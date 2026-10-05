import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, ShieldAlert } from 'lucide-react';
import CinematicBackground from '../components/common/CinematicBackground';

export const LoginPage = () => {
  const [email, setEmail] = useState('finance@invoicex.local');
  const [password, setPassword] = useState('Password@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  // =========================================================================
  // STEP-BY-STEP ARCHITECTURE FLOW:
  // 1. User submits email & password on login form.
  // 2. React sends Axios POST to `/auth/login` (via AuthContext.login).
  // 3. Express router forwards request to authController.login.
  // 4. Controller queries PostgreSQL `users` table and compares password hash.
  // 5. Backend signs JWT token containing user identity and role.
  // 6. Response returns JWT token and user profile object.
  // 7. React saves token in localStorage, updates AuthContext, and routes to `/dashboard`.
  // =========================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      addToast('Authentication successful. Welcome to InvoiceX.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail) => {
    setEmail(targetEmail);
    setPassword('Password@123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-sky-500 selection:text-white">
      {/* Subtle Three.js Ambient Particle Layer */}
      <CinematicBackground />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-sky-600/30 mb-3">
          <CreditCard className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          INVOICEX
        </h2>
        <p className="mt-1 text-xs text-sky-700 font-bold tracking-wider uppercase">
          Invoice & Vendor Payment Automation
        </p>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Centralized Accounts Payable Lifecycle & Exception Resolution Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Corporate Email
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                  placeholder="name@invoicex.local"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Role Selection */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Quick Role Sign In
            </span>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('finance@invoicex.local')}
                className="flex items-center justify-between p-2 rounded-lg border border-sky-100 bg-sky-50/50 hover:bg-sky-100 text-xs text-sky-900 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Finance Specialist</span>
                    <span className="text-[10px] text-slate-500">Invoices, verification, exceptions & payments</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-sky-700">Select</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('manager@invoicex.local')}
                className="flex items-center justify-between p-2 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-100 text-xs text-purple-900 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">AP Approver / Manager</span>
                    <span className="text-[10px] text-slate-500">Invoice sign-off & segregation of duties</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700">Select</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@invoicex.local')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 transition text-left"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">System Administrator</span>
                    <span className="text-[10px] text-slate-500">Full audit logs and controls</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-700">Select</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
