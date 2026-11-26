import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Volume2, 
  Mic, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  Save, 
  Play, 
  RotateCcw,
  ShieldCheck,
  Cpu,
  Zap,
  ExternalLink
} from 'lucide-react';
import { getSettingsStatus, saveGeminiKey, saveGroqKey, saveIntegrations } from '../api';

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [status, setStatus] = useState(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(1.05);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [silenceThreshold, setSilenceThreshold] = useState(0.9);
  const [savingGroq, setSavingGroq] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [deepgramKey, setDeepgramKey] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [livekitKey, setLivekitKey] = useState('');
  const [livekitSecret, setLivekitSecret] = useState('');
  const [hubspotToken, setHubspotToken] = useState('');
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        setVoices(available);
        if (available.length > 0 && !selectedVoice) {
          const defaultV = available.find(v => v.lang.startsWith('en')) || available[0];
          setSelectedVoice(defaultV.name);
        }
      }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Load API settings status
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await getSettingsStatus();
      setStatus(res);
    } catch (e) {
      console.error('Failed to get settings status:', e);
    }
  };

  const handleSaveGroqKey = async (e) => {
    e.preventDefault();
    if (!groqKey.trim()) return;
    try {
      setSavingGroq(true);
      const res = await saveGroqKey(groqKey.trim());
      setGroqKey('');
      setMessage({ type: 'success', text: res.message || 'Groq API Key saved successfully! LPU inference active.' });
      fetchStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingGroq(false);
    }
  };

  const handleSaveGeminiKey = async (e) => {
    e.preventDefault();
    if (!geminiKey.trim()) return;
    try {
      setSavingGemini(true);
      const res = await saveGeminiKey(geminiKey.trim());
      setGeminiKey('');
      setMessage({ type: 'success', text: res.message || 'Gemini API Key saved successfully!' });
      fetchStatus();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingGemini(false);
    }
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance("Hello! Welcome to VoxSales Academy. This is your autonomous sales assistant voice.");
    u.rate = speechRate;
    u.pitch = speechPitch;
    const v = voices.find(vox => vox.name === selectedVoice);
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>System & Voice Settings</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Configure real-time inference (Groq / Gemini), speech synthesis voice, and silence detection.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Card 1: Speech Synthesis (TTS) Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-600" />
          <span>Speech Synthesis (TTS Voice)</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Select Browser Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs outline-none focus:border-cyan-500 cursor-pointer"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}) {v.default ? '— Default' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Speaking Rate</span>
                <span className="text-cyan-700">{speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Voice Pitch</span>
                <span className="text-cyan-700">{speechPitch}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={speechPitch}
                onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestVoice}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Play className="w-3.5 h-3.5 text-cyan-700 fill-current" />
              <span>Test Audio Playback</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: Voice Recognition (STT) Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-600" />
          <span>Speech Recognition & Silence Detection</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>Silence Auto-Submit Delay</span>
              <span className="text-indigo-600">{silenceThreshold} seconds</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="2.0"
              step="0.1"
              value={silenceThreshold}
              onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Controls how long the system waits after you finish speaking before sending your inquiry to the AI agent. (Recommended: 0.8s–1.0s).
            </p>
          </div>
        </div>
      </div>

      {/* Card 3: Groq LPU Ultra-Fast Inference */}
      <div className="bg-white rounded-2xl border border-orange-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span>Groq API (Recommended for Real-Time Voice &lt;400ms)</span>
          </h3>
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
            status?.groq_active ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-slate-100 text-slate-600'
          }`}>
            {status?.groq_active ? 'Groq LPU Active (<400ms)' : 'Not Active'}
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Primary LPU Model</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">llama-3.3-70b-versatile (~300ms latency on Groq LPUs)</p>
            </div>
            <span className="text-[11px] text-orange-700 font-semibold">
              {status?.has_groq_key ? `Connected (${status.groq_preview})` : 'Key Required'}
            </span>
          </div>

          <form onSubmit={handleSaveGroqKey} className="space-y-2 pt-1">
            <label className="font-semibold text-slate-700 block">
              Enter Groq API Key (get from{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-orange-600 underline font-bold">
                console.groq.com/keys
              </a>)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                disabled={savingGroq || !groqKey.trim()}
                className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Zap className="w-3.5 h-3.5 text-white" />
                <span>Save Groq Key</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 4: Gemini AI Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <span>Google Gemini AI (Secondary Provider)</span>
          </h3>
          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
            status?.gemini_active ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
          }`}>
            {status?.gemini_active ? 'Gemini Active' : 'Not Active'}
          </span>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Gemini Key Status</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {status?.has_gemini_key ? `Connected (${status.gemini_preview})` : 'Not Configured'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveGeminiKey} className="space-y-2 pt-1">
            <label className="font-semibold text-slate-700 block">Update Gemini API Key</label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={savingGemini || !geminiKey.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#0c1427] hover:bg-[#15233e] text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save Key</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Card 5: SalesPilot AI Integrations (Deepgram, LiveKit, HubSpot) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SalesPilot AI Integrations (Deepgram, LiveKit &amp; HubSpot CRM)</span>
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className={`px-2.5 py-1 rounded-full ${status?.has_deepgram_key ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              Deepgram: {status?.has_deepgram_key ? 'Connected' : 'Optional'}
            </span>
            <span className={`px-2.5 py-1 rounded-full ${status?.has_livekit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              LiveKit: {status?.has_livekit ? 'Connected' : 'Optional'}
            </span>
            <span className={`px-2.5 py-1 rounded-full ${status?.has_hubspot_token ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              HubSpot: {status?.has_hubspot_token ? 'Connected' : 'Optional'}
            </span>
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setSavingIntegrations(true);
              const payload = {};
              if (deepgramKey.trim()) payload.deepgram_api_key = deepgramKey.trim();
              if (livekitUrl.trim()) payload.livekit_url = livekitUrl.trim();
              if (livekitKey.trim()) payload.livekit_api_key = livekitKey.trim();
              if (livekitSecret.trim()) payload.livekit_api_secret = livekitSecret.trim();
              if (hubspotToken.trim()) payload.hubspot_access_token = hubspotToken.trim();
              const res = await saveIntegrations(payload);
              setDeepgramKey(''); setLivekitUrl(''); setLivekitKey(''); setLivekitSecret(''); setHubspotToken('');
              setMessage({ type: 'success', text: res.message || 'Integrations saved!' });
              fetchStatus();
            } catch (err) {
              setMessage({ type: 'error', text: err.message });
            } finally {
              setSavingIntegrations(false);
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
        >
          <input
            type="password"
            value={deepgramKey}
            onChange={(e) => setDeepgramKey(e.target.value)}
            placeholder="Deepgram API Key (STT + Aura TTS)"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            value={hubspotToken}
            onChange={(e) => setHubspotToken(e.target.value)}
            placeholder="HubSpot Private App Token (pat-...)"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={livekitUrl}
            onChange={(e) => setLivekitUrl(e.target.value)}
            placeholder="LiveKit URL (wss://...livekit.cloud)"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            value={livekitKey}
            onChange={(e) => setLivekitKey(e.target.value)}
            placeholder="LiveKit API Key"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            value={livekitSecret}
            onChange={(e) => setLivekitSecret(e.target.value)}
            placeholder="LiveKit API Secret"
            className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={savingIntegrations || (!deepgramKey.trim() && !hubspotToken.trim() && !livekitUrl.trim() && !livekitKey.trim() && !livekitSecret.trim())}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Integration Keys</span>
          </button>
        </form>
      </div>
    </div>
  );
}
