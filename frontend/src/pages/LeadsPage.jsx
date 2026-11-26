import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Flame, 
  Mail, 
  Phone, 
  Calendar, 
  Edit2, 
  Trash2, 
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText
} from 'lucide-react';
import { getLeads, createLead, updateLead, deleteLead, syncLeadToHubspot, getLeadMemory } from '../api';

export default function LeadsPage({ onBookSlotForLead }) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  // View / Details Modal
  const [viewLead, setViewLead] = useState(null);
  const [leadMemories, setLeadMemories] = useState([]);
  const [syncingHubspot, setSyncingHubspot] = useState(false);

  const handleOpenView = async (lead) => {
    setViewLead(lead);
    setLeadMemories([]);
    try {
      const res = await getLeadMemory(lead.id);
      setLeadMemories(res.memories || []);
    } catch {
      setLeadMemories([]);
    }
  };

  const handleSyncHubspot = async (leadId) => {
    try {
      setSyncingHubspot(true);
      const res = await syncLeadToHubspot(leadId);
      if (res.ok) {
        setNotification({ type: 'success', message: `Synced to HubSpot (Contact ID: ${res.hubspot_id})` });
      } else {
        setNotification({ type: 'error', message: res.error || 'HubSpot sync failed' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSyncingHubspot(false);
    }
  };

  // Edit Modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // New Lead Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    interested_course: 'Python Programming & Automation',
    summary: '',
    notes: ''
  });

  const [notification, setNotification] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await getLeads({ 
        search, 
        category: categoryFilter, 
        course: courseFilter 
      });
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, courseFilter]);

  const handleOpenEdit = (lead) => {
    setSelectedLead(lead);
    setEditFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      interested_course: lead.interested_course || '',
      lead_category: lead.lead_category || 'Cold',
      sentiment: lead.sentiment || 'Neutral',
      summary: lead.summary || '',
      notes: lead.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateLead(selectedLead.id, editFormData);
      setIsEditModalOpen(false);
      setNotification({ type: 'success', message: 'Lead updated successfully!' });
      fetchLeads();
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleCreateNewLead = async (e) => {
    e.preventDefault();
    try {
      await createLead(newLeadData);
      setIsAddModalOpen(false);
      setNewLeadData({
        name: '',
        email: '',
        phone: '',
        interested_course: 'Python Programming & Automation',
        summary: '',
        notes: ''
      });
      setNotification({ type: 'success', message: 'New candidate lead added successfully!' });
      fetchLeads();
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(leadId);
      setNotification({ type: 'success', message: 'Lead removed from database.' });
      if (viewLead && viewLead.id === leadId) setViewLead(null);
      fetchLeads();
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '2026-11-25 10:12';
    try {
      const d = new Date(dateStr);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yr}-${mo}-${da} ${hr}:${mi}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Header & New Lead CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Leads & CRM</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Rule-based qualified prospects, conversation summaries, and sentiment classification.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#0c1427] hover:bg-[#15233e] text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>Add New Prospect</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by candidate name, email, phone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-cyan-500 focus:bg-white transition"
          />
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {['', 'Hot', 'Warm', 'Cold'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#0c1427] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat || 'All Categories'}
            </button>
          ))}
        </div>

        {/* Course Filter Dropdown */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="w-full md:w-auto px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold outline-none cursor-pointer"
        >
          <option value="">All Programs</option>
          <option value="Python">Python Bootcamp</option>
          <option value="Java">Java Enterprise</option>
          <option value="Full Stack">Full Stack MERN</option>
          <option value="AI">AI & Machine Learning</option>
          <option value="DSA">DSA & System Design</option>
        </select>
      </div>

      {/* LEADS LIST / TABLE (Exact Layout of Image 2) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading leads from database...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const category = lead.lead_category || 'Cold';
                  const score = lead.lead_score ?? 30;
                  const sentiment = lead.sentiment || 'Neutral';
                  const summaryText = lead.summary || lead.notes || `${lead.name || 'Candidate'} inquired about ${lead.interested_course || 'tech cohort'}. In evaluation stage.`;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                      {/* 1. Candidate Name & Date */}
                      <td className="px-6 py-5 align-middle w-52">
                        <div className="font-bold text-slate-900 text-sm tracking-tight">
                          {lead.name || 'Anonymous Prospect'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {formatDate(lead.created_at)}
                        </div>
                      </td>

                      {/* 2. Category & Score Badge (e.g. Cold 32/100, Warm 56/100, Hot 82/100) */}
                      <td className="px-4 py-5 align-middle w-36 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          category === 'Hot'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : category === 'Warm'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className="font-bold">{category}</span>
                          <span className="opacity-80">{score}/100</span>
                        </span>
                      </td>

                      {/* 3. Sentiment Badge (Negative / Neutral / Positive) */}
                      <td className="px-4 py-5 align-middle w-28 whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold text-center ${
                          sentiment === 'Positive'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sentiment === 'Negative'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {sentiment}
                        </span>
                      </td>

                      {/* 4. AI Conversation Summary (Multi-line snippet like in Image 2) */}
                      <td className="px-6 py-5 align-middle text-slate-600 text-xs leading-relaxed">
                        <p className="line-clamp-2 max-w-xl">
                          {summaryText}
                        </p>
                      </td>

                      {/* 5. View Action Button */}
                      <td className="px-6 py-5 align-middle text-right w-24">
                        <button
                          onClick={() => handleOpenView(lead)}
                          className="px-4 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs shadow-sm cursor-pointer transition inline-flex items-center gap-1"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW LEAD DETAILS MODAL */}
      {viewLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{viewLead.name}</h3>
                <p className="text-xs text-slate-400">Captured on {formatDate(viewLead.created_at)}</p>
              </div>
              <button
                onClick={() => setViewLead(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges Row */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                viewLead.lead_category === 'Hot'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : viewLead.lead_category === 'Warm'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {viewLead.lead_category} ({viewLead.lead_score ?? 10}/100)
              </span>

              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                viewLead.sentiment === 'Positive'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : viewLead.sentiment === 'Negative'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                Sentiment: {viewLead.sentiment || 'Neutral'}
              </span>
            </div>

            {/* Contact & Program Info */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Interested Program:</span>
                <span className="font-bold text-slate-800">{viewLead.interested_course || 'General Tech'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email Address:</span>
                <span className="font-medium text-slate-800">{viewLead.email || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone Number:</span>
                <span className="font-medium text-slate-800">{viewLead.phone || 'Not provided'}</span>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Consultation Summary</span>
              </h4>
              <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {viewLead.summary || viewLead.notes || 'Candidate engaged with VoxSales autonomous voice assistant. Details recorded for counselor follow-up.'}
              </p>
            </div>

            {/* BANT Qualification Breakdown */}
            {viewLead.bant && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  BANT Qualification ({viewLead.bant.total}/100)
                </h4>
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  {['budget', 'authority', 'need', 'timeline'].map((k) => {
                    const item = viewLead.bant[k] || {};
                    return (
                      <div key={k} className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="font-bold capitalize text-slate-800">{k}</div>
                        <div className="text-slate-500 capitalize">{item.level || 'unknown'}</div>
                        <div className="font-semibold text-indigo-700">{item.points ?? 0}/{item.max ?? 25}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cross-Call Lead Memory */}
            {leadMemories.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cross-Call Lead Memory ({leadMemories.length})
                </h4>
                <div className="max-h-28 overflow-y-auto space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                  {leadMemories.map((m) => (
                    <div key={m.id} className="text-slate-700">
                      <span className="font-bold uppercase text-[10px] text-indigo-700 mr-1.5">[{m.category}]</span>
                      <span>{m.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSyncHubspot(viewLead.id)}
                  disabled={syncingHubspot}
                  className="px-3 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs cursor-pointer transition disabled:opacity-50"
                >
                  {syncingHubspot ? 'Syncing...' : 'Sync HubSpot'}
                </button>
                <button
                  onClick={() => {
                    setViewLead(null);
                    handleOpenEdit(viewLead);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteLead(viewLead.id)}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setViewLead(null);
                  onBookSlotForLead({
                    name: viewLead.name || '',
                    email: viewLead.email || '',
                    phone: viewLead.phone || '',
                    interested_course: viewLead.interested_course || 'Python Programming & Automation'
                  });
                }}
                className="bg-[#0c1427] hover:bg-[#15233e] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition"
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Book Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Lead Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={editFormData.lead_category}
                    onChange={(e) => setEditFormData({ ...editFormData, lead_category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sentiment</label>
                  <select
                    value={editFormData.sentiment}
                    onChange={(e) => setEditFormData({ ...editFormData, sentiment: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">AI Summary</label>
                <textarea
                  rows={3}
                  value={editFormData.summary}
                  onChange={(e) => setEditFormData({ ...editFormData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0c1427] text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Candidate Prospect</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateNewLead} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                  placeholder="ramesh@gmail.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Interested Program</label>
                <select
                  value={newLeadData.interested_course}
                  onChange={(e) => setNewLeadData({ ...newLeadData, interested_course: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                >
                  <option value="Python Programming & Automation">Python Programming & Automation</option>
                  <option value="Java Enterprise & Microservices">Java Enterprise & Microservices</option>
                  <option value="Full Stack Web Development">Full Stack Web Development</option>
                  <option value="AI, Machine Learning & LLM Specialist">AI, Machine Learning & LLM Specialist</option>
                  <option value="DSA & System Design Masterclass">DSA & System Design Masterclass</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Inquiry Summary / Notes</label>
                <textarea
                  rows={3}
                  value={newLeadData.summary}
                  onChange={(e) => setNewLeadData({ ...newLeadData, summary: e.target.value })}
                  placeholder="e.g. Inquired about weekend batch fees and 100% placement support..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#0c1427] text-white font-bold cursor-pointer"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
