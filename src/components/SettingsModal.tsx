import React, { useState } from 'react';
import { X, Sliders, Shield, Terminal, Palette, RotateCcw, Check } from 'lucide-react';
import { LinWinSettings, WSLDistro } from '../types';

interface Props {
  isOpen: boolean;
  settings: LinWinSettings;
  distros: WSLDistro[];
  onSave: (newSettings: LinWinSettings) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  settings,
  distros,
  onSave,
  onClose,
  theme,
}) => {
  const [formData, setFormData] = useState<LinWinSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'safety'>('general');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleSave = () => {
    onSave(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleReset = () => {
    setFormData({
      default_distribution: 'Ubuntu',
      theme: 'dark',
      font_size: 13,
      font_family: 'Consolas',
      history_limit: 500,
      confirm_dangerous: true,
      show_exit_codes: true,
      timeout_seconds: 120,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">LinWin Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          className={`flex items-center gap-2 px-6 pt-3 border-b text-xs ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 pb-2.5 font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            WSL & Environment
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 pb-2.5 font-medium border-b-2 transition ${
              activeTab === 'appearance'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Appearance & Font
          </button>
          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-1.5 pb-2.5 font-medium border-b-2 transition ${
              activeTab === 'safety'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Safety & History
          </button>
        </div>

        {/* Tab body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Default WSL Distribution
                </label>
                <select
                  value={formData.default_distribution}
                  onChange={(e) =>
                    setFormData({ ...formData, default_distribution: e.target.value })
                  }
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none transition ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-sky-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                  }`}
                >
                  {distros.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} (WSL {d.version})
                    </option>
                  ))}
                  {!distros.some((d) => d.name === formData.default_distribution) && (
                    <option value={formData.default_distribution}>
                      {formData.default_distribution}
                    </option>
                  )}
                </select>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Commands will launch inside this environment when LinWin opens.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Execution Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={formData.timeout_seconds || 120}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timeout_seconds: parseInt(e.target.value, 10) || 120,
                    })
                  }
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none transition ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-sky-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                  }`}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Maximum execution window before an unresponsive command is terminated.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Color Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'dark' })}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition ${
                      formData.theme === 'dark'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                        : isDark
                        ? 'border-neutral-800 bg-neutral-950 text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-medium">Dark Theme</span>
                      <span className="text-[10px] text-neutral-500">Material Charcoal #0f1117</span>
                    </div>
                    {formData.theme === 'dark' && <Check className="w-4 h-4 text-sky-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: 'light' })}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition ${
                      formData.theme === 'light'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                        : isDark
                        ? 'border-neutral-800 bg-neutral-950 text-neutral-400'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <div>
                      <span className="block text-xs font-medium">Light Theme</span>
                      <span className="text-[10px] text-neutral-500">High Contrast Slate</span>
                    </div>
                    {formData.theme === 'light' && <Check className="w-4 h-4 text-sky-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Terminal Font Family
                </label>
                <select
                  value={formData.font_family}
                  onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none transition font-mono ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-sky-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                  }`}
                >
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Consolas">Consolas</option>
                  <option value="Cascadia Code">Cascadia Code</option>
                  <option value="Courier New">Courier New</option>
                  <option value="monospace">Standard Monospace</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-neutral-400">Terminal Font Size</label>
                  <span className="text-xs font-mono text-sky-400">{formData.font_size} px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="22"
                  value={formData.font_size}
                  onChange={(e) =>
                    setFormData({ ...formData, font_size: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-4">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  isDark ? 'border-neutral-800 hover:bg-neutral-800/40' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.confirm_dangerous}
                  onChange={(e) =>
                    setFormData({ ...formData, confirm_dangerous: e.target.checked })
                  }
                  className="mt-0.5 rounded accent-sky-500 cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-medium text-neutral-200">
                    Confirm Destructive Commands
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Prompt a confirmation modal before running dangerous operations like{' '}
                    <code className="text-red-400">rm -rf</code>, <code className="text-red-400">sudo</code>,{' '}
                    <code className="text-red-400">mkfs</code>, and <code className="text-red-400">dd</code>.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  isDark ? 'border-neutral-800 hover:bg-neutral-800/40' : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.show_exit_codes ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, show_exit_codes: e.target.checked })
                  }
                  className="mt-0.5 rounded accent-sky-500 cursor-pointer"
                />
                <div>
                  <span className="block text-xs font-medium text-neutral-200">
                    Show Process Exit Codes and Timers
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Print execution completion benchmarks (e.g. <code className="text-emerald-400">[SUCCESS · 0.05s]</code>) after commands.
                  </span>
                </div>
              </label>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Command History Limit (Buffer Size)
                </label>
                <input
                  type="number"
                  min="50"
                  max="2000"
                  step="50"
                  value={formData.history_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, history_limit: parseInt(e.target.value, 10) || 500 })
                  }
                  className={`w-full px-3 py-2 text-xs rounded-lg border outline-none transition ${
                    isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-200 focus:border-sky-500'
                      : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-sky-500'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-t ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition ${
                isDark
                  ? 'border-neutral-800 bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm shadow-sky-900/40"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
