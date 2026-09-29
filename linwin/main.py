#!/usr/bin/env python3
"""
LinWin — Lightweight Linux Terminal for Windows (WSL)
Main Application Entry Point. Supports both PySide6 GUI and standalone CLI modes.
"""

import os
import sys
import types
from pathlib import Path

# Setup paths so LinWin imports work seamlessly regardless of how script was invoked
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

for p in [str(CURRENT_DIR), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Ensure 'linwin' is importable as a top-level package namespace even if folder name differs
try:
    import linwin
except ImportError:
    linwin_pkg = types.ModuleType("linwin")
    linwin_pkg.__path__ = [str(CURRENT_DIR)]
    sys.modules["linwin"] = linwin_pkg

# Data directories and persistence paths
DATA_DIR = CURRENT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS_PATH = DATA_DIR / "settings.json"
COMMANDS_PATH = DATA_DIR / "commands.json"
HISTORY_PATH = DATA_DIR / "history.json"

# Core imports (Zero dependencies, pure Python standard library)
from linwin.core.wsl_manager import WSLManager
from linwin.core.command_runner import CommandRunner, is_dangerous_command
from linwin.core.command_history import CommandHistory
from linwin.core.settings_manager import SettingsManager


def run_cli_interactive():
    """
    Runs an interactive LinWin terminal directly in the console.
    Works anywhere with zero external dependencies (pure Python standard library).
    """
    # Try enabling readline on Unix/Linux for smooth arrow key navigation
    try:
        import readline
    except ImportError:
        pass

    wsl_mgr = WSLManager()
    cmd_history = CommandHistory(storage_path=HISTORY_PATH)
    settings_mgr = SettingsManager(file_path=SETTINGS_PATH)
    cmd_runner = CommandRunner(wsl_executable=wsl_mgr.executable)

    status = wsl_mgr.get_wsl_status()
    distros = wsl_mgr.list_distributions()
    active_distro = distros[0].name if distros else "Linux"
    cmd_runner.set_active_distro(active_distro)

    print("\n" + "=" * 62)
    print(" LinWin — Linux Terminal for Windows (WSL CLI Mode)")
    print("=" * 62)
    print(f" WSL Subsystem: {'Available' if status.get('installed') else 'Direct / Fallback'}")
    print(f" Active Distribution: {active_distro}")
    print(" Type any Linux command to execute.")
    print(" Special commands:")
    print("   :distro <name>   - Switch active distribution")
    print("   :distros         - List available distributions")
    print("   :history         - Display command history")
    print("   :clear           - Clear terminal buffer")
    print("   :exit / :quit    - Exit LinWin")
    print("=" * 62 + "\n")

    current_cwd = "~"
    cmd_runner.set_working_directory(current_cwd)

    while True:
        try:
            prompt_distro = active_distro.lower().replace(" ", "").replace("-", "")
            prompt = f"\033[1;32muser@{prompt_distro}\033[0m:\033[1;34m{current_cwd}\033[0m$ "

            user_input = input(prompt).strip()
            if not user_input:
                continue

            # Built-in session commands
            if user_input in [":exit", ":quit", "exit"]:
                print("Exiting LinWin CLI. Goodbye!")
                break
            elif user_input in [":clear", "clear"]:
                os.system("cls" if os.name == "nt" else "clear")
                continue
            elif user_input == ":distros":
                print("\nAvailable distributions:")
                for d in distros:
                    default_marker = " (Default)" if d.is_default else ""
                    print(f"  • {d.name} [{d.state}]{default_marker}")
                print()
                continue
            elif user_input.startswith(":distro "):
                target = user_input.split(" ", 1)[1].strip()
                match = next((d for d in distros if d.name.lower() == target.lower()), None)
                if match:
                    active_distro = match.name
                    cmd_runner.set_active_distro(active_distro)
                    print(f"Switched active distribution to: {active_distro}\n")
                else:
                    print(f"Distribution '{target}' not found in installed list.\n")
                continue
            elif user_input == ":history":
                print("\nRecent Commands:")
                for idx, h in enumerate(cmd_history.get_all()[-20:], 1):
                    print(f"  {idx:2d}. {h}")
                print()
                continue

            # Safety Guard check
            if settings_mgr.get("confirm_dangerous", True):
                dangerous, reason = is_dangerous_command(user_input)
                if dangerous:
                    print(f"\n\033[1;31m[LinWin Safety Interceptor]\033[0m Potentially destructive command:")
                    print(f"  Command: {user_input}")
                    print(f"  Reason:  {reason}")
                    confirm = input("Are you sure you want to proceed? [y/N]: ").strip().lower()
                    if confirm not in ["y", "yes"]:
                        print("Execution aborted by user.\n")
                        continue

            # Save to history
            cmd_history.add(user_input)

            # Execute command
            code, stdout, stderr, new_cwd = cmd_runner.execute_sync(
                command=user_input,
                distro_name=active_distro,
                cwd=current_cwd
            )

            if stdout:
                print(stdout, end="" if stdout.endswith("\n") else "\n")
            if stderr:
                print(f"\033[1;31m{stderr}\033[0m", end="" if stderr.endswith("\n") else "\n")

            if new_cwd and new_cwd != current_cwd:
                current_cwd = new_cwd
                cmd_runner.set_working_directory(new_cwd)

            if settings_mgr.get("show_exit_codes", True) and code != 0:
                print(f"\033[1;33m[Exit code: {code}]\033[0m")

        except (KeyboardInterrupt, EOFError):
            print("\nExiting LinWin CLI. Goodbye!")
            break


def run_gui():
    """Starts the PySide6 desktop GUI application."""
    pyside_missing = False
    try:
        from PySide6.QtCore import Qt
        from PySide6.QtWidgets import QApplication
        from linwin.ui.main_window import MainWindow
    except ImportError:
        pyside_missing = True

    if pyside_missing:
        print("\n" + "=" * 66)
        print(" [LinWin GUI Notice] PySide6 is not installed on this system.")
        print("=" * 66)
        print(" To run the full Windows desktop graphical interface:")
        print("     pip install PySide6")
        print(" or:")
        print("     pip install -r requirements.txt")
        print("-" * 66)
        print(" Starting LinWin interactive CLI mode instead...")
        print("=" * 66 + "\n")
        run_cli_interactive()
        return

    # Check for graphical display on Linux (prevents Qt 'cannot connect to X display' crash)
    if sys.platform != "win32" and not os.environ.get("DISPLAY") and not os.environ.get("WAYLAND_DISPLAY"):
        print("\n[LinWin Notice] No graphical display detected ($DISPLAY is unset).")
        print("Starting LinWin interactive CLI mode...\n")
        run_cli_interactive()
        return

    # High DPI scaling support
    if hasattr(Qt, "AA_EnableHighDpiScaling"):
        QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    if hasattr(Qt, "AA_UseHighDpiPixmaps"):
        QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)
    app.setApplicationName("LinWin")
    app.setApplicationDisplayName("LinWin — Linux Terminal for Windows")
    app.setOrganizationName("LinWin")

    # Initialize Core Subsystems
    wsl_mgr = WSLManager()
    cmd_history = CommandHistory(storage_path=HISTORY_PATH)
    settings_mgr = SettingsManager(file_path=SETTINGS_PATH)
    cmd_runner = CommandRunner(wsl_executable=wsl_mgr.executable)

    # Launch Main Window
    window = MainWindow(
        wsl_manager=wsl_mgr,
        command_runner=cmd_runner,
        command_history=cmd_history,
        settings_manager=settings_mgr,
        commands_path=COMMANDS_PATH,
    )
    window.show()

    sys.exit(app.exec())


def run_cli_diagnostic():
    """Runs a quick diagnostic on WSL status and prints detected distros."""
    print("\nLinWin Diagnostic Check")
    print("=" * 45)
    wsl = WSLManager()
    status = wsl.get_wsl_status()
    print(f"Python:         {sys.version.split()[0]}")
    print(f"OS Platform:    {sys.platform}")
    print(f"WSL Executable: {status.get('executable')}")
    print(f"WSL Available:  {status.get('installed')}")
    print(f"Default Ver:    {status.get('default_version')}")
    print("\nInstalled Distributions:")
    distros = wsl.list_distributions()
    if not distros:
        print("  (None detected)")
    for d in distros:
        default_tag = " [Default]" if d.is_default else ""
        print(f"  - {d.name} (WSL {d.version}) [{d.state}]{default_tag}")
    print("=" * 45 + "\n")


if __name__ == "__main__":
    if "--diagnostics" in sys.argv or "--check" in sys.argv:
        run_cli_diagnostic()
    elif "--cli" in sys.argv:
        run_cli_interactive()
    else:
        run_gui()
