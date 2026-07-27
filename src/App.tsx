import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DirectoryManager } from './components/DirectoryManager';
import { MediaLibraryView } from './components/MediaLibraryView';
import { NtfyConfigCard } from './components/NtfyConfigCard';
import { FileAnalyzerModal } from './components/FileAnalyzerModal';
import { DeploymentGuide } from './components/DeploymentGuide';
import { AppConfig, MediaItem, NotificationLog, SystemInfo, DirectoryConfig } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'media' | 'directories' | 'ntfy' | 'deploy'>('media');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);

  // Fetch initial state
  const fetchData = async () => {
    try {
      const [configRes, mediaRes, logsRes, sysRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/media'),
        fetch('/api/logs'),
        fetch('/api/system-info'),
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (mediaRes.ok) setMediaItems(await mediaRes.json());
      if (logsRes.ok) setNotificationLogs(await logsRes.json());
      if (sysRes.ok) setSystemInfo(await sysRes.json());
    } catch (err) {
      console.error('Error loading initial data from server:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateConfig = async (newConfig: Partial<AppConfig>) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const handleAddDirectory = async (dir: Omit<DirectoryConfig, 'id'>) => {
    if (!config) return;
    const newDirObj: DirectoryConfig = {
      ...dir,
      id: `dir-${Date.now()}`,
      lastScanTime: new Date().toISOString(),
      itemCount: 0,
    };
    const updatedDirs = [...config.directories, newDirObj];
    await handleUpdateConfig({ directories: updatedDirs });
  };

  const handleRemoveDirectory = async (id: string) => {
    if (!config) return;
    const updatedDirs = config.directories.filter((d) => d.id !== id);
    await handleUpdateConfig({ directories: updatedDirs });
  };

  const handleToggleDirectory = async (id: string) => {
    if (!config) return;
    const updatedDirs = config.directories.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d));
    await handleUpdateConfig({ directories: updatedDirs });
  };

  const handleScanDirectories = async (directoryId?: string) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directoryId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Error scanning directories:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDispatchNtfy = async (item: MediaItem) => {
    try {
      await fetch('/api/ntfy/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testMessage: `Transcode Alert for: ${item.title}`,
          topic: config?.ntfy.topic,
        }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to send ntfy alert:', err);
    }
  };

  const handleRescanItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/media/${itemId}/rescan`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to rescan media item:', err);
    }
  };

  const transcodeCount = mediaItems.filter((m) => m.needsTranscode).length;

  return (
    <div className="min-h-screen geometric-bg text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
      
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ntfy={config?.ntfy || { serverUrl: 'http://homelab:100/', topic: 'jellyfin-transcode', priority: 'high', tags: [], notifyOnlyOnTranscodeNeeded: true, includeFfmpegCommand: true }}
        systemInfo={systemInfo}
        onScanTrigger={() => handleScanDirectories()}
        isScanning={isScanning}
        onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
        transcodeCount={transcodeCount}
      />

      {/* Main Screen Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'media' && (
          <MediaLibraryView
            mediaItems={mediaItems}
            onDispatchNtfy={handleDispatchNtfy}
            onScanTrigger={() => handleScanDirectories()}
            isScanning={isScanning}
            onRescanItem={handleRescanItem}
          />
        )}

        {activeTab === 'directories' && (
          <DirectoryManager
            directories={config?.directories || []}
            onAddDirectory={handleAddDirectory}
            onRemoveDirectory={handleRemoveDirectory}
            onToggleDirectory={handleToggleDirectory}
            onScanDirectory={(id) => handleScanDirectories(id)}
            isScanning={isScanning}
          />
        )}

        {activeTab === 'ntfy' && config && (
          <NtfyConfigCard
            ntfy={config.ntfy}
            onUpdateNtfy={(ntfySettings) => handleUpdateConfig({ ntfy: { ...config.ntfy, ...ntfySettings } })}
            notificationLogs={notificationLogs}
            onRefreshLogs={fetchData}
          />
        )}

        {activeTab === 'deploy' && config && (
          <DeploymentGuide ntfy={config.ntfy} />
        )}
      </main>

      {/* File Inspector Modal */}
      <FileAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Chromecast 4K Transcode Inspector for Jellyfin • Ubuntu 26.04 Homelab
          </div>
          <div className="font-mono text-slate-400">
            ntfy Endpoint: <span className="text-amber-400">{config?.ntfy.serverUrl || 'http://homelab:100/'}{config?.ntfy.topic || 'jellyfin-transcode'}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
