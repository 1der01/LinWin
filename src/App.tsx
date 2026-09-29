import React, { useState, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Moon,
  Sun,
  Settings,
  Bookmark,
  FileCode,
  BookOpen,
  Download,
  CheckCircle,
  HelpCircle,
  Cpu,
  Layers,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { TerminalWidget } from './components/TerminalWidget';
import { CommandLibraryDrawer } from './components/CommandLibraryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { DangerousConfirmationModal } from './components/DangerousConfirmationModal';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { WSLGuideModal } from './components/WSLGuideModal';
import { WSLDistro, SavedCommand, LinWinSettings, TerminalEntry } from './types';

const INITIAL_WELCOME: TerminalEntry = {
  id: 'init-welcome',
  isSystem: true,
  stdout: `LinWin v1.0.0 — Lightweight Linux Terminal for Windows (WSL)
Connected to: Ubuntu 22.04 LTS (WSL 2)
Commands execute directly inside the Linux subsystem environment.
Type any Linux command (e.g. ls, uname -a, df -h, ps, git) to begin.
Press Up/Down for command history · Use the Command Library for common recipes.
────────────────────────────────────────────────────────────────────────────`,
  timestamp: new Date().toLocaleTimeString(),
};

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Distros state
  const [distros, setDistros] = useState<WSLDistro[]>([
    { name: 'Ubuntu 22.04 LTS', isDefault: true, state: 'Running', version: 2 },
    { name: 'Debian 12', isDefault: false, state: 'Ready', version: 2 },
    { name: 'Kali Linux 2024', isDefault: false, state: 'Stopped', version: 2 },
    { name: 'Arch Linux', isDefault: false, state: 'Stopped', version: 2 },
  ]);
  const [selectedDistro, setSelectedDistro] = useState<string>('Ubuntu 22.04 LTS');

  // Terminal state
  const [entries, setEntries] = useState<TerminalEntry[]>([INITIAL_WELCOME]);
  const [currentCwd, setCurrentCwd] = useState<string>('~');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<string[]>([
    'uname -a',
    'ls -la',
    'df -h',
    'free -m',
    'pwd',
  ]);

  // Saved commands library
  const [savedCommands, setSavedCommands] = useState<SavedCommand[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(true);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSourceOpen, setIsSourceOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Dangerous confirmation modal
  const [dangerModal, setDangerModal] = useState<{
    isOpen: boolean;
    command: string;
    reason: string;
  }>({
    isOpen: false,
    command: '',
    reason: '',
  });

  // Settings
  const [settings, setSettings] = useState<LinWinSettings>({
    default_distribution: 'Ubuntu 22.04 LTS',
    theme: 'dark',
    font_size: 13,
    font_family: 'JetBrains Mono',
    history_limit: 500,
    confirm_dangerous: true,
    show_exit_codes: true,
    timeout_seconds: 120,
  });

  // Fetch initial configuration, distros, and commands
  useEffect(() => {
    // 1. Fetch distros
    fetch('/api/wsl/distros')
      .then((res) => res.json())
      .then((data: WSLDistro[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDistros(data);
          const def = data.find((d) => d.isDefault) || data[0];
          setSelectedDistro(def.name);
        }
      })
      .catch(() => {});

    // 2. Fetch saved commands
    fetch('/api/commands')
      .then((res) => res.json())
      .then((data: SavedCommand[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedCommands(data);
        }
      })
      .catch(() => {});

    // 3. Fetch history
    fetch('/api/history')
      .then((res) => res.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setHistoryList(data);
        }
      })
      .catch(() => {});

    // 4. Fetch settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: Partial<LinWinSettings>) => {
        if (data) {
          const validTheme: 'dark' | 'light' = data.theme === 'light' ? 'light' : 'dark';
          setSettings((prev) => ({
            ...prev,
            ...data,
            theme: validTheme,
          }));
          setTheme(validTheme);
        }
      })
      .catch(() => {});
  }, []);

  // Update theme styling
  const toggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updated: LinWinSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleExecuteCommand = async (cmd: string, force: boolean = false) => {
    if (!cmd.trim() || isRunning) return;

    setIsRunning(true);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          distro: selectedDistro,
          force,
        }),
      });

      const data = await response.json();

      // Check if intercepted by safety guard
      if (data.dangerous && !force && settings.confirm_dangerous) {
        setIsRunning(false);
        setDangerModal({
          isOpen: true,
          command: cmd,
          reason: data.reason || 'Destructive command signature detected',
        });
        return;
      }

      // Add to session history
      const updatedHistory = [...historyList.filter((h) => h !== cmd), cmd].slice(
        -(settings.history_limit || 500)
      );
      setHistoryList(updatedHistory);
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedHistory),
      }).catch(() => {});

      // Add entry to terminal output
      const newEntry: TerminalEntry = {
        id: `entry-${Date.now()}`,
        command: cmd,
        distro: selectedDistro,
        cwd: currentCwd,
        stdout: data.stdout,
        stderr: data.stderr,
        exitCode: data.exitCode,
        elapsedMs: data.elapsedMs,
        timestamp: new Date().toLocaleTimeString(),
      };

      setEntries((prev) => [...prev, newEntry]);

      // If cwd changed, update currentCwd
      if (data.cwd) {
        // Pretty format home dir
        let displayCwd = data.cwd;
        if (displayCwd === process.env.HOME) displayCwd = '~';
        setCurrentCwd(displayCwd);
      }
    } catch (err: any) {
      const errorEntry: TerminalEntry = {
        id: `entry-${Date.now()}`,
        command: cmd,
        distro: selectedDistro,
        cwd: currentCwd,
        stderr: `LinWin Execution Error: ${err.message}`,
        exitCode: 1,
        timestamp: new Date().toLocaleTimeString(),
      };
      setEntries((prev) => [...prev, errorEntry]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleConfirmDangerous = () => {
    const cmd = dangerModal.command;
    setDangerModal({ isOpen: false, command: '', reason: '' });
    handleExecuteCommand(cmd, true);
  };

  const handleClearTerminal = () => {
    setEntries([
      {
        id: `clear-${Date.now()}`,
        isSystem: true,
        stdout: `Terminal buffer cleared.\nReady on: ${selectedDistro} (${currentCwd})`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleSaveSettings = (newSettings: LinWinSettings) => {
    setSettings(newSettings);
    setTheme(newSettings.theme);
    if (newSettings.default_distribution) {
      setSelectedDistro(newSettings.default_distribution);
    }
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    }).catch(() => {});
  };

  const handleAddCommand = (newCmd: Omit<SavedCommand, 'id'>) => {
    const item: SavedCommand = {
      ...newCmd,
      id: `cmd-${Date.now()}`,
    };
    const updated = [...savedCommands, item];
    setSavedCommands(updated);
    fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const handleDeleteCommand = (id: string) => {
    const updated = savedCommands.filter((c) => c.id !== id);
    setSavedCommands(updated);
    fetch('/api/commands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? 'bg-[#0f1117] text-neutral-100' : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      {/* Top Application Bar (Desktop Window Style) */}
      <header
        className={`h-13 border-b flex items-center justify-between px-4 select-none shrink-0 transition-colors z-10 ${
          isDark
            ? 'bg-[#161922] border-neutral-800/80 text-neutral-200'
            : 'bg-white border-neutral-200 text-neutral-800'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/30">
              <TerminalIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-sky-400">LinWin</span>
                <span className="text-[10px] font-mono text-neutral-400 px-1 py-0.2 rounded bg-neutral-800/50">
                  WSL Bridge
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 hidden sm:block">
                Linux Subprocess Runner for Windows
              </p>
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="h-5 w-px bg-neutral-800 mx-1 hidden md:block" />

          {/* Active Status Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-neutral-300">WSL2 Subsystem Ready</span>
          </div>
        </div>

        {/* Center / Controls: Distribution Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-400 hidden sm:inline">
            Distro:
          </label>
          <div className="relative">
            <select
              value={selectedDistro}
              onChange={(e) => setSelectedDistro(e.target.value)}
              className={`appearance-none text-xs font-mono font-medium pl-3 pr-8 py-1.5 rounded-lg border outline-none cursor-pointer transition ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:border-sky-500 focus:border-sky-500'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-900 hover:border-sky-500 focus:border-sky-500'
              }`}
            >
              {distros.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} (WSL {d.version})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* WSL Guide Modal Button */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title="WSL Installation & Diagnostics Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">WSL Guide</span>
          </button>

          {/* Python Code Viewer Button */}
          <button
            onClick={() => setIsSourceOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title="Inspect Python / PySide6 Source Code"
          >
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Python Source</span>
          </button>

          {/* Command Library Drawer Toggle */}
          <button
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              isLibraryOpen
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                : isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title="Toggle Command Library"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Commands</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title="LinWin Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* Terminal Core Widget */}
        <TerminalWidget
          entries={entries}
          currentCwd={currentCwd}
          activeDistro={selectedDistro}
          isRunning={isRunning}
          onRunCommand={(cmd) => handleExecuteCommand(cmd, false)}
          onClearTerminal={handleClearTerminal}
          settings={settings}
          theme={theme}
          historyList={historyList}
        />

        {/* Command Library Drawer */}
        <CommandLibraryDrawer
          isOpen={isLibraryOpen}
          commands={savedCommands}
          onInsertCommand={(cmd) => handleExecuteCommand(cmd, false)}
          onRunCommand={(cmd) => handleExecuteCommand(cmd, false)}
          onAddCommand={handleAddCommand}
          onDeleteCommand={handleDeleteCommand}
          onClose={() => setIsLibraryOpen(false)}
          theme={theme}
        />
      </main>

      {/* Bottom Status Bar */}
      <footer
        className={`h-7 border-t px-4 flex items-center justify-between text-[11px] font-mono select-none shrink-0 ${
          isDark
            ? 'bg-[#12151e] border-neutral-800/80 text-neutral-400'
            : 'bg-neutral-200/70 border-neutral-300 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-neutral-300 font-medium">{selectedDistro}</span>
          </span>
          <span className="text-neutral-500">·</span>
          <span>CWD: {currentCwd}</span>
          <span className="text-neutral-500 hidden sm:inline">·</span>
          <span className="hidden sm:inline">History: {historyList.length} items</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/download/zip"
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition"
          >
            <Download className="w-3 h-3" />
            <span>Download Python Source (.zip)</span>
          </a>
          <span className="text-neutral-500">·</span>
          <span>LinWin v1.0.0</span>
        </div>
      </footer>

      {/* Modals */}
      <DangerousConfirmationModal
        isOpen={dangerModal.isOpen}
        command={dangerModal.command}
        reason={dangerModal.reason}
        distro={selectedDistro}
        onConfirm={handleConfirmDangerous}
        onCancel={() => setDangerModal({ isOpen: false, command: '', reason: '' })}
        theme={theme}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        distros={distros}
        onSave={handleSaveSettings}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
      />

      <SourceCodeViewer
        isOpen={isSourceOpen}
        onClose={() => setIsSourceOpen(false)}
        theme={theme}
      />

      <WSLGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        theme={theme}
      />
    </div>
  );
}
