import { MediaItem, ChromecastProfile, TranscodeRecommendation, StreamInfo } from '../types';

export const DEFAULT_CHROMECAST_PROFILE: ChromecastProfile = {
  name: 'Chromecast 4K with Google TV',
  allowH264: true,
  allowH264_10bit: false, // 10-bit H.264 causes CPU transcode on Jellyfin
  maxH264Level: 51,
  allowHEVC: true,
  allowVP9: true,
  allowAV1: true,
  allowTrueHDDirect: false,
  allowDTSDirect: false,
  allowPGS: false,
  allowASS: false,
  maxBitrateMbps: 80,
};

export interface AnalysisResult {
  needsTranscode: boolean;
  reasons: string[];
  recommendation: TranscodeRecommendation;
}

export function analyzeMediaForChromecast(
  item: Partial<MediaItem>,
  profile: ChromecastProfile = DEFAULT_CHROMECAST_PROFILE,
  overwriteOriginal: boolean = false
): AnalysisResult {
  const reasons: string[] = [];
  const streams = item.streams || [];
  const container = (item.container || '').toLowerCase().replace('.', '');

  const videoStreams = streams.filter((s) => s.type === 'video');
  const audioStreams = streams.filter((s) => s.type === 'audio');
  const subtitleStreams = streams.filter((s) => s.type === 'subtitle');

  let videoNeedsReencode = false;
  let audioNeedsReencode = false;
  let subtitleNeedsExtraction = false;
  let containerNeedsRemux = false;

  // 1. Container check
  const safeContainers = ['mkv', 'mp4', 'webm', 'ts', 'm4v'];
  if (container && !safeContainers.includes(container)) {
    reasons.push(`Container '${container.toUpperCase()}' is not natively supported by Chromecast 4K; remuxing to MKV/MP4 recommended.`);
    containerNeedsRemux = true;
  }

  // 2. Video Stream Analysis
  if (videoStreams.length === 0) {
    reasons.push('No video stream detected in file.');
  } else {
    const mainVideo = videoStreams[0];
    const codec = (mainVideo.codec || '').toLowerCase();
    const pixFmt = (mainVideo.pixelFormat || '').toLowerCase();
    const bitDepth = mainVideo.bitDepth || (pixFmt.includes('10le') || pixFmt.includes('p10') ? 10 : 8);

    if (codec.includes('h264') || codec.includes('avc')) {
      if (bitDepth > 8 || pixFmt.includes('10le') || pixFmt.includes('444') || mainVideo.profile?.toLowerCase().includes('high 10')) {
        videoNeedsReencode = true;
        reasons.push(
          `H.264 10-Bit / High 10 profile (${pixFmt || '10-bit'}) detected. Chromecast 4K lacks 10-bit H.264 hardware decoding and will force Jellyfin to transcode.`
        );
      }
    } else if (codec.includes('hevc') || codec.includes('h265')) {
      // HEVC is great on Chromecast 4K (Main and Main 10 supported)
      if (pixFmt.includes('444')) {
        videoNeedsReencode = true;
        reasons.push(`HEVC 4:4:4 chroma format (${pixFmt}) is unsupported on Chromecast 4K hardware.`);
      }
    } else if (codec.includes('mpeg2') || codec.includes('mpeg4') || codec.includes('xvid') || codec.includes('divx') || codec.includes('vc1') || codec.includes('wmv')) {
      videoNeedsReencode = true;
      reasons.push(`Legacy video codec '${mainVideo.codecLong || codec.toUpperCase()}' cannot be direct-played on Chromecast 4K.`);
    }
  }

  // 3. Audio Stream Analysis
  audioStreams.forEach((audio, idx) => {
    const aCodec = (audio.codec || '').toLowerCase();
    const channels = audio.channels || 2;

    if (aCodec.includes('truehd') || aCodec.includes('atmos')) {
      if (!profile.allowTrueHDDirect) {
        audioNeedsReencode = true;
        reasons.push(`Audio stream #${idx + 1} (${audio.codecLong || 'Dolby TrueHD'}) will trigger Jellyfin audio transcoding on Chromecast 4K.`);
      }
    } else if (aCodec.includes('dts') || aCodec.includes('ca71') || aCodec.includes('dca')) {
      if (!profile.allowDTSDirect) {
        audioNeedsReencode = true;
        reasons.push(`Audio stream #${idx + 1} (${audio.codecLong || 'DTS / DTS-HD MA'}) triggers audio transcoding on Chromecast 4K.`);
      }
    } else if (aCodec.includes('pcm') || aCodec.includes('lpcm') || aCodec.includes('wma') || aCodec.includes('vorbis')) {
      audioNeedsReencode = true;
      reasons.push(`Uncompressed / unhandled audio format '${aCodec.toUpperCase()}' on stream #${idx + 1} requires audio conversion.`);
    }
  });

  // 4. Subtitle Stream Analysis
  subtitleStreams.forEach((sub, idx) => {
    const sCodec = (sub.codec || '').toLowerCase();
    if (sCodec.includes('pgs') || sCodec.includes('hdmv') || sCodec.includes('sup') || sCodec.includes('vobsub') || sCodec.includes('dvd_subtitle')) {
      subtitleNeedsExtraction = true;
      reasons.push(`Bitmap subtitle stream #${idx + 1} (${sCodec.toUpperCase()}) forces Jellyfin to perform full video burn-in transcoding.`);
    } else if (sCodec.includes('ass') || sCodec.includes('ssa')) {
      subtitleNeedsExtraction = true;
      reasons.push(`Styled ASS/SSA subtitle stream #${idx + 1} will force video burn-in transcoding on Chromecast unless converted to SRT.`);
    }
  });

  const needsTranscode = reasons.length > 0;

  // Generate FFmpeg Command & Recommendations
  const rawPath = item.filePath || `${item.directory || '/media'}/${item.fileName || 'file.mkv'}`;
  const dirName = rawPath.substring(0, rawPath.lastIndexOf('/')) || '.';
  const baseName = rawPath.substring(rawPath.lastIndexOf('/') + 1);
  const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.')) || baseName;
  const targetExt = 'mkv'; // MKV supports all stream types safely

  let targetVideoCodec: 'libx265' | 'libx264' | 'copy' = 'copy';
  let targetAudioCodec: 'ac3' | 'aac' | 'eac3' | 'copy' = 'copy';
  let targetSubtitleAction: 'extract_srt' | 'convert_vtt' | 'copy' | 'burn_in_not_recommended' = 'copy';
  let estimatedSpeed: 'Ultra Fast (Remux only)' | 'Fast (Audio transcode only)' | 'Normal (Full encode)' = 'Ultra Fast (Remux only)';

  let vCmd = '-c:v copy';
  let aCmd = '-c:a copy';
  let sCmd = '-c:s copy';

  if (videoNeedsReencode) {
    targetVideoCodec = 'libx265';
    // Visually transparent lossy video encoding (CRF 18 + 10-bit HEVC color depth)
    vCmd = '-c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le -tag:v hvc1';
    estimatedSpeed = 'Normal (Full encode)';
  }

  if (audioNeedsReencode) {
    targetAudioCodec = 'eac3';
    // Audibly transparent lossy audio encoding (E-AC-3 768k or AC-3 640k for multi-channel)
    aCmd = '-c:a eac3 -b:a 768k';
    if (estimatedSpeed === 'Ultra Fast (Remux only)') {
      estimatedSpeed = 'Fast (Audio transcode only)';
    }
  }

  if (subtitleNeedsExtraction) {
    targetSubtitleAction = 'extract_srt';
    // Remove bitmap/ASS subs from video container or turn text subs into srt
    sCmd = '-c:s srt';
  }

  // Construct shell command
  const inputPath = `"${rawPath}"`;
  const tempPath = `"${dirName}/${nameWithoutExt}.tmp.${targetExt}"`;
  const finalDestPath = `"${rawPath}"`;
  const optPath = `"${dirName}/${nameWithoutExt}.optimized.${targetExt}"`;

  const outputPath = overwriteOriginal
    ? `${tempPath} && mv -f ${tempPath} ${finalDestPath}`
    : optPath;

  let suggestedFfmpegCommand = `ffmpeg -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} -map 0 ${outputPath}`;
  const commandOptions: { id: string; label: string; command: string; note?: string; recommended?: boolean }[] = [];

  if (subtitleNeedsExtraction && !videoNeedsReencode && !audioNeedsReencode) {
    const step1Out = overwriteOriginal ? `${tempPath} && mv -f ${tempPath} ${finalDestPath}` : optPath;
    const stripCmd = `ffmpeg -i ${inputPath} ${vCmd} ${aCmd} -sn ${step1Out}`;
    const srtCmd = `ffmpeg -i ${inputPath} -map 0:s:0 "${dirName}/${nameWithoutExt}.en.srt"`;

    commandOptions.push({
      id: 'strip-subs',
      label: 'Option 1: Strip Image Subtitles & Fast Remux',
      command: stripCmd,
      note: 'Removes image/bitmap subtitles causing Jellyfin transcode burn-in.',
      recommended: true,
    });
    commandOptions.push({
      id: 'extract-srt',
      label: 'Option 2: Extract Subtitle Track to External SRT Sidecar',
      command: srtCmd,
      note: 'Extracts text subtitle stream to a sidecar .srt file for direct playback.',
    });
    suggestedFfmpegCommand = stripCmd;
  } else if (!videoNeedsReencode && audioNeedsReencode) {
    const remuxCmd = `ffmpeg -i ${inputPath} -c:v copy ${aCmd} ${sCmd} -map 0 ${outputPath}`;
    commandOptions.push({
      id: 'audio-transcode',
      label: 'Audio Transcode & Remux (E-AC-3 @ 768k / AC-3 @ 640k)',
      command: remuxCmd,
      note: 'Fast audio conversion while keeping video stream bit-for-bit identical.',
      recommended: true,
    });
    suggestedFfmpegCommand = remuxCmd;
  } else if (videoNeedsReencode) {
    const cpuCmd = `ffmpeg -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} -map 0 ${outputPath}`;
    const qsvCmd = `ffmpeg -init_hw_device qsv=hw -filter_hw_device hw -i ${inputPath} -c:v hevc_qsv -preset medium -global_quality 18 ${aCmd} ${sCmd} -map 0 ${outputPath}`;
    const vaapiCmd = `ffmpeg -vaapi_device /dev/dri/renderD128 -i ${inputPath} -vf 'format=nv12,hwupload' -c:v hevc_vaapi -qp 18 ${aCmd} ${sCmd} -map 0 ${outputPath}`;

    commandOptions.push({
      id: 'cpu-transcode',
      label: 'Option 1: Guaranteed CPU Transcode (CRF 18 - x265 10-bit)',
      command: cpuCmd,
      note: 'Universal CPU transcode. Works on all machines without requiring GPU render device permissions.',
      recommended: true,
    });
    commandOptions.push({
      id: 'qsv-transcode',
      label: 'Option 2: Intel QSV Hardware Acceleration (i7-7700T / HD 630 iGPU)',
      command: qsvCmd,
      note: 'Fast Intel QuickSync hardware encoding. Note: User must be in render group (`sudo usermod -aG render,video $USER`).',
    });
    commandOptions.push({
      id: 'vaapi-transcode',
      label: 'Option 3: Intel VA-API Hardware Acceleration (/dev/dri/renderD128)',
      command: vaapiCmd,
      note: 'Direct VA-API hardware encoder for Linux kernel render node.',
    });
    suggestedFfmpegCommand = cpuCmd;
  } else {
    const defaultCmd = `ffmpeg -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} -map 0 ${outputPath}`;
    commandOptions.push({
      id: 'default-cmd',
      label: 'FFmpeg Command',
      command: defaultCmd,
      recommended: true,
    });
    suggestedFfmpegCommand = defaultCmd;
  }

  const summary = needsTranscode
    ? videoNeedsReencode
      ? 'Requires Full Video Transcode for Chromecast 4K playback.'
      : audioNeedsReencode
      ? 'Requires Fast Audio Remux/Conversion (Video is Direct Play compatible!).'
      : 'Requires Subtitle Extraction/Strip to prevent Jellyfin video burn-in.'
    : '100% Direct Play Compatible with Chromecast 4K on Jellyfin!';

  return {
    needsTranscode,
    reasons,
    recommendation: {
      summary,
      targetContainer: targetExt,
      targetVideoCodec,
      targetAudioCodec,
      targetSubtitleAction,
      suggestedFfmpegCommand,
      commandOptions,
      estimatedSpeed,
      hardwareAccelOption: 'Intel QSV / VA-API (i7-7700T / HD 630)',
    },
  };
}
