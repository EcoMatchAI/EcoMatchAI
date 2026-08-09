import { useState } from 'react';
import { Star, Lightbulb, Bug, Heart, Sparkles, Mail } from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';

const TYPES = [
  { id: 'suggestion', label: 'Suggestion', icon: <Lightbulb size={18} /> },
  { id: 'issue', label: 'Issue', icon: <Bug size={18} /> },
  { id: 'praise', label: 'Praise', icon: <Heart size={18} /> },
];

const AREAS = ['General', 'Marketplace', 'Listings', 'Logistics & Orders', 'Account & Preferences'];

const SUPPORT_EMAIL = 'support@ecomatch.ai';

export const FeedbackPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [type, setType] = useState('suggestion');
  const [rating, setRating] = useState(0);
  const [area, setArea] = useState('General');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) {
      triggerToast('Please write your feedback message first.', 'error');
      return;
    }
    const subject = `EcoMatch Feedback [${type.toUpperCase()}] - ${area}`;
    const body = `Type: ${type}\nArea: ${area}\nRating: ${rating}/5\nContact Email: ${email || 'Not provided'}\n\nFeedback:\n${message}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    triggerToast('Opening email application to submit feedback...');
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
            Your input shapes EcoMatch. Send suggestions, issues, or feedback directly to our core engineering team.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-6 lg:gap-8 items-start">
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

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 flex flex-col gap-6"
          >
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

            {/* Rating and contact email are both written into the email body, but
                had no controls — so every submission reported "0/5" and
                "Not provided" no matter what the sender meant. */}
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-bold text-slate-700">How would you rate your experience?</span>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Experience rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    className={`p-1 transition-colors duration-150 ${n <= rating ? 'text-amber-400' : 'text-slate-300 hover:text-amber-200'}`}
                  >
                    <Star size={26} fill={n <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
                {rating > 0 && (
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    className="ml-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fb-area" className="text-sm font-bold text-slate-700">Area</label>
              <select
                id="fb-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
              >
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fb-message" className="text-sm font-bold text-slate-700">
                Your Feedback <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="fb-message"
                rows={4}
                required
                placeholder="Write your feedback..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="fb-email" className="text-sm font-bold text-slate-700">
                Email <span className="font-medium text-slate-400">(optional — if you&rsquo;d like a reply)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <button
              type="submit"
              className="py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Mail size={16} /> Send via Email ({SUPPORT_EMAIL})
            </button>
          </form>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default FeedbackPage;
