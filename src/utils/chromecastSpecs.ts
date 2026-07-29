import { MediaItem, ChromecastProfile, TranscodeRecommendation, StreamInfo } from '../types';

export const ISO_LANGUAGES: Record<string, string> = {
  eng: 'English',
  en: 'English',
  dan: 'Danish',
  da: 'Danish',
  swe: 'Swedish',
  sv: 'Swedish',
  nor: 'Norwegian',
  nob: 'Norwegian',
  nno: 'Norwegian',
  no: 'Norwegian',
  fin: 'Finnish',
  fi: 'Finnish',
  spa: 'Spanish',
  es: 'Spanish',
  fre: 'French',
  fra: 'French',
  fr: 'French',
  ger: 'German',
  deu: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  jpn: 'Japanese',
  ja: 'Japanese',
  chi: 'Chinese',
  zho: 'Chinese',
  zh: 'Chinese',
  rus: 'Russian',
  ru: 'Russian',
  por: 'Portuguese',
  pt: 'Portuguese',
  kor: 'Korean',
  ko: 'Korean',
  nld: 'Dutch',
  dut: 'Dutch',
  nl: 'Dutch',
  pol: 'Polish',
  pl: 'Polish',
  ces: 'Czech',
  cze: 'Czech',
  cs: 'Czech',
  hun: 'Hungarian',
  hu: 'Hungarian',
  gre: 'Greek',
  ell: 'Greek',
  el: 'Greek',
  tur: 'Turkish',
  tr: 'Turkish',
  ara: 'Arabic',
  ar: 'Arabic',
  heb: 'Hebrew',
  he: 'Hebrew',
  hin: 'Hindi',
  hi: 'Hindi',
  tha: 'Thai',
  th: 'Thai',
  vie: 'Vietnamese',
  vi: 'Vietnamese',
  ind: 'Indonesian',
  id: 'Indonesian',
  ukr: 'Ukrainian',
  uk: 'Ukrainian',
  ron: 'Romanian',
  rum: 'Romanian',
  ro: 'Romanian',
  bul: 'Bulgarian',
  bg: 'Bulgarian',
  hrv: 'Croatian',
  hr: 'Croatian',
  srp: 'Serbian',
  sr: 'Serbian',
  slv: 'Slovenian',
  sl: 'Slovenian',
  slk: 'Slovak',
  slo: 'Slovak',
  sk: 'Slovak',
  cat: 'Catalan',
  ca: 'Catalan',
  eus: 'Basque',
  baq: 'Basque',
  eu: 'Basque',
  glg: 'Galician',
  gl: 'Galician',
  und: 'Unknown',
};

export function getLanguageDisplayName(langCode?: string): string {
  if (!langCode) return '';
  const cleaned = langCode.trim().toLowerCase();
  if (ISO_LANGUAGES[cleaned]) {
    return ISO_LANGUAGES[cleaned];
  }
  if (cleaned.length > 3) {
    return langCode.charAt(0).toUpperCase() + langCode.slice(1);
  }
  return langCode.toUpperCase();
}

export function getFriendlyCodecName(stream: StreamInfo): string {
  const codec = (stream.codec || '').toLowerCase();
  const codecLong = (stream.codecLong || '').toLowerCase();
  const profile = (stream.profile || '').toLowerCase();
  const title = (stream.title || '').toLowerCase();

  if (stream.type === 'audio') {
    if (codec === 'dts') {
      if (codecLong.includes('master audio') || profile.includes('ma') || title.includes('ma') || codecLong.includes('dts-hd ma')) {
        return 'DTS-HD MA';
      }
      if (codecLong.includes('high resolution') || profile.includes('hr') || title.includes('hr')) {
        return 'DTS-HD HR';
      }
      if (codecLong.includes('dts-hd') || profile.includes('dts-hd') || title.includes('dts-hd')) {
        return 'DTS-HD';
      }
      return 'DTS';
    }
    if (codec === 'ac3') {
      return 'Dolby Digital';
    }
    if (codec === 'eac3') {
      if (codecLong.includes('atmos') || title.includes('atmos')) {
        return 'Dolby Digital Plus with Atmos';
      }
      return 'Dolby Digital Plus';
    }
    if (codec === 'truehd') {
      if (codecLong.includes('atmos') || title.includes('atmos')) {
        return 'Dolby TrueHD Atmos';
      }
      return 'Dolby TrueHD';
    }
    if (codec === 'aac') return 'AAC';
    if (codec === 'flac') return 'FLAC';
    if (codec === 'opus') return 'Opus';
    if (codec === 'mp3') return 'MP3';
    if (codec === 'vorbis') return 'Vorbis';
    if (codec.startsWith('pcm')) return 'PCM';
    return stream.codec.toUpperCase();
  }

  if (stream.type === 'subtitle') {
    if (codec === 'subrip' || codec === 'srt') return 'SRT';
    if (codec === 'ass' || codec === 'ssa') return 'ASS/SSA';
    if (codec === 'pgs' || codec === 'hdmv_pgs_subtitle') return 'PGS';
    if (codec === 'vtt' || codec === 'webvtt') return 'VTT';
    if (codec === 'vobsub' || codec === 'dvd_subtitle') return 'VobSub';
    return stream.codec.toUpperCase();
  }

  return stream.codec.toUpperCase();
}

