import React, { useEffect, useState } from 'react';
import { MailCheck, Loader2, KeyRound, Recycle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const wrap = {
  minHeight: '100vh', display: 'grid', placeItems: 'center',
  background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, Roboto, sans-serif',
};
const card = {
  width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '18px',
  boxShadow: '0 12px 30px rgba(15,23,42,0.10)', padding: '40px 32px', textAlign: 'center',
};
const btn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  width: '100%', padding: '13px 20px', border: 'none', borderRadius: '10px',
  background: '#15803d', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
};
const iconBadge = {
  width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7',
  display: 'grid', placeItems: 'center', margin: '0 auto 18px',
};

export const CheckEmailPage = ({ setCurrentPage, triggerToast }) => {
  const { user, getPendingEmail, logout, refreshUser, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const e = getPendingEmail() || user?.email || '';
    setEmail(e);
    if (user?.isEmailVerified) {
      triggerToast('Email is already verified! Moving to profile setup...');
      setCurrentPage(user?.accountStatus === 'ACTIVE' ? 'dashboard' : 'preferences');
    }
  }, [user]);

  const handleSignOut = () => {
    logout();
    setCurrentPage('signin');
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <Recycle size={26} color="#15803d" />
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>EcoMatch</span>
        </div>

        {authLoading ? (
          <>
            <Loader2 size={44} color="#15803d" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '14px' }}>Checking status…</p>
          </>
        ) : (
          <>
            <div style={iconBadge}>
              <MailCheck size={34} color="#15803d" />
            </div>
            <h1 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 10px' }}>Verify your email</h1>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, marginBottom: '6px' }}>
              We’ve sent a 6-digit OTP verification code to
            </p>
            <p style={{ color: '#0f172a', fontSize: '15px', fontWeight: 700, marginBottom: '18px' }}>
              {email || 'your email address'}
            </p>
            <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '26px' }}>
              Please enter the 6-digit OTP code to verify your account and complete registration.
            </p>

            <button style={btn} onClick={() => setCurrentPage('verifyEmail')}>
              <KeyRound size={17} /> Enter 6-Digit OTP Code
            </button>

            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 600, marginTop: '22px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CheckEmailPage;
