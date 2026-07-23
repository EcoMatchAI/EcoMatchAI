import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, Star } from 'lucide-react';
import { SignInLogo } from './Icons';

/**
 * Shared site footer.
 *  - variant="full"    -> rich marketing footer (landing / auth / preferences pages)
 *  - variant="compact" -> slim single-row bar (fixed-height dashboard pages)
 *
 * Both variants expose a Feedback option that opens a lightweight feedback modal.
 */
export const Footer = ({ triggerToast, setCurrentPage, variant = 'full' }) => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);

  const openFeedback = (e) => {
    e?.preventDefault?.();
    if (setCurrentPage) {
      setCurrentPage('feedback');
    } else {
      setFeedbackOpen(true);
    }
  };

  const openContact = (e) => {
    e?.preventDefault?.();
    if (setCurrentPage) {
      setCurrentPage('contact');
    } else {
      triggerToast?.('Contact us at support@ecomatch.ai');
    }
  };

  const closeFeedback = () => {
    setFeedbackOpen(false);
    setFeedbackText('');
    setFeedbackType('suggestion');
    setRating(0);
  };

  const submitFeedback = (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      triggerToast?.('Please write a little about your feedback first.', 'error');
      return;
    }
    closeFeedback();
    triggerToast?.('Thanks for your feedback! Our team will review it shortly.');
  };

  const feedbackModal = feedbackOpen && (
    <div className="feedback-overlay" onClick={closeFeedback}>
      <form
        className="feedback-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submitFeedback}
      >
        <div className="feedback-modal-header">
          <div>
            <h3 className="feedback-modal-title">Share your feedback</h3>
            <p className="feedback-modal-sub">
              Help us make EcoMatch better for every business.
            </p>
          </div>
          <button
            type="button"
            className="feedback-close-btn"
            aria-label="Close feedback"
            onClick={closeFeedback}
          >
            <X size={20} />
          </button>
        </div>

        <div className="feedback-type-row">
          {[
            { id: 'suggestion', label: 'Suggestion' },
            { id: 'issue', label: 'Issue' },
            { id: 'praise', label: 'Praise' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`feedback-type-chip ${feedbackType === t.id ? 'active' : ''}`}
              onClick={() => setFeedbackType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="feedback-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`feedback-star ${n <= rating ? 'active' : ''}`}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
              onClick={() => setRating(n)}
            >
              <Star size={20} fill={n <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <textarea
          className="feedback-textarea"
          placeholder="Tell us what's working well or what we could improve..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
        />

        <button type="submit" className="feedback-submit-btn">
          <Send size={16} />
          Send Feedback
        </button>
      </form>
    </div>
  );

  if (variant === 'compact') {
    return (
      <>
        <footer className="app-footer-bar">
          <span className="app-footer-bar-copy">
            © {new Date().getFullYear()} EcoMatch. All rights reserved.
          </span>
          <div className="app-footer-bar-links">
            <a href="#about" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('about'); } else { triggerToast?.('About EcoMatch'); } }}>About</a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('privacy'); } else { triggerToast?.('Privacy Policy'); } }}>Privacy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('terms'); } else { triggerToast?.('Terms & Conditions'); } }}>Terms</a>
            <button type="button" className="footer-feedback-btn" onClick={openFeedback}>
              <MessageSquarePlus size={15} />
              Feedback
            </button>
          </div>
        </footer>
        {feedbackModal}
      </>
    );
  }

  return (
    <>
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-grid">

            {/* Branding Column */}
            <div className="landing-footer-col brand-col">
              <div className="landing-footer-brand">
                <SignInLogo size={32} color="#15803D" />
                <span className="landing-brand-name">EcoMatch</span>
              </div>
              <p className="landing-brand-desc">
                Connecting companies to build a circular economy through industrial symbiosis.
              </p>
            </div>

            {/* Quick Links Column */}
            <div className="landing-footer-col">
              <span className="footer-title-text">Company</span>
              <ul className="footer-links-list">
                <li><a href="#about" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('about'); } else { triggerToast?.('About EcoMatch'); } }}>About Us</a></li>
                <li><a href="#contact" onClick={openContact}>Contact Us</a></li>
                <li>
                  <a href="#feedback" className="footer-feedback-link" onClick={openFeedback}>
                    <MessageSquarePlus size={15} />
                    Send Feedback
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links Column */}
            <div className="landing-footer-col">
              <span className="footer-title-text">Legal</span>
              <ul className="footer-links-list">
                <li><a href="#privacy" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('privacy'); } else { triggerToast?.('Privacy Policy'); } }}>Privacy Policy</a></li>
                <li><a href="#terms" onClick={(e) => { e.preventDefault(); if (setCurrentPage) { setCurrentPage('terms'); } else { triggerToast?.('Terms & Conditions'); } }}>Terms & Conditions</a></li>
              </ul>
            </div>

            {/* Social Media Column */}
            <div className="landing-footer-col">
              <span className="footer-title-text">Connect</span>
              <div className="landing-footer-socials">
                <a href="#linkedin" className="social-link-icon" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>
                <a href="#x" className="social-link-icon" aria-label="X" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/>
                  </svg>
                </a>
                <a href="#instagram" className="social-link-icon" aria-label="Instagram" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>

          <div className="landing-footer-bottom">
            <span className="copyright-text">
              © {new Date().getFullYear()} EcoMatch. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
      {feedbackModal}
    </>
  );
};

export default Footer;
