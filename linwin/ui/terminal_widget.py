"""
Terminal Widget Module
Provides the central terminal display, Linux prompt formatting, command input line,
history navigation, copy/clear controls, and safety verification.
"""

from typing import Optional
import html

try:
    from PySide6.QtCore import Qt, Signal
    from PySide6.QtGui import QFont, QTextCursor, QColor
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QPlainTextEdit,
        QLineEdit, QPushButton, QLabel, QMessageBox, QFrame,
        QApplication
    )
except ImportError:
    # Allows headless testing and code inspection without PySide6
    pass

from linwin.core.command_runner import CommandRunner, is_dangerous_command
from linwin.core.command_history import CommandHistory
from linwin.core.settings_manager import SettingsManager


class CommandInput(QLineEdit):
    """Custom QLineEdit that captures Up/Down arrows for command history navigation."""

    up_pressed = Signal()
    down_pressed = Signal()
    tab_pressed = Signal()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Up:
            self.up_pressed.emit()
            event.accept()
            return
        elif event.key() == Qt.Key_Down:
            self.down_pressed.emit()
            event.accept()
            return
        elif event.key() == Qt.Key_Tab:
            self.tab_pressed.emit()
            event.accept()
            return
        super().keyPressEvent(event)


class TerminalWidget(QWidget):
    """
    Main terminal component combining the output buffer, interactive prompt,
    history tracking, and command execution.
    """

    command_executed = Signal(str)
    directory_updated = Signal(str)

    def __init__(
        self,
        command_runner: CommandRunner,
        command_history: CommandHistory,
        settings_manager: SettingsManager,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self.runner = command_runner
        self.history = command_history
        self.settings = settings_manager
        self.is_running = False

        self._active_distro_name = "Ubuntu"
        self._current_directory = "~"
        self._user_name = "user"

        self._setup_ui()
        self._apply_font()
        self.display_welcome_banner()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Terminal Panel Container
        self.terminal_frame = QFrame(self)
        self.terminal_frame.setObjectName("terminalFrame")
        frame_layout = QVBoxLayout(self.terminal_frame)
        frame_layout.setContentsMargins(0, 0, 0, 0)
        frame_layout.setSpacing(0)

        # Output text area
        self.output_view = QPlainTextEdit(self.terminal_frame)
        self.output_view.setReadOnly(True)
        self.output_view.setObjectName("terminalOutput")
        self.output_view.setLineWrapMode(QPlainTextEdit.WidgetWidth)
        frame_layout.addWidget(self.output_view)

        # Terminal action bar (Clear, Copy, Directory display)
        action_bar = QHBoxLayout()
        action_bar.setContentsMargins(12, 8, 12, 8)

        self.cwd_label = QLabel(self._format_pwd_display(), self)
        self.cwd_label.setObjectName("cwdLabel")
        action_bar.addWidget(self.cwd_label)

        action_bar.addStretch()

        self.btn_copy_all = QPushButton("Copy Buffer", self)
        self.btn_copy_all.setObjectName("btnGhost")
        self.btn_copy_all.setToolTip("Copy entire terminal output to clipboard")
        self.btn_copy_all.clicked.connect(self._copy_all_output)
        action_bar.addWidget(self.btn_copy_all)

        self.btn_clear = QPushButton("Clear Terminal", self)
        self.btn_clear.setObjectName("btnGhost")
        self.btn_clear.setToolTip("Clear terminal output (Ctrl+L)")
        self.btn_clear.clicked.connect(self.clear_terminal)
        action_bar.addWidget(self.btn_clear)

        frame_layout.addLayout(action_bar)
        layout.addWidget(self.terminal_frame, stretch=1)

        # Command Input Area
        input_container = QFrame(self)
        input_container.setObjectName("inputContainer")
        input_layout = QHBoxLayout(input_container)
        input_layout.setContentsMargins(12, 10, 12, 10)
        input_layout.setSpacing(10)

        self.prompt_prefix_label = QLabel(self._get_prompt_prefix(), self)
        self.prompt_prefix_label.setObjectName("promptPrefix")
        input_layout.addWidget(self.prompt_prefix_label)

        self.cmd_input = CommandInput(self)
        self.cmd_input.setObjectName("cmdInput")
        self.cmd_input.setPlaceholderText("Type Linux command (e.g. ls -la, uname -a, df -h, git status)...")
        self.cmd_input.returnPressed.connect(self.run_command)
        self.cmd_input.up_pressed.connect(self._handle_history_up)
        self.cmd_input.down_pressed.connect(self._handle_history_down)
        input_layout.addWidget(self.cmd_input, stretch=1)

        self.btn_run = QPushButton("Run", self)
        self.btn_run.setObjectName("btnPrimary")
        self.btn_run.setToolTip("Execute command (Enter)")
        self.btn_run.clicked.connect(self.run_command)
        input_layout.addWidget(self.btn_run)

        self.btn_cancel = QPushButton("Cancel", self)
        self.btn_cancel.setObjectName("btnDanger")
        self.btn_cancel.setToolTip("Cancel active process")
        self.btn_cancel.setVisible(False)
        self.btn_cancel.clicked.connect(self._handle_cancel)
        input_layout.addWidget(self.btn_cancel)

        layout.addWidget(input_container)

    def set_distro(self, distro_name: str):
        """Updates active WSL distribution."""
        self._active_distro_name = distro_name
        self.runner.set_active_distro(distro_name)
        self._update_prompt_labels()

    def set_working_directory(self, cwd: str):
        """Updates current working directory."""
        self._current_directory = cwd
        self.runner.set_working_directory(cwd)
        self._update_prompt_labels()
        self.directory_updated.emit(cwd)

    def _get_prompt_prefix(self) -> str:
        distro_short = self._active_distro_name.lower().replace(" ", "").replace("-", "")
        return f"{self._user_name}@{distro_short}:{self._current_directory}$ "

    def _format_pwd_display(self) -> str:
        return f"Dir: {self._current_directory}  [{self._active_distro_name}]"

    def _update_prompt_labels(self):
        self.prompt_prefix_label.setText(self._get_prompt_prefix())
        self.cwd_label.setText(self._format_pwd_display())

    def _apply_font(self):
        font_family = self.settings.get("font_family", "Consolas")
        font_size = self.settings.get("font_size", 13)

        font = QFont(font_family, font_size)
        font.setStyleHint(QFont.Monospace)
        self.output_view.setFont(font)
        self.cmd_input.setFont(font)
        self.prompt_prefix_label.setFont(font)

    def display_welcome_banner(self):
        """Displays LinWin startup greeting and helpful WSL instructions."""
        self.append_text(
            f"LinWin v1.0.0 — Lightweight Linux Terminal for Windows (WSL)\n"
            f"Ready on distribution: {self._active_distro_name}\n"
            f"Type any Linux command to execute via WSL subsystem.\n"
            f"Use Up/Down arrows for history · Ctrl+L or Clear to wipe buffer.\n"
            f"────────────────────────────────────────────────────────────\n\n"
        )

    def append_text(self, text: str):
        """Appends plain text to the terminal and scrolls to bottom."""
        self.output_view.moveCursor(QTextCursor.End)
        self.output_view.insertPlainText(text)
        self.output_view.moveCursor(QTextCursor.End)

    def clear_terminal(self):
        """Clears terminal view."""
        self.output_view.clear()
        self.display_welcome_banner()

    def _copy_all_output(self):
        clipboard = QApplication.clipboard()
        if clipboard:
            clipboard.setText(self.output_view.toPlainText())

    def run_command(self):
        """Validates, checks safety, and executes the entered command."""
        command = self.cmd_input.text().strip()
        if not command:
            return

        if self.is_running:
            return

        # Safety check: scan for potentially dangerous actions
        if self.settings.get("confirm_dangerous", True):
            dangerous, reason = is_dangerous_command(command)
            if dangerous:
                confirmed = self._show_safety_confirmation(command, reason)
                if not confirmed:
                    self.append_text(f"\n[LinWin Security] Execution cancelled by user for: {command}\n\n")
                    return

        # Record to history
        self.history.add(command)
        self.cmd_input.clear()

        # Echo command with prompt
        prompt = self._get_prompt_prefix()
        self.append_text(f"{prompt}{command}\n")

        # Update UI state for running
        self._set_executing_state(True)
        self.command_executed.emit(command)

        # Execute asynchronously
        timeout = self.settings.get("timeout_seconds", 120)
        self.runner.execute_async(
            command=command,
            on_output=self._on_stdout_chunk,
            on_error=self._on_stderr_chunk,
            on_directory_change=self._on_directory_changed,
            on_finished=self._on_command_finished,
            timeout=timeout,
        )

    def _show_safety_confirmation(self, command: str, reason: str) -> bool:
        """Presents a Material-styled confirmation dialog before dangerous operations."""
        dialog = QMessageBox(self)
        dialog.setWindowTitle("LinWin — Dangerous Command Confirmation")
        dialog.setIcon(QMessageBox.Warning)
        dialog.setText(f"Potentially destructive command detected:\n\n{command}")
        dialog.setInformativeText(f"Warning: {reason}\n\nDo you want to proceed with executing this in {self._active_distro_name}?")
        dialog.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        dialog.setDefaultButton(QMessageBox.No)

        result = dialog.exec()
        return result == QMessageBox.Yes

    def _on_stdout_chunk(self, chunk: str):
        self.append_text(chunk)

    def _on_stderr_chunk(self, chunk: str):
        # Visually distinct error chunk
        self.append_text(f"[stderr] {chunk}")

    def _on_directory_changed(self, new_cwd: str):
        self.set_working_directory(new_cwd)

    def _on_command_finished(self, exit_code: int, elapsed: float):
        self._set_executing_state(False)

        show_codes = self.settings.get("show_exit_codes", True)
        if show_codes:
            status_text = "SUCCESS" if exit_code == 0 else f"FAILED (Exit {exit_code})"
            self.append_text(f"\n[{status_text} · {elapsed:.2f}s]\n\n")
        else:
            self.append_text("\n\n")

    def _set_executing_state(self, is_running: bool):
        self.is_running = is_running
        self.btn_run.setEnabled(not is_running)
        self.btn_cancel.setVisible(is_running)
        self.cmd_input.setEnabled(not is_running)

        if not is_running:
            self.cmd_input.setFocus()

    def _handle_cancel(self):
        self.runner.cancel_current_command()
        self.append_text("\n[Command cancelled by user (SIGINT)]\n")

    def _handle_history_up(self):
        current = self.cmd_input.text()
        prev_cmd = self.history.get_previous(current)
        if prev_cmd is not None:
            self.cmd_input.setText(prev_cmd)
            self.cmd_input.setCursorPosition(len(prev_cmd))

    def _handle_history_down(self):
        next_cmd = self.history.get_next()
        if next_cmd is not None:
            self.cmd_input.setText(next_cmd)
            self.cmd_input.setCursorPosition(len(next_cmd))

    def set_input_command(self, command: str):
        """Sets the command in the input box (e.g. from Command Library)."""
        self.cmd_input.setText(command)
        self.cmd_input.setFocus()
        self.cmd_input.setCursorPosition(len(command))
