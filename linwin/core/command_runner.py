"""
Command Runner Module
Executes Linux commands through WSL asynchronously using subprocess.
Tracks working directory state and guards against dangerous commands.
"""

import os
import platform
import re
import shlex
import subprocess
import time
from typing import Callable, Optional, Tuple

try:
    from PySide6.QtCore import QThread, Signal
    PYSIDE6_AVAILABLE = True
except ImportError:
    PYSIDE6_AVAILABLE = False
    # Mock base class if PySide6 is not present during standalone testing
    class QThread:
        def __init__(self):
            pass
        def start(self):
            self.run()
        def wait(self, timeout=None):
            pass

    class Signal:
        def __init__(self, *types):
            self._callbacks = []
        def connect(self, cb):
            self._callbacks.append(cb)
        def emit(self, *args):
            for cb in self._callbacks:
                cb(*args)


# Dangerous command patterns that warrant a confirmation prompt
DANGEROUS_PATTERNS = [
    (r"\brm\s+(-[a-zA-Z]*[rfRF][a-zA-Z]*)\b", "Recursive or forced file deletion (rm -rf)"),
    (r"\bsudo\b", "Superuser privileges execution (sudo)"),
    (r"\bmkfs(\.[a-zA-Z0-9]+)?\b", "Filesystem formatting (mkfs)"),
    (r"\bdd\s+if=.*of=", "Direct disk writing/clobbering (dd)"),
    (r"\bchmod\s+(-[a-zA-Z]*R[a-zA-Z]*\s+)?777\b", "Insecure wide-open permissions (chmod 777)"),
    (r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", "Fork bomb detected"),
    (r">\s*/dev/sd[a-z][0-9]*\b", "Direct writing to block storage device"),
    (r"\b(fdisk|parted|gdisk)\b", "Partition table modification"),
]


def is_dangerous_command(command: str) -> Tuple[bool, str]:
    """
    Scans a command string for potentially destructive actions.
    Returns (is_dangerous: bool, reason: str).
    """
    clean_cmd = command.strip()
    for pattern, reason in DANGEROUS_PATTERNS:
        if re.search(pattern, clean_cmd):
            return True, reason
    return False, ""


class CommandWorker(QThread):
    """
    QThread worker that executes commands in the background without blocking the UI.
    Emits stdout, stderr chunks, working directory changes, and completion signals.
    """

    # Signals for PySide6 integration
    output_received = Signal(str)
    error_received = Signal(str)
    directory_changed = Signal(str)
    finished = Signal(int, float)  # (exit_code, elapsed_time_seconds)

    def __init__(
        self,
        command: str,
        distro_name: Optional[str] = None,
        working_directory: str = "~",
        wsl_executable: Optional[str] = None,
        timeout: int = 120,
    ):
        super().__init__()
        self.command = command
        self.distro_name = distro_name
        self.working_directory = working_directory
        self.wsl_executable = wsl_executable or ("wsl.exe" if platform.system().lower() == "windows" else "wsl")
        self.timeout = timeout
        self._process: Optional[subprocess.Popen] = None
        self._is_killed = False

    def build_wsl_command(self) -> Tuple[list, str]:
        """
        Constructs the execution command line.
        Appends a sentinel command to retrieve the current working directory (pwd)
        after command execution, even if the user ran 'cd <dir>'.
        """
        is_windows = platform.system().lower() == "windows"

        # Directory detection wrapper: run user command, then echo marker + pwd
        # This keeps the interactive working directory in sync!
        pwd_marker = "___LINWIN_CWD_MARKER___"
        wrapped_script = f"{self.command}\n__LINWIN_CODE=$?\necho '{pwd_marker}'\npwd\nexit $__LINWIN_CODE"

        if is_windows:
            cmd_args = [self.wsl_executable]
            if self.distro_name:
                cmd_args.extend(["-d", self.distro_name])
            if self.working_directory and self.working_directory != "~":
                cmd_args.extend(["--cd", self.working_directory])
            cmd_args.extend(["--", "bash", "-c", wrapped_script])
            return cmd_args, pwd_marker
        else:
            # Fallback when running inside native Linux environment or testing
            # Run directly with bash
            cmd_args = ["bash", "-c", wrapped_script]
            return cmd_args, pwd_marker

    def run(self):
        """Thread execution logic."""
        start_time = time.time()
        cmd_args, pwd_marker = self.build_wsl_command()

        try:
            cwd = None
            if platform.system().lower() != "windows" and self.working_directory and self.working_directory != "~":
                # Expand ~ if running natively on Linux
                expanded = os.path.expanduser(self.working_directory)
                if os.path.isdir(expanded):
                    cwd = expanded

            self._process = subprocess.Popen(
                cmd_args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                cwd=cwd,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )

            stdout_lines = []
            capture_cwd = False
            new_cwd = None

            # Stream stdout line by line
            if self._process.stdout:
                for line in iter(self._process.stdout.readline, ""):
                    if self._is_killed:
                        break
                    line_str = line.rstrip("\r\n")

                    if pwd_marker in line_str:
                        capture_cwd = True
                        continue

                    if capture_cwd:
                        new_cwd = line_str.strip()
                        continue

                    stdout_lines.append(line)
                    self.output_received.emit(line)

                self._process.stdout.close()

            # Read remaining stderr
            stderr_output = ""
            if self._process.stderr:
                stderr_output = self._process.stderr.read()
                self._process.stderr.close()
                if stderr_output:
                    self.error_received.emit(stderr_output)

            self._process.wait()
            exit_code = self._process.returncode if not self._is_killed else 130
            elapsed = time.time() - start_time

            if new_cwd:
                self.directory_changed.emit(new_cwd)

            self.finished.emit(exit_code, elapsed)

        except FileNotFoundError as e:
            elapsed = time.time() - start_time
            self.error_received.emit(f"Process error: WSL executable not found ({e}).\nPlease ensure WSL is installed.")
            self.finished.emit(127, elapsed)
        except Exception as e:
            elapsed = time.time() - start_time
            self.error_received.emit(f"Execution failed: {str(e)}")
            self.finished.emit(1, elapsed)

    def kill_process(self):
        """Terminates the active command."""
        self._is_killed = True
        if self._process:
            try:
                self._process.terminate()
                self._process.kill()
            except Exception:
                pass


class CommandRunner:
    """
    Coordinates command execution for the LinWin application.
    Supports asynchronous workers and synchronous execution.
    """

    def __init__(self, wsl_executable: Optional[str] = None):
        self.wsl_executable = wsl_executable
        self.current_worker: Optional[CommandWorker] = None
        self.current_directory: str = "~"
        self.active_distro: Optional[str] = None

    def set_active_distro(self, distro_name: str):
        self.active_distro = distro_name

    def set_working_directory(self, cwd: str):
        self.current_directory = cwd

    def execute_async(
        self,
        command: str,
        on_output: Optional[Callable[[str], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
        on_directory_change: Optional[Callable[[str], None]] = None,
        on_finished: Optional[Callable[[int, float], None]] = None,
        timeout: int = 120,
    ) -> CommandWorker:
        """
        Executes a command asynchronously using CommandWorker.
        """
        worker = CommandWorker(
            command=command,
            distro_name=self.active_distro,
            working_directory=self.current_directory,
            wsl_executable=self.wsl_executable,
            timeout=timeout,
        )

        if on_output:
            worker.output_received.connect(on_output)
        if on_error:
            worker.error_received.connect(on_error)
        if on_directory_change:
            worker.directory_changed.connect(on_directory_change)
        if on_finished:
            worker.finished.connect(on_finished)

        # Internal listener to update current directory
        def handle_cwd(new_dir: str):
            if new_dir:
                self.current_directory = new_dir

        worker.directory_changed.connect(handle_cwd)

        self.current_worker = worker
        worker.start()
        return worker

    def cancel_current_command(self):
        """Stops the currently running process if one exists."""
        if self.current_worker and self.current_worker.isRunning():
            self.current_worker.kill_process()

    def execute_sync(self, command: str, distro_name: Optional[str] = None, cwd: str = "~") -> Tuple[int, str, str, str]:
        """
        Executes a command synchronously. Useful for initial setup, 'pwd' queries, and tests.
        Returns: (exit_code, stdout, stderr, new_cwd)
        """
        is_windows = platform.system().lower() == "windows"
        pwd_marker = "___LINWIN_CWD_MARKER___"
        wrapped_script = f"{command}\n__LINWIN_CODE=$?\necho '{pwd_marker}'\npwd\nexit $__LINWIN_CODE"

        if is_windows:
            wsl_bin = self.wsl_executable or "wsl.exe"
            cmd_args = [wsl_bin]
            target_distro = distro_name or self.active_distro
            if target_distro:
                cmd_args.extend(["-d", target_distro])
            if cwd and cwd != "~":
                cmd_args.extend(["--cd", cwd])
            cmd_args.extend(["--", "bash", "-c", wrapped_script])
        else:
            cmd_args = ["bash", "-c", wrapped_script]

        try:
            res = subprocess.run(
                cmd_args,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=30,
            )

            stdout_clean = ""
            new_dir = cwd
            if pwd_marker in res.stdout:
                parts = res.stdout.split(pwd_marker)
                stdout_clean = parts[0]
                if len(parts) > 1:
                    new_dir = parts[1].strip()
            else:
                stdout_clean = res.stdout

            return res.returncode, stdout_clean, res.stderr, new_dir

        except Exception as e:
            return 1, "", str(e), cwd
