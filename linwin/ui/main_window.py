"""
Main Window Module
Primary application window integrating top app bar, distribution picker,
theme toggling, terminal view, command library drawer, and status bar.
"""

from pathlib import Path
from typing import Optional

try:
    from PySide6.QtCore import Qt, QSize
    from PySide6.QtGui import QIcon, QFont
    from PySide6.QtWidgets import (
        QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
        QComboBox, QPushButton, QSplitter, QStatusBar, QMessageBox,
        QFrame
    )
except ImportError:
    pass

from linwin.core.wsl_manager import WSLManager, WSLDistro
from linwin.core.command_runner import CommandRunner
from linwin.core.command_history import CommandHistory
from linwin.core.settings_manager import SettingsManager
from linwin.ui.terminal_widget import TerminalWidget
from linwin.ui.command_library import CommandLibraryWidget
from linwin.ui.settings_dialog import SettingsDialog


DARK_STYLESHEET = """
QMainWindow, QDialog, QWidget {
    background-color: #0f1117;
    color: #e2e8f0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
}

/* App Bar */
#appBar {
    background-color: #161922;
    border-bottom: 1px solid #232733;
    min-height: 48px;
    padding: 0 12px;
}

#brandTitle {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.3px;
    color: #38bdf8;
}

#brandSubtitle {
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
}

/* Terminal Frame */
#terminalFrame {
    background-color: #0b0d13;
    border: 1px solid #232733;
    border-radius: 8px;
}

#terminalOutput {
    background-color: #0b0d13;
    color: #e2e8f0;
    border: none;
    padding: 14px;
    selection-background-color: #2563eb;
    selection-color: #ffffff;
}

#cwdLabel {
    color: #64748b;
    font-size: 11px;
    font-family: monospace;
}

/* Command Input */
#inputContainer {
    background-color: #161922;
    border: 1px solid #2a3040;
    border-radius: 8px;
}

#promptPrefix {
    color: #10b981;
    font-weight: 600;
}

#cmdInput {
    background: transparent;
    color: #f8fafc;
    border: none;
    font-size: 13px;
    padding: 4px;
}

#cmdInput:focus {
    outline: none;
}

/* Buttons */
QPushButton {
    padding: 6px 14px;
    border-radius: 6px;
    font-weight: 500;
    border: 1px solid transparent;
}

#btnPrimary {
    background-color: #0284c7;
    color: #ffffff;
}

#btnPrimary:hover {
    background-color: #0369a1;
}

#btnDanger {
    background-color: #dc2626;
    color: #ffffff;
}

#btnDanger:hover {
    background-color: #b91c1c;
}

#btnSecondary {
    background-color: #1e2433;
    border: 1px solid #2d3748;
    color: #e2e8f0;
}

#btnSecondary:hover {
    background-color: #283145;
}

#btnGhost {
    background-color: transparent;
    color: #94a3b8;
    border: 1px solid #272d3b;
}

#btnGhost:hover {
    background-color: #1e2433;
    color: #ffffff;
}

/* Dropdowns */
QComboBox {
    background-color: #1a1e29;
    border: 1px solid #2d3748;
    border-radius: 6px;
    padding: 5px 12px;
    color: #e2e8f0;
    min-width: 140px;
}

QComboBox::drop-down {
    border: none;
    width: 20px;
}

QComboBox QAbstractItemView {
    background-color: #1a1e29;
    color: #e2e8f0;
    border: 1px solid #2d3748;
    selection-background-color: #0284c7;
}

/* Command Library */
#libraryHeader {
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
}

#commandList {
    background-color: #12151e;
    border: 1px solid #232733;
    border-radius: 6px;
    padding: 4px;
}

#commandList::item {
    padding: 8px 10px;
    border-bottom: 1px solid #1a1e29;
    border-radius: 4px;
    color: #cbd5e1;
}

#commandList::item:hover {
    background-color: #1a1f2c;
}

#commandList::item:selected {
    background-color: #0369a1;
    color: #ffffff;
}

/* Status Bar */
QStatusBar {
    background-color: #12151e;
    border-top: 1px solid #232733;
    color: #64748b;
    font-size: 11px;
}
"""

