import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { AppConfig, MediaItem, NotificationLog, SystemInfo } from './src/types';
import { analyzeMediaForChromecast, DEFAULT_CHROMECAST_PROFILE } from './src/utils/chromecastSpecs';
import { getProcessedInitialMedia } from './src/utils/mockMediaGenerator';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;


app.use(express.json());

// In-Memory Application State
let appConfig: AppConfig = {
  ntfy: {
    serverUrl: process.env.NTFY_URL || 'http://homelab:100/',
    topic: process.env.NTFY_TOPIC || 'jellyfin-transcode',
    priority: 'high',
    tags: [],
    notifyOnlyOnTranscodeNeeded: true,
    includeFfmpegCommand: true,
  },
  directories: [
    {
      id: 'dir-movies',
      path: '/media/movies',
      label: 'Movies Library',
      mediaType: 'movie',
      recursive: true,
      enabled: true,
      lastScanTime: new Date().toISOString(),
      itemCount: 2,
    },
    {
      id: 'dir-tv',
      path: '/media/tv',
      label: 'TV Shows Library',
      mediaType: 'tv',
      recursive: true,
      enabled: true,
      lastScanTime: new Date().toISOString(),
      itemCount: 2,
    },
  ],
  chromecastProfile: DEFAULT_CHROMECAST_PROFILE,
  autoScanIntervalMinutes: 15,
  autoScanEnabled: true,
};

let mediaDatabase: MediaItem[] = getProcessedInitialMedia();
let notificationLogs: NotificationLog[] = [];

// Helper function to dispatch ntfy notifications
async function dispatchNtfyNotification(item: MediaItem, customTopic?: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const ntfy = appConfig.ntfy;
  const baseUrl = (ntfy.serverUrl || 'http://homelab:100/').replace(/\/+$/, '');
  const topic = customTopic || ntfy.topic || 'jellyfin-transcode';
  const fullNtfyUrl = `${baseUrl}/${topic}`;

  let cleanTitle = item.title || '';
  if (cleanTitle.toLowerCase().startsWith('transcode alert for:')) {
    cleanTitle = cleanTitle.replace(/^transcode alert for:\s*/i, '');
  } else if (cleanTitle.toLowerCase().startsWith('transcode alert:')) {
    cleanTitle = cleanTitle.replace(/^transcode alert:\s*/i, '');
  }
  const title = `Transcode Alert: ${cleanTitle}`;
  const sizeGB = (item.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2);

  let body = `**File:** \`${item.fileName}\`\n`;
  body += `**Size:** ${sizeGB} GB\n`;
  body += `**Path:** \`${item.filePath}\`\n\n`;

  if (item.transcodeReasons && item.transcodeReasons.length > 0) {
    body += `**Transcode Issues:**\n`;
    body += item.transcodeReasons.map((r) => `• ${r}`).join('\n') + '\n\n';
  }

  if (item.recommendation) {
    body += `**Recommendation:**\n${item.recommendation.summary}\n`;
    if (ntfy.includeFfmpegCommand && item.recommendation.suggestedFfmpegCommand) {
      body += `\n**Suggested FFmpeg Command:**\n\`\`\`bash\n${item.recommendation.suggestedFfmpegCommand}\n\`\`\``;
    }
  }

  const logEntry: NotificationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    mediaTitle: item.title,
    filePath: item.filePath,
    topic,
    status: 'sent',
    reasons: item.transcodeReasons,
    ffmpegCommand: item.recommendation?.suggestedFfmpegCommand || '',
  };

  try {
    const priorityMap: Record<string, number> = {
      min: 1,
      low: 2,
      default: 3,
      high: 4,
      urgent: 5,
    };
    const priorityValue = priorityMap[ntfy.priority || 'high'] || 4;
    const tagsList = ntfy.tags || [];

    // Standard ntfy JSON publishing requires POSTing to the ROOT server URL (e.g. http://homelab:100/)
    let jsonServerUrl = baseUrl;
    if (jsonServerUrl.endsWith(`/${topic}`)) {
      jsonServerUrl = jsonServerUrl.substring(0, jsonServerUrl.length - (topic.length + 1));
    }
    const rootUrl = `${jsonServerUrl}/`;

    const payload = {
      topic,
      title,
      message: body,
      priority: priorityValue,
      tags: tagsList,
      markdown: true,
    };

    const jsonHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ntfy.authToken) {
      jsonHeaders['Authorization'] = `Bearer ${ntfy.authToken}`;
    }

    // 1. Primary: POST JSON payload to root ntfy server URL
    let response = await fetch(rootUrl, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    // 2. Fallback: If root URL fails or returns error, POST plain text body to topic URL with headers
    if (!response.ok) {
      const topicUrl = `${baseUrl}/${topic}`;
      const textHeaders: Record<string, string> = {
        'Title': title,
        'Priority': String(priorityValue),
        'Tags': tagsList.join(','),
        'Markdown': 'yes',
      };

      if (ntfy.authToken) {
        textHeaders['Authorization'] = `Bearer ${ntfy.authToken}`;
      }

      response = await fetch(topicUrl, {
        method: 'POST',
        headers: textHeaders,
        body,
      });
    }

    logEntry.statusCode = response.status;

    if (response.ok) {
      logEntry.status = 'sent';
      notificationLogs.unshift(logEntry);
      return { success: true, statusCode: response.status };
    } else {
      const errText = await response.text().catch(() => 'HTTP Error');
      logEntry.status = 'failed';
      logEntry.errorMessage = errText;
      notificationLogs.unshift(logEntry);
      return { success: false, statusCode: response.status, error: errText };
    }
  } catch (err: any) {
    logEntry.status = 'failed';
    logEntry.errorMessage = err.message || 'Network request failed';
    notificationLogs.unshift(logEntry);
    return { success: false, error: err.message || 'Network request failed' };
  }
}

