import React, { useState, useEffect } from 'react';
import { FileCode, Download, Copy, Check, Folder, ChevronRight, FileText, Cpu, Eye, ExternalLink } from 'lucide-react';
import { SourceFile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export const SourceCodeViewer: React.FC<Props> = ({ isOpen, onClose, theme }) => {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen && files.length === 0) {
      setLoading(true);
      fetch('/api/source/files')
        .then((res) => res.json())
        .then((data: SourceFile[]) => {
          setFiles(data);
          // Default to main.py or README.md
          const mainFile = data.find((f) => f.relativePath === 'main.py') || data[0];
          setSelectedFile(mainFile || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, files.length]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = () => {
    window.location.href = '/api/download/zip';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-5xl h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-b ${
            isDark ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                LinWin Python Architecture & Source Code
              </h2>
              <p className="text-[11px] text-neutral-400">
                PySide6 Desktop Application · Clean modular structure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-sm shadow-sky-900/40"
              title="Download full LinWin source code as ZIP"
            >
              <Download className="w-3.5 h-3.5" />
              Download linwin.zip
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body Splitter */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Sidebar */}
          <div
            className={`w-64 border-r flex flex-col shrink-0 ${
              isDark ? 'border-neutral-800 bg-neutral-950/40' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <div className="p-3 border-b border-neutral-800/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Project Files ({files.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loading ? (
                <div className="p-4 text-xs text-neutral-500">Loading codebase...</div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFile?.relativePath === file.relativePath;
                  return (
                    <button
                      key={file.relativePath}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-left font-mono transition ${
                        isSelected
                          ? 'bg-sky-500/10 text-sky-400 font-medium'
                          : isDark
                          ? 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      {file.relativePath.endsWith('.py') ? (
                        <FileCode className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      )}
                      <span className="truncate">{file.relativePath}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
            {selectedFile ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60">
                  <div className="flex items-center gap-2 font-mono text-xs text-neutral-300">
                    <span className="text-neutral-500">linwin/</span>
                    <span className="text-sky-400 font-medium">{selectedFile.relativePath}</span>
                    <span className="text-neutral-600 text-[11px]">
                      · {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.content.split('\n').length} lines
                    </span>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition border border-neutral-700"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-neutral-300 selection:bg-sky-900 selection:text-white">
                  <pre className="whitespace-pre">
                    {selectedFile.content.split('\n').map((line, index) => (
                      <div key={index} className="table-row">
                        <span className="table-cell pr-4 text-right select-none text-neutral-600 text-[11px]">
                          {index + 1}
                        </span>
                        <span className="table-cell whitespace-pre">{line}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-neutral-500">
                Select a file from the tree to view its contents.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
