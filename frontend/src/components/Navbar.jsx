import React, { useState, useEffect } from 'react';
import { Mic, Calendar, Key, ShieldCheck, Sparkles, LogIn, LogOut } from 'lucide-react';
import { getSettingsStatus, getCurrentUser, setAuthToken } from '../api';

export default function Navbar({ activeTab, onStartCall, onBookSlot, onOpenApiKeyModal, onOpenAuthModal }) {
  const [geminiActive, setGeminiActive] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkKey();
    getCurrentUser().then(setCurrentUser).catch(() => {});
    const interval = setInterval(checkKey, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkKey = async () => {
    try {
      const data = await getSettingsStatus();
      setGeminiActive(data.gemini_active);
    } catch (e) {
      // ignore
    }
  };

  const titles = {
    dashboard: { title: 'Executive Overview', desc: 'Real-time sales metrics, lead conversions & pipeline health' },
    agent: { title: 'AI Voice Sales Agent', desc: 'Interactive autonomous counselor with speech STT, RAG & Gemini' },
    leads: { title: 'Lead Management System', desc: 'Lead qualification, scoring rubric & prospective student pipeline' },
    appointments: { title: 'Counseling Appointments', desc: 'Available time slots, conflict prevention & booking confirmation' },
    knowledge: { title: 'Course Knowledge Base', desc: 'Sentence Transformers + FAISS vector search & syllabus explorer' }
  };

  const current = titles[activeTab] || titles.dashboard;

  return (
    <header className="h-18 bg-white border-b border-purple-100/80 px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h2>
        <p className="text-xs text-slate-500 font-medium">{current.desc}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenApiKeyModal}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition cursor-pointer ${
            geminiActive
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              : 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100'
          }`}
          title="Click to configure or change Gemini API Key"
        >
          <Sparkles className={`w-3.5 h-3.5 ${geminiActive ? 'text-emerald-600' : 'text-purple-600 animate-pulse'}`} />
          <span>{geminiActive ? 'Gemini 2.5 Flash' : 'Configure Gemini API'}</span>
        </button>

        <button
          onClick={onBookSlot}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-100 text-purple-800 hover:bg-purple-200 text-xs font-semibold transition cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Book Slot</span>
        </button>

        <button
          onClick={onStartCall}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Launch Voice Call</span>
        </button>

        {currentUser ? (
          <button
            onClick={() => { setAuthToken(''); setCurrentUser(null); window.location.reload(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            title={`Signed in as ${currentUser.email} (${currentUser.role})`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>{currentUser.role === 'admin' ? 'Admin' : 'Member'}</span>
          </button>
        ) : (
          onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )
        )}
      </div>
    </header>
  );
}
