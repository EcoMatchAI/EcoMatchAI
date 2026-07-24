import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, MailCheck, Recycle } from 'lucide-react';
import { apiVerifyEmail, apiResendVerification, setToken } from '../../lib/api';

const wrap = {
  minHeight: '100vh', display: 'grid', placeItems: 'center',
  background: '#f1f5f9', padding: '24px', fontFamily: 'Segoe UI, Roboto, sans-serif',
};
const card = {
  width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '18px',
  boxShadow: '0 12px 30px rgba(15,23,42,0.10)', padding: '40px 32px', textAlign: 'center',
};
const btn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  width: '100%', padding: '13px 20px', border: 'none', borderRadius: '10px',
  background: '#15803d', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
};
const input = {
  width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px',
  fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box',
};

export const VerifyEmailPage = ({ setCurrentPage, triggerToast }) => {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const ran = useRef(false); // guard React 18 StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token was provided in the link.');
      return;
    }

    apiVerifyEmail(token)
      .then((data) => {
        if (data.token) setToken(data.token); // auto-login
        setUser(data.user || null);
        setMessage(data.message || 'Email verified successfully!');
        setStatus('success');
        // Send the user on to the material-preferences step automatically.
        const next = data.user && data.user.profileCompleted ? 'dashboard' : 'preferences';
        setTimeout(() => setCurrentPage(next), 1800);
      })
      .catch((err) => {
        setMessage(err.message || 'Verification failed.');
        setStatus('error');
      });
  }, [token]);

  const goNext = () => {
    if (user && !user.profileCompleted) setCurrentPage('preferences');
    else setCurrentPage('dashboard');
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      triggerToast('Please enter your email address.', 'error');
      return;
    }
    setResending(true);
    try {
      const data = await apiResendVerification(resendEmail.trim());
      triggerToast(data.message || 'Verification email sent.');
    } catch (err) {
      triggerToast(err.message || 'Could not resend email.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <Recycle size={26} color="#15803d" />
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>EcoMatch</span>
        </div>

        {status === 'verifying' && (
          <>
            <Loader2 size={48} color="#15803d" style={{ animation: 'spin 1s linear infinite' }} />
            <h1 style={{ fontSize: '20px', color: '#0f172a', margin: '16px 0 8px' }}>Verifying your email…</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Hang tight, this only takes a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={52} color="#15803d" />
            <h1 style={{ fontSize: '21px', color: '#0f172a', margin: '16px 0 8px' }}>Email verified!</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
            <button style={btn} onClick={goNext}>
              <MailCheck size={18} /> Continue
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={52} color="#ef4444" />
            <h1 style={{ fontSize: '21px', color: '#0f172a', margin: '16px 0 8px' }}>Verification failed</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{message}</p>

            <form onSubmit={handleResend} style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Resend verification link
              </label>
              <input
                style={input}
                type="email"
                placeholder="Enter your account email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <button style={{ ...btn, opacity: resending ? 0.7 : 1 }} type="submit" disabled={resending}>
                {resending ? 'Sending…' : 'Resend email'}
              </button>
            </form>

            <button
              onClick={() => setCurrentPage('signin')}
              style={{ background: 'none', border: 'none', color: '#15803d', fontWeight: 600, marginTop: '16px', cursor: 'pointer' }}
            >
              Back to Sign In
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VerifyEmailPage;