// Check ffprobe availability on system
let systemFfprobeAvailable = false;
exec('ffprobe -version', (error) => {
  systemFfprobeAvailable = !error;
});

// API Routes
app.get('/api/system-info', (req: Request, res: Response) => {
  const info: SystemInfo = {
    hostname: process.env.HOSTNAME || 'ubuntu-homelab-server',
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.floor(process.uptime()),
    hasFfprobe: systemFfprobeAvailable,
    hasFfmpeg: systemFfprobeAvailable,
    isTailscaleDetected: fs.existsSync('/run/tailscale/tailscaled.sock') || Boolean(process.env.TAILSCALE_IP),
    nodeVersion: process.version,
  };
  res.json(info);
});

app.get('/api/config', (req: Request, res: Response) => {
  res.json(appConfig);
});

app.post('/api/config', (req: Request, res: Response) => {
  if (req.body) {
    appConfig = { ...appConfig, ...req.body };
  }
  res.json({ status: 'ok', config: appConfig });
});

app.get('/api/media', (req: Request, res: Response) => {
  res.json(mediaDatabase);
});

app.get('/api/logs', (req: Request, res: Response) => {
  res.json(notificationLogs);
});

app.post('/api/directories/test', (req: Request, res: Response) => {
  const { path: dirPath } = req.body;
  if (!dirPath) {
    res.status(400).json({ exists: false, error: 'Path is required' });
    return;
  }
  try {
    const exists = fs.existsSync(dirPath);
    let isDirectory = false;
    let fileCount = 0;
    if (exists) {
      const stat = fs.statSync(dirPath);
      isDirectory = stat.isDirectory();
      if (isDirectory) {
        fileCount = fs.readdirSync(dirPath).length;
      }
    }
    res.json({ exists, isDirectory, fileCount, path: dirPath });
  } catch (err: any) {
    res.json({ exists: false, isDirectory: false, error: err.message });
  }
});

