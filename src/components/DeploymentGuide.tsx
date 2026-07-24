import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, ShieldCheck, Server, Cpu, ExternalLink, HardDrive } from 'lucide-react';
import { NtfySettings } from '../types';

interface DeploymentGuideProps {
  ntfy: NtfySettings;
}

export const DeploymentGuide: React.FC<DeploymentGuideProps> = ({ ntfy }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const ntfyUrl = ntfy.serverUrl || 'http://homelab:100/';
  const topic = ntfy.topic || 'jellyfin-transcode';

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadDeployPackage = async () => {
    try {
      const res = await fetch('/api/export-deploy');
      const data = await res.json();

      const combinedText = `# =========================================================
# Ubuntu 26.04 LTS Setup Package for Jellyfin Chromecast Transcode Notifier
# =========================================================

# --- 1. install.sh ---
${data.installScript}

# --- 2. docker-compose.yml ---
${data.dockerCompose}

# --- 3. jellyfin-transcode.service (Systemd) ---
${data.systemdService}
`;

      const blob = new Blob([combinedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jellyfin-transcode-notifier-ubuntu-setup.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate setup file.');
    }
  };

  const systemdScript = `# 1. Create app directory on Ubuntu host
sudo mkdir -p /opt/jellyfin-transcode-notifier
cd /opt/jellyfin-transcode-notifier

# 2. Copy code files or clone repo
git clone https://github.com/your-username/jellyfin-transcode-notifier.git .

# 3. Install Node.js dependencies & build
sudo apt update && sudo apt install -y nodejs npm ffmpeg
npm install
npm run build

# 4. Create Systemd Service File
sudo bash -c 'cat << "EOF" > /etc/systemd/system/jellyfin-transcode.service
[Unit]
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
EOF'

# 5. Enable & start service
sudo systemctl daemon-reload
sudo systemctl enable --now jellyfin-transcode.service
sudo systemctl status jellyfin-transcode.service`;

  const dockerScript = `version: '3.8'
services:
  jellyfin-transcode-notifier:
    image: node:22-alpine
    container_name: jellyfin-transcode-notifier
    restart: unless-stopped
    working_dir: /app
    volumes:
      - .:/app
      - /media:/media:ro
    command: sh -c "npm install && npm run build && npm start"
    environment:
      - NODE_ENV=production
      - NTFY_URL=${ntfyUrl}
      - NTFY_TOPIC=${topic}
      - PORT=3000
    network_mode: host`;

  const tailscaleScript = `# Access this Web Dashboard securely over Tailscale from any device:

# Step 1: Check your Ubuntu machine's Tailscale IP
tailscale status

# Step 2: Access in browser on mobile/laptop connected to Tailscale:
http://<your-ubuntu-tailscale-ip>:3000

# Step 3 (Optional): Enable Tailscale Serve for clean HTTPS without exposing ports:
sudo tailscale serve https / http://localhost:3000`;

  return (
    <div className="space-y-6">
      
      {/* Intro Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 text-slate-200 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider">
              <Server className="w-5 h-5 text-indigo-400" />
              Ubuntu 26.04 LTS & Tailscale Deployment Guide
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
              Engineered to run seamlessly alongside Jellyfin and your ntfy instance (<span className="text-indigo-400 font-bold">{ntfyUrl}</span>).
            </p>
          </div>

          <button
            onClick={handleDownloadDeployPackage}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded shadow transition cursor-pointer shrink-0 uppercase tracking-wider font-mono"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Setup Package
          </button>
        </div>
      </div>

      {/* Deployment Method 1: Systemd Service (Recommended) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Method 1: Native Systemd Service on Ubuntu 26.04</h3>
          </div>

          <button
            onClick={() => copyToClipboard(systemdScript, 'systemd')}
            className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono"
          >
            {copiedSection === 'systemd' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied Systemd Commands!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy Commands
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-300 font-mono">
          Runs directly as a background Linux daemon managed by <code className="text-indigo-300">systemctl</code>. Starts automatically on boot.
        </p>

        <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs rounded overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
          {systemdScript}
        </pre>
      </div>

      {/* Tailscale Secure Remote Access */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tailscale Configuration for Remote Access</h3>
          </div>

          <button
            onClick={() => copyToClipboard(tailscaleScript, 'tailscale')}
            className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono"
          >
            {copiedSection === 'tailscale' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied Tailscale Guide!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy Guide
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-300 font-mono">
          Access this web interface from phone, laptop, or tablet on your Tailscale mesh network.
        </p>

        <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
          {tailscaleScript}
        </pre>
      </div>

      {/* Deployment Method 2: Docker Compose */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Method 2: Docker Compose Container</h3>
          </div>

          <button
            onClick={() => copyToClipboard(dockerScript, 'docker')}
            className="inline-flex items-center px-3 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded transition cursor-pointer font-mono"
          >
            {copiedSection === 'docker' ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                Copied docker-compose!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy docker-compose.yml
              </>
            )}
          </button>
        </div>

        <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-xs rounded overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
          {dockerScript}
        </pre>
      </div>

    </div>
  );
};
