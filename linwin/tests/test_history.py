"""
Tests for Command History and Arrow Navigation.
"""

import tempfile
import unittest
from pathlib import Path
from linwin.core.command_history import CommandHistory


class TestCommandHistory(unittest.TestCase):

    def setUp(self):
        self.temp_file = Path(tempfile.mktemp(suffix=".json"))
        self.history = CommandHistory(storage_path=self.temp_file, max_entries=5)

    def tearDown(self):
        if self.temp_file.exists():
            self.temp_file.unlink()

    def test_add_and_up_down_traversal(self):
        self.history.add("cmd1")
        self.history.add("cmd2")
        self.history.add("cmd3")

        # Press Up arrow
        self.assertEqual(self.history.get_previous("current_draft"), "cmd3")
        self.assertEqual(self.history.get_previous(""), "cmd2")
        self.assertEqual(self.history.get_previous(""), "cmd1")
        # Should stay at cmd1 when reached the top
        self.assertEqual(self.history.get_previous(""), "cmd1")

        # Press Down arrow
        self.assertEqual(self.history.get_next(), "cmd2")
        self.assertEqual(self.history.get_next(), "cmd3")
        # Down past the end returns original draft
        self.assertEqual(self.history.get_next(), "current_draft")

    def test_deduplication(self):
        self.history.add("ls")
        self.history.add("ls")  # duplicate consecutive
        self.history.add("pwd")

        all_cmds = self.history.get_all()
        self.assertEqual(all_cmds, ["ls", "pwd"])

    def test_persistence(self):
        self.history.add("date")
        self.history.add("whoami")

        # Reload in new instance
        new_history = CommandHistory(storage_path=self.temp_file, max_entries=5)
        self.assertEqual(new_history.get_all(), ["date", "whoami"])


if __name__ == "__main__":
    unittest.main()
