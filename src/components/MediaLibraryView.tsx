import React, { useState } from 'react';
import {
  Film,
  Tv,
  Check,
  Copy,
  AlertTriangle,
  Play,
  BellRing,
  Search,
  Filter,
  Terminal,
  ShieldAlert,
  Cpu,
  Music,
  Subtitles,
  ChevronDown,
  ChevronRight,
  Layers,
  Folder,
} from 'lucide-react';
import { MediaItem } from '../types';
import { analyzeMediaForChromecast, generateBatchShowCommands, isEnglishStream } from '../utils/chromecastSpecs';

interface MediaLibraryViewProps {
  mediaItems: MediaItem[];
  onDispatchNtfy: (item: MediaItem) => Promise<void>;
  onScanTrigger: () => void;
  isScanning: boolean;
}

export function extractShowName(item: MediaItem): string {
  if (item.title) {
    // 1. Check "Show Name - S01E01..." or "Show Name - Season 1..."
    const dashMatch = item.title.match(/^(.*?)\s*-\s*S\d+/i);
    if (dashMatch && dashMatch[1]) {
      return dashMatch[1].trim();
    }
    // 2. Check "Show Name S01E01"
    const seMatch = item.title.match(/^(.*?)\s+S\d{1,2}E\d{1,2}/i);
    if (seMatch && seMatch[1]) {
      return seMatch[1].replace(/[._]/g, ' ').trim();
    }
  }

  // 3. Fallback from filepath e.g. /media/tv/Severance/Season 01/...
  if (item.filePath) {
    const parts = item.filePath.split('/').filter(Boolean);
    const tvIdx = parts.findIndex((p) => p.toLowerCase() === 'tv');
    if (tvIdx !== -1 && tvIdx + 1 < parts.length) {
      const showFolder = parts[tvIdx + 1];
      if (showFolder && !showFolder.toLowerCase().startsWith('season')) {
        return showFolder.replace(/[._]/g, ' ').trim();
      }
    }
  }

  return item.title.replace(/\s*-\s*S\d+.*$/i, '').trim() || 'TV Show';
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({
  mediaItems,
  onDispatchNtfy,
  onScanTrigger,
  isScanning,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'needs_transcode' | 'direct_play' | 'movies' | 'tv'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingNtfyId, setSendingNtfyId] = useState<string | null>(null);
  const [expandedShows, setExpandedShows] = useState<Record<string, boolean>>({});
  const [overwriteMap, setOverwriteMap] = useState<Record<string, boolean>>({});
  const [englishOnlyMap, setEnglishOnlyMap] = useState<Record<string, boolean>>({});

  const handleCopyCommand = async (command: string, id: string) => {
    let success = false;

    // Method 1: Modern navigator.clipboard API
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(command);
        success = true;
      } catch (err) {
        console.warn('navigator.clipboard.writeText failed, trying execCommand fallback:', err);
      }
    }

    // Method 2: Fallback using temporary textarea + document.execCommand('copy')
    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = command;
        // Make element non-visible but part of DOM so Firefox/Wayland can focus and select
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('execCommand copy failed:', err);
      }
    }

    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      // Fallback feedback if clipboard is completely blocked
      alert(`Could not automatically copy to clipboard. Please select the command and press Ctrl+C:\n\n${command}`);
    }
  };

  const handleSendNtfyClick = async (item: MediaItem) => {
    setSendingNtfyId(item.id);
    await onDispatchNtfy(item);
    setSendingNtfyId(null);
  };

  const toggleShowExpand = (showName: string) => {
    setExpandedShows((prev) => ({
      ...prev,
      [showName]: !prev[showName],
    }));
  };

  const filteredItems = mediaItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.filePath.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'needs_transcode') return item.needsTranscode;
    if (filterType === 'direct_play') return !item.needsTranscode;
    if (filterType === 'movies') return item.mediaType === 'movie';
    if (filterType === 'tv') return item.mediaType === 'tv';

    return true;
  });

  // Group filtered items into Movies and TV Shows
  const movieItems: MediaItem[] = [];
  const tvGroupMap = new Map<string, MediaItem[]>();

  filteredItems.forEach((item) => {
    if (item.mediaType === 'movie') {
      movieItems.push(item);
    } else {
      const showName = extractShowName(item);
      if (!tvGroupMap.has(showName)) {
        tvGroupMap.set(showName, []);
      }
      tvGroupMap.get(showName)!.push(item);
    }
  });

  const tvShowGroups = Array.from(tvGroupMap.entries()).map(([showName, episodes]) => {
    const transcodeCount = episodes.filter((e) => e.needsTranscode).length;
    const directPlayCount = episodes.filter((e) => !e.needsTranscode).length;
    const totalSizeBytes = episodes.reduce((acc, e) => acc + e.fileSizeBytes, 0);

    return {
      showName,
      episodes,
      transcodeCount,
      directPlayCount,
      totalSizeBytes,
    };
  });

  const needsTranscodeCount = mediaItems.filter((m) => m.needsTranscode).length;
  const directPlayCount = mediaItems.filter((m) => !m.needsTranscode).length;
  const movieCount = mediaItems.filter((m) => m.mediaType === 'movie').length;
  const tvEpisodeCount = mediaItems.filter((m) => m.mediaType === 'tv').length;

  const totalEntriesCount = movieItems.length + tvShowGroups.length;

  return (
    <div className="space-y-6">
      {/* Top Controls & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-lg border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scanned Media:</span>
            <span className="text-base font-bold text-white font-mono">{mediaItems.length}</span>
          </div>
          <span className="text-slate-800">•</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold font-mono">
              🎬 {movieCount} Movies
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-bold font-mono">
              📺 {tvShowGroups.length} TV Shows ({tvEpisodeCount} Episodes)
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold font-mono">
              {needsTranscodeCount} TRANSCODE NEEDED
            </span>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
              {directPlayCount} DIRECT PLAY
            </span>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, show, codec..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded pl-9 pr-3 py-2 outline-none font-mono"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 font-mono text-xs overflow-x-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterType('movies')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'movies' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              MOVIES
            </button>
            <button
              onClick={() => setFilterType('tv')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'tv' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              TV SHOWS
            </button>
            <button
              onClick={() => setFilterType('needs_transcode')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'needs_transcode' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              TRANSCODE
            </button>
            <button
              onClick={() => setFilterType('direct_play')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'direct_play' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              DIRECT PLAY
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {totalEntriesCount === 0 ? (
          <div className="text-center py-12 bg-slate-900/80 border border-slate-800 rounded-lg p-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white uppercase tracking-wider">No media files match filter</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Adjust search query or initiate folder scan.
            </p>
          </div>
        ) : (
          <>
            {/* Render TV Show Folders First or Integrated */}
            {tvShowGroups.map((group) => {
              const isSearching = searchQuery.trim().length > 0;
              // Auto expand when user is searching or manually toggled
              const isExpanded = isSearching ? true : !!expandedShows[group.showName];

              return (
                <div
                  key={`tv-show-${group.showName}`}
                  className={`rounded-lg border transition-all shadow-xl overflow-hidden ${
                    group.transcodeCount > 0
                      ? 'bg-slate-900 border-indigo-500/40 hover:border-indigo-500/60'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Show Card Header */}
                  <div
                    onClick={() => toggleShowExpand(group.showName)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 cursor-pointer hover:bg-slate-800/40 transition select-none"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                        <Tv className="w-6 h-6" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {group.showName}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            TV Series
                          </span>
                          {group.transcodeCount > 0 ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              ⚠️ {group.transcodeCount} {group.transcodeCount === 1 ? 'Episode' : 'Episodes'} Needs Transcode
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ✅ All {group.episodes.length} Direct Play
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5 font-mono">
                          <span>
                            Episodes: <strong className="text-white font-bold">{group.episodes.length}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total Size: <strong className="text-slate-200">{(group.totalSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Action */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-xs font-mono font-semibold text-indigo-300 flex items-center bg-indigo-950/60 border border-indigo-800/50 px-3 py-1.5 rounded-md">
                        {isExpanded ? 'Hide Episodes' : `View Episodes (${group.episodes.length})`}
                        <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </span>
                    </div>
                  </div>

                  {/* Episodes List inside Show Card */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-4">
                      {/* Show-Wide Batch FFmpeg Commands */}
                      {(() => {
                        const showOverwriteKey = `show-${group.showName}`;
                        const showEnglishKey = `show-eng-${group.showName}`;
                        const isShowOverwrite = !!overwriteMap[showOverwriteKey];
                        const isShowEnglishOnly = !!englishOnlyMap[showEnglishKey];
                        const batchInfo = generateBatchShowCommands(group.episodes, undefined, isShowOverwrite, isShowEnglishOnly);

                        if (batchInfo.batchOptions.length === 0) return null;

                        return (
                          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-lg space-y-3 mb-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
                              <div className="flex items-center space-x-2">
                                <Terminal className="w-4 h-4 text-indigo-400" />
                                <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider font-mono">
                                  Batch FFmpeg Commands (Entire Show - {group.episodes.length} Episodes)
                                </h4>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <label
                                  title="Toggle keeping English audio & subtitle tracks only (stripping non-English tracks)"
                                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-indigo-200 hover:text-white cursor-pointer select-none bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-700/80"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isShowEnglishOnly}
                                    onChange={(e) =>
                                      setEnglishOnlyMap((prev) => ({
                                        ...prev,
                                        [showEnglishKey]: e.target.checked,
                                      }))
                                    }
                                    className="w-3 h-3 rounded border-indigo-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span>Keep English tracks only</span>
                                </label>

                                <label
                                  title="Toggle between saving as .optimized files vs overwriting original files in-place"
                                  className="inline-flex items-center gap-1.5 text-[10px] font-medium text-indigo-200 hover:text-white cursor-pointer select-none bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-700/80"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isShowOverwrite}
                                    onChange={(e) =>
                                      setOverwriteMap((prev) => ({
                                        ...prev,
                                        [showOverwriteKey]: e.target.checked,
                                      }))
                                    }
                                    className="w-3 h-3 rounded border-indigo-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span>Overwrite originals</span>
                                </label>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300 font-mono">
                              Directory Path:{' '}
                              <span className="text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40">
                                {batchInfo.showDir}
                              </span>
                            </p>

                            <div className="space-y-2">
                              {batchInfo.batchOptions.map((bOpt, bIdx) => {
                                const copyKey = `batch-${group.showName}-${bOpt.id || bIdx}`;
                                return (
                                  <div
                                    key={bOpt.id || bIdx}
                                    className="bg-slate-950 border border-indigo-900/60 rounded p-2.5 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[11px] font-bold text-slate-200 font-mono truncate">
                                          {bOpt.label}
                                        </span>
                                        {bOpt.recommended && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono shrink-0">
                                            Recommended
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => handleCopyCommand(bOpt.command, copyKey)}
                                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded transition cursor-pointer font-mono shrink-0"
                                      >
                                        {copiedId === copyKey ? (
                                          <>
                                            <Check className="w-3 h-3 mr-1 text-emerald-400" />
                                            Copied!
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy Batch Command
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {bOpt.note && (
                                      <p className="text-[10px] text-slate-400 leading-tight font-sans">
                                        {bOpt.note}
                                      </p>
                                    )}

                                    <pre
                                      onClick={() => handleCopyCommand(bOpt.command, copyKey)}
                                      title="Click to copy command"
                                      className="p-2 bg-slate-900/90 hover:bg-slate-900 text-emerald-400 font-mono text-[10px] rounded overflow-x-auto border border-indigo-900/40 leading-relaxed cursor-pointer select-all transition"
                                    >
                                      {bOpt.command}
                                    </pre>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        Episodes in {group.showName}:
                      </div>

                      {group.episodes.map((item) => {
                        const videoStream = item.streams.find((s) => s.type === 'video');
                        const audioStreams = item.streams.filter((s) => s.type === 'audio');
                        const subtitleStreams = item.streams.filter((s) => s.type === 'subtitle');

                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border transition-all shadow-md overflow-hidden ${
                              item.needsTranscode
                                ? 'bg-slate-900 border-amber-500/40'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            {/* Episode Header Strip */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80">
                              <div className="flex items-start space-x-3">
                                <div
                                  className={`p-2 rounded shrink-0 ${
                                    item.needsTranscode
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  <Tv className="w-4 h-4" />
                                </div>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-sm font-bold text-white tracking-tight">
                                      {item.title}
                                    </h4>
                                    <span
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                        item.needsTranscode
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      }`}
                                    >
                                      {item.needsTranscode ? '⚠️ Needs Transcode' : '✅ Direct Play'}
                                    </span>
                                  </div>

                                  <p className="text-[11px] font-mono text-slate-400 mt-1 break-all">
                                    {item.filePath}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-mono">
                                    <span>
                                      Container: <strong className="text-slate-200 uppercase">{item.container}</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Size: <strong className="text-slate-200">{(item.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong>
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Duration: <strong className="text-slate-200">{Math.floor(item.durationSeconds / 60)} min</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Actions */}
                              <div className="flex items-center space-x-2 shrink-0">
                                {item.needsTranscode && (
                                  <button
                                    onClick={() => handleSendNtfyClick(item)}
                                    disabled={sendingNtfyId === item.id}
                                    className="inline-flex items-center px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded shadow transition cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                                  >
                                    <BellRing className="w-3.5 h-3.5 mr-1.5" />
                                    {sendingNtfyId === item.id ? 'Pushing...' : 'Push ntfy Alert'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Episode Codec Details & Transcode Analysis */}
                            <div className="p-4 space-y-3 bg-slate-950/40">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Video Stream */}
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                                  <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="uppercase text-[10px] tracking-wider text-slate-400">Video Codec</span>
                                  </div>
                                  {videoStream ? (
                                    <div className="font-mono text-slate-300 space-y-0.5 text-[11px]">
                                      <div>
                                        Codec: <strong className="text-white uppercase font-bold">{videoStream.codec}</strong>
                                      </div>
                                      <div>
                                        Profile:{' '}
                                        <strong
                                          className={
                                            videoStream.profile?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'
                                          }
                                        >
                                          {videoStream.profile || 'High'}
                                        </strong>
                                      </div>
                                      <div>
                                        Pix Format:{' '}
                                        <strong
                                          className={
                                            videoStream.pixelFormat?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'
                                          }
                                        >
                                          {videoStream.pixelFormat || 'yuv420p'}
                                        </strong>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 italic font-mono text-[11px]">No video stream</div>
                                  )}
                                </div>

                                {/* Audio Streams */}
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                                  <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="uppercase text-[10px] tracking-wider text-slate-400">
                                      Audio Tracks ({audioStreams.length})
                                    </span>
                                  </div>
                                  {audioStreams.length > 0 ? (
                                    <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                                      {audioStreams.map((audio, idx) => {
                                        const isEng = isEnglishStream(audio);
                                        const isItemEngOnly = !!englishOnlyMap[`eng-${item.id}`];
                                        const isTruncated = isItemEngOnly && !isEng;
                                        const langLabel = audio.language ? audio.language.toUpperCase() : 'UND';

                                        return (
                                          <div
                                            key={idx}
                                            className={`border-b border-slate-800/60 pb-1 last:border-0 flex items-center justify-between gap-1 ${
                                              isTruncated ? 'opacity-40 line-through' : ''
                                            }`}
                                          >
                                            <div className="min-w-0 truncate">
                                              <span className="text-slate-500">#{idx + 1}: </span>
                                              <strong className="text-white uppercase font-bold">{audio.codec}</strong> ({audio.channels || 2}ch)
                                              {audio.title && <span className="text-slate-400 text-[10px] ml-1">({audio.title})</span>}
                                            </div>
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase shrink-0 ${
                                                isEng
                                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                                              }`}
                                            >
                                              {langLabel} {isTruncated ? '• Truncated' : ''}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 italic font-mono text-[11px]">No audio stream</div>
                                  )}
                                </div>

                                {/* Subtitle Streams */}
                                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                                  <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                                    <Subtitles className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="uppercase text-[10px] tracking-wider text-slate-400">
                                      Subtitles ({subtitleStreams.length})
                                    </span>
                                  </div>
                                  {subtitleStreams.length > 0 ? (
                                    <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                                      {subtitleStreams.map((sub, idx) => {
                                        const isEng = isEnglishStream(sub);
                                        const isItemEngOnly = !!englishOnlyMap[`eng-${item.id}`];
                                        const isTruncated = isItemEngOnly && !isEng;
                                        const langLabel = sub.language ? sub.language.toUpperCase() : 'UND';

                                        return (
                                          <div
                                            key={idx}
                                            className={`border-b border-slate-800/60 pb-1 last:border-0 flex items-center justify-between gap-1 ${
                                              isTruncated ? 'opacity-40 line-through' : ''
                                            }`}
                                          >
                                            <div className="min-w-0 truncate">
                                              <span className="text-slate-500">#{idx + 1}: </span>
                                              <strong
                                                className={
                                                  sub.codec.includes('pgs') || sub.codec.includes('ass')
                                                    ? 'text-amber-400 uppercase font-bold'
                                                    : 'text-slate-200 uppercase'
                                                }
                                              >
                                                {sub.codec}
                                              </strong>
                                              {sub.title && <span className="text-slate-400 text-[10px] ml-1">({sub.title})</span>}
                                            </div>
                                            <span
                                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase shrink-0 ${
                                                isEng
                                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                                              }`}
                                            >
                                              {langLabel} {isTruncated ? '• Truncated' : ''}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-slate-500 italic font-mono text-[11px]">No embedded subtitles</div>
                                  )}
                                </div>
                              </div>

                              {/* Transcode Reasons & FFmpeg Command */}
                              {item.needsTranscode && (
                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded space-y-2">
                                  <div>
                                    <h5 className="text-[11px] font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider font-mono">
                                      <ShieldAlert className="w-3.5 h-3.5" />
                                      Incompatibility Analysis:
                                    </h5>
                                    <ul className="mt-1 space-y-0.5">
                                      {item.transcodeReasons.map((reason, rIdx) => (
                                        <li key={rIdx} className="text-[11px] text-amber-200/90 flex items-start gap-1 font-mono">
                                          <span className="text-amber-500 font-bold">•</span>
                                          <span>{reason}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {item.recommendation && (() => {
                                    const isOverwrite = !!overwriteMap[item.id];
                                    const isEnglishOnly = !!englishOnlyMap[`eng-${item.id}`];
                                    const analysis = analyzeMediaForChromecast(item, undefined, isOverwrite, isEnglishOnly);
                                    const options = analysis.recommendation.commandOptions && analysis.recommendation.commandOptions.length > 0
                                      ? analysis.recommendation.commandOptions
                                      : [{ id: 'cmd-0', label: 'FFmpeg Command', command: analysis.recommendation.suggestedFfmpegCommand }];

                                    return (
                                      <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1 font-mono uppercase">
                                            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                                            FFmpeg Command Options ({item.recommendation.estimatedSpeed}):
                                          </span>

                                          <div className="flex flex-wrap items-center gap-2">
                                            <label
                                              title="Toggle keeping English audio & subtitle tracks only (stripping non-English tracks)"
                                              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer select-none bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/80"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isEnglishOnly}
                                                onChange={(e) =>
                                                  setEnglishOnlyMap((prev) => ({
                                                    ...prev,
                                                    [`eng-${item.id}`]: e.target.checked,
                                                  }))
                                                }
                                                className="w-3 h-3 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                              />
                                              <span>Keep English tracks only</span>
                                            </label>

                                            <label
                                              title="Toggle between saving as .optimized file vs overwriting original file"
                                              className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-300 hover:text-white cursor-pointer select-none bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/80"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isOverwrite}
                                                onChange={(e) =>
                                                  setOverwriteMap((prev) => ({
                                                    ...prev,
                                                    [item.id]: e.target.checked,
                                                  }))
                                                }
                                                className="w-3 h-3 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                              />
                                              <span>Overwrite original</span>
                                            </label>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          {options.map((opt, optIdx) => {
                                            const copyKey = `${item.id}-${opt.id || optIdx}`;
                                            return (
                                              <div key={opt.id || optIdx} className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-[11px] font-bold text-slate-200 font-mono truncate">
                                                      {opt.label}
                                                    </span>
                                                    {opt.recommended && (
                                                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono shrink-0">
                                                        Recommended
                                                      </span>
                                                    )}
                                                  </div>

                                                  <button
                                                    onClick={() => handleCopyCommand(opt.command, copyKey)}
                                                    className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono shrink-0"
                                                  >
                                                    {copiedId === copyKey ? (
                                                      <>
                                                        <Check className="w-3 h-3 mr-1 text-emerald-400" />
                                                        Copied!
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        Copy Command
                                                      </>
                                                    )}
                                                  </button>
                                                </div>

                                                {opt.note && (
                                                  <p className="text-[10px] text-slate-400 leading-tight font-sans">
                                                    {opt.note}
                                                  </p>
                                                )}

                                                <pre
                                                  onClick={() => handleCopyCommand(opt.command, copyKey)}
                                                  title="Click to copy command"
                                                  className="p-2 bg-slate-900/90 hover:bg-slate-900 text-emerald-400 font-mono text-[10px] rounded overflow-x-auto border border-slate-800 leading-relaxed cursor-pointer select-all transition"
                                                >
                                                  {opt.command}
                                                </pre>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Render Movie Cards */}
            {movieItems.map((item) => {
              const videoStream = item.streams.find((s) => s.type === 'video');
              const audioStreams = item.streams.filter((s) => s.type === 'audio');
              const subtitleStreams = item.streams.filter((s) => s.type === 'subtitle');

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border transition-all shadow-xl overflow-hidden ${
                    item.needsTranscode
                      ? 'bg-slate-900 border-amber-500/40 hover:border-amber-500/60'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Header Strip */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`p-2.5 rounded shrink-0 ${
                          item.needsTranscode
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        <Film className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              item.needsTranscode
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {item.needsTranscode ? '⚠️ Needs Transcode' : '✅ Direct Play'}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-slate-400 mt-1 break-all">{item.filePath}</p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                          <span>
                            Container: <strong className="text-slate-200 uppercase">{item.container}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Size: <strong className="text-slate-200">{(item.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Duration: <strong className="text-slate-200">{Math.floor(item.durationSeconds / 60)} min</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {item.needsTranscode && (
                        <button
                          onClick={() => handleSendNtfyClick(item)}
                          disabled={sendingNtfyId === item.id}
                          className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded shadow transition cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                        >
                          <BellRing className="w-3.5 h-3.5 mr-1.5" />
                          {sendingNtfyId === item.id ? 'Pushing...' : 'Push ntfy Alert'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 sm:p-5 space-y-4 bg-slate-950/40">
                    {/* Codec Streams Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Video Stream */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                          <Cpu className="w-4 h-4 text-indigo-400" />
                          <span className="uppercase text-[11px] tracking-wider text-slate-400">Video Codec</span>
                        </div>
                        {videoStream ? (
                          <div className="font-mono text-slate-300 space-y-0.5 text-[11px]">
                            <div>
                              Codec: <strong className="text-white uppercase font-bold">{videoStream.codec}</strong>
                            </div>
                            <div>
                              Profile:{' '}
                              <strong className={videoStream.profile?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                {videoStream.profile || 'High'}
                              </strong>
                            </div>
                            <div>
                              Pix Format:{' '}
                              <strong className={videoStream.pixelFormat?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                                {videoStream.pixelFormat || 'yuv420p'}
                              </strong>
                            </div>
                            {videoStream.width && (
                              <div>
                                Resolution: {videoStream.width}x{videoStream.height}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic font-mono">No video stream</div>
                        )}
                      </div>

                      {/* Audio Streams */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                          <Music className="w-4 h-4 text-emerald-400" />
                          <span className="uppercase text-[11px] tracking-wider text-slate-400">Audio Tracks ({audioStreams.length})</span>
                        </div>
                        {audioStreams.length > 0 ? (
                          <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                            {audioStreams.map((audio, idx) => (
                              <div key={idx} className="border-b border-slate-800/60 pb-1 last:border-0">
                                <span className="text-slate-500">#{idx + 1}: </span>
                                <strong className="text-white uppercase font-bold">{audio.codec}</strong> ({audio.channels || 2}ch)
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic font-mono">No audio stream</div>
                        )}
                      </div>

                      {/* Subtitle Streams */}
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 font-semibold text-slate-300 mb-1">
                          <Subtitles className="w-4 h-4 text-amber-400" />
                          <span className="uppercase text-[11px] tracking-wider text-slate-400">Subtitles ({subtitleStreams.length})</span>
                        </div>
                        {subtitleStreams.length > 0 ? (
                          <div className="font-mono text-slate-300 space-y-1 text-[11px]">
                            {subtitleStreams.map((sub, idx) => (
                              <div key={idx} className="border-b border-slate-800/60 pb-1 last:border-0">
                                <span className="text-slate-500">#{idx + 1}: </span>
                                <strong
                                  className={
                                    sub.codec.includes('pgs') || sub.codec.includes('ass')
                                      ? 'text-amber-400 uppercase font-bold'
                                      : 'text-slate-200 uppercase'
                                  }
                                >
                                  {sub.codec}
                                </strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic font-mono">No embedded subtitles</div>
                        )}
                      </div>
                    </div>

                    {/* Transcode Reasons & Recommendation */}
                    {item.needsTranscode && (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                            <ShieldAlert className="w-4 h-4" />
                            Chromecast 4K Incompatibility Analysis:
                          </h4>
                          <ul className="mt-2 space-y-1">
                            {item.transcodeReasons.map((reason, rIdx) => (
                              <li key={rIdx} className="text-xs text-amber-200/90 flex items-start gap-1.5 font-mono">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Suggested FFmpeg Bash Command */}
                        {item.recommendation && (() => {
                          const isOverwrite = !!overwriteMap[item.id];
                          const analysis = analyzeMediaForChromecast(item, undefined, isOverwrite);
                          const options = analysis.recommendation.commandOptions && analysis.recommendation.commandOptions.length > 0
                            ? analysis.recommendation.commandOptions
                            : [{ id: 'cmd-0', label: 'FFmpeg Command', command: analysis.recommendation.suggestedFfmpegCommand }];

                          return (
                            <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase">
                                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                                  FFmpeg Command Options ({item.recommendation.estimatedSpeed}):
                                </span>

                                <label
                                  title="Toggle between saving as .optimized file vs overwriting original file"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white cursor-pointer select-none bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isOverwrite}
                                    onChange={(e) =>
                                      setOverwriteMap((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.checked,
                                      }))
                                    }
                                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <span>Overwrite original file</span>
                                </label>
                              </div>

                              <div className="space-y-2.5">
                                {options.map((opt, optIdx) => {
                                  const copyKey = `${item.id}-${opt.id || optIdx}`;
                                  return (
                                    <div key={opt.id || optIdx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 shadow-inner">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-xs font-bold text-slate-200 font-mono truncate">
                                            {opt.label}
                                          </span>
                                          {opt.recommended && (
                                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded font-mono shrink-0">
                                              Recommended
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          onClick={() => handleCopyCommand(opt.command, copyKey)}
                                          className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono shrink-0"
                                        >
                                          {copiedId === copyKey ? (
                                            <>
                                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                              Copied!
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5 mr-1" />
                                              Copy Command
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      {opt.note && (
                                        <p className="text-xs text-slate-400 leading-snug font-sans">
                                          {opt.note}
                                        </p>
                                      )}

                                      <pre
                                        onClick={() => handleCopyCommand(opt.command, copyKey)}
                                        title="Click to copy command"
                                        className="p-3 bg-slate-900/90 hover:bg-slate-900 text-emerald-400 font-mono text-[11px] rounded overflow-x-auto border border-slate-800 shadow-inner leading-relaxed cursor-pointer select-all transition"
                                      >
                                        {opt.command}
                                      </pre>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

