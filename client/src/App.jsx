import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoiceListPage from './pages/InvoiceListPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import VerificationPage from './pages/VerificationPage';
import ExceptionCenterPage from './pages/ExceptionCenterPage';
import ApprovalCenterPage from './pages/ApprovalCenterPage';
import PaymentSchedulingPage from './pages/PaymentSchedulingPage';
import PaymentTrackingPage from './pages/PaymentTrackingPage';
import ReconciliationPage from './pages/ReconciliationPage';
import VendorManagementPage from './pages/VendorManagementPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500 font-mono">
        Verifying secure session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Workspace */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="invoices" element={<InvoiceListPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="verification" element={<VerificationPage />} />
              <Route path="exceptions" element={<ExceptionCenterPage />} />
              <Route path="approvals" element={<ApprovalCenterPage />} />
              <Route path="payments/schedule" element={<PaymentSchedulingPage />} />
              <Route path="payments/track" element={<PaymentTrackingPage />} />
              <Route path="reconciliation" element={<ReconciliationPage />} />
              <Route path="vendors" element={<VendorManagementPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
