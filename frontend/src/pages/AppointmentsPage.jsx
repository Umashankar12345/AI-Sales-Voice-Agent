import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  User, 
  Mail, 
  Phone,
  BookOpen,
  Download
} from 'lucide-react';
import { getSlots, getAppointments, getAppointmentIcsUrl } from '../api';

export default function AppointmentsPage({ onOpenBookingModal }) {
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slotsData, appsData] = await Promise.all([
        getSlots(),
        getAppointments()
      ]);
      setSlots(slotsData.slots || []);
      setAppointments(appsData.appointments || []);

      if (slotsData.slots?.length > 0 && !selectedDateFilter) {
        setSelectedDateFilter(slotsData.slots[0].slot_date);
      }
    } catch (err) {
      console.error('Failed to load appointments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group slots by date
  const uniqueDates = [...new Set(slots.map(s => s.slot_date))].sort();
  const currentSlots = slots.filter(s => s.slot_date === selectedDateFilter);

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-purple-600" />
            1-on-1 Academic Counseling Appointments
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time slot scheduling with atomic MongoDB concurrency protection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenBookingModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-800 transition cursor-pointer"
            title="Refresh Slots"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Tabs */}
      <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-purple-600" />
            Select Appointment Date:
          </h3>
          <span className="text-xs text-slate-400 font-medium">30-Minute Career & Tech Guidance</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {uniqueDates.map((dateStr) => {
            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isSelected = selectedDateFilter === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateFilter(dateStr)}
                className={`px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[90px] border transition cursor-pointer ${
                  isSelected
                    ? 'bg-purple-700 text-white border-purple-700 shadow-md shadow-purple-700/30'
                    : 'bg-slate-50 hover:bg-purple-50 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                  {dayName}
                </span>
                <span className="text-xs font-extrabold mt-0.5">{monthDay}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots Grid */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Available Time Windows for {selectedDateFilter}
            </h3>
            <p className="text-xs text-slate-500">Click any available slot to book a counseling session</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span> Available
            </span>
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300"></span> Booked
            </span>
          </div>
        </div>

        {currentSlots.length === 0 ? (
          <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl">
            No slots generated for this date.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
            {currentSlots.map((slot) => {
              const isBooked = slot.is_booked;
              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (!isBooked) {
                      onOpenBookingModal({
                        slot_date: slot.slot_date,
                        slot_time: slot.slot_time
                      });
                    }
                  }}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-between gap-3 text-center transition-all ${
                    isBooked
                      ? 'bg-slate-100/80 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                      : 'bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-200/80 text-emerald-950 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.02]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{slot.slot_time}</span>
                  </div>

                  <div>
                    {isBooked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase tracking-wider">
                        Reserved
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 uppercase tracking-wider">
                        Open Slot
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmed Appointments Table */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md overflow-hidden">
        <div className="p-6 border-b border-purple-50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Confirmed Booking Records</h3>
            <p className="text-xs text-slate-500">Synchronized directly with MongoDB appointments collection</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {appointments.length} Confirmed Slots
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-purple-50">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Course Discussion</th>
                <th className="px-6 py-4">Scheduled Slot</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Booked At</th>
                <th className="px-6 py-4 text-right">Calendar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                    No appointments booked yet. Select an open slot above or ask the voice agent!
                  </td>
                </tr>
              ) : (
                appointments.map((app) => (
                  <tr key={app.id} className="hover:bg-purple-50/40 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {app.customer_name}
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3 h-3 text-purple-500" />
                        <span>{app.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3 h-3 text-purple-500" />
                        <span>{app.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-purple-900">
                      {app.course || 'Tech Counseling'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>{app.slot_date}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{app.slot_time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 w-fit">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{app.status || 'Confirmed'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Today'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={getAppointmentIcsUrl(app.id)}
                        download={`appointment-${app.id}.ics`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-50 text-purple-700 font-semibold text-[11px] transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>.ics</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
