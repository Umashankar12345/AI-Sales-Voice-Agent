import React from 'react';
import { 
  Network, 
  Layers, 
  Cpu, 
  Database, 
  Mic, 
  Volume2, 
  ShieldCheck, 
  Sparkles, 
  Server,
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function ArchitecturePage() {
  const components = [
    {
      title: "1. Client Browser Layer",
      icon: Mic,
      tech: "React 19 + Vite + Tailwind CSS",
      color: "border-cyan-500/30 bg-cyan-50/50",
      accent: "text-cyan-600",
      items: [
        "Web Speech API (SpeechRecognition) for real-time STT",
        "Browser SpeechSynthesis API for natural voice TTS vocalization",
        "Reactive state management with real-time live interim visualizers",
        "Responsive SaaS dashboard with hot lead highlights"
      ]
    },
    {
      title: "2. Backend API Service",
      icon: Server,
      tech: "Python 3.14 + FastAPI + Uvicorn",
      color: "border-indigo-500/30 bg-indigo-50/50",
      accent: "text-indigo-600",
      items: [
        "RESTful API endpoints for conversation, leads, and slots",
        "Strict Pydantic v2 schemas and input sanitization",
        "Thread pool execution with sub-3s timeout guarantee",
        "Transparent rule-based lead qualification engine (0–100)"
      ]
    },
    {
      title: "3. RAG Retrieval Engine",
      icon: Sparkles,
      tech: "SentenceTransformers + FAISS Vector Index",
      color: "border-purple-500/30 bg-purple-50/50",
      accent: "text-purple-600",
      items: [
        "Local CPU embeddings via all-MiniLM-L6-v2 (384-dimensional)",
        "FAISS IndexFlatIP cosine similarity search (top-k=3)",
        "Knowledge chunking on technical curriculum, fees, and batches",
        "Zero hallucination grounding with exact course facts"
      ]
    },
    {
      title: "4. Autonomous Sales AI",
      icon: Cpu,
      tech: "Google Gemini API + Smart Counselor Engine",
      color: "border-amber-500/30 bg-amber-50/50",
      accent: "text-amber-600",
      items: [
        "Primary LLM: gemini-3.5-flash-lite for ultra-fast generation",
        "Single-attempt failover eliminating exponential retry delays",
        "Consultative sales prompt (fees, syllabus, batch timings)",
        "Instant local counselor fallback responding in < 0.05 seconds"
      ]
    },
    {
      title: "5. Database & Storage",
      icon: Database,
      tech: "MongoDB NoSQL Database",
      color: "border-emerald-500/30 bg-emerald-50/50",
      accent: "text-emerald-600",
      items: [
        "Collections: leads, conversations, appointments, appointment_slots",
        "Compound unique indexes on (slot_date, slot_time) preventing double-booking",
        "Session transcripts and sentiment metrics persistence",
        "No hardcoded metrics — all KPIs aggregated live from DB"
      ]
    }
  ];

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Network className="w-6 h-6 text-indigo-600" />
          <span>System Architecture & Pipeline</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Comprehensive full-stack architecture design for college placement technical evaluation.
        </p>
      </div>

      {/* Visual Flow Diagram */}
      <div className="bg-[#0c1427] text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>End-to-End Data Flow Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-between">
            <Mic className="w-6 h-6 text-cyan-400 mb-2" />
            <h4 className="text-xs font-bold text-white">1. User Speech</h4>
            <p className="text-[10px] text-slate-400 mt-1">Browser Web Speech STT transcribes microphone input</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-between">
            <Server className="w-6 h-6 text-indigo-400 mb-2" />
            <h4 className="text-xs font-bold text-white">2. FastAPI Gateway</h4>
            <p className="text-[10px] text-slate-400 mt-1">Validates payload & loads active conversation history</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-between">
            <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
            <h4 className="text-xs font-bold text-white">3. FAISS Vector RAG</h4>
            <p className="text-[10px] text-slate-400 mt-1">Retrieves top-3 matching chunks via MiniLM embeddings</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-between">
            <Cpu className="w-6 h-6 text-amber-400 mb-2" />
            <h4 className="text-xs font-bold text-white">4. Gemini AI Model</h4>
            <p className="text-[10px] text-slate-400 mt-1">Generates concise sales response in sub-3 seconds</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-between">
            <Database className="w-6 h-6 text-emerald-400 mb-2" />
            <h4 className="text-xs font-bold text-white">5. MongoDB & TTS</h4>
            <p className="text-[10px] text-slate-400 mt-1">Saves qualified lead and speaks reply via browser audio</p>
          </div>
        </div>
      </div>

      {/* Component Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {components.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div key={idx} className={`p-5 rounded-2xl border bg-white shadow-sm space-y-3`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center ${c.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{c.title}</h4>
                  <p className="text-[10px] font-semibold text-slate-400">{c.tech}</p>
                </div>
              </div>

              <ul className="space-y-1.5 pt-1 text-xs text-slate-600">
                {c.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.accent}`} />
                    <span className="text-[11px] leading-tight">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
