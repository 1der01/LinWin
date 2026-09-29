"""
Settings Dialog Module
Allows customizing distribution preference, typography, theme, safety checks, and limits.
"""

from typing import List, Optional

try:
    from PySide6.QtCore import Qt
    from PySide6.QtWidgets import (
        QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, QComboBox,
        QSpinBox, QCheckBox, QPushButton, QLabel, QGroupBox, QTabWidget,
        QWidget, QMessageBox
    )
except ImportError:
    pass

from linwin.core.settings_manager import SettingsManager
from linwin.core.wsl_manager import WSLDistro


class SettingsDialog(QDialog):
    """Configuration modal for LinWin."""

    def __init__(
        self,
        settings_manager: SettingsManager,
        distros: List[WSLDistro],
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self.settings = settings_manager
        self.distros = distros

        self.setWindowTitle("LinWin Settings")
        self.setMinimumWidth(480)
        self._setup_ui()
        self._load_current_values()

    def _setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(16)
        main_layout.setContentsMargins(20, 20, 20, 20)

        tabs = QTabWidget(self)

        # Tab 1: General & WSL
        wsl_tab = QWidget()
        wsl_layout = QFormLayout(wsl_tab)
        wsl_layout.setSpacing(14)

        self.distro_combo = QComboBox(self)
        for d in self.distros:
            label = f"{d.name} ({d.state})" if d.state else d.name
            self.distro_combo.addItem(label, d.name)

        if not self.distros:
            self.distro_combo.addItem("Default Distribution", "Ubuntu")

        wsl_layout.addRow("Default Distribution:", self.distro_combo)

        self.startup_combo = QComboBox(self)
        self.startup_combo.addItem("Linux Home Directory (~)", "home_directory")
        self.startup_combo.addItem("Windows User Profile (/mnt/c/Users/...)", "windows_profile")
        wsl_layout.addRow("Startup Directory:", self.startup_combo)

        self.timeout_spin = QSpinBox(self)
        self.timeout_spin.setRange(10, 600)
        self.timeout_spin.setSuffix(" sec")
        wsl_layout.addRow("Execution Timeout:", self.timeout_spin)

        tabs.addTab(wsl_tab, "WSL & Environment")

        # Tab 2: Appearance & Typography
        ui_tab = QWidget()
        ui_layout = QFormLayout(ui_tab)
        ui_layout.setSpacing(14)

        self.theme_combo = QComboBox(self)
        self.theme_combo.addItem("Dark Theme", "dark")
        self.theme_combo.addItem("Light Theme", "light")
        ui_layout.addRow("Color Theme:", self.theme_combo)

        self.font_family_combo = QComboBox(self)
        font_options = ["Consolas", "Cascadia Code", "JetBrains Mono", "Courier New", "DejaVu Sans Mono", "Monospace"]
        for f in font_options:
            self.font_family_combo.addItem(f, f)
        ui_layout.addRow("Terminal Font:", self.font_family_combo)

        self.font_size_spin = QSpinBox(self)
        self.font_size_spin.setRange(9, 28)
        self.font_size_spin.setSuffix(" pt")
        ui_layout.addRow("Font Size:", self.font_size_spin)

        tabs.addTab(ui_tab, "Appearance")

        # Tab 3: Safety & History
        safety_tab = QWidget()
        safety_layout = QFormLayout(safety_tab)
        safety_layout.setSpacing(14)

        self.chk_confirm_dangerous = QCheckBox("Prompt before running dangerous commands (rm -rf, sudo, mkfs, dd)", self)
        safety_layout.addRow(self.chk_confirm_dangerous)

        self.chk_show_exit_codes = QCheckBox("Display execution elapsed time and exit codes", self)
        safety_layout.addRow(self.chk_show_exit_codes)

        self.history_limit_spin = QSpinBox(self)
        self.history_limit_spin.setRange(50, 5000)
        self.history_limit_spin.setSingleStep(50)
        safety_layout.addRow("History Buffer Limit:", self.history_limit_spin)

        tabs.addTab(safety_tab, "Safety & History")

        main_layout.addWidget(tabs)

        # Dialog Buttons
        btn_box = QHBoxLayout()
        self.btn_reset = QPushButton("Reset Defaults", self)
        self.btn_reset.setObjectName("btnGhost")
        self.btn_reset.clicked.connect(self._reset_defaults)
        btn_box.addWidget(self.btn_reset)

        btn_box.addStretch()

        self.btn_cancel = QPushButton("Cancel", self)
        self.btn_cancel.clicked.connect(self.reject)
        btn_box.addWidget(self.btn_cancel)

        self.btn_save = QPushButton("Save Settings", self)
        self.btn_save.setObjectName("btnPrimary")
        self.btn_save.clicked.connect(self._save_and_close)
        btn_box.addWidget(self.btn_save)

        main_layout.addLayout(btn_box)

    def _load_current_values(self):
        curr_distro = self.settings.get("default_distribution", "Ubuntu")
        for i in range(self.distro_combo.count()):
            if self.distro_combo.itemData(i) == curr_distro:
                self.distro_combo.setCurrentIndex(i)
                break

        curr_theme = self.settings.get("theme", "dark")
        idx = self.theme_combo.findData(curr_theme)
        if idx >= 0:
            self.theme_combo.setCurrentIndex(idx)

        curr_font = self.settings.get("font_family", "Consolas")
        idx = self.font_family_combo.findData(curr_font)
        if idx >= 0:
            self.font_family_combo.setCurrentIndex(idx)

        self.font_size_spin.setValue(self.settings.get("font_size", 13))
        self.history_limit_spin.setValue(self.settings.get("history_limit", 500))
        self.timeout_spin.setValue(self.settings.get("timeout_seconds", 120))

        self.chk_confirm_dangerous.setChecked(self.settings.get("confirm_dangerous", True))
        self.chk_show_exit_codes.setChecked(self.settings.get("show_exit_codes", True))

        curr_startup = self.settings.get("startup_behavior", "home_directory")
        idx = self.startup_combo.findData(curr_startup)
        if idx >= 0:
            self.startup_combo.setCurrentIndex(idx)

    def _reset_defaults(self):
        ans = QMessageBox.question(
            self,
            "Reset Settings",
            "Are you sure you want to reset all settings to defaults?",
            QMessageBox.Yes | QMessageBox.No
        )
        if ans == QMessageBox.Yes:
            self.settings.reset_to_defaults()
            self._load_current_values()

    def _save_and_close(self):
        updates = {
            "default_distribution": self.distro_combo.currentData(),
            "theme": self.theme_combo.currentData(),
            "font_family": self.font_family_combo.currentData(),
            "font_size": self.font_size_spin.value(),
            "history_limit": self.history_limit_spin.value(),
            "timeout_seconds": self.timeout_spin.value(),
            "confirm_dangerous": self.chk_confirm_dangerous.isChecked(),
            "show_exit_codes": self.chk_show_exit_codes.isChecked(),
            "startup_behavior": self.startup_combo.currentData(),
        }
        self.settings.update(updates)
        self.accept()
