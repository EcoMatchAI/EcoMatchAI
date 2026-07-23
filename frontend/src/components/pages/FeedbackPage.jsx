import React, { useState } from 'react';
import { Star, Send, Lightbulb, Bug, Heart, Sparkles } from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';

const TYPES = [
  { id: 'suggestion', label: 'Suggestion', icon: <Lightbulb size={18} /> },
  { id: 'issue', label: 'Issue', icon: <Bug size={18} /> },
  { id: 'praise', label: 'Praise', icon: <Heart size={18} /> },
];

const AREAS = ['General', 'Marketplace', 'Listings', 'Messaging', 'Matching', 'Account & Billing'];

export const FeedbackPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [type, setType] = useState('suggestion');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [area, setArea] = useState('General');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      triggerToast('Please write a little about your feedback first.', 'error');
      return;
    }
    setType('suggestion');
    setRating(0);
    setArea('General');
    setMessage('');
    setEmail('');
    triggerToast('Thanks for your feedback! Our team will review it shortly.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-800">
      <PublicNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="w-full max-w-[1200px] self-center px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex-grow flex flex-col gap-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase">
            <Sparkles size={14} /> We're listening
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#064E3B] tracking-tight leading-tight">
            Share your feedback
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[640px]">
            Your input shapes EcoMatch. Tell us what's working, what's not, or what you'd love to see next.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 lg:gap-8 items-start">
          {/* Intro / reassurance column */}
          <div className="flex flex-col gap-4">
            {[
              { icon: <Lightbulb size={20} />, title: 'Suggest improvements', desc: 'Ideas for new features or better workflows.' },
              { icon: <Bug size={20} />, title: 'Report an issue', desc: 'Something broken or confusing? Let us know.' },
              { icon: <Heart size={20} />, title: 'Tell us what you love', desc: 'Positive notes keep the team motivated.' },
            ].map((c) => (
              <div key={c.title} className="flex items-start gap-4 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  {c.icon}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-slate-800">{c.title}</span>
                  <p className="text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feedback form */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Type */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-slate-700">What kind of feedback is this?</label>
              <div className="grid grid-cols-3 gap-2.5">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-[1.5px] text-[13px] font-bold transition-all duration-200 ${
                      type === t.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div className="flex flex-col gap-2.5">
              <label className="text-sm font-bold text-slate-700">How would you rate your experience?</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`p-1 transition-colors duration-150 ${
                      n <= (hoverRating || rating) ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    <Star size={28} fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Area */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Which area is this about?</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none cursor-pointer transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Your feedback <span className="text-rose-500">*</span></label>
              <textarea
                rows={5}
                className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none resize-y transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Tell us what's on your mind..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Email <span className="font-medium text-slate-400">(optional — if you'd like a reply)</span></label>
              <input
                type="email"
                className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold rounded-xl px-6 py-3.5 transition-colors shadow-sm"
            >
              <Send size={16} /> Submit Feedback
            </button>
          </form>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default FeedbackPage;
