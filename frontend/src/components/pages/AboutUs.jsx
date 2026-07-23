import React from 'react';
import {
  Leaf, Target, Recycle, ShieldCheck, Users, Handshake, Sparkles,
  ArrowRight, Building2, MapPin, Layers, BookOpen
} from 'lucide-react';
import PublicNav from '../common/PublicNav';
import Footer from '../common/Footer';
import aboutHeroImg from '../../assets/newimage.png';

const STATS = [
  { icon: <Building2 size={22} />, value: '120+', label: 'Industries Connected' },
  { icon: <Handshake size={22} />, value: '850+', label: 'Successful Matches' },
  { icon: <Layers size={22} />, value: '1,000+', label: 'Materials Listed' },
  { icon: <MapPin size={22} />, value: '12', label: 'Cities Active' },
];

const VALUES = [
  { icon: <Leaf size={22} />, title: 'Sustainability First', desc: 'Every match is measured by the waste it keeps in use and the emissions it avoids.' },
  { icon: <Recycle size={22} />, title: 'Circular by Design', desc: 'We treat byproducts as inputs, closing material loops between local businesses.' },
  { icon: <ShieldCheck size={22} />, title: 'Trust & Transparency', desc: 'Verified profiles, clear terms, and traceable exchanges build confidence.' },
  { icon: <Users size={22} />, title: 'Collaborative Growth', desc: 'A network where industries grow together through industrial symbiosis.' },
];

export const AboutUs = ({ currentPage, setCurrentPage, triggerToast }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col font-sans text-slate-800">
      <PublicNav currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="w-full max-w-[1200px] self-center px-6 sm:px-10 lg:px-12 py-12 sm:py-16 flex-grow flex flex-col gap-16 sm:gap-20">
        {/* HERO */}
        <section className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-14">
          <div className="flex flex-col items-start gap-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold tracking-wider uppercase">
              <Sparkles size={14} /> About EcoMatch
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#064E3B] tracking-tight leading-[1.05]">
              Turning industrial waste into opportunity
            </h1>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-[560px]">
              EcoMatch is a B2B marketplace for industrial symbiosis — connecting local businesses so one
              company's byproduct becomes another's raw material. We make the circular economy practical,
              local, and profitable.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                className="inline-flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors shadow-sm"
                onClick={() => setCurrentPage('marketplace')}
              >
                Explore the marketplace <ArrowRight size={16} />
              </button>
              <button
                className="inline-flex items-center gap-2 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40 text-slate-700 text-sm font-bold rounded-xl px-6 py-3 transition-all"
                onClick={() => setCurrentPage('contact')}
              >
                Get in touch
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-emerald-500/5 rounded-[40px] blur-2xl pointer-events-none" />
            <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(6,78,59,0.08)] aspect-[4/3]">
              <img src={aboutHeroImg} alt="Circular economy" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6 flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                {s.icon}
              </div>
              <span className="text-3xl font-black text-[#064E3B]">{s.value}</span>
              <span className="text-xs font-semibold text-slate-500 leading-snug">{s.label}</span>
            </div>
          ))}
        </section>

        {/* MISSION */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12 items-start">
          <div className="flex flex-col gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-[#064E3B] tracking-tight">Our Mission</h2>
            <p className="text-slate-600 text-[15px] leading-relaxed">
              To accelerate the transition to a circular economy by intelligently matching industrial
              by-products with verified demand — unlocking value from waste and building a more
              sustainable tomorrow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] p-6 flex flex-col gap-3 transition-all duration-300 hover:shadow-md hover:border-emerald-100">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {v.icon}
                </div>
                <h4 className="text-base font-bold text-slate-900">{v.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STORY */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-bold uppercase tracking-wider">
              <BookOpen size={18} /> Our Story
            </div>
            <h2 className="text-3xl font-extrabold text-[#064E3B] tracking-tight">Built for local circular economies</h2>
            <p className="text-slate-600 text-[15px] leading-relaxed">
              EcoMatch began as a pilot in Pune, founded by a team of sustainability experts, data scientists,
              and industry veterans who saw the value hidden in industrial by-products. What started as a small
              experiment now connects businesses across India.
            </p>
            <p className="text-slate-600 text-[15px] leading-relaxed">
              We believe the future of industry is circular, collaborative, and intelligent. Through technology
              and local partnerships, we make industrial symbiosis simple, scalable, and impactful.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {['Verified business network', 'Local-first matching', 'Logistics support', 'Transparent agreements'].map((t) => (
              <div key={t} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3.5 border border-slate-100">
                <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Recycle size={15} />
                </span>
                <span className="text-sm font-bold text-slate-700">{t}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#064E3B] rounded-3xl px-8 py-12 sm:px-12 sm:py-14 text-white flex flex-col lg:flex-row items-center justify-between gap-8 shadow-lg relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-start gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center flex-shrink-0">
              <Users size={26} />
            </div>
            <div className="flex flex-col gap-2 max-w-xl">
              <h3 className="text-2xl font-bold">Be part of the change</h3>
              <p className="text-emerald-100/70 text-sm leading-relaxed">
                Join a growing network of industries, recyclers, and innovators working toward a cleaner,
                smarter, more sustainable future.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
            <button
              className="border border-white/30 hover:bg-white/10 text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors"
              onClick={() => setCurrentPage('marketplace')}
            >
              Explore platform
            </button>
            <button
              className="bg-[#059669] hover:bg-[#10b981] text-white text-sm font-bold rounded-xl px-6 py-3 transition-colors shadow-md"
              onClick={() => setCurrentPage('signup')}
            >
              Get started
            </button>
          </div>
        </section>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default AboutUs;