LIGHT_STYLESHEET = """
QMainWindow, QDialog, QWidget {
    background-color: #f8fafc;
    color: #0f172a;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
}

#appBar {
    background-color: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    min-height: 48px;
    padding: 0 12px;
}

#brandTitle {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.3px;
    color: #0284c7;
}

#brandSubtitle {
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
}

#terminalFrame {
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
}

#terminalOutput {
    background-color: #ffffff;
    color: #0f172a;
    border: none;
    padding: 14px;
    selection-background-color: #bae6fd;
    selection-color: #0f172a;
}

#cwdLabel {
    color: #64748b;
    font-size: 11px;
    font-family: monospace;
}

#inputContainer {
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
}

#promptPrefix {
    color: #059669;
    font-weight: 600;
}

#cmdInput {
    background: transparent;
    color: #0f172a;
    border: none;
    font-size: 13px;
    padding: 4px;
}

QPushButton {
    padding: 6px 14px;
    border-radius: 6px;
    font-weight: 500;
}

#btnPrimary {
    background-color: #0284c7;
    color: #ffffff;
}

#btnPrimary:hover {
    background-color: #0369a1;
}

#btnDanger {
    background-color: #dc2626;
    color: #ffffff;
}

#btnSecondary {
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #0f172a;
}

#btnGhost {
    background-color: transparent;
    color: #475569;
    border: 1px solid #e2e8f0;
}

#btnGhost:hover {
    background-color: #f1f5f9;
}

QComboBox {
    background-color: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 5px 12px;
    color: #0f172a;
    min-width: 140px;
}

#libraryHeader {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
}

#commandList {
    background-color: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
}

#commandList::item:hover {
    background-color: #f1f5f9;
}

#commandList::item:selected {
    background-color: #0284c7;
    color: #ffffff;
}

QStatusBar {
    background-color: #f1f5f9;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 11px;
}
"""


