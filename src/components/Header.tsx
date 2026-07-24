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
  const ntfyTargetUrl = `${ntfy.serverUrl.replace(/\/+$/, '')}/${ntfy.topic}`;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          
          {/* Logo & Server Status */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-md flex items-center justify-center font-bold text-white font-mono text-sm shadow-md shrink-0">
              TS
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-bold tracking-tight text-white uppercase">
                  TRANSCODE<span className="text-indigo-400">SENTINEL</span>
                </h1>
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-300 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse"></span>
                  <span className="font-mono text-[11px] font-semibold">UBUNTU 26.04 HOST</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>IP: <strong className="text-slate-200">100.82.14.92</strong> (Tailscale)</span>
                <span>•</span>
                <span className="flex items-center text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-400 inline" />
                  ntfy: <strong className="text-indigo-300 ml-1">{ntfy.serverUrl.replace('http://', '').replace('/', '')}</strong>
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAnalyzer}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Inspect Video File
            </button>

            <button
              onClick={onScanTrigger}
              disabled={isScanning}
              className="inline-flex items-center px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-lg transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan Directories'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 pt-1.5 overflow-x-auto">
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
  );
};
