import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Scale,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Invoices', to: '/invoices', icon: FileText },
    { label: 'Verification', to: '/verification', icon: CheckCircle2 },
    { label: 'Exceptions', to: '/exceptions', icon: AlertTriangle },
    { label: 'Approvals', to: '/approvals', icon: UserCheck },
    {
      label: 'Payments',
      to: '/payments/schedule',
      icon: CreditCard,
      matchPrefix: '/payments',
    },
    { label: 'Reconciliation', to: '/reconciliation', icon: Scale },
    { label: 'Vendors', to: '/vendors', icon: Building2 },
    { label: 'Reports', to: '/reports', icon: BarChart3 },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
          <CreditCard className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold tracking-tight text-white leading-none">
            INVOICEX
          </h1>
          <p className="text-[10px] text-sky-400 font-medium tracking-wider uppercase mt-1 truncate">
            Invoice & Vendor Payment Automation
          </p>
        </div>
      </div>

      {/* Clean Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          AP Modules
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isItemActive = item.matchPrefix
            ? location.pathname.startsWith(item.matchPrefix)
            : location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isItemActive
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isItemActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">
          <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {getRoleDisplayName(user?.role).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{getRoleDisplayName(user?.role)}</p>
            <p className="text-[10px] text-sky-400 font-medium truncate uppercase tracking-wider">
              {user?.department || 'Accounts Payable'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
