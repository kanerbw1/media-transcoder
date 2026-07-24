export type VideoCodec = 'h264' | 'hevc' | 'vp9' | 'av1' | 'mpeg4' | 'mpeg2' | 'vc1' | 'prores' | 'wmv' | 'other';
export type AudioCodec = 'aac' | 'ac3' | 'eac3' | 'flac' | 'mp3' | 'opus' | 'truehd' | 'dts' | 'dts-hd' | 'pcm' | 'vorbis' | 'other';
export type SubtitleCodec = 'srt' | 'vtt' | 'ass' | 'ssa' | 'pgs' | 'vobsub' | 'other';

export interface StreamInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  codecLong?: string;
  profile?: string;
  level?: number | string;
  pixelFormat?: string; // e.g. yuv420p, yuv420p10le
  bitDepth?: number;
  width?: number;
  height?: number;
  fps?: number;
  channels?: number;
  channelLayout?: string;
  sampleRate?: number;
  language?: string;
  title?: string;
  isDefault?: boolean;
  isForced?: boolean;
}

export interface MediaItem {
  id: string;
  fileName: string;
  filePath: string;
  directory: string;
  title: string;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  fileSizeBytes: number;
  durationSeconds: number;
  container: string; // e.g., mkv, mp4, avi, m2ts
  addedAt: string;
  lastScannedAt: string;
  streams: StreamInfo[];
  needsTranscode: boolean;
  transcodeReasons: string[];
  recommendation?: TranscodeRecommendation;
}

export interface FfmpegCommandOption {
  id: string;
  label: string;
  command: string;
  note?: string;
  recommended?: boolean;
}

export interface TranscodeRecommendation {
  summary: string;
  targetContainer: 'mkv' | 'mp4';
  targetVideoCodec: 'libx265' | 'libx264' | 'copy';
  targetAudioCodec: 'ac3' | 'aac' | 'eac3' | 'copy';
  targetSubtitleAction: 'extract_srt' | 'convert_vtt' | 'copy' | 'burn_in_not_recommended';
  suggestedFfmpegCommand: string;
  commandOptions?: FfmpegCommandOption[];
  estimatedSpeed: 'Ultra Fast (Remux only)' | 'Fast (Audio transcode only)' | 'Normal (Full encode)';
  hardwareAccelOption?: string; // e.g. nvenc, vaapi, qsv
}

export interface DirectoryConfig {
  id: string;
  path: string;
  label: string;
  mediaType: 'movie' | 'tv' | 'auto';
  recursive: boolean;
  enabled: boolean;
  lastScanTime?: string;
  itemCount?: number;
}

export interface NtfySettings {
  serverUrl: string; // e.g. http://homelab:100/
  topic: string;     // e.g. jellyfin-transcode
  priority: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags: string[];    // e.g. ["clapper", "warning", "tv"]
  authToken?: string;
  notifyOnlyOnTranscodeNeeded: boolean;
  includeFfmpegCommand: boolean;
}

export interface ChromecastProfile {
  name: string;
  allowH264: boolean;
  allowH264_10bit: boolean; // False by default! 10-bit H.264 forces transcode on Chromecast 4K
  maxH264Level: number; // 51 (5.1)
  allowHEVC: boolean; // Main, Main 10
  allowVP9: boolean;
  allowAV1: boolean;
  allowTrueHDDirect: boolean; // False by default - causes transcode unless audio receiver handles pass-through
  allowDTSDirect: boolean;    // False by default
  allowPGS: boolean;          // False - forces video transcode for burn-in on Jellyfin
  allowASS: boolean;          // False - ASS subtitles force burn-in transcode
  maxBitrateMbps: number;     // e.g. 80 Mbps
}

export interface AppConfig {
  ntfy: NtfySettings;
  directories: DirectoryConfig[];
  chromecastProfile: ChromecastProfile;
  autoScanIntervalMinutes: number; // 0 = disabled, e.g. 15, 30, 60
  autoScanEnabled: boolean;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  mediaTitle: string;
  filePath: string;
  topic: string;
  status: 'sent' | 'failed' | 'simulated';
  statusCode?: number;
  errorMessage?: string;
  reasons: string[];
  ffmpegCommand: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  hasFfprobe: boolean;
  hasFfmpeg: boolean;
  isTailscaleDetected: boolean;
  nodeVersion: string;
}
