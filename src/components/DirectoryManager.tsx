import React, { useState } from 'react';
import { Folder, FolderPlus, Trash2, CheckCircle2, XCircle, RefreshCw, Layers, Film, Tv, ShieldAlert } from 'lucide-react';
import { DirectoryConfig } from '../types';

interface DirectoryManagerProps {
  directories: DirectoryConfig[];
  onAddDirectory: (dir: Omit<DirectoryConfig, 'id'>) => void;
  onRemoveDirectory: (id: string) => void;
  onToggleDirectory: (id: string) => void;
  onScanDirectory: (id: string) => void;
  isScanning: boolean;
}

export const DirectoryManager: React.FC<DirectoryManagerProps> = ({
  directories,
  onAddDirectory,
  onRemoveDirectory,
  onToggleDirectory,
  onScanDirectory,
  isScanning,
}) => {
  const [newPath, setNewPath] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'auto'>('auto');
  const [recursive, setRecursive] = useState(true);

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    exists?: boolean;
    isDirectory?: boolean;
    fileCount?: number;
    error?: string;
    loading?: boolean;
  }>({ tested: false });

  const handleTestPath = async (path: string) => {
    if (!path.trim()) return;
    setTestResult({ tested: true, loading: true });
    try {
      const res = await fetch('/api/directories/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
      const data = await res.json();
      setTestResult({
        tested: true,
        loading: false,
        exists: data.exists,
        isDirectory: data.isDirectory,
        fileCount: data.fileCount,
        error: data.error,
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        loading: false,
        exists: false,
        error: err.message || 'Failed to verify directory',
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;

    const label = newLabel.trim() || newPath.split('/').pop() || 'Media Folder';
    onAddDirectory({
      path: newPath.trim(),
      label,
      mediaType,
      recursive,
      enabled: true,
    });

    setNewPath('');
    setNewLabel('');
    setTestResult({ tested: false });
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 text-slate-200 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Folder className="w-5 h-5 text-indigo-400" />
              Ubuntu Media Library Directories
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
              Specify absolute storage paths on your Ubuntu 26.04 machine.
              When new movie or TV show files land in these directories, codec analysis is triggered and alerts are pushed to ntfy.
            </p>
          </div>
        </div>

        {/* Add Directory Form */}
        <form onSubmit={handleAddSubmit} className="mt-6 bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2 font-mono">
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            Add Monitored Folder Path
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">
                Ubuntu Path
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="/media/movies or /mnt/storage/jellyfin/tv"
                  value={newPath}
                  onChange={(e) => {
                    setNewPath(e.target.value);
                    setTestResult({ tested: false });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs rounded px-3 py-2 font-mono outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleTestPath(newPath)}
                  disabled={!newPath.trim() || testResult.loading}
                  className="absolute right-1.5 top-1.5 px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded font-mono font-medium transition cursor-pointer"
                >
                  {testResult.loading ? 'Testing...' : 'Verify Path'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Display Label</label>
              <input
                type="text"
                placeholder="e.g. 4K Movies"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs rounded px-3 py-2 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Media Category</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-slate-100 text-xs rounded px-3 py-2 outline-none font-mono"
              >
                <option value="auto">Auto Detect (Movies & TV)</option>
                <option value="movie">Movies Library</option>
                <option value="tv">TV Shows Library</option>
              </select>
            </div>
          </div>

          {/* Test Path Feedback */}
          {testResult.tested && (
            <div className={`text-xs p-2.5 rounded border font-mono flex items-center gap-2 ${
              testResult.exists
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              {testResult.exists ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified directory! Found <strong>{testResult.fileCount ?? 0}</strong> media file(s).</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Path status: {testResult.error || 'Folder pending creation on host.'}</span>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer font-mono">
              <input
                type="checkbox"
                checked={recursive}
                onChange={(e) => setRecursive(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Scan subfolders recursively (Season folders)</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded shadow transition cursor-pointer flex items-center justify-center gap-1.5 font-mono uppercase tracking-wider min-h-[38px] sm:min-h-0"
            >
              <FolderPlus className="w-4 h-4" />
              Add Directory
            </button>
          </div>
        </form>
      </div>

      {/* Monitored Directories Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {directories.map((dir) => (
          <div
            key={dir.id}
            className={`p-5 rounded-2xl border transition-all shadow-lg ${
              dir.enabled
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-950/60 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-xl ${
                  dir.mediaType === 'movie'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : dir.mediaType === 'tv'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {dir.mediaType === 'movie' ? (
                    <Film className="w-5 h-5" />
                  ) : dir.mediaType === 'tv' ? (
                    <Tv className="w-5 h-5" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    {dir.label}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300">
                      {dir.mediaType.toUpperCase()}
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5 break-all">
                    {dir.path}
                  </p>
                </div>
              </div>

              {/* Status Switch & Delete */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleDirectory(dir.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition cursor-pointer ${
                    dir.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  {dir.enabled ? 'Enabled' : 'Disabled'}
                </button>

                <button
                  onClick={() => onRemoveDirectory(dir.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Remove directory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span>
                  Files: <strong className="text-slate-200 font-mono">{dir.itemCount ?? 0}</strong>
                </span>
                <span>•</span>
                <span>Recursive: <strong className="text-slate-200">{dir.recursive ? 'Yes' : 'No'}</strong></span>
              </div>

              <button
                onClick={() => onScanDirectory(dir.id)}
                disabled={isScanning || !dir.enabled}
                className="inline-flex items-center text-xs text-amber-400 hover:text-amber-300 font-medium transition disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isScanning ? 'animate-spin' : ''}`} />
                Scan Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
