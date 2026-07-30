import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, Loader2, MailCheck, Recycle, KeyRound } from 'lucide-react';
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
const input = {
  width: '100%', padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px',
  fontSize: '15px', marginBottom: '16px', boxSizing: 'border-box', textAlign: 'center',
  letterSpacing: '3px', fontWeight: 'bold'
};

export const VerifyEmailPage = ({ setCurrentPage, triggerToast }) => {
  const { verifyOtp, getPendingEmail, user } = useAuth();
  const [email, setEmail] = useState(getPendingEmail() || user?.email || '');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying | success
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!email) {
      const stored = getPendingEmail() || user?.email;
      if (stored) setEmail(stored);
    }
  }, [user]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      triggerToast('Please enter your email address.', 'error');
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      triggerToast('Please enter the 6-digit OTP code sent to your email.', 'error');
      return;
    }

    setStatus('verifying');
    setErrorMsg('');
    try {
      const data = await verifyOtp(email.trim(), otp.trim());
      setMessage(data.message || 'Email verified successfully!');
      setStatus('success');
      triggerToast('Email verified! Redirecting to profile setup...');
      setTimeout(() => {
        setCurrentPage('preferences');
      }, 1500);
    } catch (err) {
      setStatus('idle');
      setErrorMsg(err.message || 'Verification failed. Please check your OTP.');
      triggerToast(err.message || 'Verification failed.', 'error');
    }
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          <Recycle size={28} color="#15803d" />
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>EcoMatch</span>
        </div>

        {status === 'success' ? (
          <>
            <CheckCircle2 size={56} color="#15803d" style={{ margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 8px' }}>Email Verified!</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
            <button style={btn} onClick={() => setCurrentPage('preferences')}>
              <MailCheck size={18} /> Continue to Profile Setup
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7',
              display: 'grid', placeItems: 'center', margin: '0 auto 16px'
            }}>
              <ShieldCheck size={32} color="#15803d" />
            </div>
            <h1 style={{ fontSize: '22px', color: '#0f172a', margin: '0 0 8px' }}>Enter Verification Code</h1>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              We sent a 6-digit OTP code to <strong>{email || 'your email'}</strong>. Enter it below to activate your account.
            </p>

            <form onSubmit={handleVerifySubmit} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  style={{ ...input, textAlign: 'left', letterSpacing: 'normal', fontWeight: 'normal' }}
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  6-Digit OTP Code
                </label>
                <input
                  style={input}
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>

              {errorMsg && (
                <div style={{
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
                }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <button style={{ ...btn, opacity: status === 'verifying' ? 0.7 : 1 }} type="submit" disabled={status === 'verifying'}>
                {status === 'verifying' ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Verifying OTP…
                  </>
                ) : (
                  <>
                    <KeyRound size={18} /> Verify & Continue
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => setCurrentPage('signin')}
              style={{ background: 'none', border: 'none', color: '#15803d', fontWeight: 600, marginTop: '20px', cursor: 'pointer', fontSize: '14px' }}
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
