"""
Tests for WSL Manager detection and distribution parsing.
"""

import unittest
from linwin.core.wsl_manager import WSLManager, WSLDistro


class TestWSLManager(unittest.TestCase):

    def test_distro_parsing(self):
        manager = WSLManager()

        sample_wsl_output = """
  NAME                   STATE           VERSION
* Ubuntu                 Running         2
  Debian                 Stopped         2
  docker-desktop-data    Running         2
  Kali-Linux             Stopped         1
"""
        distros = manager._parse_distro_list(sample_wsl_output)

        self.assertEqual(len(distros), 4)

        # Check default Ubuntu
        ubuntu = distros[0]
        self.assertEqual(ubuntu.name, "Ubuntu")
        self.assertTrue(ubuntu.is_default)
        self.assertEqual(ubuntu.state, "Running")
        self.assertEqual(ubuntu.version, 2)

        # Check Debian
        debian = distros[1]
        self.assertEqual(debian.name, "Debian")
        self.assertFalse(debian.is_default)
        self.assertEqual(debian.state, "Stopped")

        # Check Kali
        kali = distros[3]
        self.assertEqual(kali.name, "Kali-Linux")
        self.assertEqual(kali.version, 1)

    def test_decode_utf16_and_utf8(self):
        manager = WSLManager()

        # Test UTF-8 bytes
        utf8_data = "Ubuntu Running 2".encode("utf-8")
        self.assertEqual(manager._decode_output(utf8_data), "Ubuntu Running 2")

        # Test UTF-16LE bytes with null bytes common in Windows
        utf16_data = "Ubuntu Running 2".encode("utf-16le")
        self.assertEqual(manager._decode_output(utf16_data), "Ubuntu Running 2")

    def test_fallback_distros(self):
        manager = WSLManager(override_executable="non_existent_wsl_exe")
        distros = manager.list_distributions()
        self.assertTrue(len(distros) > 0)
        self.assertTrue(any(d.name in ["Ubuntu", "Debian"] for d in distros))


if __name__ == "__main__":
    unittest.main()
