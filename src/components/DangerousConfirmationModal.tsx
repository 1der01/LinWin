import React from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  command: string;
  reason: string;
  distro: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: 'dark' | 'light';
}

export const DangerousConfirmationModal: React.FC<Props> = ({
  isOpen,
  command,
  reason,
  distro,
  onConfirm,
  onCancel,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl transition-all overflow-hidden ${
          isDark
            ? 'bg-neutral-900 border-red-500/40 text-neutral-100 shadow-red-950/20'
            : 'bg-white border-red-200 text-neutral-900 shadow-red-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 bg-red-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-500 tracking-tight">
                Dangerous Command Detected
              </h3>
              <p className="text-xs text-neutral-400">LinWin Safety Guard Interception</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-200">Security Warning:</p>
              <p className="mt-0.5 text-neutral-300">{reason}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Target Command:
            </label>
            <div className="p-3 rounded-lg font-mono text-xs bg-neutral-950 border border-neutral-800 text-red-400 break-all select-all">
              $ {command}
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Executing this command in <span className="font-semibold text-neutral-200">{distro}</span> may
            irreversibly modify files, reformat partitions, or alter critical Linux system configurations.
            Are you certain you wish to proceed?
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex items-center justify-end gap-2.5 px-5 py-3.5 border-t ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-100 bg-neutral-50'
          }`}
        >
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-xs font-medium rounded-lg border transition ${
              isDark
                ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            Cancel Execution
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition shadow-sm shadow-red-900/40"
          >
            I Understand, Run Command
          </button>
        </div>
      </div>
    </div>
  );
};
