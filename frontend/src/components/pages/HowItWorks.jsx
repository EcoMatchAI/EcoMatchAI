import { motion } from 'framer-motion';
import { Leaf, UploadCloud, Cpu, Share2, Truck, Target, Bell, Route, ShieldCheck } from 'lucide-react';

const Track = ({ steps, accent }) => {
  const isGreen = accent === 'green';
  return (
    <div className="hiw-track">
      <div className="hiw-track-head">
        <span className={`hiw-track-dot ${isGreen ? 'green' : 'purple'}`} />
        <h3 className={`hiw-track-title ${isGreen ? 'green' : 'purple'}`}>
          {isGreen ? 'Waste Creator Track' : 'Upcycler Track'}
        </h3>
      </div>

      <div className="hiw-steps">
        {steps.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
            className="hiw-step-card"
          >
            <div className={`hiw-step-icon ${isGreen ? 'green' : 'purple'}`}>
              {item.icon}
            </div>
            <div className="hiw-step-body">
              <div className="hiw-step-top">
                <h4 className="hiw-step-title">{item.title}</h4>
                <span className={`hiw-step-num ${isGreen ? 'green' : 'purple'}`}>{item.step}</span>
              </div>
              <p className="hiw-step-desc">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const HowItWorks = () => {
  const creatorSteps = [
    {
      step: "01",
      icon: <UploadCloud size={22} />,
      title: "Log & Label",
      desc: "Easily inventory your industrial byproducts with category matching, purity scores, and volume tracking."
    },
    {
      step: "02",
      icon: <Cpu size={22} />,
      title: "Smart Analysis",
      desc: "Our matching engine evaluates byproduct specs to calculate potential CO₂ offsets and verify cost savings."
    },
    {
      step: "03",
      icon: <Share2 size={22} />,
      title: "Syndicate & Match",
      desc: "The matcher alerts nearby verified upcyclers looking for that exact material grade to secure contracts."
    },
    {
      step: "04",
      icon: <Truck size={22} />,
      title: "Circular Transit",
      desc: "Coordinate with partnered local transport to move materials directly from your dock to their lines."
    }
  ];

  const upcyclerSteps = [
    {
      step: "01",
      icon: <Target size={22} />,
      title: "Define Feedstock",
      desc: "Specify raw material inputs, purity tolerances, supply volumes, and maximum shipping distances."
    },
    {
      step: "02",
      icon: <Bell size={22} />,
      title: "Sourcing Alerts",
      desc: "Receive real-time match notifications the second a local byproduct supplier uploads compatible stock."
    },
    {
      step: "03",
      icon: <Route size={22} />,
      title: "Emissions Routing",
      desc: "Assess transport profiles, verify pick-up logistics, and estimate material parity compatibility."
    },
    {
      step: "04",
      icon: <ShieldCheck size={22} />,
      title: "Scale Production",
      desc: "Transition standard feedstock to lower-cost secondary materials, tracking circular analytics in real time."
    }
  ];

  return (
    <section className="hiw-section">
      {/* Soft decorative blobs */}
      <div className="hiw-blob hiw-blob-green" />
      <div className="hiw-blob hiw-blob-purple" />

      <div className="hiw-container">
        {/* Header */}
        <div className="hiw-header">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="hiw-badge"
          >
            <Leaf size={14} />
            Operational Flow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hiw-title"
          >
            How It Operates
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hiw-subtitle"
          >
            A seamless B2B matchmaker closing the loop between byproducts and secondary manufacturing.
          </motion.p>
        </div>

        {/* Tracks */}
        <div className="hiw-tracks">
          <Track steps={creatorSteps} accent="green" />
          <div className="hiw-divider" />
          <Track steps={upcyclerSteps} accent="purple" />
        </div>
      </div>
    </section>
  );
};
export default HowItWorks;