export function getChannelLayoutDisplayName(stream: StreamInfo): string {
  if (stream.channelLayout) {
    const cl = stream.channelLayout.toLowerCase();
    if (cl.includes('5.1')) return '5.1';
    if (cl.includes('7.1')) return '7.1';
    if (cl.includes('stereo')) return '2.0';
    if (cl.includes('mono')) return '1.0';
    return stream.channelLayout;
  }
  if (stream.channels) {
    if (stream.channels === 8) return '7.1';
    if (stream.channels === 6) return '5.1';
    if (stream.channels === 2) return '2.0';
    if (stream.channels === 1) return '1.0';
    return `${stream.channels}ch`;
  }
  return '';
}

export function getFormattedStreamTitle(stream: StreamInfo): string {
  const parts: string[] = [];

  const lang = getLanguageDisplayName(stream.language);
  const friendlyCodec = getFriendlyCodecName(stream);
  const channels = getChannelLayoutDisplayName(stream);
  const rawTitle = (stream.title || '').trim();

  if (stream.type === 'audio') {
    if (rawTitle) {
      parts.push(rawTitle);
    }
    if (lang) {
      parts.push(lang);
    }
    if (!rawTitle || !rawTitle.toLowerCase().includes(friendlyCodec.toLowerCase())) {
      parts.push(friendlyCodec);
    }
    if (channels && !rawTitle.toLowerCase().includes(channels.toLowerCase())) {
      parts.push(channels);
    }
  } else if (stream.type === 'subtitle') {
    if (lang) {
      parts.push(lang);
    }
    parts.push(friendlyCodec);
    if (rawTitle && !rawTitle.toLowerCase().includes(friendlyCodec.toLowerCase())) {
      parts.push(rawTitle);
    }
  } else {
    if (lang) parts.push(lang);
    parts.push(friendlyCodec);
    if (stream.width && stream.height) {
      parts.push(`${stream.width}x${stream.height}`);
    }
  }

  if (stream.isDefault) {
    parts.push('Default');
  }
  if (stream.isForced) {
    parts.push('Forced');
  }

  const uniqueParts: string[] = [];
  parts.forEach((p) => {
    if (p && (!uniqueParts.length || uniqueParts[uniqueParts.length - 1].toLowerCase() !== p.toLowerCase())) {
      uniqueParts.push(p);
    }
  });

  return uniqueParts.join(' - ');
}

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

export function isEnglishStream(stream: StreamInfo): boolean {
  if (!stream) return false;
  const lang = (stream.language || '').toLowerCase().trim();
  const title = (stream.title || '').toLowerCase().trim();

  if (
    lang === 'eng' ||
    lang === 'en' ||
    lang.startsWith('en-') ||
    lang.startsWith('eng') ||
    lang === 'english'
  ) {
    return true;
  }
  if (
    title.includes('english') ||
    /\beng\b/i.test(title) ||
    /\ben\b/i.test(title)
  ) {
    return true;
  }
  // Fallback: If no language tag/title is present, treat as English / primary
  if (!lang && !title) {
    return true;
  }
  return false;
}

