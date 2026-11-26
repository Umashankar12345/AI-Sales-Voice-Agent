import React, { useState } from 'react';
import { X, Lock, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data =
        mode === 'login'
          ? await loginUser(email.trim(), password)
          : await registerUser({
              email: email.trim(),
              password,
              full_name: fullName.trim(),
              organization_name: orgName.trim(),
            });
      if (onAuthSuccess) onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {mode === 'login' ? 'Sign In to Organization' : 'Register Organization'}
              </h3>
              <p className="text-[11px] text-slate-400">JWT-secured multi-tenant workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 border-b-2 cursor-pointer ${mode === 'login' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2 border-b-2 cursor-pointer ${mode === 'register' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400'}`}
          >
            Register Org
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {mode === 'register' && (
            <>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
              />
            </>
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Work Email"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Organization'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
