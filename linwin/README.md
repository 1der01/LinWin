# LinWin — Lightweight Linux Terminal for Windows (WSL)

LinWin is a clean, modern desktop application that bridges Windows and Linux. It allows developers, sysadmins, and students to execute genuine Linux commands seamlessly through the Windows Subsystem for Linux (WSL) without needing to manually launch the standard WSL terminal or PowerShell prompt.

LinWin is **not** an emulator and does not mock Linux commands. Instead, it delegates commands directly to your installed WSL Linux distributions (Ubuntu, Debian, Kali Linux, Arch, etc.) and presents their output in a responsive, Material Design-inspired interface.

---

## Features

- **Subsystem Auto-Detection**: Automatically detects your Windows WSL installation, active WSL version (WSL 1 vs WSL 2), and lists all registered Linux distributions.
- **Distribution Switcher**: Switch dynamically between multiple installed distributions (e.g., Ubuntu, Debian, Kali Linux) directly from the top app bar.
- **Asynchronous Command Execution**: Long-running commands execute in background threads (`QThread` / `subprocess.Popen`) with real-time streaming output, preventing UI freezing.
- **Dynamic Working Directory Tracking**: Tracks directory changes (`cd /var/log`, `cd ~/projects`) and reflects the current working directory in the Linux prompt.
- **Safety Interceptor**: Automatically scans input for destructive commands (`rm -rf`, `sudo`, `mkfs`, `dd`, `chmod 777`) and displays a confirmation dialog before execution.
- **Command History**: Navigate previous commands with <kbd>↑</kbd> and <kbd>↓</kbd> arrow keys, with persistent disk storage across sessions.
- **Built-in Command Library**: Curated, categorized Linux command snippets (System, Network, Processes, Git, Filesystem) with 1-click execution or insertion.
- **Theme Support**: Minimalist Material dark theme by default, with an optional high-contrast light theme.
- **Buffer Management**: Quick copy to clipboard, buffer clearing, exit code reporting, and execution time measurement.

---

## Screenshots

```
┌────────────────────────────────────────────────────────────────────────┐
│ LinWin  WSL Bridge    Distro: [ Ubuntu (WSL 2) ▾ ]  [Theme] [Commands] │
├──────────────────────────────────────────────────────┬─────────────────┤
│ user@ubuntu:~$ uname -a                              │ Command Library │
│ Linux desktop 5.15.153.1-microsoft-standard-WSL2     │ Search...       │
│                                                      │ ─────────────── │
│ user@ubuntu:~$ df -h                                 │ Check Disk Space│
│ Filesystem      Size  Used Avail Use% Mounted on     │ $ df -h         │
│ /dev/sdb        251G   24G  215G  10% /              │                 │
│ /dev/sda        251G  1.2G  238G   1% /mnt/wslg      │ Active Ports    │
│ C:\             953G  410G  543G  44% /mnt/c         │ $ ss -tulpn     │
│ [SUCCESS · 0.08s]                                    │                 │
│                                                      │ Top RAM Usage   │
│ Dir: ~  [Ubuntu]                     [Copy] [Clear]  │ $ ps aux --sort │
├──────────────────────────────────────────────────────┴─────────────────┤
│ user@ubuntu:~$ git status                                       [Run]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

- **Python 3.8+**: Application logic, thread handling, and orchestration.
- **PySide6 (Qt for Python)**: Native cross-platform desktop UI framework adhering to Material Design principles.
- **subprocess & QThread**: Asynchronous process spawning, I/O streaming, signal handling, and timeout enforcement.
- **Windows Subsystem for Linux (WSL)**: True Linux kernel environment executing commands natively.
- **pathlib**: Platform-independent path resolution and data directory handling.
- **JSON**: Persistent storage for user settings, command history, and saved snippet libraries.

---

## How LinWin Works

1. **Subsystem Discovery**: LinWin queries the Windows WSL subsystem via `wsl.exe -l -v` and `wsl.exe --status`, parsing distributions, default markers, and running states while gracefully handling Windows UTF-16LE encoding.
2. **Command Dispatch**: When a command is triggered, LinWin constructs the execution vector:
   ```cmd
   wsl.exe -d <distro_name> --cd <current_directory> -- bash -c "<user_command>"
   ```
3. **Stream Pipeline**: Standard output (`stdout`) and standard error (`stderr`) are piped asynchronously into the terminal widget buffer line-by-line.
4. **State Persistence**: A sentinel payload captures the updated Linux working directory (`pwd`) and process exit code upon completion.

---

## WSL Requirements

To use LinWin on Windows, you must have Windows Subsystem for Linux enabled with at least one Linux distribution:

1. Open PowerShell as **Administrator**.
2. Run the command:
   ```powershell
   wsl --install
   ```
3. Restart your computer if prompted.
4. Open the installed distribution (e.g., Ubuntu) once from the Start menu to set up your username and password.
5. Verify WSL installation by running:
   ```powershell
   wsl --list --verbose
   ```

---

## Installation Instructions

1. Clone or download the LinWin project repository:
   ```bash
   git clone https://github.com/your-username/linwin.git
   cd linwin
   ```

2. Create and activate a Python virtual environment (recommended):
   ```bash
   # Windows (Command Prompt / PowerShell)
   python -m venv venv
   .\venv\Scripts\activate

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## Running the Application

