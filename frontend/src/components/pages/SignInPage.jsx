import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Recycle } from 'lucide-react';
import {
  BackgroundWaves, SignInLogo, DotGrid, FactoryIllustration, GoogleIcon,
  LinkedInIcon, WindTurbineIllustration
} from '../common/Icons';
import { apiLogin, setToken } from '../../lib/api';

export const SignInPage = ({ setCurrentPage, triggerToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      triggerToast('Please enter your email address.', 'error');
      return;
    }
    if (!password) {
      triggerToast('Please enter your password.', 'error');
      return;
    }

    setSignInLoading(true);
    try {
      const data = await apiLogin({ email: email.trim(), password });
      setToken(data.token);
      const verified = data.user?.isEmailVerified;
      const done = data.user?.profileCompleted;
      triggerToast(
        !verified
          ? 'Please verify your email to continue.'
          : done
          ? 'Welcome back! Redirecting to your dashboard...'
          : 'Welcome back! Let’s finish setting up your profile...'
      );
      setTimeout(() => {
        // Email not verified -> gate page; else onboarded -> dashboard, otherwise profile.
        if (!verified) setCurrentPage('checkEmail');
        else setCurrentPage(done ? 'dashboard' : 'preferences');
      }, 1200);
    } catch (err) {
      triggerToast(err.message || 'Sign in failed. Please try again.', 'error');
    } finally {
      setSignInLoading(false);
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

      {/* CENTER COLUMN (SIGN IN CARD) */}
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
              <h1 className="card-title">Welcome Back</h1>
              <p className="card-subtitle">
                Sign in to continue managing your waste marketplace.
              </p>
            </div>
          </div>

          <form className="signin-form" onSubmit={handleSignInSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password-input">Password</label>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  className="checkbox-custom"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember Me
              </label>
              <a href="#forgot" className="forgot-password" onClick={(e) => { e.preventDefault(); setCurrentPage('forgotPassword'); }}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn-primary" disabled={signInLoading}>
              {signInLoading ? 'Signing In...' : 'Sign In'}
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
            Don't have an account? 
            <a href="#create" className="link-signup" onClick={(e) => { e.preventDefault(); setCurrentPage('signup'); }}>
              Create Account
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
export default SignInPage;
