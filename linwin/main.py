#!/usr/bin/env python3
"""
LinWin — Lightweight Linux Terminal for Windows (WSL)
Main Application Entry Point.
"""

import sys
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SETTINGS_PATH = DATA_DIR / "settings.json"
COMMANDS_PATH = DATA_DIR / "commands.json"
HISTORY_PATH = DATA_DIR / "history.json"

# Core imports
from linwin.core.wsl_manager import WSLManager
from linwin.core.command_runner import CommandRunner
from linwin.core.command_history import CommandHistory
from linwin.core.settings_manager import SettingsManager


def run_gui():
    """Starts the PySide6 desktop GUI application."""
    try:
        from PySide6.QtCore import Qt
        from PySide6.QtWidgets import QApplication
        from linwin.ui.main_window import MainWindow
    except ImportError as e:
        print("\n" + "=" * 60)
        print(" [LinWin Startup Error] PySide6 is not installed!")
        print(" Please install requirements by running:")
        print("     pip install -r requirements.txt")
        print(" or:")
        print("     pip install PySide6")
        print("=" * 60 + "\n")
        sys.exit(1)

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
    print("LinWin Diagnostic Check")
    print("=" * 40)
    wsl = WSLManager()
    status = wsl.get_wsl_status()
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
    print("=" * 40)


if __name__ == "__main__":
    if "--diagnostics" in sys.argv or "--check" in sys.argv:
        run_cli_diagnostic()
    else:
        run_gui()
