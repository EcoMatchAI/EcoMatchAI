import React, { useState } from 'react';
import { Mail, ArrowLeft, Recycle, MailCheck } from 'lucide-react';
import {
  BackgroundWaves, SignInLogo, DotGrid, FactoryIllustration,
  WindTurbineIllustration
} from '../common/Icons';

export const ForgotPasswordPage = ({ setCurrentPage, triggerToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      triggerToast('Please enter your email address.', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      triggerToast('Password reset link sent to your email.');
    }, 1400);
  };

  return (
    <div className="page-container">
      <BackgroundWaves />

      {/* LEFT COLUMN */}
      <aside className="sidebar-left">
        <header className="brand-header">
          <SignInLogo size={42} />
          <div className="brand-text-container">
            <span className="brand-name">EcoMatch</span>
            <span className="brand-tagline">Industrial Symbiosis</span>
          </div>
        </header>

        <div className="quote-container">
          <span className="quote-mark open">“</span>
          <p className="quote-text">
            One company’s waste is another company’s resource.
          </p>
          <span className="quote-mark close" style={{ bottom: '-45px', right: '10px' }}>”</span>
          <div className="quote-line"></div>
        </div>

        <div className="illustration-container">
          <DotGrid color="#8B5CF6" style={{ top: '15%', right: '18%', width: '36px', height: '48px' }} />
          <FactoryIllustration />
        </div>
      </aside>

      {/* CENTER COLUMN */}
      <main className="center-content">
        <div className="signin-card">
          <div className="card-header">
            <div className="brand-header">
              <SignInLogo size={46} color="#15803D" />
              <div className="brand-text-container" style={{ textAlign: 'left' }}>
                <span className="brand-name">EcoMatch</span>
                <span className="brand-tagline">Industrial Symbiosis</span>
              </div>
            </div>
            <div className="card-header-titles">
              <h1 className="card-title">{sent ? 'Check Your Email' : 'Forgot Password?'}</h1>
              <p className="card-subtitle">
                {sent
                  ? `We've sent a password reset link to ${email}.`
                  : "No worries — enter your email and we'll send you a reset link."}
              </p>
            </div>
          </div>

          {!sent ? (
            <form className="signin-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="fp-email"
                    type="email"
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="fp-success">
              <div className="fp-success-icon">
                <MailCheck size={34} />
              </div>
              <p className="fp-success-text">
                Didn't receive the email? Check your spam folder or try resending.
              </p>
              <button
                type="button"
                className="btn-social"
                onClick={() => { setSent(false); }}
              >
                Resend Link
              </button>
            </div>
          )}

          <div className="card-footer">
            <a
              href="#signin"
              className="link-signup"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={(e) => { e.preventDefault(); setCurrentPage('signin'); }}
            >
              <ArrowLeft size={15} />
              Back to Sign In
            </a>
          </div>
        </div>
      </main>

      {/* RIGHT COLUMN */}
      <aside className="sidebar-right">
        <div className="quote-container" style={{ margin: 'auto 0 0 0', position: 'relative' }}>
          <span className="quote-mark open" style={{ top: '-45px', left: '-20px' }}>“</span>
          <p className="quote-text">
            Building a sustainable tomorrow through smart connections today.
          </p>
          <span className="quote-mark close" style={{ bottom: '-45px', right: '10px' }}>”</span>
          <div className="quote-line"></div>
        </div>

        <div className="illustration-container" style={{ alignSelf: 'flex-end', width: '100%' }}>
          <div style={{ position: 'absolute', bottom: '65%', left: '15%', zIndex: 3 }}>
            <div className="badge-recycle">
              <Recycle size={28} />
            </div>
          </div>
          <DotGrid color="#4ADE80" style={{ bottom: '70%', right: '5%', width: '36px', height: '48px' }} />
          <WindTurbineIllustration />
        </div>
      </aside>
    </div>
  );
};
export default ForgotPasswordPage;
