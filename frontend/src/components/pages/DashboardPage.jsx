import React from 'react';
import {
  Plus, Package, Recycle, IndianRupee, CheckCircle2, ArrowUpRight,
  MessageSquare, MapPin, ArrowRight, Eye, Bell, Search
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

const STAT_CARDS = [
  { key: 'listings', label: 'Active Listings', value: '6', delta: '+2 this week', icon: <Package size={20} />, tone: 'green' },
  { key: 'matches', label: 'New Matches', value: '14', delta: '+5 today', icon: <Recycle size={20} />, tone: 'purple' },
  { key: 'requests', label: 'Pending Requests', value: '3', delta: 'Awaiting reply', icon: <MessageSquare size={20} />, tone: 'amber' },
  { key: 'savings', label: 'Cost Savings', value: '₹2.45L', delta: '+18% this month', icon: <IndianRupee size={20} />, tone: 'green' },
];

const IMPACT = [
  { label: 'Materials Listed', value: '6 Streams', icon: <Package size={18} /> },
  { label: 'Completed Deals', value: '48', icon: <CheckCircle2 size={18} /> },
  { label: 'Avg. Match Score', value: '91%', icon: <Recycle size={18} /> },
];

const MY_LISTINGS = [
  { id: 1, title: 'Spent Coffee Grounds', qty: '120 kg/day', views: 48, requests: 3, status: 'Active', img: coffeeImg },
  { id: 2, title: 'Recycled Textile Fabric', qty: '350 kg/month', views: 31, requests: 1, status: 'Active', img: fabricImg },
  { id: 3, title: 'Premium Wood Offcuts', qty: '500 kg/month', views: 22, requests: 0, status: 'Paused', img: woodImg },
];

const MATCHES = [
  { id: 1, partner: 'BioSkins Skincare Co.', material: 'Coffee Grounds', score: 95, dist: '5 km', img: coffeeImg },
  { id: 2, partner: 'EcoInsulate Ltd.', material: 'Textile Fabric', score: 88, dist: '12 km', img: fabricImg },
  { id: 3, partner: 'Artisan Toys Inc.', material: 'Wood Offcuts', score: 92, dist: '8 km', img: woodImg },
];

export const DashboardPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container" style={{ overflowY: 'auto' }}>
          {/* Header */}
          <div className="dash-header">
            <div>
              <h1 className="inbox-view-title" style={{ marginBottom: '4px' }}>Welcome back, GreenBrew Co. 👋</h1>
              <p className="dash-subtitle">Here's what's happening with your materials today.</p>
            </div>
            <button className="dash-primary-btn" onClick={() => setCurrentPage('createListing')}>
              <Plus size={18} />
              Create Listing
            </button>
          </div>

          {/* Stat cards */}
          <div className="dash-stats-grid">
            {STAT_CARDS.map((s) => (
              <div key={s.key} className="dash-stat-card">
                <div className={`dash-stat-icon ${s.tone}`}>{s.icon}</div>
                <div className="dash-stat-info">
                  <span className="dash-stat-value">{s.value}</span>
                  <span className="dash-stat-label">{s.label}</span>
                </div>
                <span className="dash-stat-delta">{s.delta}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="dash-quick-actions">
            <button className="dash-quick-btn" onClick={() => setCurrentPage('marketplace')}>
              <Search size={16} /> Browse Marketplace
            </button>
            <button className="dash-quick-btn" onClick={() => setCurrentPage('listingsDetails')}>
              <Package size={16} /> My Listings
            </button>
            <button className="dash-quick-btn" onClick={() => setCurrentPage('messages')}>
              <MessageSquare size={16} /> Messages
            </button>
            <button className="dash-quick-btn" onClick={() => setCurrentPage('notifications')}>
              <Bell size={16} /> Notifications
            </button>
          </div>

          {/* Two-column content */}
          <div className="dash-grid">
            {/* My Listings */}
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2 className="dash-panel-title">Your Active Listings</h2>
                <button className="dash-link" onClick={() => setCurrentPage('listingsDetails')}>
                  View all <ArrowRight size={14} />
                </button>
              </div>

              <div className="dash-list">
                {MY_LISTINGS.map((l) => (
                  <div key={l.id} className="dash-listing-row">
                    <img src={l.img} alt={l.title} className="dash-listing-thumb" />
                    <div className="dash-listing-info">
                      <span className="dash-listing-title">{l.title}</span>
                      <span className="dash-listing-qty">{l.qty}</span>
                    </div>
                    <div className="dash-listing-metrics">
                      <span className="dash-metric"><Eye size={13} /> {l.views}</span>
                      <span className="dash-metric"><MessageSquare size={13} /> {l.requests}</span>
                    </div>
                    <span className={`listing-status-badge ${l.status === 'Active' ? 'status-active' : 'status-paused'}`}>
                      {l.status}
                    </span>
                    <button
                      className="dash-row-edit"
                      onClick={() => { triggerToast(`Editing "${l.title}"`); setCurrentPage('createListing'); }}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Right column */}
            <div className="dash-side">
              {/* Impact card */}
              <section className="dash-panel">
                <div className="dash-panel-head">
                  <h2 className="dash-panel-title">Your Impact</h2>
                </div>
                <div className="dash-impact-list">
                  {IMPACT.map((i) => (
                    <div key={i.label} className="dash-impact-row">
                      <div className="dash-impact-icon">{i.icon}</div>
                      <span className="dash-impact-label">{i.label}</span>
                      <span className="dash-impact-value">{i.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent matches */}
              <section className="dash-panel">
                <div className="dash-panel-head">
                  <h2 className="dash-panel-title">Recent Matches</h2>
                  <button className="dash-link" onClick={() => setCurrentPage('marketplace')}>
                    View all <ArrowRight size={14} />
                  </button>
                </div>
                <div className="dash-list">
                  {MATCHES.map((m) => (
                    <div key={m.id} className="dash-match-row" onClick={() => setCurrentPage('listingsDetails')}>
                      <img src={m.img} alt={m.material} className="dash-match-thumb" />
                      <div className="dash-match-info">
                        <span className="dash-match-partner">{m.partner}</span>
                        <span className="dash-match-meta">
                          {m.material} · <MapPin size={11} /> {m.dist}
                        </span>
                      </div>
                      <div className="dash-match-score">
                        {m.score}%
                        <ArrowUpRight size={13} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};
export default DashboardPage;
