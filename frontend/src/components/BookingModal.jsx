import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, BookOpen, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { bookAppointment } from '../api';

export default function BookingModal({ isOpen, onClose, initialData = {}, onSuccess }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    course: 'Python Programming & Automation',
    slot_date: '',
    slot_time: '10:00 AM',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Generate tomorrow's date as default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().split('T')[0];

    setFormData({
      customer_name: initialData.customer_name || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      course: initialData.course || 'Python Programming & Automation',
      slot_date: initialData.slot_date || defaultDate,
      slot_time: initialData.slot_time || '10:00 AM',
      notes: initialData.notes || 'Counseling booked via VoxSales AI interface'
    });
    setError(null);
    setSuccess(null);
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await bookAppointment(formData);
      setSuccess(res.message || 'Appointment successfully confirmed!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to book slot. It might already be reserved.');
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "10:00 AM",
    "11:30 AM",
    "02:00 PM",
    "03:30 PM",
    "05:00 PM",
    "06:30 PM"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100">
        <div className="flex items-center justify-between pb-4 border-b border-purple-50 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Book Counseling Slot</h3>
              <p className="text-[11px] text-slate-400">1-on-1 Academic Consultation</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
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

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Student Full Name *</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-purple-500">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full bg-transparent outline-none text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-purple-500">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="rahul@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent outline-none text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-purple-500">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-transparent outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Interested Program</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 focus-within:border-purple-500">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full bg-transparent outline-none text-slate-800 cursor-pointer"
              >
                <option value="Python Programming & Automation">Python Programming & Automation</option>
                <option value="Java Enterprise & Microservices">Java Enterprise & Microservices</option>
                <option value="Full Stack Web Development (MERN)">Full Stack Web Development (MERN)</option>
                <option value="AI, Machine Learning & LLM Specialist">AI, Machine Learning & LLM Specialist</option>
                <option value="DSA & System Design Masterclass">DSA & System Design Masterclass</option>
                <option value="General Tech Career Counseling">General Tech Career Counseling</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Appointment Date *</label>
              <input
                type="date"
                required
                value={formData.slot_date}
                onChange={(e) => setFormData({ ...formData, slot_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Preferred Time Window *</label>
              <select
                value={formData.slot_time}
                onChange={(e) => setFormData({ ...formData, slot_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500 cursor-pointer"
              >
                {timeSlots.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Counseling Notes</label>
            <textarea
              rows={2}
              placeholder="Questions about placements, scholarships, or batch schedule..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
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
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 font-semibold text-white shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Confirming in MongoDB...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
