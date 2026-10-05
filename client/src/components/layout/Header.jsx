import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, LogOut, CheckCheck, ExternalLink, ChevronDown, User, Shield, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

export const Header = () => {
  const { user, logout, quickSwitchRole } = useAuth();
  const { notifications, unreadCount, refreshNotifications, addToast } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await axiosClient.put('/notifications/read-all');
      refreshNotifications();
    } catch {
      // non-blocking
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await axiosClient.put(`/notifications/${notif.id}/read`);
        refreshNotifications();
      }
      setShowNotifs(false);
      if (notif.link_url) {
        navigate(notif.link_url);
      }
    } catch {
      // non-blocking
    }
  };

  const handleSwitchPersona = async (targetRole) => {
    try {
      const switched = await quickSwitchRole(targetRole);
      addToast(`Active session switched to ${getRoleDisplayName(switched.role)}`, 'success');
      setShowProfileMenu(false);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'FINANCE_STAFF':
        return 'Finance Staff';
      case 'APPROVER':
        return 'Approver / Manager';
      case 'ADMIN':
        return 'Admin';
      default:
        return role ? role.replace('_', ' ') : 'User';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Workspace Brand / Division Header */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <span className="text-[11px] text-sky-700 font-bold tracking-wider uppercase block leading-tight truncate">
            INVOICEX · Invoice & Vendor Payment Automation
          </span>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-snug truncate">
            Accounts Payable Division
          </h2>
        </div>
      </div>

      {/* Right Actions: System Info, Notifications, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100/80 text-slate-600 border border-slate-200/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Role permissions active</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No recent notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition flex items-start justify-between gap-2 ${
                        !n.is_read ? 'bg-sky-50/40 font-medium' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {n.link_url && <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 transition text-left"
          >
            <div className="w-8 h-8 rounded-full bg-sky-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {getRoleDisplayName(user?.role).charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                {getRoleDisplayName(user?.role)}
              </span>
              <span className="text-[10px] text-sky-700 font-semibold block tracking-wide">
                {user?.department || 'Accounts Payable'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100">
              {/* Profile Details */}
              <div className="p-4 bg-slate-50/80">
                <p className="text-xs font-bold text-slate-900">{getRoleDisplayName(user?.role)}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">{user?.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                    <Shield className="w-3 h-3" />
                    {getRoleDisplayName(user?.role)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {user?.department || 'Accounts Payable'}
                  </span>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                  Switch Active Role
                </span>
                <div className="space-y-1">
                  <button
                    onClick={() => handleSwitchPersona('FINANCE_STAFF')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      user?.role === 'FINANCE_STAFF'
                        ? 'bg-sky-50 text-sky-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Finance Specialist</span>
                    {user?.role === 'FINANCE_STAFF' && <Check className="w-3.5 h-3.5 text-sky-600" />}
                  </button>

                  <button
                    onClick={() => handleSwitchPersona('APPROVER')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      user?.role === 'APPROVER'
                        ? 'bg-purple-50 text-purple-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>AP Approver / Manager</span>
                    {user?.role === 'APPROVER' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                  </button>

                  <button
                    onClick={() => handleSwitchPersona('ADMIN')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                      user?.role === 'ADMIN'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>System Administrator</span>
                    {user?.role === 'ADMIN' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>
              </div>

              {/* Navigation & Logout */}
              <div className="p-2 bg-slate-50/50">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 transition"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Account Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Icon Button */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
