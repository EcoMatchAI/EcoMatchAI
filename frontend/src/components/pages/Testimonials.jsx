import { Quote, MessageSquare, Star } from 'lucide-react';

export const Testimonials = () => {
  const reviews = [
    {
      quote: "EcoMatch completely transformed our waste management. We diverted 500 tons of brewery spent grain directly to local feed manufacturers, turning a disposal cost into a new revenue stream.",
      name: "Vikram Mehta",
      role: "Operations Director",
      company: "GreenBrew Beverages",
      initials: "VM",
      accent: "green"
    },
    {
      quote: "Finding high-quality recycled feedstock used to take months of vetting. With EcoMatch's purity scoring and location filters, we sourced 100% of our packaging inputs locally within a week.",
      name: "Dr. Ananya Iyer",
      role: "Head of Sustainability",
      company: "BioPack Solutions",
      initials: "AI",
      accent: "purple"
    },
    {
      quote: "The CO₂ savings tracking has been key for our ESG audits. We saved over 45 tons of carbon emissions this quarter alone by sourcing textile waste local to Pune.",
      name: "Rajesh Kulkarni",
      role: "Supply Chain Lead",
      company: "Pune Textiles Guild",
      initials: "RK",
      accent: "green"
    },
    {
      quote: "EcoMatch provides verified purity profiles that give us full confidence in upcycling wood shavings into premium composite panels. An absolute game-changer.",
      name: "Sarah Jenkins",
      role: "Technical Director",
      company: "Apex Woodworks",
      initials: "SJ",
      accent: "purple"
    },
    {
      quote: "By automating matches between our plastic scraps and regional upcyclers, EcoMatch helped us reach our Net Zero target two years ahead of schedule.",
      name: "Amit Sharma",
      role: "Head of Supply Chain",
      company: "CleanPoly Ltd",
      initials: "AS",
      accent: "green"
    }
  ];

  // Double the reviews to create a seamless infinite loop scroll
  const doubleReviews = [...reviews, ...reviews];

  return (
    <section className="tst-section">
      {/* Self-contained CSS injection for infinite loop marquee */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tstMarqueeLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .tst-marquee {
          display: flex;
          width: max-content;
          animation: tstMarqueeLoop 38s linear infinite;
        }
        .tst-marquee:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Soft decorative blob */}
      <div className="tst-blob" />

      <div className="tst-header-wrap">
        <div className="tst-badge">
          <MessageSquare size={14} />
          Social Proof
        </div>
        <h2 className="tst-title">Trust &amp; Symbiosis</h2>
        <p className="tst-subtitle">
          Hear from leading partners who are closing materials loops and saving costs.
        </p>
      </div>

      {/* Infinite Horizontal Marquee */}
      <div className="tst-marquee-viewport">
        <div className="tst-fade tst-fade-left" />
        <div className="tst-fade tst-fade-right" />

        <div className="tst-marquee">
          {doubleReviews.map((item, idx) => (
            <div key={idx} className="tst-card">
              <div className="tst-card-top">
                <div className={`tst-avatar ${item.accent}`}>{item.initials}</div>
                <Quote className="tst-quote-icon" size={26} />
              </div>

              <div className="tst-stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={14} fill="currentColor" />
                ))}
              </div>

              <p className="tst-quote">"{item.quote}"</p>

              <div className="tst-card-foot">
                <span className="tst-name">{item.name}</span>
                <span className="tst-role">
                  {item.role}, <span className={`tst-company ${item.accent}`}>{item.company}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Testimonials;
