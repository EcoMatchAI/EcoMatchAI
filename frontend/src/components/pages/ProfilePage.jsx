import { useState, useEffect } from 'react';
import {
  BadgeCheck, Pencil, User, Mail, Phone, Briefcase, Building2,
  Save, X, RefreshCw, Loader2, AlertCircle
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import {
  CoffeeIcon, TextilesIcon, WoodIcon, GrainIcon, PlasticsIcon, MetalsIcon
} from '../common/Icons';
import avatarImg from '../../assets/avatar.png';
import { apiGetProfile, apiUpdateProfile, apiGetMyProducts, isLoggedIn, roleLabel } from '../../lib/api';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

const MATERIAL_ICONS = {
  coffee: <CoffeeIcon />,
  textiles: <TextilesIcon />,
  wood: <WoodIcon />,
  plastics: <PlasticsIcon />,
  metals: <MetalsIcon />,
  grain: <GrainIcon />,
};

const DETAIL_FIELDS = [
  { key: 'fullName', label: 'Business / Full Name', icon: <User size={15} /> },
  { key: 'designation', label: 'Industry / Field of Interest', icon: <Briefcase size={15} /> },
  { key: 'email', label: 'Email', icon: <Mail size={15} />, type: 'email', readOnly: true },
  { key: 'phone', label: 'Phone', icon: <Phone size={15} />, type: 'tel' },
  { key: 'gstin', label: 'GSTIN', icon: <Building2 size={15} /> },
];

const detailsFromUser = (user) => ({
  fullName: user.businessName || '',
  designation: user.FieldOfInterest || '',
  email: user.email || '',
  phone: user.phoneNumber || '',
  gstin: user.GSTIN || '',
});

export const ProfilePage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [profileUser, setProfileUser] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  // `details` is what the read-only view renders. Keeping it separate from
  // `editForm` means cancelling an edit no longer leaves unsaved values on screen.
  const [details, setDetails] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, prodRes] = await Promise.allSettled([
        apiGetProfile(),
        apiGetMyProducts()
      ]);

      // GET /api/user/profile returns the user document itself, while
      // PATCH /api/user wraps it as { user }. Only checking for `.user` meant the
      // profile silently never loaded and every field read "Not specified".
      if (profRes.status === 'fulfilled') {
        const loaded = profRes.value?.user || profRes.value;
        if (loaded?._id) {
          const mapped = detailsFromUser(loaded);
          setProfileUser(loaded);
          setDetails(mapped);
          setEditForm(mapped);
        } else {
          setError('Could not read your profile from the server.');
        }
      } else {
        setError(profRes.reason?.message || 'Could not load your profile.');
      }

      if (prodRes.status === 'fulfilled' && prodRes.value?.products) {
        setMyProducts(prodRes.value.products);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    } else {
       
      setLoading(false);
    }
     
  }, []);

  const startEditing = () => {
    setEditForm(details);
    setEditing(true);
  };

  const cancelEditing = () => {
    // Throw the draft away rather than leaving it on screen as if it were saved.
    setEditForm(details);
    setEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.fullName?.trim()) {
      triggerToast('Business name cannot be empty.', 'error');
      return;
    }
    if (editForm.phone && !/^[+\d][\d\s-]{7,15}$/.test(editForm.phone.trim())) {
      triggerToast('Please enter a valid phone number.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        businessName: editForm.fullName.trim(),
        phoneNumber: editForm.phone?.trim() || '',
        FieldOfInterest: editForm.designation?.trim() || '',
        GSTIN: editForm.gstin?.trim() || ''
      };
      const res = await apiUpdateProfile(payload);
      const updated = res?.user || res;
      if (!updated?._id) {
        throw new Error('The server did not return the updated profile.');
      }
      const mapped = detailsFromUser(updated);
      setProfileUser(updated);
      setDetails(mapped);
      setEditForm(mapped);
      setEditing(false);
      triggerToast('Profile updated successfully!');
    } catch (err) {
      triggerToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getProductImage = (p) => {
    if (p.photos && p.photos.length > 0 && p.photos[0]) return p.photos[0];
    if (p.category === 'Organic' || p.category === 'Grain') return coffeeImg;
    if (p.category === 'Textiles') return fabricImg;
    return woodImg;
  };

  // Materials the user explicitly switched off are stored with selection 'none';
  // listing them here claimed the company handles materials it had opted out of.
  const userMaterials = (profileUser?.materials || []).filter((m) => m.selection !== 'none');

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 size={30} className="animate-spin text-emerald-600" aria-hidden="true" />
              <p className="text-sm font-medium">Loading your profile…</p>
            </div>
          )}

          {!loading && error && (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center flex flex-col items-center gap-3 my-6">
              <AlertCircle size={30} className="text-rose-600" aria-hidden="true" />
              <p className="font-bold text-rose-800 text-sm">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="px-5 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors inline-flex items-center gap-2"
              >
                <RefreshCw size={14} aria-hidden="true" /> Try Again
              </button>
            </div>
          )}

          {!loading && !error && (
          <>
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 border-2 border-emerald-200 overflow-hidden flex-shrink-0">
                <img src={avatarImg} alt="User Avatar" className="w-full h-full object-cover" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-800">
                    {profileUser?.businessName || 'Business Account'}
                  </h1>
                  {profileUser?.accountStatus === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <BadgeCheck size={14} /> Verified Member
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium mt-1">
                  {roleLabel(profileUser?.role)} • Joined{' '}
                  {profileUser?.createdAt
                    ? new Date(profileUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                    : 'Recently'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={editing ? cancelEditing : startEditing}
              className="self-start md:self-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              {editing ? <X size={16} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
              {editing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>

          {/* Details Form / View */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
            <h2 className="text-base font-extrabold text-slate-800 mb-4">Business Information</h2>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DETAIL_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`profile-${f.key}`} className="text-xs font-bold text-slate-700 block mb-1">
                      {f.label}
                      {f.readOnly && <span className="font-medium text-slate-400"> (cannot be changed)</span>}
                    </label>
                    <input
                      id={`profile-${f.key}`}
                      type={f.type || 'text'}
                      readOnly={f.readOnly}
                      value={editForm[f.key] || ''}
                      onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold read-only:bg-slate-100 read-only:text-slate-500"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Profile Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DETAIL_FIELDS.map((f) => (
                  <div key={f.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {f.label}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {details[f.key] || 'Not specified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Materials We Handle */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
            <h2 className="text-base font-extrabold text-slate-800 mb-4">Materials Handled</h2>
            {userMaterials.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No material preferences configured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {userMaterials.map((mat, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs capitalize flex items-center gap-1.5"
                  >
                    {MATERIAL_ICONS[mat.id || mat.name?.toLowerCase()] || null}
                    {mat.name || mat.id || mat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Real User Listings */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-slate-800">Company Byproduct Listings</h2>
              <button
                onClick={() => setCurrentPage('listingsDetails')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                Manage All
              </button>
            </div>

            {myProducts.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium">No active listings published.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myProducts.map((p) => (
                  <div key={p._id} className="p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      <img src={getProductImage(p)} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-800 truncate">{p.title}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{p.quantity} {p.unit || 'kg'} • {p.city}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};

export default ProfilePage;