// Trigger directory scan & analyze files
app.post('/api/scan', async (req: Request, res: Response) => {
  const { directoryId } = req.body;

  const targetDirs = directoryId
    ? appConfig.directories.filter((d) => d.id === directoryId)
    : appConfig.directories.filter((d) => d.enabled);

  const scannedItems: MediaItem[] = [];
  const newlyDispatched: string[] = [];

  for (const dir of targetDirs) {
    dir.lastScanTime = new Date().toISOString();
    
    // Check if path exists on local host system
    if (fs.existsSync(dir.path)) {
      try {
        const readFilesRecursively = (currentPath: string, depth = 0): string[] => {
          if (depth > 5) return [];
          let results: string[] = [];
          const entries = fs.readdirSync(currentPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory() && dir.recursive) {
              results = results.concat(readFilesRecursively(fullPath, depth + 1));
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).toLowerCase();
              if (['.mkv', '.mp4', '.avi', '.m2ts', '.ts', '.mov', '.webm', '.vob', '.wmv'].includes(ext)) {
                results.push(fullPath);
              }
            }
          }
          return results;
        };

        const foundFiles = readFilesRecursively(dir.path);
        dir.itemCount = foundFiles.length;

        for (const filePath of foundFiles) {
          const fileName = path.basename(filePath);
          const stat = fs.statSync(filePath);
          const ext = path.extname(fileName).replace('.', '').toLowerCase();

          // Infer basic metadata from filename if ffprobe is not installed
          const title = fileName.replace(/\.[^/.]+$/, '').replace(/[._]/g, ' ');
          const isTv = /S\d{2}E\d{2}/i.test(fileName) || dir.mediaType === 'tv';

          const inferredItem: Partial<MediaItem> = {
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            fileName,
            filePath,
            directory: dir.path,
            title,
            mediaType: isTv ? 'tv' : 'movie',
            fileSizeBytes: stat.size,
            durationSeconds: 5400,
            container: ext,
            addedAt: stat.birthtime.toISOString(),
            lastScannedAt: new Date().toISOString(),
            streams: [
              {
                index: 0,
                type: 'video',
                codec: fileName.toLowerCase().includes('10bit') && fileName.toLowerCase().includes('h264') ? 'h264' : (fileName.toLowerCase().includes('hevc') ? 'hevc' : 'h264'),
                profile: fileName.toLowerCase().includes('10bit') ? 'High 10' : 'High',
                pixelFormat: fileName.toLowerCase().includes('10bit') ? 'yuv420p10le' : 'yuv420p',
                width: 1920,
                height: 1080,
              },
              {
                index: 1,
                type: 'audio',
                codec: fileName.toLowerCase().includes('dts') ? 'dts' : (fileName.toLowerCase().includes('truehd') ? 'truehd' : 'ac3'),
                channels: 6,
              },
            ],
          };

          const analysis = analyzeMediaForChromecast(inferredItem, appConfig.chromecastProfile);
          const fullMediaItem: MediaItem = {
            ...(inferredItem as MediaItem),
            needsTranscode: analysis.needsTranscode,
            transcodeReasons: analysis.reasons,
            recommendation: analysis.recommendation,
          };

          scannedItems.push(fullMediaItem);

          // Update in-memory DB
          const existingIdx = mediaDatabase.findIndex((m) => m.filePath === filePath);
          if (existingIdx >= 0) {
            mediaDatabase[existingIdx] = fullMediaItem;
          } else {
            mediaDatabase.unshift(fullMediaItem);
          }

          // Trigger ntfy notification if required
          if (fullMediaItem.needsTranscode && appConfig.ntfy.notifyOnlyOnTranscodeNeeded) {
            await dispatchNtfyNotification(fullMediaItem);
            newlyDispatched.push(fullMediaItem.title);
          }
        }
      } catch (err: any) {
        console.error(`Error scanning directory ${dir.path}:`, err);
      }
    } else {
      // Path does not exist on this environment; re-evaluate simulated directory items
      dir.itemCount = mediaDatabase.filter((m) => m.directory === dir.path || m.filePath.startsWith(dir.path)).length;
    }
  }

  // Also trigger alerts for existing simulated transcode items if requested
  const itemsNeedingTranscode = mediaDatabase.filter((m) => m.needsTranscode);
  
  res.json({
    status: 'ok',
    directoriesScanned: targetDirs.length,
    scannedItemsCount: scannedItems.length,
    totalMediaCount: mediaDatabase.length,
    transcodeCount: itemsNeedingTranscode.length,
    newlyDispatched,
  });
});

