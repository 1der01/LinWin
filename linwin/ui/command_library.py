"""
Command Library Widget Module
Provides quick access, filtering, creation, and execution of frequently used Linux commands.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional

try:
    from PySide6.QtCore import Qt, Signal
    from PySide6.QtWidgets import (
        QWidget, QVBoxLayout, QHBoxLayout, QListWidget, QListWidgetItem,
        QLineEdit, QPushButton, QLabel, QDialog, QFormLayout,
        QMessageBox, QTextEdit, QFrame
    )
except ImportError:
    pass


class CommandDialog(QDialog):
    """Modal dialog for adding or editing a saved command."""

    def __init__(self, parent=None, command_data=None):
        super().__init__(parent)
        self.setWindowTitle("Save Linux Command" if not command_data else "Edit Command")
        self.setMinimumWidth(400)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        form = QFormLayout()
        self.input_name = QLineEdit(self)
        self.input_command = QLineEdit(self)
        self.input_category = QLineEdit(self)
        self.input_category.setPlaceholderText("e.g. System, Network, Git")
        self.input_desc = QTextEdit(self)
        self.input_desc.setMaximumHeight(80)

        if command_data:
            self.input_name.setText(command_data.get("name", ""))
            self.input_command.setText(command_data.get("command", ""))
            self.input_category.setText(command_data.get("category", "General"))
            self.input_desc.setPlainText(command_data.get("description", ""))
        else:
            self.input_category.setText("General")

        form.addRow("Name:", self.input_name)
        form.addRow("Command:", self.input_command)
        form.addRow("Category:", self.input_category)
        form.addRow("Description:", self.input_desc)
        layout.addLayout(form)

        btn_box = QHBoxLayout()
        btn_box.addStretch()
        self.btn_cancel = QPushButton("Cancel", self)
        self.btn_cancel.clicked.connect(self.reject)
        btn_box.addWidget(self.btn_cancel)

        self.btn_save = QPushButton("Save", self)
        self.btn_save.setObjectName("btnPrimary")
        self.btn_save.clicked.connect(self._validate_and_accept)
        btn_box.addWidget(self.btn_save)

        layout.addLayout(btn_box)

    def _validate_and_accept(self):
        if not self.input_name.text().strip():
            QMessageBox.warning(self, "Validation Error", "Please provide a name for the command.")
            return
        if not self.input_command.text().strip():
            QMessageBox.warning(self, "Validation Error", "Command string cannot be empty.")
            return
        self.accept()

    def get_data(self) -> dict:
        return {
            "name": self.input_name.text().strip(),
            "command": self.input_command.text().strip(),
            "category": self.input_category.text().strip() or "General",
            "description": self.input_desc.toPlainText().strip(),
        }


class CommandLibraryWidget(QWidget):
    """
    Sidebar / panel displaying curated Linux command snippets.
    Allows inserting into terminal, immediate execution, or customization.
    """

    command_selected = Signal(str)  # Send command to terminal input
    command_execute = Signal(str)   # Execute command immediately

    def __init__(self, data_path: Path, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.data_path = data_path
        self.commands: List[Dict[str, str]] = []
        self._setup_ui()
        self.load_commands()

    def _setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Header
        header = QHBoxLayout()
        title = QLabel("Command Library", self)
        title.setObjectName("libraryHeader")
        header.addWidget(title)
        header.addStretch()

        self.btn_add = QPushButton("+ Add", self)
        self.btn_add.setObjectName("btnGhost")
        self.btn_add.setToolTip("Add a new custom Linux command")
        self.btn_add.clicked.connect(self._add_command)
        header.addWidget(self.btn_add)
        layout.addLayout(header)

        # Search filter
        self.search_input = QLineEdit(self)
        self.search_input.setPlaceholderText("Filter commands...")
        self.search_input.textChanged.connect(self._filter_commands)
        layout.addWidget(self.search_input)

        # List Widget
        self.list_widget = QListWidget(self)
        self.list_widget.setObjectName("commandList")
        self.list_widget.itemDoubleClicked.connect(self._on_item_double_clicked)
        layout.addWidget(self.list_widget, stretch=1)

        # Action Buttons
        btn_layout = QHBoxLayout()
        self.btn_use = QPushButton("Insert", self)
        self.btn_use.setObjectName("btnSecondary")
        self.btn_use.setToolTip("Place selected command into prompt")
        self.btn_use.clicked.connect(self._use_selected)
        btn_layout.addWidget(self.btn_use)

        self.btn_run = QPushButton("Run", self)
        self.btn_run.setObjectName("btnPrimary")
        self.btn_run.setToolTip("Execute selected command immediately")
        self.btn_run.clicked.connect(self._run_selected)
        btn_layout.addWidget(self.btn_run)

        self.btn_delete = QPushButton("Delete", self)
        self.btn_delete.setObjectName("btnGhost")
        self.btn_delete.clicked.connect(self._delete_selected)
        btn_layout.addWidget(self.btn_delete)

        layout.addLayout(btn_layout)

    def load_commands(self):
        """Loads command library from disk."""
        if not self.data_path.exists():
            self.commands = []
            return

        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                self.commands = json.load(f)
        except Exception:
            self.commands = []

        self.refresh_list()

    def save_commands(self):
        """Persists updated command library to disk."""
        try:
            self.data_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(self.commands, f, indent=2)
        except Exception as e:
            QMessageBox.warning(self, "Error", f"Failed to save command library: {e}")

    def refresh_list(self, filter_text: str = ""):
        """Populates the list widget."""
        self.list_widget.clear()
        filter_lower = filter_text.strip().lower()

        for idx, item in enumerate(self.commands):
            name = item.get("name", "Untitled")
            cmd = item.get("command", "")
            cat = item.get("category", "General")

            if filter_lower:
                if filter_lower not in name.lower() and filter_lower not in cmd.lower() and filter_lower not in cat.lower():
                    continue

            list_item = QListWidgetItem()
            list_item.setText(f"{name}\n  $ {cmd}")
            list_item.setData(Qt.UserRole, idx)
            self.list_widget.addItem(list_item)

    def _filter_commands(self, text: str):
        self.refresh_list(text)

    def _on_item_double_clicked(self, item: QListWidgetItem):
        idx = item.data(Qt.UserRole)
        if 0 <= idx < len(self.commands):
            self.command_selected.emit(self.commands[idx]["command"])

    def _use_selected(self):
        item = self.list_widget.currentItem()
        if not item:
            return
        idx = item.data(Qt.UserRole)
        if 0 <= idx < len(self.commands):
            self.command_selected.emit(self.commands[idx]["command"])

    def _run_selected(self):
        item = self.list_widget.currentItem()
        if not item:
            return
        idx = item.data(Qt.UserRole)
        if 0 <= idx < len(self.commands):
            self.command_execute.emit(self.commands[idx]["command"])

    def _add_command(self):
        dlg = CommandDialog(self)
        if dlg.exec() == QDialog.Accepted:
            new_cmd = dlg.get_data()
            new_cmd["id"] = f"custom-{len(self.commands) + 1}"
            self.commands.append(new_cmd)
            self.save_commands()
            self.refresh_list()

    def _delete_selected(self):
        item = self.list_widget.currentItem()
        if not item:
            return
        idx = item.data(Qt.UserRole)
        if 0 <= idx < len(self.commands):
            name = self.commands[idx].get("name", "this command")
            ans = QMessageBox.question(
                self,
                "Confirm Delete",
                f"Are you sure you want to remove '{name}'?",
                QMessageBox.Yes | QMessageBox.No
            )
            if ans == QMessageBox.Yes:
                self.commands.pop(idx)
                self.save_commands()
                self.refresh_list()
