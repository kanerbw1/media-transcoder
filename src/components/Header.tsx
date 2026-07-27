import React from 'react';
import { Tv, FolderSearch, Bell, Terminal, Activity, ShieldCheck, PlayCircle, RefreshCw } from 'lucide-react';
import { NtfySettings, SystemInfo } from '../types';

interface HeaderProps {
  activeTab: 'media' | 'directories' | 'ntfy' | 'deploy';
  setActiveTab: (tab: 'media' | 'directories' | 'ntfy' | 'deploy') => void;
  ntfy: NtfySettings;
  systemInfo: SystemInfo | null;
  onScanTrigger: () => void;
  isScanning: boolean;
  onOpenAnalyzer: () => void;
  transcodeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  ntfy,
  systemInfo,
  onScanTrigger,
  isScanning,
  onOpenAnalyzer,
  transcodeCount,
}) => {
  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
            
            {/* Logo & Server Status */}
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white font-mono text-sm shadow-md shrink-0">
                TS
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white uppercase truncate">
                    TRANSCODE<span className="text-indigo-400">SENTINEL</span>
                  </h1>
                  <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-slate-300 border border-slate-700 shrink-0">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 status-pulse"></span>
                    <span className="font-mono font-semibold">UBUNTU 26.04</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-mono truncate">
                  <span>IP: <strong className="text-slate-200">100.82.14.92</strong></span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:flex items-center text-slate-300">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-400 inline" />
                    ntfy: <strong className="text-indigo-300 ml-1">{ntfy.serverUrl.replace('http://', '').replace('/', '')}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAnalyzer}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 sm:py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border border-slate-700 rounded-lg sm:rounded-md transition-colors cursor-pointer min-h-[38px] sm:min-h-0"
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                <span>Inspect File</span>
              </button>

              <button
                onClick={onScanTrigger}
                disabled={isScanning}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-3.5 py-2 sm:py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg sm:rounded-md shadow-lg transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider min-h-[38px] sm:min-h-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-1 border-t border-slate-800/80 pt-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-md transition-all border-b-2 uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                activeTab === 'media'
                  ? 'border-indigo-500 bg-slate-800/80 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Live Analysis Stream</span>
              {transcodeCount > 0 && (
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 text-[10px] rounded font-mono font-bold">
                  {transcodeCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('directories')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-md transition-all border-b-2 uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                activeTab === 'directories'
                  ? 'border-indigo-500 bg-slate-800/80 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FolderSearch className="w-4 h-4" />
              <span>Monitored Libraries</span>
            </button>

            <button
              onClick={() => setActiveTab('ntfy')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-md transition-all border-b-2 uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                activeTab === 'ntfy'
                  ? 'border-indigo-500 bg-slate-800/80 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>ntfy Push Server</span>
            </button>

            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-t-md transition-all border-b-2 uppercase tracking-wider whitespace-nowrap cursor-pointer ${
                activeTab === 'deploy'
                  ? 'border-indigo-500 bg-slate-800/80 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Host & Tailscale Setup</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('media')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer relative min-w-[64px] ${
            activeTab === 'media'
              ? 'text-indigo-400 font-bold bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Tv className="w-5 h-5 mb-0.5" />
            {transcodeCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-mono text-[9px] font-extrabold px-1 rounded-full animate-pulse">
                {transcodeCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('directories')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer min-w-[64px] ${
            activeTab === 'directories'
              ? 'text-indigo-400 font-bold bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderSearch className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Libraries</span>
        </button>

        <button
          onClick={() => setActiveTab('ntfy')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer min-w-[64px] ${
            activeTab === 'ntfy'
              ? 'text-indigo-400 font-bold bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">ntfy Push</span>
        </button>

        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition cursor-pointer min-w-[64px] ${
            activeTab === 'deploy'
              ? 'text-indigo-400 font-bold bg-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Host Setup</span>
        </button>
      </nav>
    </>
  );
};
