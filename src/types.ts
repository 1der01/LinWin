export interface WSLDistro {
  name: string;
  isDefault: boolean;
  state: 'Running' | 'Stopped' | 'Ready';
  version: number;
}

export interface SavedCommand {
  id: string;
  name: string;
  command: string;
  category: string;
  description?: string;
}

export interface LinWinSettings {
  default_distribution: string;
  theme: 'dark' | 'light';
  font_size: number;
  font_family: string;
  history_limit: number;
  confirm_dangerous: boolean;
  show_exit_codes?: boolean;
  timeout_seconds?: number;
}

export interface TerminalEntry {
  id: string;
  command?: string;
  distro?: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  elapsedMs?: number;
  timestamp: string;
  isSystem?: boolean;
}

export interface SourceFile {
  path: string;
  relativePath: string;
  content: string;
  size: number;
}