export function buildFfmpegMapFlags(
  item: Partial<MediaItem>,
  selectedStreamIndices?: number[]
): {
  mapFlags: string;
  mapFlagsNoSubs: string;
  truncatedAudioCount: number;
  truncatedSubCount: number;
} {
  const streams = item.streams || [];
  if (!selectedStreamIndices) {
    return {
      mapFlags: '-map 0',
      mapFlagsNoSubs: '-map "0:v?" -map "0:a?"',
      truncatedAudioCount: 0,
      truncatedSubCount: 0,
    };
  }

  const selectedSet = new Set(selectedStreamIndices);
  const videoStreams = streams.filter((s) => s.type === 'video');
  const audioStreams = streams.filter((s) => s.type === 'audio');
  const subStreams = streams.filter((s) => s.type === 'subtitle');

  const unselectedAudio = audioStreams.filter((s) => !selectedSet.has(s.index));
  const unselectedSub = subStreams.filter((s) => !selectedSet.has(s.index));

  const mapParts: string[] = [];
  const mapPartsNoSubs: string[] = [];

  // Video
  if (videoStreams.length > 0) {
    let videoMapped = false;
    videoStreams.forEach((v) => {
      if (selectedSet.has(v.index)) {
        mapParts.push(`-map "0:${v.index}?"`);
        mapPartsNoSubs.push(`-map "0:${v.index}?"`);
        videoMapped = true;
      }
    });
    if (!videoMapped) {
      mapParts.push('-map "0:v?"');
      mapPartsNoSubs.push('-map "0:v?"');
    }
  } else {
    mapParts.push('-map "0:v?"');
    mapPartsNoSubs.push('-map "0:v?"');
  }

  // Audio (Only map audio streams explicitly present in selectedSet)
  audioStreams.forEach((a) => {
    if (selectedSet.has(a.index)) {
      mapParts.push(`-map "0:${a.index}?"`);
      mapPartsNoSubs.push(`-map "0:${a.index}?"`);
    }
  });

  // Subtitles
  subStreams.forEach((s) => {
    if (selectedSet.has(s.index)) {
      mapParts.push(`-map "0:${s.index}?"`);
    }
  });

  return {
    mapFlags: mapParts.length > 0 ? mapParts.join(' ') : '-map 0',
    mapFlagsNoSubs: mapPartsNoSubs.length > 0 ? mapPartsNoSubs.join(' ') : '-map "0:v?" -map "0:a?"',
    truncatedAudioCount: unselectedAudio.length,
    truncatedSubCount: unselectedSub.length,
  };
}

