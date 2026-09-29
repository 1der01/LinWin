import React, { useState } from 'react';
import { Search, Plus, Play, ArrowDownLeft, Trash2, Bookmark, Folder, X, Check } from 'lucide-react';
import { SavedCommand } from '../types';

interface Props {
  isOpen: boolean;
  commands: SavedCommand[];
  onInsertCommand: (cmd: string) => void;
  onRunCommand: (cmd: string) => void;
  onAddCommand: (cmd: Omit<SavedCommand, 'id'>) => void;
  onDeleteCommand: (id: string) => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const CommandLibraryDrawer: React.FC<Props> = ({
  isOpen,
  commands,
  onInsertCommand,
  onRunCommand,
  onAddCommand,
  onDeleteCommand,
  onClose,
  theme,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCmd, setNewCmd] = useState('');
  const [newCategory, setNewCategory] = useState('System');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  // Extract categories
  const categories = ['All', ...Array.from(new Set(commands.map((c) => c.category)))];

  const filteredCommands = commands.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.command.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCmd.trim()) return;

    onAddCommand({
      name: newName.trim(),
      command: newCmd.trim(),
      category: newCategory.trim() || 'General',
      description: newDesc.trim(),
    });

    setNewName('');
    setNewCmd('');
    setNewDesc('');
    setIsAdding(false);
  };

  return (
    <div
      className={`w-80 md:w-96 flex flex-col border-l shrink-0 transition-all z-20 ${
        isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-semibold tracking-tight uppercase text-neutral-400">
            Command Library
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition"
            title="Add Custom Command"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Command Subform */}
      {isAdding && (
        <form onSubmit={handleSaveNew} className={`p-3 border-b ${isDark ? 'border-neutral-800 bg-neutral-950/80' : 'border-neutral-200 bg-neutral-50'}`}>
          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g. Check Listening Ports"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                  isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200 focus:border-sky-500' : 'bg-white border-neutral-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Command</label>
              <input
                type="text"
                placeholder="e.g. ss -tulpn"
                value={newCmd}
                onChange={(e) => setNewCmd(e.target.value)}
                required
                className={`w-full px-2.5 py-1.5 font-mono text-xs rounded border outline-none ${
                  isDark ? 'bg-neutral-900 border-neutral-700 text-sky-300 focus:border-sky-500' : 'bg-white border-neutral-300 text-sky-700'
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full px-2 py-1.5 text-xs rounded border outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-300'
                  }`}
                >
                  <option value="System">System</option>
                  <option value="Network">Network</option>
                  <option value="Processes">Processes</option>
                  <option value="Filesystem">Filesystem</option>
                  <option value="Development">Development</option>
                  <option value="WSL">WSL</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional note"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-300'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded transition shadow-xs"
              >
                Save Snippet
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-neutral-800">
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
          isDark ? 'bg-neutral-950 border-neutral-800 text-neutral-300' : 'bg-neutral-50 border-neutral-300 text-neutral-700'
        }`}>
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Search commands or descriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-none placeholder:text-neutral-500"
          />
        </div>

        {/* Category Pills (Interactive Filter Buttons) */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-sky-500 text-white'
                  : isDark
                  ? 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Command List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredCommands.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500">
            No commands matching &quot;{search}&quot;
          </div>
        ) : (
          filteredCommands.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border group transition ${
                isDark
                  ? 'border-neutral-800/80 bg-neutral-950/40 hover:bg-neutral-800/30 hover:border-neutral-700'
                  : 'border-neutral-200 bg-neutral-50 hover:bg-white hover:border-neutral-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-neutral-200 leading-snug">
                  {item.name}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {item.category}
                </span>
              </div>

              <div
                className={`p-2 rounded font-mono text-xs break-all mb-2 ${
                  isDark ? 'bg-neutral-950 border border-neutral-900 text-emerald-400' : 'bg-neutral-100 border border-neutral-200 text-emerald-700'
                }`}
              >
                $ {item.command}
              </div>

              {item.description && (
                <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/50">
                <button
                  onClick={() => onDeleteCommand(item.id)}
                  className="opacity-40 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition"
                  title="Remove from saved library"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onInsertCommand(item.command)}
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition ${
                      isDark
                        ? 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100'
                    }`}
                    title="Insert into terminal prompt without running"
                  >
                    <ArrowDownLeft className="w-3 h-3" />
                    Insert
                  </button>

                  <button
                    onClick={() => onRunCommand(item.command)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs"
                    title="Execute directly in current WSL distribution"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Run
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
