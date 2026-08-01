import React, { useState, useEffect } from 'react';
import {
  BadgeCheck, MapPin, Star, Pencil, Clock, CheckCircle2, CalendarDays,
  Package, MessageSquare, User, Mail, Phone, Briefcase, Building2, Save, X
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import {
  CoffeeIcon, TextilesIcon, WoodIcon, GrainIcon, PlasticsIcon, MetalsIcon
} from '../common/Icons';
import avatarImg from '../../assets/avatar.png';
import { apiGetProfile, apiUpdateProfile, apiGetMyProducts, isLoggedIn } from '../../lib/api';

// Map a material id (stored on the backend) back to its display icon.
const MATERIAL_ICONS = {
  coffee: <CoffeeIcon />,
  textiles: <TextilesIcon />,
  wood: <WoodIcon />,
  plastics: <PlasticsIcon />,
  metals: <MetalsIcon />,
  grain: <GrainIcon />,
};

// Human-readable label for the businessDetails.industry enum value.
const INDUSTRY_LABELS = {
  cafe: 'Cafe / Coffee Shop',
  brewery: 'Brewery / Distillery',
  textile: 'Textile / Apparel',
  carpentry: 'Carpentry / Furniture',
  food: 'Food Processing',
  packaging: 'Packaging / Paper',
  manufacturing: 'General Manufacturing',
  other: 'Other',
};

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

// Member Since is real (from user.createdAt); the rest are app metrics with
// no backend yet, so they stay as illustrative placeholders.
const buildStats = (user, activeListingsCount = 0) => {
  let memberSince = '—';
  if (user?.createdAt) {
    memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  return [
    { label: 'Completed Deals', value: '0', icon: <CheckCircle2 size={18} /> },
    { label: 'Avg. Response', value: '—', icon: <Clock size={18} /> },
    { label: 'Member Since', value: memberSince, icon: <CalendarDays size={18} /> },
    { label: 'Active Listings', value: String(activeListingsCount), icon: <Package size={18} /> },
  ];
};

// Only fields the backend user schema actually stores.
const DETAIL_FIELDS = [
  { key: 'fullName', label: 'Business / Full Name', icon: <User size={15} /> },
  { key: 'designation', label: 'Industry / Field of Interest', icon: <Briefcase size={15} /> },
  { key: 'email', label: 'Email', icon: <Mail size={15} />, type: 'email', readOnly: true },
  { key: 'phone', label: 'Phone', icon: <Phone size={15} />, type: 'tel' },
  { key: 'gstin', label: 'GSTIN', icon: <Building2 size={15} /> },
];

const LISTINGS = [
  { id: 1, title: 'Spent Coffee Grounds', qty: '120 kg/day', img: coffeeImg },
  { id: 2, title: 'Recycled Textile Fabric', qty: '350 kg/month', img: fabricImg },
  { id: 3, title: 'Premium Wood Offcuts', qty: '500 kg/month', img: woodImg },
];

const REVIEWS = [
  { id: 1, name: 'BioSkins Skincare Co.', rating: 5, text: 'Reliable supply and excellent material purity. Pickup was always on time.', initials: 'BS' },
  { id: 2, name: 'EcoInsulate Ltd.', rating: 4, text: 'Great communication and fair pricing. Would source from them again.', initials: 'EI' },
];

const EMPTY_DETAILS = {
  fullName: '', designation: '', email: '', phone: '', gstin: '',
};

// Build the flat `details` object the UI renders from the API user document.
// Field names follow the backend user schema (businessName / phoneNumber /
// FieldOfInterest / GSTIN) — those are the only ones the API actually stores.
const detailsFromUser = (user) => ({
  fullName: user.businessName || '',
  designation: user.FieldOfInterest || '',
  email: user.email || '',
  phone: user.phoneNumber || '',
  gstin: user.GSTIN || '',
});

// Rough profile-completion percentage from the fields the backend actually stores.
const computeCompletion = (user) => {
  const fields = [
    user.businessName, user.email, user.phoneNumber,
    user.FieldOfInterest, user.GSTIN, user.role,
  ];
  const filled = fields.filter((v) => v && String(v).trim()).length;
  return Math.round((filled / fields.length) * 100);
};

export const ProfilePage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DETAILS);
  const [myProducts, setMyProducts] = useState([]);

  useEffect(() => {
    if (!isLoggedIn()) {
      triggerToast('Please sign in to view your profile.', 'error');
      setCurrentPage('signin');
      return;
    }
    let cancelled = false;
    apiGetProfile()
      // GET /api/user/profile returns the user document itself; PATCH /api/user
      // wraps it as { user }. Accept either shape.
      .then((res) => {
        if (cancelled) return;
        const loaded = res?.user || res;
        setUser(loaded);
        setDetails(detailsFromUser(loaded));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          triggerToast('Session expired. Please sign in again.', 'error');
          setCurrentPage('signin');
        } else {
          triggerToast(err.message || 'Could not load your profile.', 'error');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    apiGetMyProducts()
      .then((res) => {
        if (!cancelled && res?.products && Array.isArray(res.products)) {
          setMyProducts(res.products);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completion = user ? computeCompletion(user) : 0;

  // The backend stores a single `role` (SELLER = generator, BUYER = upcycler).
  const roleTags = [];
  if (user?.role === 'SELLER') roleTags.push({ key: 'generator', label: 'Generator', cls: 'generator' });
  if (user?.role === 'BUYER') roleTags.push({ key: 'upcycler', label: 'Upcycler', cls: 'upcycler' });

  const activeMaterials = (user?.materials || [])
    .filter((m) => m.selection !== 'none')
    .map((m) => ({ name: m.name, icon: MATERIAL_ICONS[m.id] || <Package size={16} /> }));

  const startEdit = () => {
    setDraft(details);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    if (!draft.fullName.trim()) {
      triggerToast('Full name cannot be empty.', 'error');
      return;
    }
    setSaving(true);
    try {
      // The backend has no email-change flow yet, so email is read-only here.
      // Send only the fields PATCH /api/user actually accepts.
      const res = await apiUpdateProfile({
        businessName: draft.fullName,
        FieldOfInterest: draft.designation,
        phoneNumber: draft.phone,
        GSTIN: draft.gstin,
      });
      setUser(res.user);
      setDetails({ ...detailsFromUser(res.user) });
      setEditing(false);
      triggerToast(res.message || 'Profile details updated successfully!');
    } catch (err) {
      if (err.status === 401) {
        triggerToast('Session expired. Please sign in again.', 'error');
        setCurrentPage('signin');
      } else {
        triggerToast(err.message || 'Could not update your profile.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        {loading ? (
          <div className="inbox-view-container" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Loading your profile…</p>
          </div>
        ) : (
        <div className="inbox-view-container" style={{ overflowY: 'auto' }}>
          {/* ===== Header card ===== */}
          <div className="profile-hero">
            <div className="profile-hero-cover" />
            <div className="profile-hero-body">
              <div className="profile-hero-avatar">
                <img src={avatarImg} alt={details.fullName} />
                <span className="profile-hero-online" />
              </div>

              <div className="profile-hero-info">
                <div className="profile-hero-name-row">
                  <h1 className="profile-hero-name">{details.fullName}</h1>
                  {user?.isEmailVerified && (
                    <span className="profile-verified"><BadgeCheck size={15} /> Verified</span>
                  )}
                </div>
                <div className="profile-hero-meta">
                  {details.designation && <span><Briefcase size={14} /> {details.designation}</span>}
                  {details.designation && details.gstin && <span className="profile-hero-dot">·</span>}
                  {details.gstin && <span><Building2 size={14} /> GSTIN {details.gstin}</span>}
                </div>
                <div className="profile-hero-tags">
                  {roleTags.map((t) => (
                    <span key={t.key} className={`profile-role-tag ${t.cls}`}>{t.label}</span>
                  ))}
                  <span className="profile-hero-rating"><Star size={13} fill="currentColor" /> 4.8 · 52 reviews</span>
                </div>
              </div>

              <button className="profile-hero-edit" onClick={startEdit}>
                <Pencil size={15} /> Edit Profile
              </button>
            </div>

            {/* Completion bar */}
            <div className="profile-completion">
              <div className="profile-completion-top">
                <span>Profile completion</span>
                <strong>{completion}%</strong>
              </div>
              <div className="profile-completion-track">
                <div className="profile-completion-fill" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>

          {/* ===== Stats ===== */}
          <div className="profile-stats-strip">
            {buildStats(user, myProducts.length).map((s) => (
              <div key={s.label} className="profile-stat">
                <div className="profile-stat-icon">{s.icon}</div>
                <div className="profile-stat-text">
                  <span className="profile-stat-value">{s.value}</span>
                  <span className="profile-stat-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ===== Body ===== */}
          <div className="profile-body-grid">
            {/* Left column */}
            <div className="profile-col">
              {/* Personal details */}
              <section className="dash-panel">
                <div className="dash-panel-head">
                  <h2 className="dash-panel-title">Personal Details</h2>
                  {!editing ? (
                    <button className="profile-edit-link" onClick={startEdit}>
                      <Pencil size={14} /> Edit
                    </button>
                  ) : (
                    <div className="profile-edit-actions">
                      <button className="profile-cancel-btn" onClick={cancelEdit}><X size={14} /> Cancel</button>
                      <button className="profile-save-btn" onClick={saveEdit} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
                    </div>
                  )}
                </div>
                <div className="profile-details-grid">
                  {DETAIL_FIELDS.map((f) => (
                    <div key={f.key} className="profile-detail-item">
                      <span className="profile-detail-label">{f.icon}{f.label}</span>
                      {editing && !f.readOnly ? (
                        <input
                          className="pref-input"
                          type={f.type || 'text'}
                          value={draft[f.key]}
                          onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        />
                      ) : (
                        <span className="profile-detail-value">{details[f.key] || '—'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* About */}
              <section className="dash-panel">
                <div className="dash-panel-head"><h2 className="dash-panel-title">About</h2></div>
                <p className="profile-about-text">
                  {details.fullName || 'This member'}
                  {details.designation ? ` works in ${INDUSTRY_LABELS[details.designation] || details.designation}` : ''}
                  {roleTags.length ? ` as a ${roleTags.map((t) => t.label).join(' & ')} on EcoMatch.` : ' on EcoMatch.'}
                </p>
              </section>

              {/* Listings */}
              <section className="dash-panel">
                <div className="dash-panel-head">
                  <h2 className="dash-panel-title">Active Listings</h2>
                  <button className="dash-link" onClick={() => setCurrentPage('listingsDetails')}>View all</button>
                </div>
                <div className="dash-list">
                  {LISTINGS.map((l) => (
                    <div key={l.id} className="dash-listing-row" onClick={() => setCurrentPage('listingsDetails')} style={{ cursor: 'pointer' }}>
                      <img src={l.img} alt={l.title} className="dash-listing-thumb" />
                      <div className="dash-listing-info">
                        <span className="dash-listing-title">{l.title}</span>
                        <span className="dash-listing-qty">{l.qty}</span>
                      </div>
                      <span className="listing-status-badge status-active">Active</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="profile-col">
              {/* Quick contact */}
              <section className="dash-panel">
                <div className="dash-panel-head"><h2 className="dash-panel-title">Contact</h2></div>
                <div className="profile-contact-list">
                  <a className="profile-contact-row" href={`mailto:${details.email}`}>
                    <span className="profile-contact-icon"><Mail size={16} /></span>
                    <span className="profile-contact-val">{details.email}</span>
                  </a>
                  <a className="profile-contact-row" href={`tel:${details.phone.replace(/\s/g, '')}`}>
                    <span className="profile-contact-icon"><Phone size={16} /></span>
                    <span className="profile-contact-val">{details.phone}</span>
                  </a>
                  {details.gstin && (
                    <div className="profile-contact-row">
                      <span className="profile-contact-icon"><MapPin size={16} /></span>
                      <span className="profile-contact-val">GSTIN {details.gstin}</span>
                    </div>
                  )}
                </div>
                <button className="profile-contact-btn" onClick={() => setCurrentPage('messages')}>
                  <MessageSquare size={16} /> Open Inbox
                </button>
              </section>

              {/* Materials */}
              <section className="dash-panel">
                <div className="dash-panel-head"><h2 className="dash-panel-title">Materials We Handle</h2></div>
                <div className="profile-materials">
                  {activeMaterials.length ? (
                    activeMaterials.map((m) => (
                      <div key={m.name} className="profile-material-chip">
                        <span className="profile-material-icon">{m.icon}</span>
                        {m.name}
                      </div>
                    ))
                  ) : (
                    <span className="profile-detail-value">No materials selected yet.</span>
                  )}
                </div>
              </section>

              {/* Reviews */}
              <section className="dash-panel">
                <div className="dash-panel-head"><h2 className="dash-panel-title">Reviews</h2></div>
                <div className="profile-reviews">
                  {REVIEWS.map((r) => (
                    <div key={r.id} className="profile-review">
                      <div className="profile-review-avatar">{r.initials}</div>
                      <div className="profile-review-body">
                        <div className="profile-review-top">
                          <span className="profile-review-name">{r.name}</span>
                          <span className="profile-review-stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={12} fill={n <= r.rating ? 'currentColor' : 'none'} />
                            ))}
                          </span>
                        </div>
                        <p className="profile-review-text">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Account */}
              <section className="dash-panel">
                <div className="dash-panel-head"><h2 className="dash-panel-title">Account</h2></div>
                <div className="profile-account-actions">
                  <button className="profile-account-btn" onClick={() => setCurrentPage('preferences')}>
                    <Pencil size={15} /> Business Preferences
                  </button>
                  <button className="profile-account-btn" onClick={() => setCurrentPage('notifications')}>
                    <MessageSquare size={15} /> Notifications
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
        )}

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};
export default ProfilePage;
