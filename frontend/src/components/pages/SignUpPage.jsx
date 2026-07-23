import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Recycle, User } from 'lucide-react';
import {
  BackgroundWaves, SignInLogo, DotGrid, FactoryIllustration, GoogleIcon,
  LinkedInIcon, WindTurbineIllustration
} from '../common/Icons';
import { apiSignup, setToken } from '../../lib/api';

export const SignUpPage = ({ setCurrentPage, triggerToast }) => {
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupAgree, setSignupAgree] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (!signupName.trim()) {
      triggerToast('Please enter your company or full name.', 'error');
      return;
    }
    if (!signupEmail.trim()) {
      triggerToast('Please enter your email address.', 'error');
      return;
    }
    if (!signupPassword) {
      triggerToast('Please enter a password.', 'error');
      return;
    }
    if (signupPassword.length < 6) {
      triggerToast('Password must be at least 6 characters.', 'error');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      triggerToast('Passwords do not match.', 'error');
      return;
    }
    if (!signupAgree) {
      triggerToast('You must agree to the Terms of Service & Privacy Policy.', 'error');
      return;
    }

    setSignUpLoading(true);
    try {
      const data = await apiSignup({
        name: signupName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
      setToken(data.token);
      triggerToast(data.message || 'Account created! Please verify your email.');
      setTimeout(() => {
        // Email must be verified before anything else — go to the gate page.
        setCurrentPage('checkEmail');
      }, 1200);
    } catch (err) {
      triggerToast(err.message || 'Sign up failed. Please try again.', 'error');
    } finally {
      setSignUpLoading(false);
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

      {/* CENTER COLUMN (SIGN UP CARD) */}
      <main className="center-content">
        <div className="signin-card signup-card">
          <div className="card-header">
            <div className="brand-header">
              <SignInLogo size={46} color="#15803D" />
              <div className="brand-text-container" style={{ textAlign: 'left' }}>
                <span className="brand-name">EcoMatch</span>
                <span className="brand-tagline">Industrial Symbiosis</span>
              </div>
            </div>
            <div className="card-header-titles">
              <h1 className="card-title">Create Account</h1>
              <p className="card-subtitle">
                Join EcoMatch to start trading industrial waste.
              </p>
            </div>
          </div>

          <form className="signin-form signup-form" onSubmit={handleSignUpSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name-input">Company or Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <User size={18} />
                </span>
                <input
                  id="signup-name-input"
                  type="text"
                  className="form-input"
                  placeholder="Enter your name or company"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email-input">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="signup-email-input"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password-input">Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="signup-password-input"
                  type={showSignupPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm-password-input">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="signup-confirm-password-input"
                  type={showSignupConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Confirm your password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                  aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me" style={{ gap: '10px' }}>
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={signupAgree}
                  onChange={(e) => setSignupAgree(e.target.checked)}
                />
                <span style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  I agree to the Terms of Service & Privacy Policy
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary" disabled={signUpLoading}>
              {signUpLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line"></div>
            <span className="divider-text">OR</span>
            <div className="divider-line"></div>
          </div>

          <div className="social-buttons">
            <button type="button" className="btn-social" onClick={() => triggerToast('Connecting with Google...')}>
              <GoogleIcon />
              Continue with Google
            </button>
            <button type="button" className="btn-social" onClick={() => triggerToast('Connecting with LinkedIn...')}>
              <LinkedInIcon />
              Continue with LinkedIn
            </button>
          </div>

          <div className="card-footer">
            Already have an account? 
            <a href="#signin" className="link-signup" onClick={(e) => { e.preventDefault(); setCurrentPage('signin'); }}>
              Sign In
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
export default SignUpPage;
