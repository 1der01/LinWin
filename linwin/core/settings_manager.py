"""
Settings Manager Module
Loads, validates, and persists user preferences in JSON format.
"""

import json
from pathlib import Path
from typing import Any, Dict


DEFAULT_SETTINGS: Dict[str, Any] = {
    "default_distribution": "Ubuntu",
    "theme": "dark",
    "font_size": 13,
    "font_family": "Consolas",
    "history_limit": 500,
    "confirm_dangerous": True,
    "startup_behavior": "home_directory",
    "timeout_seconds": 120,
    "show_exit_codes": True,
    "timestamp_display": True,
}


class SettingsManager:
    """
    Manages JSON-based application settings with validation and defaults.
    """

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._settings: Dict[str, Any] = dict(DEFAULT_SETTINGS)
        self.load()

    def get(self, key: str, default: Any = None) -> Any:
        """Retrieves a configuration value."""
        return self._settings.get(key, default if default is not None else DEFAULT_SETTINGS.get(key))

    def set(self, key: str, value: Any) -> None:
        """Sets a configuration value and commits to disk."""
        self._settings[key] = value
        self.save()

    def update(self, new_values: Dict[str, Any]) -> None:
        """Updates multiple settings and writes to disk."""
        self._settings.update(new_values)
        self.save()

    def load(self) -> None:
        """Loads configuration from JSON file."""
        if not self.file_path.exists():
            self.save()
            return

        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    # Merge with default settings to ensure new keys exist
                    for k, v in DEFAULT_SETTINGS.items():
                        if k not in loaded:
                            loaded[k] = v
                    self._settings = loaded
        except Exception:
            self._settings = dict(DEFAULT_SETTINGS)
            self.save()

    def save(self) -> None:
        """Writes current configuration to JSON file."""
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self._settings, f, indent=2)
        except Exception as e:
            print(f"Warning: Failed to persist settings: {e}")

    def reset_to_defaults(self) -> None:
        """Resets all settings to their original factory defaults."""
        self._settings = dict(DEFAULT_SETTINGS)
        self.save()

    def to_dict(self) -> Dict[str, Any]:
        """Returns a copy of all active settings."""
        return dict(self._settings)
