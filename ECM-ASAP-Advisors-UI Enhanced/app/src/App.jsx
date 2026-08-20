import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { ViewProvider } from './context/ViewContext';
import ErrorBoundary from './components/ErrorBoundary';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import GST2BReco from './pages/GST2BReco';
import ReimbursementAudit from './pages/ReimbursementAudit';
import PlaceholderPage from './pages/PlaceholderPage';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRedirect() {
  return <Navigate to="/audit/reimbursement" replace />;
}

function Placeholder({ path }) {
  return <PlaceholderPage path={path} />;
}

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <ErrorBoundary>
      <ViewProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminRedirect />} />
            <Route path="admin" element={<AdminRedirect />} />

            {/* Statutory */}
            <Route path="statutory/tds" element={<Placeholder path="/statutory/tds" />} />
            <Route path="statutory/2b-reco" element={<GST2BReco />} />
            {/* 26AS matching — coming soon (Phase 2), same as TDS */}
            <Route path="statutory/26as" element={<Placeholder path="/statutory/26as" />} />

            {/* Audit */}
            <Route path="audit/reimbursement" element={<ReimbursementAudit />} />
            <Route path="audit/income-expenditure" element={<Placeholder path="/audit/income-expenditure" />} />

            {/* Bill Tracking */}
            <Route path="bill-tracking/lt-flow" element={<Placeholder path="/bill-tracking/lt-flow" />} />
            <Route path="bill-tracking/cosmos" element={<Placeholder path="/bill-tracking/cosmos" />} />

            {/* Others */}
            <Route path="others/invoice-print" element={<Placeholder path="/others/invoice-print" />} />
            <Route path="others/bank-payment" element={<Placeholder path="/others/bank-payment" />} />
            <Route path="others/outstanding" element={<Placeholder path="/others/outstanding" />} />
          </Route>
        </Routes>
      </ViewProvider>

      {/* Powered by Pucho.ai Badge — hidden on login page to avoid overlap with characters */}
      {!isLogin && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none select-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 px-4 py-2 bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(89,34,198,0.15)] border border-white/50"
          >
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Powered By</span>
            <img
              src="https://cdn.prod.website-files.com/690ec911550adb97c4a56495/69399fa4c6253325791cd9ce_pucho%20logo.webp"
              alt="Pucho.ai"
              className="h-4 w-auto object-contain"
            />
          </motion.div>
        </div>
      )}
    </ErrorBoundary>
  );
}