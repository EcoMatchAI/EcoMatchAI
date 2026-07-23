import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import './pages.css';

// Import Page Components
import LandingPage from './components/pages/LandingPage';
import SignInPage from './components/pages/SignInPage';
import SignUpPage from './components/pages/SignUpPage';
import ForgotPasswordPage from './components/pages/ForgotPasswordPage';
import PreferencesPage from './components/pages/PreferencesPage';
import MessagesPage from './components/pages/MessagesPage';
import ListingsDetailsPage from './components/pages/ListingsDetailsPage';
import MarketplacePage from './components/pages/MarketplacePage';
import DashboardPage from './components/pages/DashboardPage';
import CreateListingPage from './components/pages/CreateListingPage';
import ProfilePage from './components/pages/ProfilePage';
import NotificationsPage from './components/pages/NotificationsPage';
import AboutUs from './components/pages/AboutUs';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import TermsConditions from './components/pages/TermsConditions';
import ContactUs from './components/pages/ContactUs';
import FeedbackPage from './components/pages/FeedbackPage';
import VerifyEmailPage from './components/pages/VerifyEmailPage';
import VerifyEmailChangePage from './components/pages/VerifyEmailChangePage';
import CheckEmailPage from './components/pages/CheckEmailPage';

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

  // Draggable menu states and positioning
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const menuRef = React.useRef(null);
  const dragStartRef = React.useRef({ x: 0, y: 0 });
  const posStartRef = React.useRef({ x: 24, y: 24 });
  const dragDistanceRef = React.useRef(0);

  const handlePointerDown = (e) => {
    // Only drag on primary mouse click / touch
    if (e.button !== 0) return;
    setIsDragging(true);
    dragDistanceRef.current = 0;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    dragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let newX = posStartRef.current.x + deltaX;
    let newY = posStartRef.current.y - deltaY;

    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const padding = 12;
      newX = Math.max(padding, Math.min(newX, window.innerWidth - rect.width - padding));
      newY = Math.max(padding, Math.min(newY, window.innerHeight - rect.height - padding));
    }

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const toggleMinimize = (e) => {
    if (dragDistanceRef.current > 5) return;
    setIsMinimized(!isMinimized);
  };

  // Keep menu position valid when browser window resizes
  React.useEffect(() => {
    const handleResize = () => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const padding = 12;
        setPosition((prev) => {
          const newX = Math.max(padding, Math.min(prev.x, window.innerWidth - rect.width - padding));
          const newY = Math.max(padding, Math.min(prev.y, window.innerHeight - rect.height - padding));
          return { x: newX, y: newY };
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Common Toast Function
  const triggerToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Adapter: existing components call setCurrentPage('key') -> navigate to its path
  const setCurrentPage = (page) => navigate(PAGE_TO_PATH[page] ?? '/');
  const currentPage = PATH_TO_PAGE[location.pathname] ?? 'listsource';

  const nav = { currentPage, setCurrentPage, triggerToast, listingDraft, setListingDraft };

  return (
    <>
      {/* Floating toast notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 10000,
          backgroundColor: notification.type === 'error' ? '#EF4444' : '#10B981',
          color: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          fontWeight: 700,
          fontSize: '15px',
          animation: 'slideIn 0.3s ease-out forwards',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {notification.type === 'error' ? '⚠️' : '✓'}
          {notification.message}
        </div>
      )}

      {/* Global CSS Inject for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />

      {/* Application Routes */}
      <Routes>
        <Route path="/" element={<LandingPage {...nav} />} />
        <Route path="/signin" element={<SignInPage {...nav} />} />
        <Route path="/signup" element={<SignUpPage {...nav} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage {...nav} />} />
        <Route path="/check-email" element={<CheckEmailPage {...nav} />} />
        <Route path="/preferences" element={<PreferencesPage {...nav} />} />
        <Route path="/verify-email" element={<VerifyEmailPage {...nav} />} />
        <Route path="/verify-email-change" element={<VerifyEmailChangePage {...nav} />} />
        <Route path="/dashboard" element={<DashboardPage {...nav} />} />
        <Route path="/marketplace" element={<MarketplacePage {...nav} />} />
        <Route path="/listing-details" element={<ListingsDetailsPage {...nav} />} />
        <Route path="/create-listing" element={<CreateListingPage {...nav} />} />
        <Route path="/profile" element={<ProfilePage {...nav} />} />
        <Route path="/notifications" element={<NotificationsPage {...nav} />} />
        <Route path="/messages" element={<MessagesPage {...nav} />} />
        <Route path="/about" element={<AboutUs {...nav} />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy {...nav} />} />
        <Route path="/terms-conditions" element={<TermsConditions {...nav} />} />
        <Route path="/contact" element={<ContactUs {...nav} />} />
        <Route path="/feedback" element={<FeedbackPage {...nav} />} />
        {/* Unknown paths fall back to the landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* ============================================================================
         GLOBAL DEVELOPER ROUTE SWITCHER (Fixed bottom-left / Draggable)
         ============================================================================ */}
      {isMinimized ? (
        <div
          ref={menuRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            bottom: `${position.y}px`,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px 16px',
            borderRadius: '9999px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onClick={toggleMinimize}
        >
          <span style={{ fontSize: '14px' }}>🛠️</span>
          <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>App Navigator</span>
          <span style={{ fontSize: '10px', color: '#94A3B8', marginLeft: '4px' }}>[Click to Expand]</span>
        </div>
      ) : (
        <div
          ref={menuRef}
          className="page-switch-menu"
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            bottom: `${position.y}px`,
            zIndex: 99999,
            flexWrap: 'nowrap',
            maxWidth: '450px',
            flexDirection: 'column',
            padding: '0',
            overflow: 'hidden',
            touchAction: 'none',
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
            borderRadius: '12px',
          }}
        >
          {/* Header/Drag Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              backgroundColor: '#1E293B',
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ width: '12px', height: '2px', backgroundColor: '#94A3B8' }} />
                <div style={{ width: '12px', height: '2px', backgroundColor: '#94A3B8' }} />
                <div style={{ width: '12px', height: '2px', backgroundColor: '#94A3B8' }} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#F8FAFC', letterSpacing: '0.5px' }}>
                🛠️ App Navigator
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#F8FAFC',
                borderRadius: '4px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                lineHeight: '1',
              }}
              title="Minimize panel"
            >
              −
            </button>
          </div>

          {/* Buttons List Container */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px', 
            padding: '12px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <button
              className={`btn-switch-page ${currentPage === 'listsource' ? 'active' : ''}`}
              onClick={() => setCurrentPage('listsource')}
            >
              Landing (List/Source)
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'messages' ? 'active' : ''}`}
              onClick={() => setCurrentPage('messages')}
            >
              Inbox (Messages)
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'signin' ? 'active' : ''}`}
              onClick={() => setCurrentPage('signin')}
            >
              Sign In
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'signup' ? 'active' : ''}`}
              onClick={() => setCurrentPage('signup')}
            >
              Sign Up
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'preferences' ? 'active' : ''}`}
              onClick={() => setCurrentPage('preferences')}
            >
              Preferences
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'listingsDetails' ? 'active' : ''}`}
              onClick={() => setCurrentPage('listingsDetails')}
            >
              My Listings Details
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'marketplace' ? 'active' : ''}`}
              onClick={() => setCurrentPage('marketplace')}
            >
              Waste Marketplace
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentPage('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'createListing' ? 'active' : ''}`}
              onClick={() => { setListingDraft(null); setCurrentPage('createListing'); }}
            >
              Create Listing
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentPage('profile')}
            >
              Profile
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'notifications' ? 'active' : ''}`}
              onClick={() => setCurrentPage('notifications')}
            >
              Notifications
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'forgotPassword' ? 'active' : ''}`}
              onClick={() => setCurrentPage('forgotPassword')}
            >
              Forgot Password
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'about' ? 'active' : ''}`}
              onClick={() => setCurrentPage('about')}
            >
              About Us
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'contact' ? 'active' : ''}`}
              onClick={() => setCurrentPage('contact')}
            >
              Contact Us
            </button>
            <button
              className={`btn-switch-page ${currentPage === 'feedback' ? 'active' : ''}`}
              onClick={() => setCurrentPage('feedback')}
            >
              Feedback
            </button>
          </div>
        </div>
      )}
    </>
  );
}
