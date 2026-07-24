import React from 'react';
import {
  ClipboardCheck, CheckSquare, Compass, User, ClipboardList, Handshake,
  AlertTriangle, LogOut, RefreshCw, Mail
} from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';

const SECTIONS = [
  { icon: <CheckSquare size={22} />, title: 'Acceptance of Terms', body: 'By accessing or using EcoMatch, you agree to comply with and be legally bound by these Terms & Conditions.' },
  { icon: <Compass size={22} />, title: 'Use of the Platform', body: 'You agree to use the platform only for lawful purposes. You must not misuse the platform or interfere with its security or functionality.' },
  { icon: <User size={22} />, title: 'User Accounts', body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.' },
  { icon: <ClipboardList size={22} />, title: 'Listings & Content', body: 'You are solely responsible for the accuracy, legality, and reliability of the materials you list or share on the platform.' },
  { icon: <Handshake size={22} />, title: 'Matching & Agreements', body: 'EcoMatch facilitates connections but does not guarantee outcomes. Any agreements, transactions, or communications are solely between users.' },
  { icon: <AlertTriangle size={22} />, title: 'Limitation of Liability', body: 'EcoMatch is not liable for any indirect, incidental, or consequential damages arising from the use of our platform.' },
  { icon: <LogOut size={22} />, title: 'Termination', body: 'We reserve the right to suspend or terminate accounts that violate these terms or engage in unethical or illegal activities.' },
  { icon: <RefreshCw size={22} />, title: 'Changes to Terms', body: 'We may update these Terms & Conditions at any time. Continued use of the platform constitutes acceptance of the revised terms.' },
];

export const TermsConditions = ({ currentPage, setCurrentPage, triggerToast }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-800">
      <PublicNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="w-full max-w-[920px] self-center px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex-grow flex flex-col gap-12">
        {/* HERO */}
        <section className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <ClipboardCheck size={32} />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#064E3B] tracking-tight">Terms &amp; Conditions</h1>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last updated: June 12, 2026</span>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[640px]">
            Welcome to EcoMatch. By accessing or using our platform, you agree to be bound by these Terms.
            Please read them carefully.
          </p>
        </section>

        {/* SECTIONS */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 sm:p-10 flex flex-col">
          {SECTIONS.map((s, i) => (
            <div
              key={s.title}
              className={`flex gap-5 sm:gap-6 items-start py-7 ${i !== 0 ? 'border-t border-slate-100' : ''}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  {s.icon}
                </div>
                <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-[#064E3B] text-white text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <h3 className="text-lg sm:text-xl font-extrabold text-[#064E3B]">{s.title}</h3>
                <p className="text-[15px] text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CONTACT STRIP */}
        <section className="bg-[#064E3B] rounded-3xl px-8 py-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold">Questions about these terms?</h3>
            <p className="text-emerald-100/70 text-sm mt-1">Our team is here to clarify anything you need.</p>
          </div>
          <button
            className="relative z-10 inline-flex items-center gap-2 bg-[#059669] hover:bg-[#10b981] text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors shadow-md flex-shrink-0"
            onClick={() => setCurrentPage('contact')}
          >
            <Mail size={16} /> Contact us
          </button>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default TermsConditions;
