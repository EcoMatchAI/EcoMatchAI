import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SignInLogo } from './Icons';

/**
 * Shared top navigation for the public-facing pages
 * (About, Contact, Feedback, Privacy, Terms).
 */
export const PublicNav = ({ currentPage, setCurrentPage }) => {
  const [open, setOpen] = useState(false);

  const links = [
    { key: 'listsource', label: 'Home' },
    { key: 'about', label: 'About' },
    { key: 'contact', label: 'Contact' },
    { key: 'feedback', label: 'Feedback' },
  ];

  const go = (key) => {
    setOpen(false);
    setCurrentPage(key);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/70">
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 lg:px-12 h-[68px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => go('listsource')}>
          <SignInLogo size={32} color="#15803D" />
          <span className="text-xl font-extrabold text-[#064E3B] tracking-tight">EcoMatch</span>
        </div>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.key}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors duration-200 ${
                currentPage === l.key
                  ? 'text-[#059669] bg-emerald-50'
                  : 'text-slate-600 hover:text-[#059669] hover:bg-slate-50'
              }`}
              onClick={() => go(l.key)}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            className="hidden sm:inline-flex text-sm font-bold text-slate-600 hover:text-[#059669] px-3 py-2 transition-colors"
            onClick={() => go('signin')}
          >
            Sign In
          </button>
          <button
            className="bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
            onClick={() => go('signup')}
          >
            Get Started
          </button>
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="md:hidden border-t border-slate-100 bg-white px-6 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <button
              key={l.key}
              className={`text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                currentPage === l.key ? 'text-[#059669] bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => go(l.key)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
export default PublicNav;
