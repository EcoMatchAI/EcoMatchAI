import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Globe, ChevronDown, Bell, User, Settings, Bookmark,
  LifeBuoy, MessageSquarePlus, LogOut
} from 'lucide-react';
import avatarImg from '../../assets/avatar.png';
import { useAuth } from '../../context/useAuth';

export const Topnav = ({ triggerToast, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const closeMenu = () => setProfileOpen(false);

  // The term used to be dropped on the floor: this navigated to the marketplace
  // and searched for nothing. The marketplace reads `?search=` from the URL.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    navigate(term ? `/marketplace?search=${encodeURIComponent(term)}` : '/marketplace');
  };

  const handleSignOut = async () => {
    closeMenu();
    if (triggerToast) triggerToast('Signing out...');
    await logout();
    if (setCurrentPage) {
      setCurrentPage('signin');
    }
  };

  const goTo = (page) => {
    closeMenu();
    if (setCurrentPage) {
      setCurrentPage(page);
    }
  };

  return (
    <header className="inbox-topnav">
      <form onSubmit={handleSearchSubmit} className="inbox-search-container" role="search">
        <Search size={18} className="inbox-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="inbox-search-input"
          aria-label="Search the marketplace"
          placeholder="Search materials, industries, or locations... (Press Enter)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </form>

      <div className="inbox-topnav-actions">
        <button className="inbox-loc-picker" onClick={() => triggerToast && triggerToast('Location: India')}>
          <Globe size={16} />
          Pune, India
        </button>

        <button
          className="inbox-topnav-btn"
          aria-label="Notifications"
          onClick={() => (setCurrentPage ? setCurrentPage('notifications') : null)}
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

                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('profile')}>
                  <User size={16} />
                  My Profile
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('preferences')}>
                  <Settings size={16} />
                  Account Settings
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('listingsDetails')}>
                  <Bookmark size={16} />
                  My Listings
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('contact')}>
                  <LifeBuoy size={16} />
                  Contact Support
                </button>
                <button className="profile-dropdown-item" role="menuitem" onClick={() => goTo('feedback')}>
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
