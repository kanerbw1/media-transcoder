import React, { useState } from 'react';
import { Bell, Send, CheckCircle2, AlertCircle, Server, Hash, ShieldCheck, Tag, ListFilter, RefreshCw } from 'lucide-react';
import { NtfySettings, NotificationLog } from '../types';

interface NtfyConfigCardProps {
  ntfy: NtfySettings;
  onUpdateNtfy: (settings: Partial<NtfySettings>) => void;
  notificationLogs: NotificationLog[];
  onRefreshLogs: () => void;
}

export const NtfyConfigCard: React.FC<NtfyConfigCardProps> = ({
  ntfy,
  onUpdateNtfy,
  notificationLogs,
  onRefreshLogs,
}) => {
  const [serverUrl, setServerUrl] = useState(ntfy.serverUrl || 'http://homelab:100/');
  const [topic, setTopic] = useState(ntfy.topic || 'jellyfin-transcode');
  const [priority, setPriority] = useState(ntfy.priority || 'high');
  const [tagsInput, setTagsInput] = useState(ntfy.tags ? ntfy.tags.join(', ') : 'clapper, warning, tv');
  const [authToken, setAuthToken] = useState(ntfy.authToken || '');
  const [includeFfmpegCommand, setIncludeFfmpegCommand] = useState(ntfy.includeFfmpegCommand ?? true);

  const [testMessage, setTestMessage] = useState('Inception.2010.1080p.10bit.H264.DTS-HD.MA.mkv');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    statusCode?: number;
    error?: string;
    loading?: boolean;
  }>({ tested: false });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onUpdateNtfy({
      serverUrl: serverUrl.trim(),
      topic: topic.trim(),
      priority,
      tags: tagsArray,
      authToken: authToken.trim() || undefined,
      includeFfmpegCommand,
    });
  };

  const handleSendTestNotification = async () => {
    setTestResult({ tested: true, loading: true });
    try {
      const res = await fetch('/api/ntfy/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testMessage,
          serverUrl: serverUrl.trim(),
          topic: topic.trim(),
        }),
      });
      const data = await res.json();
      setTestResult({
        tested: true,
        loading: false,
        success: data.success,
        statusCode: data.statusCode,
        error: data.error,
      });
      onRefreshLogs();
    } catch (err: any) {
      setTestResult({
        tested: true,
        loading: false,
        success: false,
        error: err.message || 'Failed to dispatch notification',
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ntfy Configuration Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 shadow-xl text-slate-200">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Self-Hosted ntfy Push Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Configured for your homelab instance at <span className="text-indigo-400 font-bold">http://homelab:100/</span>.
              Sends real-time transcode alerts and recommended FFmpeg commands directly to mobile or desktop clients.
            </p>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Server URL */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                ntfy Host URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://homelab:100/"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-xs rounded px-3 py-2 outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Homelab Target: http://homelab:100/
              </span>
            </div>

            {/* Topic Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                Notification Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="jellyfin-transcode"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-xs rounded px-3 py-2 outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                Full Endpoint: <span className="text-indigo-300">{serverUrl.replace(/\/+$/, '')}/{topic}</span>
              </span>
            </div>

            {/* Notification Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 text-xs font-mono rounded px-3 py-2 outline-none"
              >
                <option value="urgent">Urgent (5 - Ringtone & Popup)</option>
                <option value="high">High (4 - Sound & High Priority)</option>
                <option value="default">Default (3 - Standard Notification)</option>
                <option value="low">Low (2 - Silent Notification)</option>
                <option value="min">Min (1 - No sound)</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                Notification Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="clapper, warning, tv"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-xs rounded px-3 py-2 outline-none"
              />
            </div>

            {/* Auth Token (Optional) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-mono uppercase">
                Bearer Token (Optional)
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="tk_1234567890 (Optional)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-slate-100 font-mono text-xs rounded px-3 py-2 outline-none"
              />
            </div>

            {/* Checkbox Options */}
            <div className="flex flex-col justify-center space-y-2 pt-2 font-mono">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFfmpegCommand}
                  onChange={(e) => setIncludeFfmpegCommand(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                />
                <span>Include suggested FFmpeg bash command in ntfy payload</span>
              </label>
            </div>

          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 font-mono">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={testResult.loading}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs rounded border border-slate-700 transition cursor-pointer flex items-center gap-2 uppercase tracking-wider"
            >
              <Send className="w-3.5 h-3.5" />
              {testResult.loading ? 'Pushing...' : 'Push Test Alert'}
            </button>

            <button
              type="submit"
              className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded shadow transition cursor-pointer uppercase tracking-wider"
            >
              Save Configuration
            </button>
          </div>
        </form>

        {/* Test Result Feedback */}
        {testResult.tested && (
          <div className={`mt-4 p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {testResult.success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Successfully sent test alert to <strong>{serverUrl.replace(/\/+$/, '')}/{topic}</strong>! (Status HTTP {testResult.statusCode})</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Failed to dispatch alert: {testResult.error || 'Check server URL & connection to http://homelab:100/'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Notification Logs History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Dispatched Notification History</h3>
          </div>

          <button
            onClick={onRefreshLogs}
            className="inline-flex items-center text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Logs
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {notificationLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 italic">
              No notifications dispatched yet. Trigger a scan or test notification above.
            </div>
          ) : (
            notificationLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{log.mediaTitle}</span>
                  <div className="flex items-center space-x-2 font-mono text-[10px]">
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      log.status === 'sent'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 font-mono text-[11px] truncate">
                  Target: {ntfy.serverUrl.replace(/\/+$/, '')}/{log.topic}
                </div>

                {log.reasons && log.reasons.length > 0 && (
                  <div className="text-[11px] text-amber-300/90 font-sans">
                    • {log.reasons.join(' • ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
