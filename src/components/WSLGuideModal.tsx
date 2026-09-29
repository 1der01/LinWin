import React from 'react';
import { X, BookOpen, Terminal, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const WSLGuideModal: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const copySnippet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: '1. Install WSL & Default Ubuntu on Windows',
      description: 'Open PowerShell as Administrator on Windows 10/11 and run:',
      cmd: 'wsl --install',
    },
    {
      title: '2. Verify Installed Distributions & WSL Version',
      description: 'Check that WSL 2 is the default architecture:',
      cmd: 'wsl --list --verbose',
    },
    {
      title: '3. Install Specific Distributions (Optional)',
      description: 'You can install Debian, Kali Linux, or openSUSE alongside Ubuntu:',
      cmd: 'wsl --install -d Debian\nwsl --install -d kali-linux',
    },
    {
      title: '4. Run LinWin (Desktop GUI or Instant CLI Mode)',
      description: 'Run the full PySide6 GUI window or instant zero-dependency CLI terminal:',
      cmd: '# Option A: Full Desktop GUI (requires PySide6)\npip install PySide6\npython main.py\n\n# Option B: Instant CLI Terminal (Zero external dependencies needed)\npython main.py --cli\n\n# Option C: System Diagnostic Check\npython main.py --diagnostics',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                WSL Setup Guide & LinWin Deployment
              </h2>
              <p className="text-[11px] text-neutral-400">
                Prerequisites and steps for Windows Subsystem for Linux
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="p-3.5 rounded-lg border border-sky-500/20 bg-sky-500/5 text-sky-300 text-xs flex items-start gap-3">
            <Terminal className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-sky-200">How LinWin Works:</span> LinWin does not emulate Linux or mock commands. It communicates with <code className="font-mono text-white">wsl.exe</code> using Python&apos;s <code className="font-mono text-white">subprocess</code> engine, piping genuine Linux outputs directly into the PySide6 Material terminal.
            </div>
          </div>

          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-neutral-800 bg-neutral-950/50' : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-semibold text-neutral-200">{step.title}</h4>
                  <button
                    onClick={() => copySnippet(step.cmd, idx)}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-sky-400 transition"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mb-2">{step.description}</p>
                <div className="p-2.5 rounded font-mono text-xs bg-neutral-950 border border-neutral-800 text-emerald-400 whitespace-pre overflow-x-auto">
                  {step.cmd}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950/80 text-xs space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-300">
              <AlertCircle className="w-4 h-4" />
              <span>Troubleshooting: Virtualization Not Enabled</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              If <code className="text-neutral-200">wsl --install</code> throws an error regarding virtualization, enter your computer&apos;s UEFI/BIOS settings during reboot and verify that <strong>Intel VT-x</strong> or <strong>AMD SVM</strong> is toggled to Enabled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end px-6 py-3 border-t ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
