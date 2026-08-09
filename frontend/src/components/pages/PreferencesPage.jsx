import { useState, useEffect } from 'react';
import { Save, Loader2, ArrowLeft, Check } from 'lucide-react';
import {
  SignInLogo, GeneratorIcon, UpcyclerIcon, CoffeeIcon, TextilesIcon,
  WoodIcon, PlasticsIcon, MetalsIcon, GrainIcon
} from '../common/Icons';
import Footer from '../common/Footer';
import { useAuth } from '../../context/useAuth';
import { apiUpdateProfile } from '../../lib/api';

const DEFAULT_MATERIALS = [
  { id: 'coffee', name: 'Coffee', icon: <CoffeeIcon />, selection: 'primary' },
  { id: 'textiles', name: 'Textiles', icon: <TextilesIcon />, selection: 'primary' },
  { id: 'wood', name: 'Wood', icon: <WoodIcon />, selection: 'secondary' },
  { id: 'plastics', name: 'Plastics', icon: <PlasticsIcon />, selection: 'secondary' },
  { id: 'metals', name: 'Metals', icon: <MetalsIcon />, selection: 'secondary' },
  { id: 'grain', name: 'Brewery Grain', icon: <GrainIcon />, selection: 'secondary' },
];

export const PreferencesPage = ({ setCurrentPage, triggerToast }) => {
  const { user, completeProfile, isLoggedIn, refreshUser } = useAuth();
  const [activeStep, setActiveStep] = useState('business'); // 'business' | 'materials'
  const [saving, setSaving] = useState(false);

  const isAlreadyActive = user?.accountStatus === 'ACTIVE' && Boolean(user?.role);

  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState({
    generator: true,
    upcycler: true
  });

  const [businessDetails, setBusinessDetails] = useState({
    industry: '',
    companySize: '',
    address: '',
    city: '',
    serviceRadius: '25km',
    gstNumber: '',
    docName: ''
  });

  const [generatorInfo, setGeneratorInfo] = useState({
    byproducts: '',
    volume: '',
    frequency: 'Weekly'
  });

  const [upcyclerInfo, setUpcyclerInfo] = useState({
    feedstock: '',
    purity: '',
    minVolume: '',
    maxVolume: '',
    maxDistance: '50km'
  });

  const [materials, setMaterials] = useState(DEFAULT_MATERIALS);

  // Prefill every field from logged in user
  useEffect(() => {
    if (!isLoggedIn) {
      triggerToast('Please sign in first.', 'error');
      setCurrentPage('signin');
      return;
    }
    if (user && !user.isEmailVerified && !isAlreadyActive) {
      triggerToast('Please verify your email first.', 'error');
      setCurrentPage('verifyEmail');
      return;
    }

    if (user) {
      // Prefill from the fetched user record — synchronising local form state with
      // data loaded from the server, which the lint rule cannot distinguish from
      // redundant derived state.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (user.businessTypes) {
        setSelectedBusinessTypes({
          generator: Boolean(user.businessTypes.generator),
          upcycler: Boolean(user.businessTypes.upcycler)
        });
      }
      if (user.businessDetails) {
        setBusinessDetails((prev) => ({ ...prev, ...user.businessDetails }));
      }
      if (user.generatorInfo) {
        setGeneratorInfo((prev) => ({ ...prev, ...user.generatorInfo }));
      }
      if (user.upcyclerInfo) {
        setUpcyclerInfo((prev) => ({ ...prev, ...user.upcyclerInfo }));
      }
      if (user.materials && Array.isArray(user.materials) && user.materials.length > 0) {
        setMaterials((prev) =>
          prev.map((item) => {
            const match = user.materials.find((m) => m.id === item.id || m.name === item.name);
            return match ? { ...item, selection: match.selection || 'primary' } : item;
          })
        );
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoggedIn]);

  const isGenerator = selectedBusinessTypes.generator;
  const isUpcycler = selectedBusinessTypes.upcycler;
  const roleLabel = isGenerator && isUpcycler ? 'Both' : isGenerator ? 'Generator' : isUpcycler ? 'Upcycler' : 'None';

  const toggleBusinessType = (type) => {
    setSelectedBusinessTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const updateBusiness = (key, value) => setBusinessDetails((prev) => ({ ...prev, [key]: value }));
  const updateGenerator = (key, value) => setGeneratorInfo((prev) => ({ ...prev, [key]: value }));
  const updateUpcycler = (key, value) => setUpcyclerInfo((prev) => ({ ...prev, [key]: value }));

  // Selected or not — the old primary/secondary split had no visual difference,
  // so two controls silently disagreed about what a click should do.
  const toggleMaterial = (id) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, selection: m.selection === 'none' ? 'primary' : 'none' } : m))
    );
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();
    if (activeStep === 'business') {
      if (!isGenerator && !isUpcycler) {
        triggerToast('Please select at least one business role.', 'error');
        return;
      }
      setActiveStep('materials');
      return;
    }

    // Submit preferences
    setSaving(true);
    try {
      // The backend `role` enum is BUYER | SELLER only. This used to send the
      // display label ('Both' / 'Generator' / 'Upcycler'), which failed validation
      // with "Invalid role" and made it impossible to finish signup at all.
      // A generator sells material, so generator (or both) maps to SELLER; the
      // generator/upcycler pair itself is preserved in `businessTypes`.
      const role = isGenerator ? 'SELLER' : 'BUYER';

      const payload = {
        role,
        businessTypes: selectedBusinessTypes,
        businessDetails,
        generatorInfo: isGenerator ? generatorInfo : undefined,
        upcyclerInfo: isUpcycler ? upcyclerInfo : undefined,
        materials: materials.map((m) => ({ id: m.id, name: m.name, selection: m.selection }))
      };

      if (isAlreadyActive) {
        // Route through apiUpdateProfile for active users — complete-profile needs
        // the short-lived verification token, which they no longer hold.
        await apiUpdateProfile(payload);
        triggerToast(`Preferences updated — saved as ${roleLabel}.`);
      } else {
        // Complete initial profile setup
        await completeProfile(payload);
        triggerToast(`Profile completed — registered as ${roleLabel}.`);
      }
      await refreshUser();
      setCurrentPage('dashboard');
    } catch (err) {
      triggerToast(err.message || 'Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Bar */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <SignInLogo size={24} />
          </div>
          <span className="font-extrabold text-slate-800 text-lg tracking-tight">EcoMatch Preferences</span>
        </div>

        <button
          onClick={() => setCurrentPage('dashboard')}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </header>

      <main className="w-full max-w-4xl self-center px-4 py-8 flex-1 flex flex-col gap-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveStep('business')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeStep === 'business'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            1. Business Profile
          </button>
          <span className="text-slate-300">→</span>
          <button
            onClick={() => setActiveStep('materials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeStep === 'materials'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            2. Material Preferences
          </button>
        </div>

        <form onSubmit={handleStepSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
          {activeStep === 'business' ? (
            <>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Select Business Roles</h2>
                <p className="text-xs text-slate-500 mt-1">Choose how your business operates in the industrial ecosystem.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div
                    onClick={() => toggleBusinessType('generator')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                      selectedBusinessTypes.generator
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <GeneratorIcon size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Waste Generator (Seller)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">We produce organic or industrial byproducts.</p>
                    </div>
                  </div>

                  <div
                    onClick={() => toggleBusinessType('upcycler')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                      selectedBusinessTypes.upcycler
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <UpcyclerIcon size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Upcycler / Buyer</h4>
                      <p className="text-xs text-slate-500 mt-0.5">We source byproduct materials for manufacturing.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details fields */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-extrabold text-slate-800 mb-4">Company Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Industry</label>
                    <input
                      type="text"
                      placeholder="e.g. Food Processing, Textiles..."
                      value={businessDetails.industry}
                      onChange={(e) => updateBusiness('industry', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Company Size</label>
                    <select
                      value={businessDetails.companySize}
                      onChange={(e) => updateBusiness('companySize', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="200+">200+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="Factory / Office Address"
                      value={businessDetails.address}
                      onChange={(e) => updateBusiness('address', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune"
                      value={businessDetails.city}
                      onChange={(e) => updateBusiness('city', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Next: Material Preferences →
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Material Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">Select streams your facility generates or processes.</p>

                {/* One control per card. This was a clickable div wrapping a
                    button, where the two disagreed about what a click meant and
                    keyboard users could not toggle anything. */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                  {materials.map((m) => {
                    const isSelected = m.selection !== 'none';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleMaterial(m.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-emerald-700" aria-hidden="true">{m.icon}</span>
                        <span className="font-extrabold text-xs">{m.name}</span>
                        <span className={`text-[10px] font-bold inline-flex items-center gap-1 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {isSelected && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                          {isSelected ? 'Selected' : 'Not selected'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role-specific questions. These are stored on the user record and
                  prefilled above; without inputs they could only ever hold
                  defaults, so the answers were never really collected. */}
              {isGenerator && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-extrabold text-slate-800 mb-1">What do you generate?</h3>
                  <p className="text-xs text-slate-500 mb-4">Helps buyers find your streams before you list them.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="gen-byproducts" className="text-xs font-bold text-slate-700 block mb-1">Byproducts / waste streams</label>
                      <input
                        id="gen-byproducts"
                        type="text"
                        placeholder="e.g. Spent coffee grounds, fabric offcuts"
                        value={generatorInfo.byproducts || ''}
                        onChange={(e) => updateGenerator('byproducts', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="gen-volume" className="text-xs font-bold text-slate-700 block mb-1">Typical volume</label>
                      <input
                        id="gen-volume"
                        type="text"
                        placeholder="e.g. 120 kg"
                        value={generatorInfo.volume || ''}
                        onChange={(e) => updateGenerator('volume', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="gen-frequency" className="text-xs font-bold text-slate-700 block mb-1">Frequency</label>
                      <select
                        id="gen-frequency"
                        value={generatorInfo.frequency || 'Weekly'}
                        onChange={(e) => updateGenerator('frequency', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="One-time">One-time</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {isUpcycler && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-extrabold text-slate-800 mb-1">What do you need?</h3>
                  <p className="text-xs text-slate-500 mb-4">Used to surface matching listings for you.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="up-feedstock" className="text-xs font-bold text-slate-700 block mb-1">Required feedstock</label>
                      <input
                        id="up-feedstock"
                        type="text"
                        placeholder="e.g. Clean cotton fabric scraps"
                        value={upcyclerInfo.feedstock || ''}
                        onChange={(e) => updateUpcycler('feedstock', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-purity" className="text-xs font-bold text-slate-700 block mb-1">Required purity / grade</label>
                      <input
                        id="up-purity"
                        type="text"
                        placeholder="e.g. 90%+ / Grade A"
                        value={upcyclerInfo.purity || ''}
                        onChange={(e) => updateUpcycler('purity', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-min" className="text-xs font-bold text-slate-700 block mb-1">Min volume</label>
                      <input
                        id="up-min"
                        type="text"
                        placeholder="e.g. 50 kg/week"
                        value={upcyclerInfo.minVolume || ''}
                        onChange={(e) => updateUpcycler('minVolume', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-max" className="text-xs font-bold text-slate-700 block mb-1">Max volume</label>
                      <input
                        id="up-max"
                        type="text"
                        placeholder="e.g. 500 kg/week"
                        value={upcyclerInfo.maxVolume || ''}
                        onChange={(e) => updateUpcycler('maxVolume', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="up-distance" className="text-xs font-bold text-slate-700 block mb-1">Max sourcing distance</label>
                      <select
                        id="up-distance"
                        value={upcyclerInfo.maxDistance || '50km'}
                        onChange={(e) => updateUpcycler('maxDistance', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="25km">Within 25 km</option>
                        <option value="50km">Within 50 km</option>
                        <option value="100km">Within 100 km</option>
                        <option value="100km+">100 km+</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveStep('business')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save All Preferences
                </button>
              </div>
            </>
          )}
        </form>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default PreferencesPage;
