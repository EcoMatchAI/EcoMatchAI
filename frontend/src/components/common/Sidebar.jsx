import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingBag, ChevronDown, FileText, Recycle, Sparkles,
  Network, BarChart2, MessageSquare, Bell, Settings 
} from 'lucide-react';
import { SignInLogo } from './Icons';
import avatarImg from '../../assets/avatar.png';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ currentPage, setCurrentPage, triggerToast }) => {
  const { user } = useAuth();
  const [isScrolling, setIsScrolling] = useState(false);
  const navRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    };

    const navElement = navRef.current;
    if (navElement) {
      navElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (navElement) {
        navElement.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <aside className="inbox-sidebar-left">
      <div className="inbox-brand-area">
        <div className="inbox-brand-logo">
          <SignInLogo size={32} color="#4ADE80" />
        </div>
        <div className="inbox-brand-text">
          <span className="inbox-brand-name">EcoMatch</span>
          <span className="inbox-brand-tagline">Industrial Symbiosis</span>
        </div>
      </div>

      <nav ref={navRef} className={`inbox-sidebar-nav ${isScrolling ? 'scrolling' : ''}`}>
        <a
          href="#dashboard"
          className={`inbox-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('dashboard'); }}
        >
          <div className="inbox-nav-item-left">
            <LayoutDashboard className="inbox-nav-icon" />
            Dashboard
          </div>
        </a>

        <div>
          <a 
            href="#marketplace" 
            className={`inbox-nav-item ${currentPage === 'marketplace' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentPage('marketplace'); }}
          >
            <div className="inbox-nav-item-left">
              <ShoppingBag className="inbox-nav-icon" />
              Waste Marketplace
            </div>
            <ChevronDown size={14} style={{ transform: currentPage === 'marketplace' ? 'rotate(180deg)' : 'none', color: '#FFFFFF' }} />
          </a>
          {currentPage === 'marketplace' && (
            <div style={{ paddingLeft: '38px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#browse" style={{ textDecoration: 'none', fontSize: '13px', fontWeight: '750', color: '#4ADE80', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); triggerToast('Browsing materials...'); }}>Browse Materials</a>
              <a href="#saved" style={{ textDecoration: 'none', fontSize: '13px', fontWeight: '600', color: '#86B3A9', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); triggerToast('Saved searches...'); }}>Saved Searches</a>
            </div>
          )}
        </div>

        <a 
          href="#listings" 
          className={`inbox-nav-item ${currentPage === 'listingsDetails' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('listingsDetails'); }}
        >
          <div className="inbox-nav-item-left">
            <FileText className="inbox-nav-icon" />
            My Listings
          </div>
          <ChevronDown size={14} style={{ transform: currentPage === 'listingsDetails' ? 'rotate(180deg)' : 'none', color: '#FFFFFF' }} />
        </a>

        <a href="#matches" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening Matches...'); }}>
          <div className="inbox-nav-item-left">
            <Recycle className="inbox-nav-icon" />
            Matches
          </div>
        </a>

        <a href="#recommendations" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening AI Recommendations...'); }}>
          <div className="inbox-nav-item-left">
            <Sparkles className="inbox-nav-icon" />
            AI Recommendations
          </div>
        </a>

        <a href="#network" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening Network...'); }}>
          <div className="inbox-nav-item-left">
            <Network className="inbox-nav-icon" />
            Network
          </div>
        </a>

        <a href="#analytics" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening Analytics...'); }}>
          <div className="inbox-nav-item-left">
            <BarChart2 className="inbox-nav-icon" />
            Analytics
          </div>
        </a>

        <a href="#contracts" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening Contracts...'); }}>
          <div className="inbox-nav-item-left">
            <FileText className="inbox-nav-icon" />
            Contracts
          </div>
        </a>

        <a 
          href="#messages" 
          className={`inbox-nav-item ${currentPage === 'messages' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('messages'); }}
        >
          <div className="inbox-nav-item-left">
            <MessageSquare className="inbox-nav-icon" />
            Messages
          </div>
          <ChevronDown size={14} style={{ transform: currentPage === 'messages' ? 'rotate(180deg)' : 'none', color: '#FFFFFF' }} />
        </a>

        <a
          href="#notifications"
          className={`inbox-nav-item ${currentPage === 'notifications' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); setCurrentPage('notifications'); }}
        >
          <div className="inbox-nav-item-left">
            <Bell className="inbox-nav-icon" />
            Notifications
          </div>
        </a>

        <a href="#settings" className="inbox-nav-item" onClick={(e) => { e.preventDefault(); triggerToast('Opening Settings...'); }}>
          <div className="inbox-nav-item-left">
            <Settings className="inbox-nav-icon" />
            Settings
          </div>
        </a>
      </nav>

      <div
        className="inbox-sidebar-profile"
        style={{ cursor: 'pointer' }}
        onClick={() => setCurrentPage('profile')}
        title="View company profile"
      >
        <div className="inbox-profile-left">
          <div className="inbox-profile-pic-container">
            <img src={avatarImg} alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="inbox-profile-info">
            <span className="inbox-profile-name">{user?.businessName || 'Business Account'}</span>
            <span className="inbox-profile-role">{user?.role || 'Member'}</span>
          </div>
        </div>
        <ChevronDown size={14} style={{ color: '#86B3A9' }} />
      </div>
    </aside>
  );
};
export default Sidebar;
