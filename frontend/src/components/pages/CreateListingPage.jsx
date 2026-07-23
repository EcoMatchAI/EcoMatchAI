import React, { useState } from 'react';
import {
  ArrowLeft, ImagePlus, UploadCloud, Save, Tag, Box, Clock, Calendar,
  BadgeCheck, Droplet, IndianRupee, MapPin, Truck, Package, FileText, CircleDot
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';

const EMPTY_FORM = {
  title: '',
  category: '',
  description: '',
  quantity: '',
  unit: 'kg',
  frequency: 'Weekly',
  availability: '',
  purity: '',
  moisture: 'Dry',
  price: '',
  priceUnit: 'per kg',
  pricingModel: 'Negotiable',
  city: '',
  logistics: 'Local Pickup',
  packaging: 'Bagged',
  status: 'Active',
  photoCount: 0,
  docName: '',
};

export const CreateListingPage = ({ currentPage, setCurrentPage, triggerToast, listingDraft }) => {
  const isEdit = Boolean(listingDraft);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(listingDraft || {}) }));

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePhotos = (e) => {
    const count = e.target.files?.length || 0;
    if (count) {
      update('photoCount', count);
      triggerToast(`${count} photo${count > 1 ? 's' : ''} attached.`);
    }
  };

  const handleDoc = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      update('docName', file.name);
      triggerToast(`Document "${file.name}" attached.`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { triggerToast('Please enter a listing title.', 'error'); return; }
    if (!form.category) { triggerToast('Please select a material category.', 'error'); return; }
    if (!form.quantity.toString().trim()) { triggerToast('Please enter a quantity.', 'error'); return; }
    if (!form.city.trim()) { triggerToast('Please enter a location / city.', 'error'); return; }

    triggerToast(isEdit ? 'Listing updated successfully!' : 'Listing published to the marketplace!');
    setTimeout(() => setCurrentPage('listingsDetails'), 1200);
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container" style={{ overflowY: 'auto' }}>
          <div className="details-back-header" onClick={() => setCurrentPage('listingsDetails')}>
            <ArrowLeft size={18} />
            <span>Back to My Listings</span>
          </div>

          <div className="cl-head">
            <h1 className="inbox-view-title" style={{ margin: 0 }}>
              {isEdit ? 'Edit Listing' : 'Create New Listing'}
            </h1>
            <p className="dash-subtitle">
              {isEdit ? 'Update your material listing details.' : 'List a byproduct or waste stream for upcyclers to discover.'}
            </p>
          </div>

          <form className="cl-form" onSubmit={handleSubmit}>
            {/* Section: Material details */}
            <section className="cl-card">
              <h2 className="cl-section-title"><Tag size={17} /> Material Details</h2>
              <div className="pref-form-grid">
                <div className="pref-field pref-field-full">
                  <label className="pref-field-label">Listing Title <span className="cl-req">*</span></label>
                  <input className="pref-input" placeholder='e.g. "120kg Spent Coffee Grounds — Daily Supply"'
                    value={form.title} onChange={(e) => update('title', e.target.value)} />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Box size={15} /> Material Category <span className="cl-req">*</span></label>
                  <select className="pref-select" value={form.category} onChange={(e) => update('category', e.target.value)}>
                    <option value="">Select category...</option>
                    <option>Organic</option>
                    <option>Textiles</option>
                    <option>Wood</option>
                    <option>Plastics</option>
                    <option>Metals</option>
                    <option>Grain</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><BadgeCheck size={15} /> Purity / Grade <span className="cl-req">*</span></label>
                  <input className="pref-input" placeholder="e.g. 92% / Grade A"
                    value={form.purity} onChange={(e) => update('purity', e.target.value)} />
                </div>

                <div className="pref-field pref-field-full">
                  <label className="pref-field-label"><FileText size={15} /> Description <span className="cl-req">*</span></label>
                  <textarea className="cl-textarea" rows={4}
                    placeholder="Describe the material: condition, source process, suitable uses..."
                    value={form.description} onChange={(e) => update('description', e.target.value)} />
                </div>

                <div className="pref-field pref-field-full">
                  <label className="pref-field-label"><ImagePlus size={15} /> Photos <span className="cl-req">*</span></label>
                  <label className="pref-upload-box">
                    <UploadCloud size={18} />
                    <span>{form.photoCount > 0 ? `${form.photoCount} photo(s) selected` : 'Upload material photos (min 1)'}</span>
                    <input type="file" className="pref-file-input" accept="image/*" multiple onChange={handlePhotos} />
                  </label>
                </div>
              </div>
            </section>

            {/* Section: Quantity & availability */}
            <section className="cl-card">
              <h2 className="cl-section-title"><Clock size={17} /> Quantity &amp; Availability</h2>
              <div className="pref-form-grid">
                <div className="pref-field">
                  <label className="pref-field-label"><Box size={15} /> Quantity <span className="cl-req">*</span></label>
                  <div className="cl-input-combo">
                    <input className="pref-input" type="number" min="0" placeholder="120"
                      value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
                    <select className="pref-select cl-unit-select" value={form.unit} onChange={(e) => update('unit', e.target.value)}>
                      <option value="kg">kg</option>
                      <option value="tons">tons</option>
                      <option value="litres">litres</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Clock size={15} /> Frequency</label>
                  <select className="pref-select" value={form.frequency} onChange={(e) => update('frequency', e.target.value)}>
                    <option>One-time</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Calendar size={15} /> Available From</label>
                  <input className="pref-input" type="date"
                    value={form.availability} onChange={(e) => update('availability', e.target.value)} />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Droplet size={15} /> Moisture / Condition</label>
                  <select className="pref-select" value={form.moisture} onChange={(e) => update('moisture', e.target.value)}>
                    <option>Dry</option>
                    <option>Wet</option>
                    <option>Mixed</option>
                    <option>Clean / Sorted</option>
                    <option>Contaminated</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Pricing */}
            <section className="cl-card">
              <h2 className="cl-section-title"><IndianRupee size={17} /> Pricing</h2>
              <div className="pref-form-grid">
                <div className="pref-field">
                  <label className="pref-field-label">Pricing Model</label>
                  <select className="pref-select" value={form.pricingModel} onChange={(e) => update('pricingModel', e.target.value)}>
                    <option>Fixed</option>
                    <option>Negotiable</option>
                    <option>Free — disposal saving</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><IndianRupee size={15} /> Price</label>
                  <div className="cl-input-combo">
                    <input className="pref-input" type="number" min="0" placeholder="8"
                      disabled={form.pricingModel === 'Free — disposal saving'}
                      value={form.price} onChange={(e) => update('price', e.target.value)} />
                    <select className="pref-select cl-unit-select" value={form.priceUnit} onChange={(e) => update('priceUnit', e.target.value)}>
                      <option value="per kg">per kg</option>
                      <option value="per ton">per ton</option>
                      <option value="per lot">per lot</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Location & logistics */}
            <section className="cl-card">
              <h2 className="cl-section-title"><MapPin size={17} /> Location &amp; Logistics</h2>
              <div className="pref-form-grid">
                <div className="pref-field">
                  <label className="pref-field-label"><MapPin size={15} /> Location / City <span className="cl-req">*</span></label>
                  <input className="pref-input" placeholder="e.g. Koregaon Park, Pune"
                    value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Truck size={15} /> Logistics Term</label>
                  <select className="pref-select" value={form.logistics} onChange={(e) => update('logistics', e.target.value)}>
                    <option>Local Pickup</option>
                    <option>Freight (supplier-arranged)</option>
                    <option>Courier</option>
                    <option>Buyer-arranged</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><Package size={15} /> Packaging Format</label>
                  <select className="pref-select" value={form.packaging} onChange={(e) => update('packaging', e.target.value)}>
                    <option>Loose / bulk</option>
                    <option>Bagged</option>
                    <option>Palletised</option>
                    <option>Container</option>
                  </select>
                </div>

                <div className="pref-field">
                  <label className="pref-field-label"><CircleDot size={15} /> Status</label>
                  <select className="pref-select" value={form.status} onChange={(e) => update('status', e.target.value)}>
                    <option>Active</option>
                    <option>Paused</option>
                    <option>Reserved</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section: Verification */}
            <section className="cl-card">
              <h2 className="cl-section-title"><BadgeCheck size={17} /> Certifications <span className="pref-optional-tag">optional</span></h2>
              <div className="pref-form-grid">
                <div className="pref-field pref-field-full">
                  <label className="pref-field-label">Supporting Documents (lab report, compliance docs)</label>
                  <label className="pref-upload-box">
                    <UploadCloud size={18} />
                    <span>{form.docName || 'Upload certification / lab report'}</span>
                    <input type="file" className="pref-file-input" onChange={handleDoc} />
                  </label>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="cl-actions">
              <button type="button" className="cl-cancel-btn" onClick={() => setCurrentPage('listingsDetails')}>
                Cancel
              </button>
              <button type="submit" className="cl-submit-btn">
                <Save size={16} />
                {isEdit ? 'Save Changes' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};
export default CreateListingPage;
