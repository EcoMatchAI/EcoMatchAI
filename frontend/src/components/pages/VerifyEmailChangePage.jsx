import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Recycle } from 'lucide-react';
import { apiVerifyEmailChange, isLoggedIn } from '../../lib/api';

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

export const VerifyEmailChangePage = ({ setCurrentPage }) => {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No confirmation token was provided in the link.');
      return;
    }

    apiVerifyEmailChange(token)
      .then((data) => {
        setNewEmail(data.user?.email || '');
        setMessage(data.message || 'Your email has been updated.');
        setStatus('success');
      })
      .catch((err) => {
        setMessage(err.message || 'Email change failed.');
        setStatus('error');
      });
  }, [token]);

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
            <h1 style={{ fontSize: '20px', color: '#0f172a', margin: '16px 0 8px' }}>Confirming your new email…</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>One moment please.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={52} color="#15803d" />
            <h1 style={{ fontSize: '21px', color: '#0f172a', margin: '16px 0 8px' }}>Email updated!</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '8px' }}>{message}</p>
            {newEmail && (
              <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, marginBottom: '24px' }}>{newEmail}</p>
            )}
            <button style={btn} onClick={() => setCurrentPage(isLoggedIn() ? 'profile' : 'signin')}>
              {isLoggedIn() ? 'Go to Profile' : 'Sign In'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={52} color="#ef4444" />
            <h1 style={{ fontSize: '21px', color: '#0f172a', margin: '16px 0 8px' }}>Couldn’t update email</h1>
            <p style={{ color: '#475569', fontSize: '14px', marginBottom: '24px' }}>{message}</p>
            <button style={btn} onClick={() => setCurrentPage(isLoggedIn() ? 'profile' : 'signin')}>
              {isLoggedIn() ? 'Back to Profile' : 'Back to Sign In'}
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default VerifyEmailChangePage;
