import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, ArrowUpRight } from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';

const SUPPORT_EMAIL = 'support@ecomatch.ai';

const INFO = [
  { icon: <Mail size={20} />, label: 'Email us', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: <Phone size={20} />, label: 'Call us', value: '+91 98765 43210', href: 'tel:+919876543210' },
  { icon: <MapPin size={20} />, label: 'Visit us', value: 'Koregaon Park, Pune, India', href: null },
  { icon: <Clock size={20} />, label: 'Response time', value: 'Within 24 hours, Mon–Sat', href: null },
];

export const ContactUs = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      triggerToast('Please fill in your name, email, and message.', 'error');
      return;
    }
    const subject = form.subject.trim() || `New enquiry from ${form.name}`;
    const body = `${form.message}\n\n— ${form.name} (${form.email})`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    triggerToast('Opening your email app to send the message...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-800">
      <PublicNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="w-full max-w-[1200px] self-center px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex-grow flex flex-col gap-12">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase">
            <Mail size={14} /> Get in touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#064E3B] tracking-tight leading-tight">
            We'd love to hear from you
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[640px]">
            Questions about listing your byproducts, sourcing materials, or partnering with us?
            Send a message and our team will get back to you.
          </p>
        </section>

        {/* Content grid */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 lg:gap-8 items-start">
          {/* Info column */}
          <div className="flex flex-col gap-4">
            {INFO.map((i) => {
              const Wrapper = i.href ? 'a' : 'div';
              return (
                <Wrapper
                  key={i.label}
                  {...(i.href ? { href: i.href } : {})}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-5 transition-all duration-300 hover:shadow-md hover:border-emerald-100 no-underline"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    {i.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{i.label}</span>
                    <span className="text-[15px] font-bold text-slate-800 truncate">{i.value}</span>
                  </div>
                  {i.href && (
                    <ArrowUpRight size={18} className="ml-auto text-slate-300 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                  )}
                </Wrapper>
              );
            })}

            {/* Support card */}
            <div className="bg-[#064E3B] rounded-2xl p-6 text-white flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold">Prefer live chat?</span>
                <p className="text-emerald-100/70 text-sm leading-relaxed">
                  Existing members can reach our team directly from the in-app inbox.
                </p>
                <button
                  className="mt-2 self-start text-sm font-bold text-emerald-300 hover:text-white inline-flex items-center gap-1 transition-colors"
                  onClick={() => setCurrentPage('signin')}
                >
                  Open the app <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Form column */}
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-8 flex flex-col gap-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">Full Name <span className="text-rose-500">*</span></label>
                <input
                  className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700">Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Subject</label>
              <input
                className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="How can we help?"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Message <span className="text-rose-500">*</span></label>
              <textarea
                rows={6}
                className="w-full rounded-xl border-[1.5px] border-slate-200 px-4 py-3 text-[15px] text-slate-800 outline-none resize-y transition-all duration-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                placeholder="Tell us a bit more..."
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-xs text-slate-400">
                We'll reply to your email directly. Your details are never shared.
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors shadow-sm"
              >
                <Send size={16} /> Send Message
              </button>
            </div>
          </form>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default ContactUs;
