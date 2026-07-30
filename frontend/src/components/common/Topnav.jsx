import React, { useState } from 'react';
import {
  Search, Globe, ChevronDown, Bell, User, Settings, Bookmark,
  LifeBuoy, MessageSquarePlus, LogOut
} from 'lucide-react';
import avatarImg from '../../assets/avatar.png';
import { useAuth } from '../../context/AuthContext';

export const Topnav = ({ triggerToast, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMenu = () => setProfileOpen(false);

  const handleItem = (label) => {
    closeMenu();
    triggerToast(label);
  };

  const handleSignOut = async () => {
    closeMenu();
    triggerToast('Signing out...');
    await logout();
    if (setCurrentPage) {
      setCurrentPage('signin');
    }
  };

  const goTo = (page, fallbackMsg) => {
    closeMenu();
    if (setCurrentPage) {
      setCurrentPage(page);
    } else {
      triggerToast(fallbackMsg);
    }
  };

  return (
    <header className="inbox-topnav">
      <div className="inbox-search-container">
        <Search size={18} className="inbox-search-icon" />
        <input
          type="text"
          className="inbox-search-input"
          placeholder="Search materials, industries, or locations..."
          onClick={() => triggerToast('Search active')}
        />
      </div>

      <div className="inbox-topnav-actions">
        <button className="inbox-loc-picker" onClick={() => triggerToast('Current Location: Pune, India')}>
          <Globe size={16} />
          Pune, India
          <ChevronDown size={12} />
        </button>

        <button
          className="inbox-topnav-btn"
          aria-label="Notifications"
          onClick={() => setCurrentPage ? setCurrentPage('notifications') : triggerToast('Notifications open')}
        >
          <Bell size={18} />
        </button>

        <div className="topnav-profile-wrapper">
          <div
            className="inbox-user-profile"
            onClick={() => setProfileOpen((v) => !v)}
            role="button"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <img src={avatarImg} alt="User headshot" className="inbox-user-avatar" />
            <ChevronDown
              size={12}
              style={{ color: '#4B5563', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </div>

          {profileOpen && (
            <>
              <div className="profile-dropdown-backdrop" onClick={closeMenu} />
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-header">
                  <img src={avatarImg} alt="User headshot" className="profile-dropdown-avatar" />
                  <div>
                    <div className="profile-dropdown-name">{user?.businessName || 'Business Account'}</div>
                    <div className="profile-dropdown-email">{user?.email || 'Authenticated User'}</div>
                  </div>
                </div>

                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('profile', 'Opening your profile...')}>
                  <User size={16} />
                  My Profile
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('preferences', 'Account settings')}>
                  <Settings size={16} />
                  Account Settings
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('listingsDetails', 'Saved listings')}>
                  <Bookmark size={16} />
                  Saved Listings
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => handleItem('Opening Help & Support...')}>
                  <LifeBuoy size={16} />
                  Help & Support
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => handleItem('Share your feedback with us!')}>
                  <MessageSquarePlus size={16} />
                  Send Feedback
                </button>

                <div className="profile-dropdown-divider" />

                <button className="profile-dropdown-item danger" role="menuitem" onClick={handleSignOut}>
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
export default Topnav;
