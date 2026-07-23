import React, { useState, useEffect } from 'react';
import {
  Globe, ChevronDown, Bell, Check, Building2, MapPin, Ruler,
  BadgeCheck, UploadCloud, Users, Factory, Boxes, Gauge
} from 'lucide-react';
import {
  SignInLogo, GeneratorIcon, UpcyclerIcon, CoffeeIcon, TextilesIcon,
  WoodIcon, PlasticsIcon, MetalsIcon, GrainIcon
} from '../common/Icons';
import Footer from '../common/Footer';
import avatarImg from '../../assets/avatar.png';
import { apiGetMe, apiCompleteProfile, isLoggedIn } from '../../lib/api';

export const PreferencesPage = ({ setCurrentPage, triggerToast }) => {
  const [activeStep, setActiveStep] = useState('business'); // 'business' | 'materials'
  const [saving, setSaving] = useState(false);

  // A user may complete their profile only once. If they're already done,
  // bounce them to the dashboard instead of letting them re-onboard.
  useEffect(() => {
    if (!isLoggedIn()) {
      triggerToast('Please sign in first.', 'error');
      setCurrentPage('signin');
      return;
    }
    let cancelled = false;
    apiGetMe()
      .then(({ user }) => {
        if (cancelled) return;
        // Email must be verified before completing the profile.
        if (!user?.isEmailVerified) {
          triggerToast('Please verify your email first.', 'error');
          setCurrentPage('checkEmail');
          return;
        }
        if (user?.profileCompleted) {
          triggerToast('Your profile is already complete.');
          setCurrentPage('dashboard');
        }
      })
      .catch((err) => {
        if (!cancelled && err.status === 401) {
          triggerToast('Session expired. Please sign in again.', 'error');
          setCurrentPage('signin');
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const [materials, setMaterials] = useState([
    { id: 'coffee', name: 'Coffee', icon: <CoffeeIcon />, selection: 'primary' },
    { id: 'textiles', name: 'Textiles', icon: <TextilesIcon />, selection: 'primary' },
    { id: 'wood', name: 'Wood', icon: <WoodIcon />, selection: 'secondary' },
    { id: 'plastics', name: 'Plastics', icon: <PlasticsIcon />, selection: 'secondary' },
    { id: 'metals', name: 'Metals', icon: <MetalsIcon />, selection: 'secondary' },
    { id: 'grain', name: 'Brewery Grain', icon: <GrainIcon />, selection: 'secondary' },
  ]);

  const isGenerator = selectedBusinessTypes.generator;
  const isUpcycler = selectedBusinessTypes.upcycler;
  const roleLabel = isGenerator && isUpcycler ? 'Both' : isGenerator ? 'Generator' : isUpcycler ? 'Upcycler' : 'None';

  const toggleBusinessType = (type) => {
    setSelectedBusinessTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const updateBusiness = (key, value) => setBusinessDetails(prev => ({ ...prev, [key]: value }));
  const updateGenerator = (key, value) => setGeneratorInfo(prev => ({ ...prev, [key]: value }));
  const updateUpcycler = (key, value) => setUpcyclerInfo(prev => ({ ...prev, [key]: value }));

  const handleMaterialCardClick = (id) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const nextSelection = m.selection === 'primary' ? 'secondary' : 'primary';
        return { ...m, selection: nextSelection };
      }
      return m;
    }));
  };

  const handleMaterialToggleClick = (e, id) => {
    e.stopPropagation();
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const nextSelection = m.selection === 'none' ? 'secondary' : 'none';
        return { ...m, selection: nextSelection };
      }
      return m;
    }));
  };

  const handleDocUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      updateBusiness('docName', file.name);
      triggerToast(`Document "${file.name}" attached.`);
    }
  };

  const validateBusinessStep = () => {
    if (!isGenerator && !isUpcycler) {
      triggerToast('Please select at least one business type.', 'error');
      return false;
    }
    if (!businessDetails.industry) {
      triggerToast('Please select your industry / category.', 'error');
      return false;
    }
    if (!businessDetails.city.trim()) {
      triggerToast('Please enter your operating city.', 'error');
      return false;
    }
    return true;
  };

  const goToMaterials = () => {
    if (validateBusinessStep()) {
      setActiveStep('materials');
    }
  };

  const handleSavePreferences = async () => {
    if (!validateBusinessStep()) {
      setActiveStep('business');
      return;
    }

    // Strip non-serializable React icon elements before sending to the API.
    const materialsPayload = materials.map(({ id, name, selection }) => ({ id, name, selection }));

    const payload = {
      businessTypes: { generator: isGenerator, upcycler: isUpcycler },
      businessDetails,
      generatorInfo,
      upcyclerInfo,
      materials: materialsPayload,
    };

    setSaving(true);
    try {
      const data = await apiCompleteProfile(payload);
      const activeMaterials = materialsPayload.filter(m => m.selection !== 'none');
      triggerToast(
        data.message || `Profile saved as ${roleLabel}! ${activeMaterials.length} material interests selected.`
      );
      setTimeout(() => {
        setCurrentPage('dashboard');
      }, 1200);
    } catch (err) {
      if (err.status === 401) {
        triggerToast('Session expired. Please sign in again.', 'error');
        setCurrentPage('signin');
      } else if (err.status === 409) {
        // Already completed elsewhere — treat as done.
        triggerToast('Your profile is already complete.');
        setCurrentPage('dashboard');
      } else {
        triggerToast(err.message || 'Could not save your profile. Please try again.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pref-page-wrapper">
      {/* Header Navigation Bar */}
      <header className="navbar">
        <div className="navbar-brand">
          <SignInLogo size={34} color="#15803D" />
          <span className="navbar-brand-name">EcoMatch</span>
        </div>

        <div className="navbar-actions">
          <button className="navbar-action-item" onClick={() => triggerToast('Location: Pune, India')}>
            <Globe size={18} />
            Pune, India
            <ChevronDown size={14} />
          </button>

          <button className="navbar-icon-btn" aria-label="Notifications" onClick={() => triggerToast('No new notifications')}>
            <Bell size={20} />
          </button>

          <div className="navbar-profile" onClick={() => triggerToast('Opening user profile menu...')}>
            <img src={avatarImg} alt="User headshot" className="profile-avatar" />
            <ChevronDown size={14} style={{ color: '#475569' }} />
          </div>
        </div>
      </header>

      {/* Main content body */}
      <main className="pref-content">
        <h1 className="pref-title">Complete Your Business Profile.</h1>

        <div className="pref-card">
          {/* Steps Progress Tracker (clickable tabs) */}
          <div className="steps-container">
            <ul className="steps-list">
              <li>
                <button
                  type="button"
                  className={`step-item ${activeStep === 'business' ? 'active' : 'completed'}`}
                  onClick={() => setActiveStep('business')}
                >
                  {activeStep !== 'business' && (
                    <span className="step-icon-check">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  1. Business Info
                </button>
              </li>

              <li className="step-arrow">→</li>

              <li>
                <button
                  type="button"
                  className={`step-item ${activeStep === 'materials' ? 'active' : ''}`}
                  onClick={goToMaterials}
                >
                  2. Material Preferences
                </button>
              </li>
            </ul>

            {/* Progress bar line */}
            <div className="progress-bar-segmented">
              <div className="progress-segment green"></div>
              <div className={`progress-segment ${activeStep === 'materials' ? 'purple' : 'gray'}`}></div>
            </div>
          </div>

          {activeStep === 'business' && (
          <>
          {/* Question 1: What best describes your business? */}
          <section className="pref-section">
            <h2 className="pref-section-title">What best describes your business?</h2>
            <p className="pref-section-hint">Select one or both — choosing both registers you as a <strong>Both</strong> account.</p>
            <div className="business-type-grid">

              {/* Generator Card */}
              <div
                className={`business-card ${selectedBusinessTypes.generator ? 'selected' : ''}`}
                onClick={() => toggleBusinessType('generator')}
              >
                <div className="business-card-left">
                  <GeneratorIcon />
                </div>
                <div className="business-card-right">
                  <span className="business-card-title">Generator</span>
                  <span className="business-card-subtitle">(Supplier)</span>
                </div>
                {selectedBusinessTypes.generator && (
                  <div className="card-select-badge">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Upcycler Card */}
              <div
                className={`business-card ${selectedBusinessTypes.upcycler ? 'selected' : ''}`}
                onClick={() => toggleBusinessType('upcycler')}
              >
                <div className="business-card-left">
                  <UpcyclerIcon />
                </div>
                <div className="business-card-right">
                  <span className="business-card-title">Upcycler</span>
                  <span className="business-card-subtitle">(Manufacturer)</span>
                </div>
                {selectedBusinessTypes.upcycler && (
                  <div className="card-select-badge">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* Question 2: Business Details */}
          <section className="pref-section">
            <h2 className="pref-section-title">Business Details</h2>
            <div className="pref-form-grid">

              <div className="pref-field">
                <label className="pref-field-label"><Factory size={15} /> Industry / Category</label>
                <select
                  className="pref-select"
                  value={businessDetails.industry}
                  onChange={(e) => updateBusiness('industry', e.target.value)}
                >
                  <option value="">Select industry...</option>
                  <option value="cafe">Cafe / Coffee Shop</option>
                  <option value="brewery">Brewery / Distillery</option>
                  <option value="textile">Textile / Apparel</option>
                  <option value="carpentry">Carpentry / Furniture</option>
                  <option value="food">Food Processing</option>
                  <option value="packaging">Packaging / Paper</option>
                  <option value="manufacturing">General Manufacturing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="pref-field">
                <label className="pref-field-label"><Users size={15} /> Company Size / Scale</label>
                <select
                  className="pref-select"
                  value={businessDetails.companySize}
                  onChange={(e) => updateBusiness('companySize', e.target.value)}
                >
                  <option value="">Select size...</option>
                  <option value="micro">Micro (1–10 employees)</option>
                  <option value="small">Small (11–50)</option>
                  <option value="medium">Medium (51–250)</option>
                  <option value="large">Large (250+)</option>
                </select>
              </div>

              <div className="pref-field pref-field-full">
                <label className="pref-field-label"><MapPin size={15} /> Business Address</label>
                <div className="pref-input-with-action">
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="Street, area, building..."
                    value={businessDetails.address}
                    onChange={(e) => updateBusiness('address', e.target.value)}
                  />
                  <button type="button" className="pref-map-btn" onClick={() => triggerToast('Drop a pin on the map to set your exact location.')}>
                    <MapPin size={15} />
                    Pin on map
                  </button>
                </div>
                <span className="pref-field-help">Used for distance-based matching with nearby partners.</span>
              </div>

              <div className="pref-field">
                <label className="pref-field-label"><Building2 size={15} /> Operating City</label>
                <input
                  type="text"
                  className="pref-input"
                  placeholder="e.g. Pune"
                  value={businessDetails.city}
                  onChange={(e) => updateBusiness('city', e.target.value)}
                />
              </div>

              <div className="pref-field">
                <label className="pref-field-label"><Ruler size={15} /> Service Radius</label>
                <select
                  className="pref-select"
                  value={businessDetails.serviceRadius}
                  onChange={(e) => updateBusiness('serviceRadius', e.target.value)}
                >
                  <option value="10km">Within 10 km</option>
                  <option value="25km">Within 25 km</option>
                  <option value="50km">Within 50 km</option>
                  <option value="100km">Within 100 km</option>
                  <option value="100km+">100 km+</option>
                </select>
              </div>

            </div>
          </section>

          {/* Question 3: Verification (KYB-lite) */}
          <section className="pref-section">
            <h2 className="pref-section-title">Verification <span className="pref-optional-tag">builds trust</span></h2>
            <div className="pref-form-grid">

              <div className="pref-field">
                <label className="pref-field-label"><BadgeCheck size={15} /> GST / Business Registration No.</label>
                <input
                  type="text"
                  className="pref-input"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={businessDetails.gstNumber}
                  onChange={(e) => updateBusiness('gstNumber', e.target.value)}
                />
              </div>

              <div className="pref-field">
                <label className="pref-field-label">Supporting Documents <span className="pref-optional-tag">optional</span></label>
                <label className="pref-upload-box">
                  <UploadCloud size={18} />
                  <span>{businessDetails.docName || 'Upload registration / license'}</span>
                  <input type="file" className="pref-file-input" onChange={handleDocUpload} />
                </label>
              </div>

            </div>
          </section>
          </>
          )}

          {activeStep === 'materials' && (
          <>
          {/* Question 4: Select Primary Material Interests */}
          <section className="pref-section">
            <h2 className="pref-section-title">Select Primary Material Interests</h2>
            <div className="materials-grid">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className={`material-card ${m.selection === 'primary' ? 'primary' : ''}`}
                  onClick={() => handleMaterialCardClick(m.id)}
                  title="Click card to toggle between Primary selection"
                >
                  <div className="material-card-content">
                    <div className="material-icon-wrapper">
                      {m.icon}
                    </div>
                    <span className="material-name">{m.name}</span>
                  </div>

                  {/* Custom Toggle Switch */}
                  <div
                    className={`toggle-switch ${m.selection !== 'none' ? 'on' : 'off'}`}
                    onClick={(e) => handleMaterialToggleClick(e, m.id)}
                    title="Toggle to enable/disable material"
                  >
                    <div className="toggle-thumb"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Generator-only: byproducts generated */}
          {isGenerator && (
            <section className="pref-section">
              <h2 className="pref-section-title">
                <span className="pref-role-pill generator"><Boxes size={13} /> Generator</span>
                What byproducts do you generate?
              </h2>
              <div className="pref-form-grid">
                <div className="pref-field pref-field-full">
                  <label className="pref-field-label">Byproducts / Waste Streams</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. Spent coffee grounds, fabric offcuts..."
                    value={generatorInfo.byproducts}
                    onChange={(e) => updateGenerator('byproducts', e.target.value)}
                  />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Typical Volume</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. 120 kg"
                    value={generatorInfo.volume}
                    onChange={(e) => updateGenerator('volume', e.target.value)}
                  />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Frequency</label>
                  <select
                    className="pref-select"
                    value={generatorInfo.frequency}
                    onChange={(e) => updateGenerator('frequency', e.target.value)}
                  >
                    <option value="One-time">One-time</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Upcycler-only: feedstock needed */}
          {isUpcycler && (
            <section className="pref-section">
              <h2 className="pref-section-title">
                <span className="pref-role-pill upcycler"><Gauge size={13} /> Upcycler</span>
                What feedstock do you need?
              </h2>
              <div className="pref-form-grid">
                <div className="pref-field pref-field-full">
                  <label className="pref-field-label">Required Feedstock</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. Clean cotton fabric scraps..."
                    value={upcyclerInfo.feedstock}
                    onChange={(e) => updateUpcycler('feedstock', e.target.value)}
                  />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Required Purity / Grade</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. 90%+ / Grade A"
                    value={upcyclerInfo.purity}
                    onChange={(e) => updateUpcycler('purity', e.target.value)}
                  />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Max Sourcing Distance</label>
                  <select
                    className="pref-select"
                    value={upcyclerInfo.maxDistance}
                    onChange={(e) => updateUpcycler('maxDistance', e.target.value)}
                  >
                    <option value="25km">Within 25 km</option>
                    <option value="50km">Within 50 km</option>
                    <option value="100km">Within 100 km</option>
                    <option value="100km+">100 km+</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Min Volume</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. 50 kg/week"
                    value={upcyclerInfo.minVolume}
                    onChange={(e) => updateUpcycler('minVolume', e.target.value)}
                  />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label">Max Volume</label>
                  <input
                    type="text"
                    className="pref-input"
                    placeholder="e.g. 500 kg/week"
                    value={upcyclerInfo.maxVolume}
                    onChange={(e) => updateUpcycler('maxVolume', e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}
          </>
          )}

          {/* Action Button */}
          <div className="action-container">
            {activeStep === 'business' ? (
              <button className="btn-save" onClick={goToMaterials}>
                Continue to Materials →
              </button>
            ) : (
              <button className="btn-save" onClick={handleSavePreferences} disabled={saving}>
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            )}
          </div>

        </div>
      </main>

      <Footer triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
    </div>
  );
};
export default PreferencesPage;
