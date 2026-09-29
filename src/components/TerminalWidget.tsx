import React, { useRef, useEffect, useState } from 'react';
import { Play, Square, Copy, Trash2, Check, CornerDownLeft, Loader2, Folder, Terminal as TerminalIcon } from 'lucide-react';
import { TerminalEntry, LinWinSettings } from '../types';

interface Props {
  entries: TerminalEntry[];
  currentCwd: string;
  activeDistro: string;
  isRunning: boolean;
  onRunCommand: (cmd: string) => void;
  onClearTerminal: () => void;
  settings: LinWinSettings;
  theme: 'dark' | 'light';
  historyList: string[];
}

export const TerminalWidget: React.FC<Props> = ({
  entries,
  currentCwd,
  activeDistro,
  isRunning,
  onRunCommand,
  onClearTerminal,
  settings,
  theme,
  historyList,
}) => {
  const [inputCommand, setInputCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [tempDraft, setTempDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Auto scroll to bottom whenever new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isRunning]);

  // Focus input automatically
  useEffect(() => {
    if (!isRunning) {
      inputRef.current?.focus();
    }
  }, [isRunning]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isRunning) return;

    onRunCommand(inputCommand.trim());
    setInputCommand('');
    setHistoryIndex(-1);
    setTempDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length === 0) return;

      if (historyIndex === -1) {
        setTempDraft(inputCommand);
        const newIdx = historyList.length - 1;
        setHistoryIndex(newIdx);
        setInputCommand(historyList[newIdx]);
      } else if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        setInputCommand(historyList[newIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;

      if (historyIndex < historyList.length - 1) {
        const newIdx = historyIndex + 1;
        setHistoryIndex(newIdx);
        setInputCommand(historyList[newIdx]);
      } else {
        setHistoryIndex(-1);
        setInputCommand(tempDraft);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onClearTerminal();
    }
  };

  const handleCopyBuffer = () => {
    const textBuffer = entries
      .map((entry) => {
        if (entry.isSystem) return entry.stdout;
        const prompt = `user@${entry.distro?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'linwin'}:${entry.cwd || '~'}$ ${entry.command}\n`;
        const out = entry.stdout ? entry.stdout : '';
        const err = entry.stderr ? `[stderr] ${entry.stderr}` : '';
        const exit = entry.exitCode !== undefined ? `[Exit Code: ${entry.exitCode}]\n` : '';
        return `${prompt}${out}${err}${exit}`;
      })
      .join('\n');

    navigator.clipboard.writeText(textBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDistroUser = () => {
    const cleanDistro = activeDistro.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `user@${cleanDistro}`;
  };

  const fontSizeClass = {
    fontFamily: settings.font_family || 'JetBrains Mono, Consolas, monospace',
    fontSize: `${settings.font_size || 13}px`,
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-3 md:p-4">
      {/* Terminal Display Panel */}
      <div
        className={`flex-1 rounded-xl border flex flex-col overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0b0d13] border-neutral-800 shadow-inner'
            : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        {/* Terminal Header / Action Bar */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-b select-none text-xs ${
            isDark ? 'border-neutral-800/80 bg-neutral-900/40 text-neutral-400' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}
        >
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-neutral-500">Working Directory:</span>
            <span className={`font-semibold ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              {currentCwd}
            </span>
            <span className="text-neutral-500">[{activeDistro}]</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyBuffer}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition border ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
              }`}
              title="Copy terminal buffer to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Buffer'}</span>
            </button>

            <button
              onClick={onClearTerminal}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition border ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
              }`}
              title="Clear terminal buffer (Ctrl+L)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Scrollable Terminal Output Buffer */}
        <div
          ref={scrollRef}
          style={fontSizeClass}
          className={`flex-1 overflow-y-auto p-4 md:p-5 font-mono leading-relaxed select-text space-y-3 ${
            isDark ? 'text-neutral-200 selection:bg-sky-900 selection:text-white' : 'text-neutral-900 selection:bg-sky-200'
          }`}
        >
          {entries.map((entry) => {
            if (entry.isSystem) {
              return (
                <div key={entry.id} className="text-neutral-400 text-xs whitespace-pre-wrap leading-relaxed">
                  {entry.stdout}
                </div>
              );
            }

            const promptDistro = (entry.distro || activeDistro).toLowerCase().replace(/[^a-z0-9]/g, '');

            return (
              <div key={entry.id} className="space-y-1">
                {/* Command Line with Prompt */}
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-semibold select-none shrink-0">
                    user@{promptDistro}:{entry.cwd || '~'}$
                  </span>
                  <span className="font-semibold text-sky-400 break-all">{entry.command}</span>
                </div>

                {/* Standard Output */}
                {entry.stdout && (
                  <pre className="whitespace-pre-wrap break-all text-neutral-300 pl-4 py-0.5 font-mono">
                    {entry.stdout}
                  </pre>
                )}

                {/* Standard Error */}
                {entry.stderr && (
                  <pre className="whitespace-pre-wrap break-all text-rose-400 bg-rose-500/10 border-l-2 border-rose-500 pl-3 py-1 font-mono text-xs">
                    {entry.stderr}
                  </pre>
                )}

                {/* Exit Code & Execution Duration Banner */}
                {settings.show_exit_codes !== false && entry.exitCode !== undefined && (
                  <div className="pl-4 pt-0.5 flex items-center gap-2 text-[11px] text-neutral-500 select-none">
                    <span
                      className={`font-mono font-medium ${
                        entry.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      [{entry.exitCode === 0 ? 'SUCCESS' : `FAILED (Exit ${entry.exitCode})`} ·{' '}
                      {entry.elapsedMs !== undefined ? `${(entry.elapsedMs / 1000).toFixed(2)}s` : '0.01s'}]
                    </span>
                    <span>·</span>
                    <span>{entry.timestamp}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Running indicator */}
          {isRunning && (
            <div className="flex items-center gap-2 text-sky-400 text-xs pl-4 pt-1 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Executing command in {activeDistro}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Command Input Area */}
      <form onSubmit={handleSubmit} className="mt-3">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 focus-within:border-sky-500/70 shadow-lg'
              : 'bg-white border-neutral-300 focus-within:border-sky-500 shadow-sm'
          }`}
        >
          {/* Linux Prompt Indicator */}
          <div className="flex items-center gap-1 font-mono text-xs font-semibold text-emerald-500 shrink-0 select-none">
            <span>{formatDistroUser()}:{currentCwd}$</span>
          </div>

          {/* Large Command Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder={
              isRunning
                ? 'Command is executing...'
                : 'Type Linux command (e.g. ls -la, df -h, uname -a, git status)...'
            }
            style={fontSizeClass}
            className={`flex-1 bg-transparent border-none outline-none font-mono ${
              isDark ? 'text-white placeholder:text-neutral-500' : 'text-neutral-900 placeholder:text-neutral-400'
            }`}
          />

          {/* Run Button */}
          <button
            type="submit"
            disabled={isRunning || !inputCommand.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white transition shadow-sm shrink-0"
            title="Execute command (Enter)"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run</span>
                <span className="text-[10px] text-sky-200 hidden sm:inline">(↵)</span>
              </>
            )}
          </button>
        </div>

        {/* Input Footer Shortcuts Hint */}
        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-neutral-500 select-none">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">↓</kbd> History</span>
            <span><kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">Enter</kbd> Run</span>
            <span><kbd className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">Ctrl+L</kbd> Clear</span>
          </div>
          <span className="hidden sm:inline">Linux Subprocess Execution</span>
        </div>
      </form>
    </div>
  );
};