class MainWindow(QMainWindow):
    """Primary LinWin desktop application window."""

    def __init__(
        self,
        wsl_manager: WSLManager,
        command_runner: CommandRunner,
        command_history: CommandHistory,
        settings_manager: SettingsManager,
        commands_path: Path,
    ):
        super().__init__()
        self.wsl = wsl_manager
        self.runner = command_runner
        self.history = command_history
        self.settings = settings_manager
        self.commands_path = commands_path

        self.setWindowTitle("LinWin — Linux Terminal for Windows (WSL)")
        self.resize(1080, 720)
        self.setMinimumSize(800, 520)

        self._init_ui()
        self._apply_theme()
        self._check_wsl_status()

    def _init_ui(self):
        # Central Container
        central = QWidget(self)
        self.setCentralWidget(central)
        main_layout = QVBoxLayout(central)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Top App Bar
        app_bar = QFrame(self)
        app_bar.setObjectName("appBar")
        bar_layout = QHBoxLayout(app_bar)
        bar_layout.setContentsMargins(14, 8, 14, 8)
        bar_layout.setSpacing(12)

        # App Brand & Icon
        brand_layout = QHBoxLayout()
        brand_layout.setSpacing(8)
        self.brand_title = QLabel("LinWin", self)
        self.brand_title.setObjectName("brandTitle")
        self.brand_sub = QLabel("WSL Bridge", self)
        self.brand_sub.setObjectName("brandSubtitle")
        brand_layout.addWidget(self.brand_title)
        brand_layout.addWidget(self.brand_sub)
        bar_layout.addLayout(brand_layout)

        bar_layout.addStretch()

        # Distribution Dropdown
        distro_label = QLabel("Distro:", self)
        distro_label.setObjectName("brandSubtitle")
        bar_layout.addWidget(distro_label)

        self.distro_selector = QComboBox(self)
        self.distro_selector.setObjectName("distroSelector")
        self.distro_selector.currentIndexChanged.connect(self._on_distro_changed)
        bar_layout.addWidget(self.distro_selector)

        # Theme Toggle Button
        self.btn_theme = QPushButton("Theme", self)
        self.btn_theme.setObjectName("btnGhost")
        self.btn_theme.setToolTip("Toggle Dark/Light theme")
        self.btn_theme.clicked.connect(self._toggle_theme)
        bar_layout.addWidget(self.btn_theme)

        # Command Library Toggle Button
        self.btn_library = QPushButton("Commands", self)
        self.btn_library.setObjectName("btnSecondary")
        self.btn_library.setToolTip("Toggle Command Library panel")
        self.btn_library.clicked.connect(self._toggle_library)
        bar_layout.addWidget(self.btn_library)

        # Settings Button
        self.btn_settings = QPushButton("Settings", self)
        self.btn_settings.setObjectName("btnGhost")
        self.btn_settings.clicked.connect(self._open_settings)
        bar_layout.addWidget(self.btn_settings)

        main_layout.addWidget(app_bar)

        # Splitter with Terminal & Command Library
        self.splitter = QSplitter(Qt.Horizontal, self)

        self.terminal = TerminalWidget(
            command_runner=self.runner,
            command_history=self.history,
            settings_manager=self.settings,
            parent=self.splitter,
        )
        self.splitter.addWidget(self.terminal)

        self.library = CommandLibraryWidget(
            data_path=self.commands_path,
            parent=self.splitter,
        )
        self.library.command_selected.connect(self.terminal.set_input_command)
        self.library.command_execute.connect(self._execute_library_command)
        self.splitter.addWidget(self.library)

        # Set initial splitter proportions (75% terminal, 25% library)
        self.splitter.setStretchFactor(0, 3)
        self.splitter.setStretchFactor(1, 1)

        main_layout.addWidget(self.splitter, stretch=1)

        # Status Bar
        self.status = QStatusBar(self)
        self.setStatusBar(self.status)
        self.status_wsl = QLabel("WSL: Initializing...", self)
        self.status.addWidget(self.status_wsl)

        self.terminal.command_executed.connect(self._on_command_started)

    def _check_wsl_status(self):
        """Scans for WSL installation and populates distributions."""
        status = self.wsl.get_wsl_status()
        installed = status.get("installed", False)

        if not installed:
            self.status_wsl.setText("WSL: Not installed or inaccessible")
            QMessageBox.critical(
                self,
                "WSL Not Found",
                "Windows Subsystem for Linux (WSL) was not detected.\n\n"
                "To use LinWin, please install WSL by running in an Administrator PowerShell:\n"
                "  wsl --install\n\n"
                "Then restart your computer and open LinWin again."
            )

        distros = self.wsl.list_distributions()
        self.distro_selector.clear()

        preferred_distro = self.settings.get("default_distribution", "")
        preferred_index = 0

        for idx, d in enumerate(distros):
            label = f"{d.name} (WSL {d.version})"
            self.distro_selector.addItem(label, d.name)
            if d.name.lower() == preferred_distro.lower():
                preferred_index = idx

        if distros:
            self.distro_selector.setCurrentIndex(preferred_index)
            selected_name = self.distro_selector.currentData()
            self.terminal.set_distro(selected_name)
            self.status_wsl.setText(f"WSL Ready · Distro: {selected_name} · WSL2")
        else:
            self.distro_selector.addItem("No Distro Found", "None")
            self.status_wsl.setText("WSL: No distributions installed")

    def _on_distro_changed(self, index: int):
        distro_name = self.distro_selector.currentData()
        if distro_name and distro_name != "None":
            self.terminal.set_distro(distro_name)
            self.status_wsl.setText(f"WSL Ready · Distro: {distro_name}")

    def _toggle_theme(self):
        curr = self.settings.get("theme", "dark")
        new_theme = "light" if curr == "dark" else "dark"
        self.settings.set("theme", new_theme)
        self._apply_theme()

    def _apply_theme(self):
        theme = self.settings.get("theme", "dark")
        if theme == "light":
            self.setStyleSheet(LIGHT_STYLESHEET)
            self.btn_theme.setText("Dark Mode")
        else:
            self.setStyleSheet(DARK_STYLESHEET)
            self.btn_theme.setText("Light Mode")

    def _toggle_library(self):
        is_visible = self.library.isVisible()
        self.library.setVisible(not is_visible)

    def _open_settings(self):
        distros = self.wsl.list_distributions()
        dialog = SettingsDialog(self.settings, distros, self)
        if dialog.exec():
            self._apply_theme()
            new_distro = self.settings.get("default_distribution")
            if new_distro:
                idx = self.distro_selector.findData(new_distro)
                if idx >= 0:
                    self.distro_selector.setCurrentIndex(idx)

    def _execute_library_command(self, command: str):
        self.terminal.set_input_command(command)
        self.terminal.run_command()

    def _on_command_started(self, command: str):
        self.status.showMessage(f"Executing: {command[:40]}...", 3000)
