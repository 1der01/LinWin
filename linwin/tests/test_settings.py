"""
Tests for Settings Manager.
"""

import tempfile
import unittest
from pathlib import Path
from linwin.core.settings_manager import SettingsManager, DEFAULT_SETTINGS


class TestSettingsManager(unittest.TestCase):

    def setUp(self):
        self.temp_file = Path(tempfile.mktemp(suffix=".json"))
        self.mgr = SettingsManager(file_path=self.temp_file)

    def tearDown(self):
        if self.temp_file.exists():
            self.temp_file.unlink()

    def test_default_values(self):
        self.assertEqual(self.mgr.get("default_distribution"), "Ubuntu")
        self.assertEqual(self.mgr.get("theme"), "dark")
        self.assertEqual(self.mgr.get("font_size"), 13)
        self.assertTrue(self.mgr.get("confirm_dangerous"))

    def test_update_and_persist(self):
        self.mgr.set("theme", "light")
        self.mgr.set("font_size", 16)

        # Reload from disk
        reloaded = SettingsManager(file_path=self.temp_file)
        self.assertEqual(reloaded.get("theme"), "light")
        self.assertEqual(reloaded.get("font_size"), 16)

    def test_reset_to_defaults(self):
        self.mgr.set("font_size", 24)
        self.mgr.reset_to_defaults()
        self.assertEqual(self.mgr.get("font_size"), DEFAULT_SETTINGS["font_size"])


if __name__ == "__main__":
    unittest.main()
