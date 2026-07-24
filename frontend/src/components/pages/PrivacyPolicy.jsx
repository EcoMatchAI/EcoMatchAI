import React from 'react';
import {
  Lock, Shield, Search, Sliders, ClipboardCheck, User, Mail, Building2,
  Phone, Box, Activity, Workflow, BarChart3, Edit3, Trash2, MessageSquare,
  FileText, ArrowRight
} from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';

const PILLARS = [
  { icon: <Shield size={20} />, title: 'Data Protection', desc: 'Industry-standard security safeguards your information.' },
  { icon: <Search size={20} />, title: 'Transparency', desc: 'You always know what we collect and why.' },
  { icon: <Sliders size={20} />, title: 'User Control', desc: 'Manage, update, or delete your data anytime.' },
  { icon: <ClipboardCheck size={20} />, title: 'Compliance', desc: 'Aligned with applicable privacy regulations.' },
];

const PERSONAL = [
  { icon: <User size={16} />, label: 'Name' },
  { icon: <Mail size={16} />, label: 'Email address' },
  { icon: <Building2 size={16} />, label: 'Company details' },
  { icon: <Phone size={16} />, label: 'Contact information' },
];

const PLATFORM = [
  { icon: <Box size={16} />, label: 'Waste & material listings' },
  { icon: <Activity size={16} />, label: 'Marketplace activity' },
  { icon: <Workflow size={16} />, label: 'Match history' },
  { icon: <BarChart3 size={16} />, label: 'Usage analytics' },
];

const USES = [
  { icon: <BarChart3 size={20} />, title: 'Improve matching', desc: 'We analyse data to deliver more accurate material matches.' },
  { icon: <Lock size={20} />, title: 'Secure transactions', desc: 'We keep interactions across the platform safe and trusted.' },
  { icon: <MessageSquare size={20} />, title: 'Enable connections', desc: 'We connect businesses for sustainable partnerships.' },
  { icon: <Sliders size={20} />, title: 'Enhance the product', desc: 'We use insights to improve features and usability.' },
];

const RIGHTS = [
  { icon: <Lock size={20} />, title: 'Access your data', desc: 'Request a copy of the personal data we store about you.' },
  { icon: <Edit3 size={20} />, title: 'Update information', desc: 'Correct or modify your personal information anytime.' },
  { icon: <Trash2 size={20} />, title: 'Delete account', desc: 'Request deletion of your account and associated data.' },
  { icon: <MessageSquare size={20} />, title: 'Contact support', desc: 'Reach us for any privacy-related questions.' },
];

const Card = ({ icon, title, desc }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-3 transition-all duration-300 hover:shadow-md hover:border-emerald-100">
    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">{icon}</div>
    <h4 className="text-base font-bold text-slate-900">{title}</h4>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

export const PrivacyPolicy = ({ currentPage, setCurrentPage, triggerToast }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-800">
      <PublicNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="w-full max-w-[1080px] self-center px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex-grow flex flex-col gap-14">
        {/* HERO */}
        <section className="flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase">
            <Lock size={14} /> Privacy
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#064E3B] tracking-tight">Privacy Policy</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last updated: June 12, 2026</span>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[680px]">
            EcoMatch values your privacy. This policy explains how we collect, use, store, and protect your
            information while enabling secure industrial symbiosis and material matching.
          </p>
        </section>

        {/* PILLARS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((p) => <Card key={p.title} {...p} />)}
        </section>

        {/* INFO WE COLLECT */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 sm:p-10 flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><FileText size={20} /></span>
            <h2 className="text-2xl font-extrabold text-[#064E3B]">Information We Collect</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="flex flex-col gap-4">
              <h4 className="text-lg font-bold text-emerald-800 border-b border-slate-100 pb-2">Personal Information</h4>
              <ul className="flex flex-col gap-3">
                {PERSONAL.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="text-emerald-600 flex-shrink-0">{p.icon}</span>{p.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-lg font-bold text-emerald-800 border-b border-slate-100 pb-2">Platform Information</h4>
              <ul className="flex flex-col gap-3">
                {PLATFORM.map((p) => (
                  <li key={p.label} className="flex items-center gap-3 text-slate-700 font-medium">
                    <span className="text-emerald-600 flex-shrink-0">{p.icon}</span>{p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* HOW WE USE */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Sliders size={20} /></span>
            <h2 className="text-2xl font-extrabold text-[#064E3B]">How We Use Your Data</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {USES.map((u) => <Card key={u.title} {...u} />)}
          </div>
        </section>

        {/* SECURITY STRIP */}
        <section className="bg-[#064E3B] rounded-3xl p-8 sm:p-10 text-white grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-center relative overflow-hidden">
          <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col gap-3 relative z-10">
            <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-bold uppercase tracking-wider">
              <Shield size={18} /> Our commitment
            </div>
            <h3 className="text-2xl font-bold">Security & trust by default</h3>
            <p className="text-emerald-100/70 text-sm leading-relaxed">
              Your data is encrypted, monitored, and stored securely — every step of the way.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
            {[
              { v: '100%', l: 'Encrypted Data' },
              { v: '24/7', l: 'Monitoring' },
              { v: '500+', l: 'Verified Businesses' },
              { v: '99.9%', l: 'Platform Uptime' },
            ].map((c) => (
              <div key={c.l} className="bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col items-center text-center">
                <span className="text-xl font-black">{c.v}</span>
                <span className="text-[10px] font-semibold text-emerald-100/60 mt-1 leading-snug">{c.l}</span>
              </div>
            ))}
          </div>
        </section>

        {/* YOUR RIGHTS */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><User size={20} /></span>
            <h2 className="text-2xl font-extrabold text-[#064E3B]">Your Privacy, Your Rights</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RIGHTS.map((r) => <Card key={r.title} {...r} />)}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><MessageSquare size={22} /></span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Questions about privacy?</h3>
              <p className="text-slate-500 text-sm">Our team is happy to help with any data concerns.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button className="inline-flex items-center gap-2 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40 text-slate-700 text-sm font-bold rounded-xl px-5 py-3 transition-all" onClick={() => setCurrentPage('contact')}>
              <Mail size={16} /> Contact us
            </button>
            <button className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold rounded-xl px-5 py-3 transition-colors" onClick={() => setCurrentPage('terms')}>
              Read Terms <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default PrivacyPolicy;