// Test ntfy notification
app.post('/api/ntfy/test', async (req: Request, res: Response) => {
  const { testMessage, serverUrl, topic } = req.body;
  
  const sampleItem: MediaItem = {
    id: 'test-item',
    fileName: 'Inception.2010.1080p.10bit.H264.DTS-HD.MA.mkv',
    filePath: '/media/movies/Inception.2010.1080p.10bit.H264.DTS-HD.MA.mkv',
    directory: '/media/movies',
    title: testMessage || 'Test Media Item - Inception (2010)',
    mediaType: 'movie',
    fileSizeBytes: 14200000000,
    durationSeconds: 8880,
    container: 'mkv',
    addedAt: new Date().toISOString(),
    lastScannedAt: new Date().toISOString(),
    streams: [],
    needsTranscode: true,
    transcodeReasons: [
      'H.264 10-Bit profile causes CPU video transcode on Chromecast 4K.',
      'DTS-HD MA 5.1 audio stream causes Jellyfin audio transcoding.',
    ],
    recommendation: {
      summary: 'Requires audio conversion & video re-encode to HEVC 10-bit or H.264 8-bit.',
      targetContainer: 'mkv',
      targetVideoCodec: 'libx265',
      targetAudioCodec: 'ac3',
      targetSubtitleAction: 'copy',
      suggestedFfmpegCommand: 'ffmpeg -i "/media/movies/Inception.2010.mkv" -c:v libx265 -crf 20 -c:a ac3 -b:a 640k "/media/movies/Inception.2010.optimized.mkv"',
      estimatedSpeed: 'Normal (Full encode)',
    },
  };

  const overrideTopic = topic || appConfig.ntfy.topic;
  if (serverUrl) {
    appConfig.ntfy.serverUrl = serverUrl;
  }

  const result = await dispatchNtfyNotification(sampleItem, overrideTopic);
  res.json(result);
});

// Manually analyze custom uploaded/pasted file metadata
app.post('/api/analyze', (req: Request, res: Response) => {
  const itemData: Partial<MediaItem> = req.body;
  if (!itemData.fileName) {
    res.status(400).json({ error: 'Filename is required' });
    return;
  }
  const result = analyzeMediaForChromecast(itemData, appConfig.chromecastProfile);
  res.json(result);
});

// Download Ubuntu deployment scripts
app.get('/api/export-deploy', (req: Request, res: Response) => {
  const ntfyUrl = appConfig.ntfy.serverUrl;
  const topic = appConfig.ntfy.topic;

  const dockerCompose = `version: '3.8'
services:
  jellyfin-transcode-notifier:
    build: .
    container_name: jellyfin-transcode-notifier
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /media:/media:ro
      - ./config:/app/config
    environment:
      - NODE_ENV=production
      - NTFY_URL=${ntfyUrl}
      - NTFY_TOPIC=${topic}
      - PORT=3000
    network_mode: host
`;

  const systemdService = `[Unit]
Description=Jellyfin Chromecast Transcode Notifier
After=network.target jellyfin.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/jellyfin-transcode-notifier
ExecStart=/usr/bin/node /opt/jellyfin-transcode-notifier/dist/server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=NTFY_URL=${ntfyUrl}
Environment=NTFY_TOPIC=${topic}
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
`;

  const installScript = `#!/bin/bash
# Installation script for Ubuntu 26.04 LTS / Debian
echo "=== Installing Jellyfin Chromecast Transcode Notifier ==="

# 1. Update packages & install dependencies
sudo apt update && sudo apt install -y nodejs npm ffmpeg curl git tailscale

# 2. Setup application directory
sudo mkdir -p /opt/jellyfin-transcode-notifier
sudo cp -r . /opt/jellyfin-transcode-notifier/
cd /opt/jellyfin-transcode-notifier

# 3. Build production bundle
npm install
npm run build

# 4. Install systemd service
sudo cp jellyfin-transcode.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jellyfin-transcode.service

echo ""
echo "✅ Installation complete!"
echo "Server running at http://localhost:3000 or via Tailscale!"
echo "Access via ntfy: ${ntfyUrl}${topic}"
`;

  res.json({
    dockerCompose,
    systemdService,
    installScript,
  });
});

async function startServer() {
  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Jellyfin Transcode Notifier listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
