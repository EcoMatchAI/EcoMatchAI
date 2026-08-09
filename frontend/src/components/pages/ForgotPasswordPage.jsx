import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Recycle, KeyRound, CheckCircle2 } from 'lucide-react';
import {
  BackgroundWaves, SignInLogo, DotGrid, FactoryIllustration,
  WindTurbineIllustration
} from '../common/Icons';
import { apiForgotPassword, apiResetPassword } from '../../lib/api';

export const ForgotPasswordPage = ({ setCurrentPage, triggerToast }) => {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      triggerToast('Please enter your registered email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await apiForgotPassword(email.trim());
      triggerToast(res.message || 'OTP code sent! Please check your email.');
      setStep(2);
    } catch (err) {
      triggerToast(err.message || 'Failed to request password reset OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      triggerToast('Please enter the 6-digit OTP code sent to your email.', 'error');
      return;
    }
    if (!newPassword) {
      triggerToast('Please enter your new password.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      triggerToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await apiResetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });
      triggerToast(res.message || 'Password reset successful!');
      setStep(3);
    } catch (err) {
      triggerToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setLoading(false);
    }
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
              <h1 className="card-title">
                {step === 1 ? 'Forgot Password?' : step === 2 ? 'Reset Password' : 'Password Reset Completed'}
              </h1>
              <p className="card-subtitle">
                {step === 1
                  ? "Enter your email and we'll send a 6-digit OTP code to reset your password."
                  : step === 2
                  ? `Enter the 6-digit OTP sent to ${email} and your new password.`
                  : 'Your password has been successfully reset. You can now sign in with your new password.'}
              </p>
            </div>
          </div>

          {step === 1 && (
            <form className="signin-form" onSubmit={handleRequestOtp}>
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
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending OTP Code...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="signin-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="fp-otp">6-Digit OTP Code</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <KeyRound size={18} />
                  </span>
                  <input
                    id="fp-otp"
                    type="text"
                    maxLength={6}
                    className="form-input"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{ letterSpacing: '2px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fp-new-password">New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="fp-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fp-confirm-password">Confirm New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="fp-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <button
                type="button"
                className="btn-social"
                style={{ marginTop: '10px' }}
                onClick={() => setStep(1)}
              >
                Request New Code
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="fp-success">
              <div className="fp-success-icon">
                <CheckCircle2 size={44} color="#15803d" />
              </div>
              <p className="fp-success-text" style={{ fontSize: '15px', color: '#1e293b' }}>
                Your password has been changed successfully.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentPage('signin')}
              >
                Sign In Now
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
