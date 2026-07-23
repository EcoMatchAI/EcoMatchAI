import React, { useEffect, useRef, useState } from 'react';
import { MailCheck, Loader2, RefreshCw, Recycle, LogOut } from 'lucide-react';
import { apiGetMe, apiResendVerification, isLoggedIn, logout } from '../../lib/api';

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
const ghostBtn = {
  ...btn, background: 'transparent', color: '#15803d', border: '1px solid #cbd5e1', marginTop: '12px',
};
const iconBadge = {
  width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7',
  display: 'grid', placeItems: 'center', margin: '0 auto 18px',
};

export const CheckEmailPage = ({ setCurrentPage, triggerToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // Once verified, send the user on to complete their business profile.
  const proceedIfVerified = (user) => {
    if (user?.isEmailVerified) {
      triggerToast('Email verified! Let’s set up your profile.');
      setCurrentPage(user.profileCompleted ? 'dashboard' : 'preferences');
      return true;
    }
    return false;
  };

  // Initial load + background polling: if the user verifies in another tab,
  // this page notices and moves them forward automatically.
  const pollRef = useRef(null);
  useEffect(() => {
    if (!isLoggedIn()) {
      setCurrentPage('signin');
      return;
    }
    let cancelled = false;

    apiGetMe()
      .then(({ user }) => {
        if (cancelled) return;
        setEmail(user?.email || '');
        if (!proceedIfVerified(user)) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });

    pollRef.current = setInterval(async () => {
      try {
        const { user } = await apiGetMe();
        if (!cancelled && proceedIfVerified(user)) clearInterval(pollRef.current);
      } catch { /* ignore transient errors while polling */ }
    }, 5000);

    return () => { cancelled = true; clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const data = await apiResendVerification(email);
      triggerToast(data.message || 'Verification email sent. Check your inbox.');
    } catch (err) {
      triggerToast(err.message || 'Could not resend the email.', 'error');
    } finally {
      setResending(false);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const { user } = await apiGetMe();
      if (!proceedIfVerified(user)) {
        triggerToast('Not verified yet. Please click the link in your email.', 'error');
      }
    } catch {
      triggerToast('Could not check status. Please try again.', 'error');
    } finally {
      setChecking(false);
    }
  };

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

        {loading ? (
          <>
            <Loader2 size={44} color="#15803d" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '14px' }}>Loading…</p>
          </>
        ) : (
          <>
            <div style={iconBadge}>
              <MailCheck size={34} color="#15803d" />
            </div>
            <h1 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 10px' }}>Verify your email</h1>
            <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, marginBottom: '6px' }}>
              We’ve sent a verification link to
            </p>
            <p style={{ color: '#0f172a', fontSize: '15px', fontWeight: 700, marginBottom: '18px' }}>
              {email || 'your email address'}
            </p>
            <p style={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.6, marginBottom: '26px' }}>
              You must verify your email before continuing. Open the email and click
              <strong> Verify Email</strong> — this page will move on automatically once you do.
            </p>

            <button style={{ ...btn, opacity: checking ? 0.7 : 1 }} onClick={handleManualCheck} disabled={checking}>
              {checking ? 'Checking…' : <><RefreshCw size={17} /> I’ve verified — continue</>}
            </button>

            <button style={{ ...ghostBtn, opacity: resending ? 0.7 : 1 }} onClick={handleResend} disabled={resending}>
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>

            <button
              onClick={handleSignOut}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 600, marginTop: '18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
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
