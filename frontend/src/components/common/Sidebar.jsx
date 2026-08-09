import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, ShoppingBag, ChevronDown, FileText,
  MessageSquare, Bell, Settings, Package
} from 'lucide-react';
import { SignInLogo } from './Icons';
import avatarImg from '../../assets/avatar.png';
import { useAuth } from '../../context/useAuth';
import { roleLabel } from '../../lib/api';

export const Sidebar = ({ currentPage, setCurrentPage }) => {
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
      <div className="inbox-brand-area cursor-pointer" onClick={() => setCurrentPage('listsource')}>
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
          aria-current={currentPage === 'dashboard' ? 'page' : undefined}
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
          aria-current={currentPage === 'marketplace' ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); setCurrentPage('marketplace'); }}
          >
            <div className="inbox-nav-item-left">
              <ShoppingBag className="inbox-nav-icon" />
              Waste Marketplace
            </div>
          </a>
        </div>

        <a
          href="#listings"
          className={`inbox-nav-item ${currentPage === 'listingsDetails' ? 'active' : ''}`}
          aria-current={currentPage === 'listingsDetails' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setCurrentPage('listingsDetails'); }}
        >
          <div className="inbox-nav-item-left">
            <FileText className="inbox-nav-icon" />
            My Listings
          </div>
        </a>

        <a
          href="#orders"
          className={`inbox-nav-item ${currentPage === 'orders' ? 'active' : ''}`}
          aria-current={currentPage === 'orders' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setCurrentPage('orders'); }}
        >
          <div className="inbox-nav-item-left">
            <Package className="inbox-nav-icon" />
            Orders & Shipments
          </div>
        </a>

        <a
          href="#messages"
          className={`inbox-nav-item ${currentPage === 'messages' ? 'active' : ''}`}
          aria-current={currentPage === 'messages' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setCurrentPage('messages'); }}
        >
          <div className="inbox-nav-item-left">
            <MessageSquare className="inbox-nav-icon" />
            Communications
          </div>
        </a>

        <a
          href="#notifications"
          className={`inbox-nav-item ${currentPage === 'notifications' ? 'active' : ''}`}
          aria-current={currentPage === 'notifications' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setCurrentPage('notifications'); }}
        >
          <div className="inbox-nav-item-left">
            <Bell className="inbox-nav-icon" />
            Notifications
          </div>
        </a>

        <a
          href="#preferences"
          className={`inbox-nav-item ${currentPage === 'preferences' ? 'active' : ''}`}
          aria-current={currentPage === 'preferences' ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); setCurrentPage('preferences'); }}
        >
          <div className="inbox-nav-item-left">
            <Settings className="inbox-nav-icon" />
            Account Settings
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
            <span className="inbox-profile-role">{roleLabel(user?.role)}</span>
          </div>
        </div>
        <ChevronDown size={14} style={{ color: '#86B3A9' }} />
      </div>
    </aside>
  );
};

export default Sidebar;