### Launch Desktop GUI
```bash
# Requires PySide6 installed (pip install PySide6)
python main.py
```

### Launch Interactive CLI Terminal (Zero Dependencies)
If you don't have PySide6 installed or are in a headless environment, you can run LinWin directly in your terminal:
```bash
python main.py --cli
```

### Run Diagnostic Check (CLI)
To quickly check your WSL status, available distributions, and environment without launching the UI:
```bash
python main.py --diagnostics
```

---

## Supported Functionality

LinWin supports executing standard Linux utilities, scripts, and commands:
- **Filesystem & Navigation**: `ls`, `pwd`, `cd`, `mkdir`, `rm`, `cp`, `mv`, `cat`, `grep`, `find`, `chmod`
- **System Monitoring**: `ps`, `top`, `htop`, `df`, `du`, `free`, `uptime`, `uname`
- **Networking**: `ip`, `ping`, `curl`, `wget`, `ss`, `netstat`, `traceroute`
- **Development Tools**: `git`, `python3`, `node`, `gcc`, `make`, `docker` (if Docker Desktop or WSL integration is configured)

---

## Safety Considerations

LinWin is designed with strict safety boundaries:
1. **Interactive Safeguard**: Commands containing destructive signatures (`rm -rf`, `sudo`, `mkfs`, `dd`, `chmod 777`, fork bombs) trigger an explicit confirmation dialog detailing the danger before executing.
2. **Non-Elevated Privilege**: LinWin runs with normal user privileges and respects Linux file permissions (`read`, `write`, `execute`).
3. **Subprocess Isolation**: Commands are confined to the WSL virtual machine without direct modifications to the Windows system registry or bootloader.

---

## Project Structure

```
linwin/
├── main.py                  # Application entry point & CLI diagnostics
├── ui/
│   ├── __init__.py
│   ├── main_window.py       # Main window layout, app bar & stylesheets
│   ├── terminal_widget.py   # Terminal output, input line & history bindings
│   ├── settings_dialog.py   # Configuration preferences modal
│   └── command_library.py   # Saved commands panel & editor
├── core/
│   ├── __init__.py
│   ├── wsl_manager.py       # WSL detection, version querying & distro parsing
│   ├── command_runner.py    # Subprocess execution, streaming & safety checks
│   ├── command_history.py   # Arrow key navigation & disk persistence
│   └── settings_manager.py  # JSON settings loader & validator
├── assets/                  # Icons and visual assets
├── data/
│   ├── settings.json        # User preferences (fonts, theme, defaults)
│   ├── commands.json        # Curated library of Linux commands
│   └── history.json         # Session history file
├── tests/                   # Automated unit tests
├── requirements.txt         # Python package dependencies
└── README.md                # Documentation & usage guide
```

---

## Future Improvements

- **Multiple Terminal Tabs**: Run simultaneous terminal tabs across different WSL distributions or working directories.
- **Integrated File Browser**: Visual explorer for navigating the WSL Linux filesystem with drag-and-drop file transfers between Windows and Linux.
- **Process Manager**: Real-time task manager listing active Linux processes with CPU/memory percentages and kill signals.
- **System Information Panel**: Graphical live gauges for CPU load, RAM allocation, and virtual disk usage in WSL2.
- **SSH Connection Support**: Connect to remote Linux servers and cloud instances alongside local WSL distros.
- **Command Autocomplete**: Intelligent auto-completion for Linux commands, flags, and path completion.
- **Searchable Terminal History**: Fuzzy search overlay (`Ctrl+R`) to quickly find and re-run past commands.
