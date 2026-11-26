import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Search, 
  Calendar, 
  Clock, 
  MessageSquare, 
  Volume2, 
  Sparkles, 
  RefreshCw,
  User,
  Bot,
  Flame,
  ArrowRight
} from 'lucide-react';
import { getConversations, getConversationDetail } from '../api';

export default function CallHistoryPage() {
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations(50, 0);
      setConversations(data.conversations || []);
      setTotal(data.total || 0);
      if (data.conversations && data.conversations.length > 0 && !selectedSession) {
        handleSelectSession(data.conversations[0]);
      }
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectSession = async (conv) => {
    setSelectedSession(conv);
    try {
      setLoadingDetail(true);
      const detail = await getConversationDetail(conv.session_id);
      setSessionDetail(detail);
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  const filteredConversations = conversations.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.customer_name || '').toLowerCase().includes(s) ||
      (c.session_id || '').toLowerCase().includes(s) ||
      (c.last_message || '').toLowerCase().includes(s) ||
      (c.summary || '').toLowerCase().includes(s)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-5 h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <PhoneCall className="w-6 h-6 text-indigo-600" />
            <span>Call & Conversation History</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Recorded voice agent transcripts, customer inquiries, and audio playback archive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConversations}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: List on Left, Transcript on Right */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        {/* Left: Call Sessions List */}
        <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate or session..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading call records...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedSession && selectedSession.session_id === c.session_id;
                return (
                  <button
                    key={c.id || c.session_id}
                    onClick={() => handleSelectSession(c)}
                    className={`w-full p-4 text-left transition cursor-pointer flex flex-col gap-1.5 ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-l-4 border-indigo-600' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {c.customer_name || 'Prospective Candidate'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatDate(c.updated_at || c.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                      "{c.last_message || 'Voice inquiry'}"
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.lead_category === 'Hot'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.lead_category === 'Warm'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.lead_category || 'Cold'} ({c.lead_score ?? 10})
                      </span>

                      <span className="text-[10px] text-slate-400">
                        {c.message_count || (c.messages ? c.messages.length : 1)} turns
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Transcript Details */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {sessionDetail ? (
            <>
              {/* Transcript Header */}
              <div className="p-4 border-b border-slate-100 bg-[#0c1427] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <span>{sessionDetail.customer_name || 'Candidate Call Record'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {sessionDetail.session_id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(sessionDetail.created_at || sessionDetail.updated_at)} • {sessionDetail.messages ? sessionDetail.messages.length : 0} interactions recorded
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    sessionDetail.lead_category === 'Hot'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {sessionDetail.lead_category || 'Warm'} ({sessionDetail.lead_score ?? 10}/100)
                  </span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#fbfcfd]">
                {sessionDetail.messages && sessionDetail.messages.length > 0 ? (
                  sessionDetail.messages.map((m, idx) => {
                    const isAi = m.role === 'assistant';
                    return (
                      <div key={idx} className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isAi ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>

                        <div className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-sm ${
                          isAi ? 'bg-white border border-slate-200 text-slate-800' : 'bg-[#15233e] text-white'
                        }`}>
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="font-bold text-[11px] opacity-80">
                              {isAi ? 'VoxSales AI Counselor' : (sessionDetail.customer_name || 'Candidate')}
                            </span>
                            <span className="text-[10px] opacity-50">{m.timestamp || ''}</span>
                          </div>
                          <p className="leading-relaxed text-xs">{m.content}</p>
                          {isAi && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <button
                                onClick={() => speakText(m.content)}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Replay Audio</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-slate-400 py-12 text-xs italic">
                    No transcript entries recorded for this session.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
              <PhoneCall className="w-8 h-8 text-slate-300 mb-2" />
              <span>Select a call session from the left to inspect its full transcript and audio history.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
