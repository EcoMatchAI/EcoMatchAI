import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import './pages.css';

// The landing and auth screens are what a first-time visitor actually loads, so
// they stay in the main bundle. Everything behind sign-in is split into its own
// chunk — previously every page (and its images) shipped in one ~600 kB file
// that had to download before the sign-in form could render.
import LandingPage from './components/pages/LandingPage';
import SignInPage from './components/pages/SignInPage';
import SignUpPage from './components/pages/SignUpPage';

const ForgotPasswordPage = lazy(() => import('./components/pages/ForgotPasswordPage'));
const PreferencesPage = lazy(() => import('./components/pages/PreferencesPage'));
const MessagesPage = lazy(() => import('./components/pages/MessagesPage'));
const ListingsDetailsPage = lazy(() => import('./components/pages/ListingsDetailsPage'));
const MarketplacePage = lazy(() => import('./components/pages/MarketplacePage'));
const DashboardPage = lazy(() => import('./components/pages/DashboardPage'));
const CreateListingPage = lazy(() => import('./components/pages/CreateListingPage'));
const ProfilePage = lazy(() => import('./components/pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./components/pages/NotificationsPage'));
const OrdersPage = lazy(() => import('./components/pages/OrdersPage'));
const AboutUs = lazy(() => import('./components/pages/AboutUs'));
const PrivacyPolicy = lazy(() => import('./components/pages/PrivacyPolicy'));
const TermsConditions = lazy(() => import('./components/pages/TermsConditions'));
const ContactUs = lazy(() => import('./components/pages/ContactUs'));
const FeedbackPage = lazy(() => import('./components/pages/FeedbackPage'));
const VerifyEmailPage = lazy(() => import('./components/pages/VerifyEmailPage'));
const VerifyEmailChangePage = lazy(() => import('./components/pages/VerifyEmailChangePage'));
const CheckEmailPage = lazy(() => import('./components/pages/CheckEmailPage'));

import { useAuth } from './context/useAuth';

const FullPageMessage = ({ children }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', color: '#15803d', fontWeight: 700 }}>
    {children}
  </div>
);

const ProtectedRoute = ({ children, triggerToast }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <FullPageMessage>Loading session...</FullPageMessage>;
  }
  if (!isAuthenticated) {
    triggerToast('Please sign in to access this page.', 'error');
    return <Navigate to="/signin" replace />;
  }
  return children;
};

/* ============================================================================
   ROUTING
   ============================================================================ */
const PAGE_TO_PATH = {
  listsource: '/',
  signin: '/signin',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  checkEmail: '/check-email',
  preferences: '/preferences',
  verifyEmail: '/verify-email',
  verifyEmailChange: '/verify-email-change',
  dashboard: '/dashboard',
  marketplace: '/marketplace',
  listingsDetails: '/listing-details',
  createListing: '/create-listing',
  orders: '/orders',
  profile: '/profile',
  notifications: '/notifications',
  messages: '/messages',
  about: '/about',
  privacy: '/privacy-policy',
  terms: '/terms-conditions',
  contact: '/contact',
  feedback: '/feedback',
};

const PATH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page])
);

export default function App() {
  const [notification, setNotification] = useState(null);
  const [listingDraft, setListingDraft] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const triggerToast = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.msg === msg ? null : curr));
    }, 4000);
  };

  const currentPage = PATH_TO_PAGE[location.pathname] || 'listsource';

  const setCurrentPage = (newPage) => {
    const targetPath = PAGE_TO_PATH[newPage];
    if (targetPath && targetPath !== location.pathname) {
      navigate(targetPath);
    }
  };

  const nav = { currentPage, setCurrentPage, triggerToast, setListingDraft, listingDraft };

  return (
    <>
      {/* Global Toast Alert */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[999999] px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span>{notification.msg}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <Suspense fallback={<FullPageMessage>Loading…</FullPageMessage>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage {...nav} />} />
        <Route path="/signin" element={<SignInPage {...nav} />} />
        <Route path="/signup" element={<SignUpPage {...nav} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage {...nav} />} />
        <Route path="/check-email" element={<CheckEmailPage {...nav} />} />
        <Route path="/verify-email" element={<VerifyEmailPage {...nav} />} />
        <Route path="/verify-email-change" element={<VerifyEmailChangePage {...nav} />} />

        {/* Protected Routes */}
        <Route path="/preferences" element={<ProtectedRoute triggerToast={triggerToast}><PreferencesPage {...nav} /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute triggerToast={triggerToast}><DashboardPage {...nav} /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute triggerToast={triggerToast}><MarketplacePage {...nav} /></ProtectedRoute>} />
        <Route path="/listing-details" element={<ProtectedRoute triggerToast={triggerToast}><ListingsDetailsPage {...nav} /></ProtectedRoute>} />
        <Route path="/create-listing" element={<ProtectedRoute triggerToast={triggerToast}><CreateListingPage {...nav} /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute triggerToast={triggerToast}><OrdersPage {...nav} /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute triggerToast={triggerToast}><ProfilePage {...nav} /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute triggerToast={triggerToast}><NotificationsPage {...nav} /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute triggerToast={triggerToast}><MessagesPage {...nav} /></ProtectedRoute>} />

        <Route path="/about" element={<AboutUs {...nav} />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy {...nav} />} />
        <Route path="/terms-conditions" element={<TermsConditions {...nav} />} />
        <Route path="/contact" element={<ContactUs {...nav} />} />
        <Route path="/feedback" element={<FeedbackPage {...nav} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
