"""
Tests for Command Runner and Safety Filters.
"""

import unittest
from linwin.core.command_runner import is_dangerous_command, CommandRunner


class TestCommandRunner(unittest.TestCase):

    def test_dangerous_command_detection(self):
        # Should flag dangerous commands
        dangerous_samples = [
            ("rm -rf /", True),
            ("rm -r -f /var/log", True),
            ("sudo apt update", True),
            ("mkfs.ext4 /dev/sdb1", True),
            ("dd if=/dev/zero of=/dev/sda", True),
            ("chmod 777 file.txt", True),
            ("chmod -R 777 /var/www", True),
            (":(){ :|:& };:", True),
            ("echo test > /dev/sda", True),
        ]

        for cmd, expected in dangerous_samples:
            is_dang, reason = is_dangerous_command(cmd)
            self.assertTrue(is_dang, f"Expected '{cmd}' to be flagged as dangerous. Reason: {reason}")

        # Safe commands should pass
        safe_samples = [
            "ls -la",
            "pwd",
            "df -h",
            "git status",
            "uname -a",
            "cat /etc/os-release",
            "curl -I https://google.com",
            "python3 --version",
            "echo 'Hello World'",
        ]

        for cmd in safe_samples:
            is_dang, reason = is_dangerous_command(cmd)
            self.assertFalse(is_dang, f"Expected '{cmd}' to be safe, but flagged for: {reason}")

    def test_sync_command_execution(self):
        runner = CommandRunner()
        # Run a basic command like echo
        code, out, err, new_cwd = runner.execute_sync("echo 'LinWin Test 123'")
        self.assertEqual(code, 0)
        self.assertIn("LinWin Test 123", out)

    def test_invalid_command_handling(self):
        runner = CommandRunner()
        code, out, err, new_cwd = runner.execute_sync("non_existent_command_xyz_123")
        self.assertNotEqual(code, 0)
        self.assertTrue(len(err) > 0 or code == 127)

    def test_working_directory_cd(self):
        runner = CommandRunner()
        # Run cd to /tmp and check if directory marker is captured
        code, out, err, new_cwd = runner.execute_sync("cd /tmp")
        self.assertEqual(code, 0)
        self.assertTrue(new_cwd.endswith("/tmp") or "/tmp" in new_cwd)


if __name__ == "__main__":
    unittest.main()
