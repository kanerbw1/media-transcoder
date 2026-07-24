import React, { useState } from 'react';
import { Film, Tv, Check, Copy, AlertTriangle, Play, BellRing, Search, Filter, Terminal, ShieldAlert, Cpu, Music, Subtitles } from 'lucide-react';
import { MediaItem } from '../types';

interface MediaLibraryViewProps {
  mediaItems: MediaItem[];
  onDispatchNtfy: (item: MediaItem) => Promise<void>;
  onScanTrigger: () => void;
  isScanning: boolean;
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

  const handleCopyCommand = (command: string, id: string) => {
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendNtfyClick = async (item: MediaItem) => {
    setSendingNtfyId(item.id);
    await onDispatchNtfy(item);
    setSendingNtfyId(null);
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

  const needsTranscodeCount = mediaItems.filter((m) => m.needsTranscode).length;
  const directPlayCount = mediaItems.filter((m) => !m.needsTranscode).length;

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-lg border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scanned Media:</span>
            <span className="text-base font-bold text-white font-mono">{mediaItems.length}</span>
          </div>
          <span className="text-slate-800">•</span>
          <div className="flex items-center space-x-2">
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
              placeholder="Search title, codec or path..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded pl-9 pr-3 py-2 outline-none font-mono"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL
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

      {/* Media Cards List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/80 border border-slate-800 rounded-lg p-6">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white uppercase tracking-wider">No media files match filter</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Adjust search query or initiate folder scan.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
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
                    <div className={`p-2.5 rounded shrink-0 ${
                      item.needsTranscode
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {item.mediaType === 'movie' ? (
                        <Film className="w-5 h-5" />
                      ) : (
                        <Tv className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {item.title}
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          item.needsTranscode
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {item.needsTranscode ? '⚠️ Needs Transcode' : '✅ Direct Play'}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                        {item.filePath}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                        <span>Container: <strong className="text-slate-200 uppercase">{item.container}</strong></span>
                        <span>•</span>
                        <span>Size: <strong className="text-slate-200">{(item.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong></span>
                        <span>•</span>
                        <span>Duration: <strong className="text-slate-200">{Math.floor(item.durationSeconds / 60)} min</strong></span>
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
                          <div>Codec: <strong className="text-white uppercase font-bold">{videoStream.codec}</strong></div>
                          <div>Profile: <strong className={videoStream.profile?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'}>{videoStream.profile || 'High'}</strong></div>
                          <div>Pix Format: <strong className={videoStream.pixelFormat?.includes('10') ? 'text-amber-400 font-bold' : 'text-slate-200'}>{videoStream.pixelFormat || 'yuv420p'}</strong></div>
                          {videoStream.width && <div>Resolution: {videoStream.width}x{videoStream.height}</div>}
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
                              <strong className={sub.codec.includes('pgs') || sub.codec.includes('ass') ? 'text-amber-400 uppercase font-bold' : 'text-slate-200 uppercase'}>
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
                      {item.recommendation && (
                        <div className="mt-3 pt-3 border-t border-amber-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              FFmpeg Bash Command ({item.recommendation.estimatedSpeed}):
                            </span>

                            <button
                              onClick={() => handleCopyCommand(item.recommendation!.suggestedFfmpegCommand, item.id)}
                              className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 mr-1" />
                                  Copy FFmpeg Command
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                            {item.recommendation.suggestedFfmpegCommand}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
