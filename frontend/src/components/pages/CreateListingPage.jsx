import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, UploadCloud, Save, Loader2 } from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import { apiCreateProduct, apiUpdateProduct, apiUploadImages } from '../../lib/api';

const EMPTY_FORM = {
  title: '',
  category: 'Organic',
  description: '',
  quantity: '',
  unit: 'kg',
  frequency: 'Weekly',
  purity: 'Standard',
  price: '',
  priceUnit: 'per kg',
  pricingModel: 'Negotiable',
  moisture: 'Dry',
  availableFrom: '',
  logistics: 'Local Pickup',
  packaging: 'Bagged',
  city: '',
  status: 'Active',
  photos: []
};

export const CreateListingPage = ({ currentPage, setCurrentPage, triggerToast, listingDraft }) => {
  const isEdit = Boolean(listingDraft && listingDraft._id);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(listingDraft || {}),
    quantity: listingDraft?.quantity !== undefined ? String(listingDraft.quantity) : '',
    price: listingDraft?.price !== undefined ? String(listingDraft.price) : '',
    // <input type="date"> only accepts yyyy-MM-dd. Mongo hands back a full ISO
    // timestamp, which the control silently rejects, blanking the field on edit.
    availableFrom: listingDraft?.availableFrom
      ? new Date(listingDraft.availableFrom).toISOString().slice(0, 10)
      : '',
    photos: listingDraft?.photos || []
  }));

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState(listingDraft?.photos || []);

  const update = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // When Free pricing model is selected, lock price to 0
      if (key === 'pricingModel' && value === 'Free — disposal saving') {
        next.price = '0';
      }
      return next;
    });
  };

  // Object URLs pin their blob in memory until revoked. Re-picking photos used to
  // leak the previous batch, and so did leaving the page.
  const objectUrlsRef = useRef([]);
  const releaseObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  };
  useEffect(() => releaseObjectUrls, []);

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  const handlePhotosSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const tooBig = files.filter((f) => f.size > MAX_PHOTO_BYTES);
    if (tooBig.length) {
      // The hint said "up to 5MB" but nothing enforced it; the upload just failed
      // later with a generic message.
      triggerToast(
        `${tooBig.map((f) => f.name).join(', ')} exceeds the 5MB limit per photo.`,
        'error'
      );
      e.target.value = '';
      return;
    }

    releaseObjectUrls();
    const previews = files.map((file) => URL.createObjectURL(file));
    objectUrlsRef.current = previews;
    setImageFiles(files);
    setImagePreviews(previews);
    triggerToast(`${files.length} photo${files.length > 1 ? 's' : ''} selected.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      triggerToast('Please enter a listing title.', 'error');
      return;
    }
    if (!form.category) {
      triggerToast('Please select a material category.', 'error');
      return;
    }
    if (!form.quantity.toString().trim() || Number(form.quantity) < 0) {
      triggerToast('Please enter a valid quantity.', 'error');
      return;
    }
    if (!form.city.trim()) {
      triggerToast('Please enter a location / city.', 'error');
      return;
    }

    // Process photo uploads
    let finalPhotos = form.photos || [];
    if (imageFiles.length > 0) {
      setUploading(true);
      try {
        const uploadRes = await apiUploadImages(imageFiles);
        if (uploadRes?.data && Array.isArray(uploadRes.data)) {
          finalPhotos = uploadRes.data.map((img) => img.url || img.secure_url || img);
        } else if (uploadRes?.url) {
          finalPhotos = [uploadRes.url];
        } else {
          throw new Error('Image upload returned empty response.');
        }
      } catch (uploadErr) {
        setUploading(false);
        triggerToast(`Image upload failed: ${uploadErr.message}`, 'error');
        return; // Stop form submission on upload failure
      }
      setUploading(false);
    }

    // Enforce at least one photo requirement
    if (!finalPhotos || finalPhotos.length === 0) {
      triggerToast('At least one photo of the material waste stream is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim() || form.title.trim(),
        purity: form.purity || 'Standard',
        photos: finalPhotos,
        quantity: Number(form.quantity),
        unit: form.unit || 'kg',
        frequency: form.frequency || 'Weekly',
        price: form.pricingModel === 'Free — disposal saving' ? 0 : Number(form.price) || 0,
        priceUnit: form.priceUnit || 'per kg',
        pricingModel: form.pricingModel || 'Negotiable',
        moisture: form.moisture || 'Dry',
        availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : null,
        logistics: form.logistics || 'Local Pickup',
        packaging: form.packaging || 'Bagged',
        city: form.city.trim(),
        status: form.status || 'Active'
      };

      if (isEdit) {
        await apiUpdateProduct(listingDraft._id, payload);
        triggerToast('Listing updated successfully!');
      } else {
        await apiCreateProduct(payload);
        triggerToast('Listing published successfully!');
      }
      setCurrentPage('listingsDetails');
    } catch (err) {
      triggerToast(err.message || 'Failed to save listing.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isFreeModel = form.pricingModel === 'Free — disposal saving';

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {/* Top header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage('listingsDetails')}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="inbox-view-title mb-0.5">
                  {isEdit ? 'Edit Byproduct Listing' : 'Create Byproduct Listing'}
                </h1>
                <p className="dash-subtitle">
                  {isEdit
                    ? 'Update the parameters and availability of your waste stream.'
                    : 'List your industrial waste byproducts to find verified upcycling buyers.'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col gap-6 max-w-4xl shadow-sm mb-12">
            {/* Title & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="cl-title" className="text-xs font-bold text-slate-700 block mb-1">
                  Listing Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cl-title"
                  type="text"
                  required
                  placeholder="e.g. 120kg Spent Coffee Grounds — Daily Supply"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="cl-category" className="text-xs font-bold text-slate-700 block mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="cl-category"
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="Organic">Organic</option>
                  <option value="Textiles">Textiles</option>
                  <option value="Wood">Wood</option>
                  <option value="Plastics">Plastics</option>
                  <option value="Metals">Metals</option>
                  <option value="Grain">Grain</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="cl-description" className="text-xs font-bold text-slate-700 block mb-1">
                Material Description & Specifications
              </label>
              <textarea
                  id="cl-description"
                rows={3}
                placeholder="Describe purity, extraction process, contaminants, storage condition..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quantity, Unit, Frequency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label htmlFor="cl-quantity" className="text-xs font-bold text-slate-700 block mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cl-quantity"
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 500"
                  value={form.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                />
              </div>

              <div>
                <label htmlFor="cl-unit" className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                <input
                  id="cl-unit"
                  type="text"
                  placeholder="kg, ton, liters..."
                  value={form.unit}
                  onChange={(e) => update('unit', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                />
              </div>

              <div>
                <label htmlFor="cl-frequency" className="text-xs font-bold text-slate-700 block mb-1">Supply Frequency</label>
                <select
                  id="cl-frequency"
                  value={form.frequency}
                  onChange={(e) => update('frequency', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
                >
                  <option value="One-time">One-time</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              {/* Purity and Available From are stored by the backend and were
                  already being submitted — with no inputs they could only ever
                  send the hardcoded default. */}
              <div>
                <label htmlFor="cl-purity" className="text-xs font-bold text-slate-700 block mb-1">Purity / Grade</label>
                <input
                  id="cl-purity"
                  type="text"
                  placeholder="e.g. 92% or Grade A"
                  value={form.purity}
                  onChange={(e) => update('purity', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                />
              </div>

              <div>
                <label htmlFor="cl-available" className="text-xs font-bold text-slate-700 block mb-1">
                  Available From <span className="font-medium text-slate-400">(optional)</span>
                </label>
                <input
                  id="cl-available"
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => update('availableFrom', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                />
              </div>
            </div>

            {/* Pricing Model & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cl-pricing-model" className="text-xs font-bold text-slate-700 block mb-1">Pricing Model</label>
                <select
                  id="cl-pricing-model"
                  value={form.pricingModel}
                  onChange={(e) => update('pricingModel', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-semibold"
                >
                  <option value="Negotiable">Negotiable</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Free — disposal saving">Free — disposal saving</option>
                </select>
              </div>

              <div>
                <label htmlFor="cl-price" className="text-xs font-bold text-slate-700 block mb-1">
                  Price (₹) {isFreeModel && <span className="text-emerald-700 font-normal">(Locked to ₹0 for Free)</span>}
                </label>
                <input
                  id="cl-price"
                  type="number"
                  min="0"
                  disabled={isFreeModel}
                  placeholder="e.g. 15"
                  value={isFreeModel ? '0' : form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
                />
              </div>

              <div>
                <label htmlFor="cl-price-unit" className="text-xs font-bold text-slate-700 block mb-1">Price Unit</label>
                <input
                  id="cl-price-unit"
                  type="text"
                  placeholder="per kg"
                  value={form.priceUnit}
                  onChange={(e) => update('priceUnit', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            {/* Moisture, Logistics, Packaging, City */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="cl-moisture" className="text-xs font-bold text-slate-700 block mb-1">Moisture Condition</label>
                <select
                  id="cl-moisture"
                  value={form.moisture}
                  onChange={(e) => update('moisture', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="Dry">Dry</option>
                  <option value="Wet">Wet</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Clean / Sorted">Clean / Sorted</option>
                  <option value="Contaminated">Contaminated</option>
                </select>
              </div>

              <div>
                <label htmlFor="cl-logistics" className="text-xs font-bold text-slate-700 block mb-1">Logistics Arrangement</label>
                <select
                  id="cl-logistics"
                  value={form.logistics}
                  onChange={(e) => update('logistics', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="Local Pickup">Local Pickup</option>
                  <option value="Freight (supplier-arranged)">Freight (supplier-arranged)</option>
                  <option value="Courier">Courier</option>
                  <option value="Buyer-arranged">Buyer-arranged</option>
                </select>
              </div>

              <div>
                <label htmlFor="cl-packaging" className="text-xs font-bold text-slate-700 block mb-1">Packaging Method</label>
                <select
                  id="cl-packaging"
                  value={form.packaging}
                  onChange={(e) => update('packaging', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="Loose / bulk">Loose / bulk</option>
                  <option value="Bagged">Bagged</option>
                  <option value="Palletised">Palletised</option>
                  <option value="Container">Container</option>
                </select>
              </div>

              <div>
                <label htmlFor="cl-city" className="text-xs font-bold text-slate-700 block mb-1">
                  City / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  id="cl-city"
                  type="text"
                  required
                  placeholder="e.g. Pune"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                Material Photos <span className="text-rose-500">* (At least 1 photo required)</span>
              </label>

              {/* A <label> is the drop zone, so the whole area is clickable and
                  keyboard reachable via the input itself. The input used to be
                  `absolute inset-0` inside a plain <div> with no `relative`, so it
                  positioned against a far-off ancestor and covered unrelated parts
                  of the form instead of this box. */}
              <label className="relative block border-2 border-dashed border-slate-200 hover:border-emerald-500 focus-within:border-emerald-500 rounded-2xl p-6 text-center transition-colors flex flex-col items-center gap-2 cursor-pointer bg-slate-50/50">
                <UploadCloud size={32} className="text-slate-400" aria-hidden="true" />
                <span className="text-xs font-bold text-slate-700">Click to upload material photos</span>
                <span className="text-[11px] text-slate-400">PNG, JPG or WEBP</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotosSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </label>

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-2">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                      <img src={src} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentPage('listingsDetails')}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {submitting || uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{uploading ? 'Uploading Photos...' : 'Saving Listing...'}</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEdit ? 'Update Listing' : 'Publish Listing'}</span>
                  </>
                )}
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