export function analyzeMediaForChromecast(
  item: Partial<MediaItem>,
  profile: ChromecastProfile = DEFAULT_CHROMECAST_PROFILE,
  overwriteOriginal: boolean = false,
  selectedStreamIndices?: number[]
): AnalysisResult {
  const reasons: string[] = [];
  const streams = item.streams || [];
  const container = (item.container || '').toLowerCase().replace('.', '');

  const selectedSet = selectedStreamIndices ? new Set(selectedStreamIndices) : null;

  const videoStreams = streams.filter((s) => s.type === 'video');
  const audioStreams = streams.filter((s) => s.type === 'audio');
  const subtitleStreams = streams.filter((s) => s.type === 'subtitle');

  const activeVideoStreams = selectedSet
    ? videoStreams.filter((s) => selectedSet.has(s.index))
    : videoStreams;
  const activeAudioStreams = selectedSet
    ? audioStreams.filter((s) => selectedSet.has(s.index))
    : audioStreams;
  const activeSubtitleStreams = selectedSet
    ? subtitleStreams.filter((s) => selectedSet.has(s.index))
    : subtitleStreams;

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
  const videoToAnalyze = activeVideoStreams.length > 0 ? activeVideoStreams[0] : videoStreams[0];
  if (!videoToAnalyze) {
    reasons.push('No video stream detected in file.');
  } else {
    const codec = (videoToAnalyze.codec || '').toLowerCase();
    const pixFmt = (videoToAnalyze.pixelFormat || '').toLowerCase();
    const bitDepth = videoToAnalyze.bitDepth || (pixFmt.includes('10le') || pixFmt.includes('p10') ? 10 : 8);

    if (codec.includes('h264') || codec.includes('avc')) {
      if (bitDepth > 8 || pixFmt.includes('10le') || pixFmt.includes('444') || videoToAnalyze.profile?.toLowerCase().includes('high 10')) {
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
      reasons.push(`Legacy video codec '${videoToAnalyze.codecLong || codec.toUpperCase()}' cannot be direct-played on Chromecast 4K.`);
    }
  }

  // 3. Audio Stream Analysis (Only check selected/active audio streams)
  activeAudioStreams.forEach((audio) => {
    const aCodec = (audio.codec || '').toLowerCase();

    if (aCodec.includes('truehd') || aCodec.includes('atmos')) {
      if (!profile.allowTrueHDDirect) {
        audioNeedsReencode = true;
        reasons.push(`Audio stream #${audio.index} (${audio.codecLong || 'Dolby TrueHD'}) will trigger Jellyfin audio transcoding on Chromecast 4K.`);
      }
    } else if (aCodec.includes('dts') || aCodec.includes('ca71') || aCodec.includes('dca')) {
      if (!profile.allowDTSDirect) {
        audioNeedsReencode = true;
        reasons.push(`Audio stream #${audio.index} (${audio.codecLong || 'DTS / DTS-HD MA'}) triggers audio transcoding on Chromecast 4K.`);
      }
    } else if (aCodec.includes('pcm') || aCodec.includes('lpcm') || aCodec.includes('wma') || aCodec.includes('vorbis')) {
      audioNeedsReencode = true;
      reasons.push(`Uncompressed / unhandled audio format '${aCodec.toUpperCase()}' on stream #${audio.index} requires audio conversion.`);
    }
  });

  let hasBitmapSubs = false;
  let hasTextSubs = false;

  // 4. Subtitle Stream Analysis (Only check selected/active subtitle streams)
  activeSubtitleStreams.forEach((sub) => {
    const sCodec = (sub.codec || '').toLowerCase();
    if (sCodec.includes('pgs') || sCodec.includes('hdmv') || sCodec.includes('sup') || sCodec.includes('vobsub') || sCodec.includes('dvd_subtitle')) {
      subtitleNeedsExtraction = true;
      hasBitmapSubs = true;
      reasons.push(
        `Bitmap subtitle stream #${sub.index} (${sCodec.toUpperCase()}) forces Jellyfin to perform full video burn-in transcoding on Chromecast 4K. With OpenSubtitles active, strip embedded bitmap subs (-sn) so Jellyfin uses your external .srt for 100% Direct Play.`
      );
    } else if (sCodec.includes('ass') || sCodec.includes('ssa')) {
      subtitleNeedsExtraction = true;
      hasTextSubs = true;
      reasons.push(
        `Styled ASS/SSA subtitle stream #${sub.index} forces video burn-in transcoding on Chromecast unless converted to SubRip (-c:s subrip) inside MKV or replaced with an external OpenSubtitles .srt file.`
      );
    } else if (sCodec.includes('subrip') || sCodec.includes('srt') || sCodec.includes('vtt') || sCodec.includes('text')) {
      hasTextSubs = true;
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
    vCmd = '-c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le -tag:v hvc1';
    estimatedSpeed = 'Normal (Full encode)';
  }

  if (audioNeedsReencode) {
    targetAudioCodec = 'eac3';
    aCmd = '-c:a eac3 -b:a 768k';
    if (estimatedSpeed === 'Ultra Fast (Remux only)') {
      estimatedSpeed = 'Fast (Audio transcode only)';
    }
  }

  if (subtitleNeedsExtraction) {
    targetSubtitleAction = 'extract_srt';
    sCmd = '-c:s copy';
  }

  const { mapFlags, mapFlagsNoSubs, truncatedAudioCount, truncatedSubCount } = buildFfmpegMapFlags(item, selectedStreamIndices);

  // Determine target subtitle stream for external extraction
  const selectedSubStreams = subtitleStreams.filter((s) =>
    selectedStreamIndices ? selectedStreamIndices.includes(s.index) : false
  );
  const targetSubStream = selectedSubStreams.length > 0 ? selectedSubStreams[0] : subtitleStreams[0];
  const subTypeIndex = targetSubStream ? Math.max(0, subtitleStreams.indexOf(targetSubStream)) : 0;
  const subMapFlag = targetSubStream ? `-map "0:s:${subTypeIndex}?"` : '-map "0:s:0?"';

  // Construct shell command
  const inputPath = `"${rawPath}"`;
  const optPath = `"${dirName}/${nameWithoutExt}.optimized.${targetExt}"`;
  const tempPath = `"${dirName}/${nameWithoutExt}.tmp.${targetExt}"`;

  const outputPath = overwriteOriginal ? tempPath : optPath;
  const yFlag = overwriteOriginal ? '-y ' : '';
  const postProcess = overwriteOriginal ? ` && mv -f ${tempPath} ${inputPath}` : '';

  const formatCmd = (cmdBody: string) => `${cmdBody}${postProcess}`;

  const langNote = (truncatedAudioCount > 0 || truncatedSubCount > 0)
    ? `Truncating ${truncatedAudioCount} unselected audio track(s) & ${truncatedSubCount} unselected subtitle track(s).`
    : undefined;

  let suggestedFfmpegCommand = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
  const commandOptions: { id: string; label: string; command: string; note?: string; recommended?: boolean }[] = [];

  if (subtitleNeedsExtraction && !videoNeedsReencode && !audioNeedsReencode) {
    const keepCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
    const stripCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} -sn ${mapFlagsNoSubs} ${outputPath}`);

    if (hasBitmapSubs) {
      // Bitmap subtitles (PGS, SUP, VobSub) cannot be directly exported to raw .sup by FFmpeg without elementary header errors.
      // Instead, extract to a sidecar .pgs.mkv container or strip embedded bitmap subs (-sn) for Direct Play.
      const sidecarPgsCmd = `ffmpeg -y -fflags +genpts -i ${inputPath} ${subMapFlag} -c:s copy "${dirName}/${nameWithoutExt}.en.pgs.mkv"`;
      const remuxPlusPgsCmd = `${sidecarPgsCmd} && ${stripCmd}`;

      commandOptions.push({
        id: 'strip-subs',
        label: 'Option 1: Strip Bitmap Subtitles (-sn) for 100% Direct Play (Recommended)',
        command: stripCmd,
        note: 'Strips bitmap PGS subtitles completely with -sn to guarantee 100% Direct Play on Chromecast 4K without video burn-in transcode. Use Bazarr or OpenSubtitles to fetch clean text .srt files.',
        recommended: true,
      });
      commandOptions.push({
        id: 'remux-plus-pgs',
        label: 'Option 2: Remux MKV & Save PGS Subtitles as External Sidecar (.pgs.mkv)',
        command: remuxPlusPgsCmd,
        note: 'Extracts the PGS subtitle track into a sidecar .pgs.mkv container FIRST (preventing raw .sup FFmpeg packet errors), then remuxes the MKV with -sn to strip embedded PGS subtitles.',
        recommended: false,
      });
      commandOptions.push({
        id: 'keep-subs-remux',
        label: 'Option 3: Remux & Keep Subtitles (-c:s copy)',
        command: keepCmd,
        note: langNote ? `${langNote} Preserves selected subtitle tracks.` : 'Preserves selected video, audio, and subtitle tracks inside MKV. (Note: Keeps PGS subtitles embedded in MKV. Turning PGS subtitles ON in Jellyfin will trigger transcode).',
      });
      commandOptions.push({
        id: 'extract-pgs-only',
        label: 'Option 4: Extract Subtitles as External Sidecar .pgs.mkv File Only',
        command: sidecarPgsCmd,
        note: 'Extracts the bitmap subtitle track into a separate .pgs.mkv sidecar container without touching the original video file.',
      });
      suggestedFfmpegCommand = stripCmd;
    } else {
      // Text subtitles (ASS, SSA, SRT, VTT) can be converted to SubRip inside MKV or extracted directly to .srt
      const srtCmd = `ffmpeg -y -fflags +genpts -i ${inputPath} ${subMapFlag} "${dirName}/${nameWithoutExt}.en.srt"`;
      const remuxPlusSrtCmd = `${srtCmd} && ${stripCmd}`;
      const convertEmbeddedSrtCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} -c:s subrip ${mapFlags} ${outputPath}`);

      commandOptions.push({
        id: 'convert-embedded-srt',
        label: 'Option 1: Convert Embedded Subtitles to SubRip (-c:s subrip) inside MKV',
        command: convertEmbeddedSrtCmd,
        note: 'Converts styled ASS/SSA subtitle tracks directly to clean SubRip (.srt) text tracks inside the MKV container. Allows subtitle playback on Chromecast 4K with 0% video transcoding!',
        recommended: true,
      });
      commandOptions.push({
        id: 'remux-plus-srt',
        label: 'Option 2: Remux MKV & Save Subtitles as External .SRT File',
        command: remuxPlusSrtCmd,
        note: 'Extracts the text subtitle track into an external .srt file FIRST, then remuxes the MKV with -sn to strip embedded subtitles from the video file for 100% Direct Play on Chromecast.',
        recommended: false,
      });
      commandOptions.push({
        id: 'strip-subs',
        label: 'Option 3: Strip Subtitles (-sn) for 100% Direct Play',
        command: stripCmd,
        note: 'Strips subtitle streams completely with -sn. Resolves burn-in notice upon rescan and guarantees 100% Direct Play on Chromecast.',
        recommended: false,
      });
      commandOptions.push({
        id: 'keep-subs-remux',
        label: 'Option 4: Remux & Keep Subtitles (-c:s copy)',
        command: keepCmd,
        note: langNote ? `${langNote} Preserves selected subtitle tracks.` : 'Preserves selected video, audio, and subtitle tracks in MKV.',
      });
      commandOptions.push({
        id: 'extract-srt-only',
        label: 'Option 5: Extract Subtitles as External .SRT File Only (No Remux)',
        command: srtCmd,
        note: 'Extracts the subtitle track into a separate external .srt file without touching or re-processing the original video file.',
      });
      suggestedFfmpegCommand = convertEmbeddedSrtCmd;
    }
  } else if (!videoNeedsReencode && audioNeedsReencode) {
    const remuxCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} -c:v copy ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
    commandOptions.push({
      id: 'audio-transcode',
      label: 'Audio Transcode & Remux (E-AC-3 @ 768k / AC-3 @ 640k)',
      command: remuxCmd,
      note: langNote ? `${langNote} Fast audio conversion keeping video stream bit-for-bit identical.` : 'Fast audio conversion while keeping video stream bit-for-bit identical.',
      recommended: true,
    });
    suggestedFfmpegCommand = remuxCmd;
  } else if (videoNeedsReencode) {
    const cpuCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
    const qsvCmd = formatCmd(`ffmpeg ${yFlag}-init_hw_device qsv=hw -filter_hw_device hw -fflags +genpts -i ${inputPath} -c:v hevc_qsv -preset medium -global_quality 18 ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
    const vaapiCmd = formatCmd(`ffmpeg ${yFlag}-vaapi_device /dev/dri/renderD128 -fflags +genpts -i ${inputPath} -vf 'format=nv12,hwupload' -c:v hevc_vaapi -qp 18 ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);

    commandOptions.push({
      id: 'cpu-transcode',
      label: 'Option 1: Guaranteed CPU Transcode (CRF 18 - x265 10-bit)',
      command: cpuCmd,
      note: langNote ? `${langNote} Universal CPU transcode.` : 'Universal CPU transcode. Works on all machines without requiring GPU render device permissions.',
      recommended: true,
    });
    commandOptions.push({
      id: 'qsv-transcode',
      label: 'Option 2: Intel QSV Hardware Acceleration (i7-7700T / HD 630 iGPU)',
      command: qsvCmd,
      note: langNote ? `${langNote} Fast Intel QuickSync hardware encoding.` : 'Fast Intel QuickSync hardware encoding. Note: User must be in render group (`sudo usermod -aG render,video $USER`).',
    });
    commandOptions.push({
      id: 'vaapi-transcode',
      label: 'Option 3: Intel VA-API Hardware Acceleration (/dev/dri/renderD128)',
      command: vaapiCmd,
      note: 'Direct VA-API hardware encoder for Linux kernel render node.',
    });
    suggestedFfmpegCommand = cpuCmd;
  } else {
    const defaultCmd = formatCmd(`ffmpeg ${yFlag}-fflags +genpts -i ${inputPath} ${vCmd} ${aCmd} ${sCmd} ${mapFlags} ${outputPath}`);
    commandOptions.push({
      id: 'default-cmd',
      label: 'FFmpeg Command',
      command: defaultCmd,
      note: langNote,
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

export interface BatchShowOption {
  id: string;
  label: string;
  command: string;
  note?: string;
  recommended?: boolean;
}

export function generateBatchShowCommands(
  episodes: MediaItem[],
  profile: ChromecastProfile = DEFAULT_CHROMECAST_PROFILE,
  overwriteOriginal: boolean = false,
  selectedStreamIndices?: number[]
): {
  showDir: string;
  needsTranscodeCount: number;
  batchOptions: BatchShowOption[];
} {
  if (!episodes || episodes.length === 0) {
    return { showDir: '', needsTranscodeCount: 0, batchOptions: [] };
  }

  // 1. Determine show directory
  const paths = episodes.map((e) => e.filePath || '').filter(Boolean);
  let showDir = '';
  if (paths.length > 0) {
    const firstDir = paths[0].substring(0, paths[0].lastIndexOf('/'));
    if (firstDir.match(/\/season\s*\d+$/i)) {
      showDir = firstDir.substring(0, firstDir.lastIndexOf('/'));
    } else {
      showDir = firstDir;
    }
  } else {
    showDir = episodes[0].directory || '/media/tv';
  }

  // 2. Determine show-wide transcode requirements
  let videoNeedsReencode = false;
  let audioNeedsReencode = false;
  let subtitleNeedsExtraction = false;
  let transcodeCount = 0;

  episodes.forEach((ep) => {
    const analysis = analyzeMediaForChromecast(ep, profile, overwriteOriginal, selectedStreamIndices);
    if (analysis.needsTranscode) {
      transcodeCount++;
    }
    if (analysis.recommendation.targetVideoCodec !== 'copy') {
      videoNeedsReencode = true;
    }
    if (analysis.recommendation.targetAudioCodec !== 'copy') {
      audioNeedsReencode = true;
    }
    if (analysis.recommendation.targetSubtitleAction === 'extract_srt') {
      subtitleNeedsExtraction = true;
    }
  });

  const vCmd = videoNeedsReencode
    ? '-c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le -tag:v hvc1'
    : '-c:v copy';
  const aCmd = audioNeedsReencode ? '-c:a eac3 -b:a 768k' : '-c:a copy';
  const sCmd = subtitleNeedsExtraction ? '-sn' : '-c:s copy';

  let mapFlags = '-map 0';
  let langSuffixNote = '';

  if (selectedStreamIndices && selectedStreamIndices.length > 0) {
    const mapParts = ['-map "0:v?"'];
    selectedStreamIndices.forEach((idx) => {
      mapParts.push(`-map "0:${idx}?"`);
    });
    mapFlags = mapParts.join(' ');
    langSuffixNote = ` Maps selected streams (indices ${selectedStreamIndices.join(', ')}), truncating unselected tracks.`;
  }

  const yFlag = overwriteOriginal ? '-y ' : '';
  const escapedDir = `"${showDir}"`;

  const batchOptions: BatchShowOption[] = [];

  if (overwriteOriginal) {
    const recursiveFindCmd = `find ${escapedDir} -type f \\( -name "*.mkv" -o -name "*.mp4" -o -name "*.m2ts" \\) -exec sh -c 'for f; do ffmpeg ${yFlag}-fflags +genpts -i "$f" ${vCmd} ${aCmd} ${sCmd} ${mapFlags} "\${f%.*}.tmp.\${f##*.}" && mv -f "\${f%.*}.tmp.\${f##*.}" "$f"; done' _ {} +`;

    const folderLoopCmd = `for f in ${escapedDir}/*.mkv; do [ -f "$f" ] || continue; ffmpeg ${yFlag}-fflags +genpts -i "$f" ${vCmd} ${aCmd} ${sCmd} ${mapFlags} "\${f%.mkv}.tmp.mkv" && mv -f "\${f%.mkv}.tmp.mkv" "$f"; done`;

    batchOptions.push({
      id: 'batch-recursive-overwrite',
      label: 'Batch Loop (Recursive - All Seasons & Subfolders)',
      command: recursiveFindCmd,
      note: `Recursively finds all video files in the show directory (including Season folders) and processes them sequentially in-place.${langSuffixNote}`,
      recommended: true,
    });

    batchOptions.push({
      id: 'batch-folder-overwrite',
      label: 'Batch Loop (Single Directory)',
      command: folderLoopCmd,
      note: `Processes all .mkv files directly inside the specified folder in-place.${langSuffixNote}`,
    });

    if (videoNeedsReencode) {
      const qsvBatchCmd = `find ${escapedDir} -type f \\( -name "*.mkv" -o -name "*.mp4" \\) -exec sh -c 'for f; do ffmpeg ${yFlag}-init_hw_device qsv=hw -filter_hw_device hw -fflags +genpts -i "$f" -c:v hevc_qsv -preset medium -global_quality 18 ${aCmd} ${sCmd} ${mapFlags} "\${f%.*}.tmp.\${f##*.}" && mv -f "\${f%.*}.tmp.\${f##*.}" "$f"; done' _ {} +`;

      batchOptions.push({
        id: 'batch-qsv-overwrite',
        label: 'Batch Loop with Intel QSV Hardware Acceleration',
        command: qsvBatchCmd,
        note: `Hardware-accelerated Intel QuickSync HEVC batch conversion across all seasons.${langSuffixNote}`,
      });
    }
  } else {
    const recursiveFindCmd = `find ${escapedDir} -type f \\( -name "*.mkv" -o -name "*.mp4" -o -name "*.m2ts" \\) -exec sh -c 'for f; do ffmpeg -fflags +genpts -i "$f" ${vCmd} ${aCmd} ${sCmd} ${mapFlags} "\${f%.*}.optimized.\${f##*.}"; done' _ {} +`;

    const folderLoopCmd = `for f in ${escapedDir}/*.mkv; do [ -f "$f" ] || continue; ffmpeg -fflags +genpts -i "$f" ${vCmd} ${aCmd} ${sCmd} ${mapFlags} "\${f%.mkv}.optimized.mkv"; done`;

    batchOptions.push({
      id: 'batch-recursive-opt',
      label: 'Batch Loop (Recursive - All Seasons & Subfolders)',
      command: recursiveFindCmd,
      note: `Recursively converts all episodes in the show folder, outputting new .optimized files alongside originals.${langSuffixNote}`,
      recommended: true,
    });

    batchOptions.push({
      id: 'batch-folder-opt',
      label: 'Batch Loop (Single Directory)',
      command: folderLoopCmd,
      note: `Converts all .mkv files directly in the show folder into .optimized.mkv files.${langSuffixNote}`,
    });

    if (videoNeedsReencode) {
      const qsvBatchCmd = `find ${escapedDir} -type f \\( -name "*.mkv" -o -name "*.mp4" \\) -exec sh -c 'for f; do ffmpeg -init_hw_device qsv=hw -filter_hw_device hw -fflags +genpts -i "$f" -c:v hevc_qsv -preset medium -global_quality 18 ${aCmd} ${sCmd} ${mapFlags} "\${f%.*}.optimized.\${f##*.}"; done' _ {} +`;

      batchOptions.push({
        id: 'batch-qsv-opt',
        label: 'Batch Loop with Intel QSV Hardware Acceleration',
        command: qsvBatchCmd,
        note: `Hardware-accelerated Intel QuickSync HEVC batch conversion saving to .optimized files.${langSuffixNote}`,
      });
    }
  }

  return {
    showDir,
    needsTranscodeCount: transcodeCount,
    batchOptions,
  };
}

export interface BulkProcessResult {
  itemCount: number;
  transcodeCount: number;
  bulkFfmpegCommand: string;
  bashLoopCommand: string;
  items: {
    id: string;
    title: string;
    fileName: string;
    filePath: string;
    needsTranscode: boolean;
    command: string;
  }[];
}

export function generateBulkSelectedItemsCommand(
  selectedItems: MediaItem[],
  profile: ChromecastProfile = DEFAULT_CHROMECAST_PROFILE,
  overwriteMap: Record<string, boolean> = {},
  selectedStreamsMap: Record<string, number[]> = {}
): BulkProcessResult {
  if (!selectedItems || selectedItems.length === 0) {
    return {
      itemCount: 0,
      transcodeCount: 0,
      bulkFfmpegCommand: '# No items selected for batch processing',
      bashLoopCommand: '# No items selected',
      items: [],
    };
  }

  const itemsInfo: BulkProcessResult['items'] = [];
  let transcodeCount = 0;
  const individualCmds: string[] = [];
  const filePathsList: string[] = [];

  selectedItems.forEach((item) => {
    const isOverwrite = !!overwriteMap[item.id];
    const selectedIndices = selectedStreamsMap[item.id] !== undefined
      ? selectedStreamsMap[item.id]
      : (item.streams || []).map((s) => s.index);

    const analysis = analyzeMediaForChromecast(item, profile, isOverwrite, selectedIndices);
    if (analysis.needsTranscode) {
      transcodeCount++;
    }

    const cmd = analysis.recommendation?.suggestedFfmpegCommand || '';
    itemsInfo.push({
      id: item.id,
      title: item.title,
      fileName: item.fileName,
      filePath: item.filePath,
      needsTranscode: analysis.needsTranscode,
      command: cmd,
    });

    if (cmd) {
      individualCmds.push(cmd);
    }
    if (item.filePath) {
      filePathsList.push(`"${item.filePath.replace(/"/g, '\\"')}"`);
    }
  });

  // Single bulk ffmpeg command string chaining all commands sequentially
  const bulkFfmpegCommand = individualCmds.length > 0
    ? individualCmds.join(' && \\\n')
    : '# No valid commands generated';

  // Alternative bash array loop command for iterating over selected paths
  const bashLoopCommand = filePathsList.length > 0
    ? `files=(\n  ${filePathsList.join('\n  ')}\n)\n\nfor f in "\${files[@]}"; do\n  echo "Processing: $f"\n  ffmpeg -fflags +genpts -i "$f" -c:v copy -c:a eac3 -b:a 768k -sn "\${f%.*}.optimized.mkv"\ndone`
    : '';

  return {
    itemCount: selectedItems.length,
    transcodeCount,
    bulkFfmpegCommand,
    bashLoopCommand,
    items: itemsInfo,
  };
}

