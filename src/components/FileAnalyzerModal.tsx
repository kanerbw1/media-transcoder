import React, { useState } from 'react';
import { X, PlayCircle, Film, CheckCircle2, AlertTriangle, Terminal, Copy, Check, UploadCloud } from 'lucide-react';
import { StreamInfo, TranscodeRecommendation } from '../types';
import { analyzeMediaForChromecast } from '../utils/chromecastSpecs';

interface FileAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FileAnalyzerModal: React.FC<FileAnalyzerModalProps> = ({ isOpen, onClose }) => {
  const [fileName, setFileName] = useState('Avatar.The.Way.of.Water.2022.2160p.10bit.H264.DTS-HD.MA.mkv');
  const [vCodec, setVCodec] = useState('h264');
  const [vProfile, setVProfile] = useState('High 10');
  const [pixFmt, setPixFmt] = useState('yuv420p10le');
  const [aCodec, setACodec] = useState('dts');
  const [subCodec, setSubCodec] = useState('pgs');

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Perform live calculation
  const testStreams: StreamInfo[] = [
    {
      index: 0,
      type: 'video',
      codec: vCodec,
      profile: vProfile,
      pixelFormat: pixFmt,
      width: 3840,
      height: 2160,
    },
    {
      index: 1,
      type: 'audio',
      codec: aCodec,
      channels: 6,
    },
  ];

  if (subCodec && subCodec !== 'none') {
    testStreams.push({
      index: 2,
      type: 'subtitle',
      codec: subCodec,
    });
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'mkv';

  const analysis = analyzeMediaForChromecast({
    fileName,
    filePath: `/media/downloads/${fileName}`,
    container: ext,
    streams: testStreams,
  });

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Infer codecs from filename
      const fNameLower = file.name.toLowerCase();
      if (fNameLower.includes('10bit') && fNameLower.includes('h264')) {
        setVCodec('h264');
        setVProfile('High 10');
        setPixFmt('yuv420p10le');
      } else if (fNameLower.includes('hevc') || fNameLower.includes('h265')) {
        setVCodec('hevc');
        setVProfile('Main 10');
        setPixFmt('yuv420p10le');
      }
      if (fNameLower.includes('dts')) setACodec('dts');
      if (fNameLower.includes('truehd')) setACodec('truehd');
      if (fNameLower.includes('pgs')) setSubCodec('pgs');
      if (fNameLower.includes('ass')) setSubCodec('ass');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center font-mono text-xs font-bold text-white">
              FF
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chromecast 4K Codec Inspector</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* File Drag / Selector */}
          <div className="border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 rounded p-4 text-center cursor-pointer transition relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-7 h-7 text-indigo-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-200 font-mono">
              Select or Drop a local media file to inspect codecs
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Parses file extension & infers video/audio parameters instantly
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">
              Target File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-200 text-xs rounded px-3 py-2 font-mono outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Video Codec</label>
              <select
                value={vCodec}
                onChange={(e) => setVCodec(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-3 py-2 outline-none font-mono"
              >
                <option value="h264">H.264 / AVC</option>
                <option value="hevc">HEVC / H.265</option>
                <option value="vc1">VC-1 (Legacy Blu-ray)</option>
                <option value="mpeg2">MPEG-2 (DVD/Broadcast)</option>
                <option value="av1">AV1</option>
                <option value="vp9">VP9</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Profile / Pixel Format</label>
              <select
                value={pixFmt}
                onChange={(e) => {
                  setPixFmt(e.target.value);
                  if (e.target.value.includes('10')) setVProfile('High 10');
                  else setVProfile('High');
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-3 py-2 outline-none font-mono"
              >
                <option value="yuv420p10le">yuv420p10le (10-bit)</option>
                <option value="yuv420p">yuv420p (8-bit standard)</option>
                <option value="yuv444p">yuv444p (4:4:4 chroma)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Audio Codec</label>
              <select
                value={aCodec}
                onChange={(e) => setACodec(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-3 py-2 outline-none font-mono"
              >
                <option value="dts">DTS / DTS-HD MA</option>
                <option value="truehd">Dolby TrueHD / Atmos</option>
                <option value="ac3">AC3 (Dolby Digital 5.1)</option>
                <option value="eac3">E-AC3 (Dolby Digital Plus)</option>
                <option value="aac">AAC (Stereo / 5.1)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">Subtitle Format</label>
            <select
              value={subCodec}
              onChange={(e) => setSubCodec(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded px-3 py-2 outline-none font-mono"
            >
              <option value="pgs">PGS (Bitmap Blu-ray - Video Burn-in Trigger)</option>
              <option value="ass">ASS / SSA (Styled Subtitle - Video Burn-in Trigger)</option>
              <option value="srt">SRT (SubRip Text - Direct Play OK)</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Analysis Results Display */}
          <div className={`p-4 rounded border text-xs space-y-3 ${
            analysis.needsTranscode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
          }`}>
            <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider font-mono">
              {analysis.needsTranscode ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-300">Requires Transcoding for Chromecast 4K</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Direct Play Compatible</span>
                </>
              )}
            </div>

            {analysis.needsTranscode && (
              <ul className="space-y-1 font-mono text-[11px]">
                {analysis.reasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            )}

            {analysis.recommendation && analysis.needsTranscode && (
              <div className="pt-3 border-t border-amber-500/20">
                <div className="flex items-center justify-between mb-1 font-mono">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase text-[11px]">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    FFmpeg Command:
                  </span>
                  <button
                    onClick={() => handleCopy(analysis.recommendation!.suggestedFfmpegCommand)}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded transition font-medium cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded overflow-x-auto border border-slate-800">
                  {analysis.recommendation.suggestedFfmpegCommand}
                </pre>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
