import React, { useState, useEffect } from 'react';
import { Sparkles, Key, CheckCircle2, AlertCircle, ExternalLink, X, Zap, ShieldCheck } from 'lucide-react';
import { getSettingsStatus, saveGroqKey, saveGeminiKey, saveIntegrations } from '../api';

export default function ApiKeyModal({ isOpen, onClose, onKeyUpdated }) {
  const [activeTab, setActiveTab] = useState('groq'); // 'groq' | 'gemini' | 'integrations'
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [deepgramKey, setDeepgramKey] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [livekitKey, setLivekitKey] = useState('');
  const [livekitSecret, setLivekitSecret] = useState('');
  const [hubspotToken, setHubspotToken] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const data = await getSettingsStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSaveGroq = async (e) => {
    e.preventDefault();
    if (!groqKey.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await saveGroqKey(groqKey.trim());
      setSuccess(res.message || 'Groq API Key activated successfully!');
      setStatus(prev => ({
        ...prev,
        groq_active: true,
        has_groq_key: true,
        groq_preview: `${groqKey.trim().slice(0, 6)}...${groqKey.trim().slice(-4)}`,
        active_provider: 'Groq LPU (Ultra-Fast 300ms)',
        model_name: 'llama-3.3-70b-versatile (Groq)'
      }));
      setGroqKey('');
      if (onKeyUpdated) onKeyUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to activate Groq API key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGemini = async (e) => {
    e.preventDefault();
    if (!geminiKey.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await saveGeminiKey(geminiKey.trim());
      setSuccess(res.message || 'Gemini API Key activated successfully!');
      setStatus(prev => ({
        ...prev,
        gemini_active: true,
        has_gemini_key: true,
        gemini_preview: `${geminiKey.trim().slice(0, 6)}...${geminiKey.trim().slice(-4)}`
      }));
      setGeminiKey('');
      if (onKeyUpdated) onKeyUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to activate Gemini API key');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIntegrations = async (e) => {
    e.preventDefault();
    const payload = {};
    if (deepgramKey.trim()) payload.deepgram_api_key = deepgramKey.trim();
    if (livekitUrl.trim()) payload.livekit_url = livekitUrl.trim();
    if (livekitKey.trim()) payload.livekit_api_key = livekitKey.trim();
    if (livekitSecret.trim()) payload.livekit_api_secret = livekitSecret.trim();
    if (hubspotToken.trim()) payload.hubspot_access_token = hubspotToken.trim();
    if (Object.keys(payload).length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await saveIntegrations(payload);
      setSuccess(res.message || 'Integration credentials saved!');
      setDeepgramKey(''); setLivekitUrl(''); setLivekitKey(''); setLivekitSecret(''); setHubspotToken('');
      await checkStatus();
      if (onKeyUpdated) onKeyUpdated();
    } catch (err) {
      setError(err.message || 'Failed to save integration credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">AI Engine & API Keys</h3>
              <p className="text-[11px] text-slate-400">Configure real-time voice inference engines</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Engine Status */}
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Active Inference Engine:</span>
            <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
              status?.groq_active
                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                : status?.gemini_active
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {status?.active_provider || 'Built-in Educational Engine Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex flex-col">
              <span className="text-slate-400 font-medium">Groq LPU (Ultra-Fast)</span>
              <span className="font-bold text-slate-800">
                {status?.has_groq_key ? `Connected (${status.groq_preview})` : 'Not Configured'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex flex-col">
              <span className="text-slate-400 font-medium">Gemini 2.5 Flash</span>
              <span className="font-bold text-slate-800">
                {status?.has_gemini_key ? `Connected (${status.gemini_preview})` : 'Not Configured'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-400 font-medium">Deepgram</span>
              <span className={`font-bold ${status?.has_deepgram_key ? 'text-emerald-700' : 'text-slate-500'}`}>
                {status?.has_deepgram_key ? 'Connected' : 'Optional'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-400 font-medium">LiveKit</span>
              <span className={`font-bold ${status?.has_livekit ? 'text-emerald-700' : 'text-slate-500'}`}>
                {status?.has_livekit ? 'Connected' : 'Optional'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <span className="text-slate-400 font-medium">HubSpot</span>
              <span className={`font-bold ${status?.has_hubspot_token ? 'text-emerald-700' : 'text-slate-500'}`}>
                {status?.has_hubspot_token ? 'Connected' : 'Optional'}
              </span>
            </div>
          </div>
        </div>

        {/* Provider Switcher Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            onClick={() => { setActiveTab('groq'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'groq'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>Groq LPU (&lt;400ms)</span>
          </button>
          <button
            onClick={() => { setActiveTab('gemini'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'gemini'
                ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span>Gemini API</span>
          </button>
          <button
            onClick={() => { setActiveTab('integrations'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
              activeTab === 'integrations'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Voice &amp; CRM</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Groq Tab */}
        {activeTab === 'groq' && (
          <form onSubmit={handleSaveGroq} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Enter your Groq API Key
              </label>
              <input
                type="password"
                required
                placeholder="gsk_..."
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-slate-900 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Get a free key instantly at{' '}
                <a 
                  href="https://console.groq.com/keys" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-orange-600 hover:text-orange-800 font-bold underline inline-flex items-center gap-0.5"
                >
                  console.groq.com/keys <ExternalLink className="w-3 h-3" />
                </a>.
                Provides sub-300ms inference on LPUs with zero 503 rate limit drops.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !groqKey.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 font-semibold text-white shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{loading ? 'Activating Groq...' : 'Activate Groq LPU'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Gemini Tab */}
        {activeTab === 'gemini' && (
          <form onSubmit={handleSaveGemini} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Enter your Google Gemini API Key
              </label>
              <input
                type="password"
                required
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-500 outline-none text-slate-900 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Get a key from{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-purple-600 hover:text-purple-800 font-bold underline inline-flex items-center gap-0.5"
                >
                  Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !geminiKey.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-semibold text-white shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Activate Gemini API'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Voice & CRM Integrations Tab */}
        {activeTab === 'integrations' && (
          <form onSubmit={handleSaveIntegrations} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-2.5">
              <input
                type="password"
                value={deepgramKey}
                onChange={(e) => setDeepgramKey(e.target.value)}
                placeholder="Deepgram API Key (Nova-2 STT + Aura TTS)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono text-xs"
              />
              <input
                type="text"
                value={livekitUrl}
                onChange={(e) => setLivekitUrl(e.target.value)}
                placeholder="LiveKit URL (wss://...livekit.cloud)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  value={livekitKey}
                  onChange={(e) => setLivekitKey(e.target.value)}
                  placeholder="LiveKit API Key"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono text-xs"
                />
                <input
                  type="password"
                  value={livekitSecret}
                  onChange={(e) => setLivekitSecret(e.target.value)}
                  placeholder="LiveKit API Secret"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono text-xs"
                />
              </div>
              <input
                type="password"
                value={hubspotToken}
                onChange={(e) => setHubspotToken(e.target.value)}
                placeholder="HubSpot Private App Token (pat-...)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none font-mono text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (!deepgramKey.trim() && !livekitUrl.trim() && !livekitKey.trim() && !livekitSecret.trim() && !hubspotToken.trim())}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{loading ? 'Saving...' : 'Save Voice & CRM Keys'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
