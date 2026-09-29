"""
Command History Module
Tracks command execution history for Up/Down arrow navigation and persistence.
"""

import json
from pathlib import Path
from typing import List, Optional


class CommandHistory:
    """
    Manages terminal command history with navigation and disk persistence.
    """

    def __init__(self, storage_path: Optional[Path] = None, max_entries: int = 500):
        self.storage_path = storage_path
        self.max_entries = max_entries
        self.history: List[str] = []
        self._current_index = -1
        self._temp_edit = ""
        self.load()

    def add(self, command: str) -> None:
        """
        Appends a command to history.
        Omits empty commands or consecutive duplicate entries.
        """
        clean_cmd = command.strip()
        if not clean_cmd:
            return

        # Avoid exact duplicate of the most recent item
        if self.history and self.history[-1] == clean_cmd:
            self.reset_index()
            return

        self.history.append(clean_cmd)

        # Enforce max limit
        if len(self.history) > self.max_entries:
            self.history = self.history[-self.max_entries:]

        self.reset_index()
        self.save()

    def get_previous(self, current_input: str = "") -> Optional[str]:
        """
        Navigates backward in history (Up arrow).
        """
        if not self.history:
            return None

        if self._current_index == -1:
            self._temp_edit = current_input
            self._current_index = len(self.history) - 1
            return self.history[self._current_index]

        if self._current_index > 0:
            self._current_index -= 1
            return self.history[self._current_index]

        return self.history[0]

    def get_next(self) -> Optional[str]:
        """
        Navigates forward in history (Down arrow).
        """
        if not self.history or self._current_index == -1:
            return None

        if self._current_index < len(self.history) - 1:
            self._current_index += 1
            return self.history[self._current_index]

        # Reached the bottom - restore draft input
        self._current_index = -1
        return self._temp_edit

    def reset_index(self) -> None:
        """Resets the arrow navigation index to default."""
        self._current_index = -1
        self._temp_edit = ""

    def clear(self) -> None:
        """Wipes all command history."""
        self.history.clear()
        self.reset_index()
        self.save()

    def get_all(self) -> List[str]:
        """Returns a copy of all history items."""
        return list(self.history)

    def load(self) -> None:
        """Loads command history from storage file."""
        if not self.storage_path or not self.storage_path.exists():
            return

        try:
            with open(self.storage_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    self.history = [str(x) for x in data][-self.max_entries:]
        except Exception:
            self.history = []

    def save(self) -> None:
        """Saves command history to disk."""
        if not self.storage_path:
            return

        try:
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
