import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Code,
  DollarSign,
  Briefcase,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { getKnowledgeChunks, searchKnowledge } from '../api';

export default function KnowledgeBasePage() {
  const [chunks, setChunks] = useState([]);
  const [kbMeta, setKbMeta] = useState({});
  const [loading, setLoading] = useState(true);

  // Live FAISS Search Simulator
  const [searchQuery, setSearchQuery] = useState('What are the Python course fees and schedule?');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchChunks();
    handleLiveSearch('What are the Python course fees and schedule?');
  }, []);

  const fetchChunks = async () => {
    try {
      setLoading(true);
      const data = await getKnowledgeChunks();
      setChunks(data.chunks || []);
      setKbMeta({
        total: data.total_chunks,
        model: data.embedding_model,
        dimension: data.vector_dimension
      });
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLiveSearch = async (queryText) => {
    if (!queryText.trim()) return;
    try {
      setIsSearching(true);
      const res = await searchKnowledge(queryText, 3);
      setSearchResults(res);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const courses = [
    {
      title: "Complete Python Programming & Automation",
      duration: "12 Weeks (3 Months)",
      fee: "INR 3,499 (Early Bird)",
      emi: "From INR 583/mo",
      roles: "Junior Python Dev, Automation Engineer, Data Ops",
      desc: "Zero-to-hero Python covering Core OOP, NumPy, Pandas, Web Scraping, FastAPI REST microservices & Automation."
    },
    {
      title: "Java Enterprise & Distributed Microservices",
      duration: "16 Weeks (4 Months)",
      fee: "INR 3,999 (Placement Offer)",
      emi: "From INR 666/mo",
      roles: "Java Backend Engineer, SDE-1, Cloud Java Consultant",
      desc: "Core Java 21, Spring Boot 3, Microservices with Spring Cloud, Kafka event sourcing, Redis caching & Docker deployment."
    },
    {
      title: "Full Stack Web Development (MERN + Next.js 14)",
      duration: "18 Weeks (4.5 Months)",
      fee: "INR 4,499 (Placement Special)",
      emi: "From INR 750/mo",
      roles: "Full Stack Engineer, React Developer, Node.js Backend Dev",
      desc: "TypeScript, React 18/19, Next.js 14 Server Actions, Node/Express APIs, MongoDB, PostgreSQL with Prisma & AWS hosting."
    },
    {
      title: "AI, Machine Learning & LLM Specialist",
      duration: "20 Weeks (5 Months)",
      fee: "INR 4,999 (Scholarship Tier)",
      emi: "From INR 833/mo",
      roles: "AI Engineer, Machine Learning Developer, GenAI Solutions Architect",
      desc: "Math & Data Science foundations, Scikit-learn, Deep Learning PyTorch, Generative AI APIs, RAG FAISS, LangChain & MLOps."
    },
    {
      title: "DSA & System Design Masterclass for Placements",
      duration: "14 Weeks (3.5 Months)",
      fee: "INR 3,299 (Placement Discount)",
      emi: "From INR 550/mo",
      roles: "SDE-1 at Tier-1 product firms (FAANG/MNCs)",
      desc: "Core algorithms, trees, dynamic programming, 300+ LeetCode patterns, Low-Level OOP Design & High-Level System Architecture."
    }
  ];

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
      {/* Header & Meta Card */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-semibold mb-3 border border-white/20">
            <Database className="w-3.5 h-3.5 text-purple-300" />
            Vector Search Architecture
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            RAG Knowledge Base & FAISS Index
          </h2>
          <p className="text-purple-200/80 text-xs md:text-sm mt-2 max-w-2xl leading-relaxed">
            The course catalog text is dynamically parsed into semantic chunks, vectorized via SentenceTransformer embeddings, and queried using high-performance FAISS cosine similarity index.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-2 text-xs shrink-0">
          <div className="flex justify-between gap-4">
            <span className="text-purple-200">Embedding Model:</span>
            <span className="font-bold text-white font-mono">{kbMeta.model || 'all-MiniLM-L6-v2'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-purple-200">Vector Dimension:</span>
            <span className="font-bold text-white font-mono">{kbMeta.dimension || 384}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-purple-200">Total Indexed Chunks:</span>
            <span className="font-bold text-yellow-300">{kbMeta.total || 7} Chunks</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-purple-200">Index Type:</span>
            <span className="font-bold text-white">faiss.IndexFlatIP</span>
          </div>
        </div>
      </div>

      {/* Interactive FAISS Vector Search Tester */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Live FAISS Cosine Similarity Simulator
          </h3>
          <p className="text-xs text-slate-500">
            Type any question to test FAISS cosine similarity retrieval and view retrieved chunks with similarity scores.
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleLiveSearch(searchQuery);
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 focus-within:border-purple-400 focus-within:bg-white transition">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. What is the fee for Python? or What are the Java batch timings?"
              className="w-full text-xs bg-transparent outline-none text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer flex items-center gap-1.5"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>Test Search</span>
          </button>
        </form>

        {/* Live Search Results View */}
        {searchResults && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Retrieved <strong className="text-purple-700">{searchResults.retrieved_count}</strong> matching chunks for: "{searchResults.query}"
              </span>
              <span className="font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-bold">
                FAISS Latency: {searchResults.latency_ms} ms
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {searchResults.results?.map((res, i) => (
                <div key={i} className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-purple-900">{res.course}</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-200/90 text-purple-900 font-extrabold text-[10px]">
                        Cosine: {res.score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {res.content}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-purple-200/50 text-[10px] text-purple-600 font-semibold">
                    Chunk #{res.id} • Passed to Gemini
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course Catalog Highlights */}
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            Official Course Offerings & Curricula
          </h3>
          <p className="text-xs text-slate-500">Knowledge base entries used for conversational sales qualification</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 mb-3 inline-block">
                  Cohort Program
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 mb-2">{c.title}</h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">{c.desc}</p>
                
                <div className="space-y-2 text-xs border-t border-purple-50 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-semibold text-slate-800">{c.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Offer Fee:</span>
                    <span className="font-bold text-purple-700">{c.fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">EMI Options:</span>
                    <span className="font-semibold text-slate-800">{c.emi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Placement:</span>
                    <span className="font-semibold text-emerald-700">100% Guaranteed Calls</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-50">
                <span className="text-[10px] text-slate-400 block truncate">
                  Target Roles: {c.roles}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
