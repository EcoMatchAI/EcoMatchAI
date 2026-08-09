import { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, Pencil, Share2, X, Copy, Trash2, CheckCircle2,
  AlertCircle, Loader2, Package, RefreshCw, XCircle
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import Modal from '../common/Modal';
import {
  apiGetMyProducts,
  apiDeleteProduct,
  apiUpdateProduct,
  apiGetReceivedSourcingRequests,
  apiUpdateSourcingRequestStatus
} from '../../lib/api';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

export const ListingsDetailsPage = ({ currentPage, setCurrentPage, triggerToast, setListingDraft }) => {
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Received Sourcing Requests state
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Delete dialog state
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Share Modal State
  const [shareOpen, setShareOpen] = useState(false);

  const fetchMyProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetMyProducts();
      if (res?.products) {
        setMyProducts(res.products);
      }
    } catch (err) {
      setError(err.message || 'Could not fetch your listings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await apiGetReceivedSourcingRequests();
      if (res?.requests) {
        setReceivedRequests(res.requests);
      }
    } catch (err) {
      console.warn('Could not fetch received sourcing requests:', err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    // Initial data load; writing loading/result state is the point of the call.
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchMyProducts();
    fetchReceivedRequests();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const activeListing = myProducts.find((item) => item._id === selectedListingId);

  const startCreate = () => {
    setListingDraft?.(null);
    setCurrentPage('createListing');
  };

  const startEdit = (product) => {
    setListingDraft?.(product);
    setCurrentPage('createListing');
  };

  // Status Switcher
  const handleStatusChange = async (productId, newStatus) => {
    try {
      const res = await apiUpdateProduct(productId, { status: newStatus });
      if (res?.product || res?.success) {
        setMyProducts((prev) =>
          prev.map((p) => (p._id === productId ? { ...p, status: newStatus } : p))
        );
        triggerToast(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      triggerToast(err.message || 'Failed to update status.', 'error');
    }
  };

  // Delete confirmation & execute
  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await apiDeleteProduct(deleteCandidate._id);
      setMyProducts((prev) => prev.filter((p) => p._id !== deleteCandidate._id));
      if (selectedListingId === deleteCandidate._id) {
        setSelectedListingId(null);
      }
      triggerToast('Listing deleted successfully!');
      setDeleteCandidate(null);
    } catch (err) {
      triggerToast(err.message || 'Failed to delete listing.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Respond to incoming sourcing request (Accept / Decline)
  const handleRequestStatus = async (requestId, status) => {
    try {
      const res = await apiUpdateSourcingRequestStatus(requestId, status);
      if (res?.request || res?.success) {
        setReceivedRequests((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status } : r))
        );
        triggerToast(`Sourcing request marked as ${status}`);
      }
    } catch (err) {
      triggerToast(err.message || 'Failed to update request status.', 'error');
    }
  };

  const getProductImage = (p) => {
    if (p.photos && p.photos.length > 0 && p.photos[0]) return p.photos[0];
    if (p.category === 'Organic' || p.category === 'Grain') return coffeeImg;
    if (p.category === 'Textiles') return fabricImg;
    return woodImg;
  };

  const shareLink = activeListing
    ? `${window.location.origin}/marketplace?search=${encodeURIComponent(activeListing.title || '')}`
    : '';

  const copyShareLink = async () => {
    // navigator.clipboard is undefined outside secure contexts and can reject if
    // permission is denied — this used to claim success unconditionally.
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable in this browser.');
      }
      await navigator.clipboard.writeText(shareLink);
      setShareOpen(false);
      triggerToast('Listing link copied to clipboard!');
    } catch {
      triggerToast('Could not copy automatically — select the link and copy it.', 'error');
    }
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {!activeListing ? (
            /* LISTINGS GRID VIEW */
            <div>
              <div className="dash-header">
                <div>
                  <h1 className="inbox-view-title mb-1">My Waste Stream Listings</h1>
                  <p className="dash-subtitle">
                    Manage your active inventory, update availability, and respond to incoming sourcing requests.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchMyProducts}
                    disabled={loading}
                    type="button"
                    aria-label="Refresh my listings"
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={startCreate} className="dash-primary-btn">
                    <Plus size={18} />
                    Create Listing
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col gap-4 animate-pulse">
                      <div className="w-full h-44 bg-slate-200 rounded-2xl" />
                      <div className="w-3/4 h-5 bg-slate-200 rounded" />
                      <div className="w-1/2 h-4 bg-slate-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center flex flex-col items-center gap-3 my-6">
                  <AlertCircle size={32} className="text-rose-600" />
                  <p className="font-bold text-rose-800 text-base">{error}</p>
                  <button
                    onClick={fetchMyProducts}
                    className="px-5 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : myProducts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center gap-4 my-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">No Active Listings Yet</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Publish your byproduct or waste stream to start matching with buyers.
                    </p>
                  </div>
                  <button
                    onClick={startCreate}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    + Create First Listing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {myProducts.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                    >
                      <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
                        <img src={getProductImage(item)} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-slate-700 border border-slate-200">
                          {item.category}
                        </div>
                        {/* Inline Status Dropdown */}
                        <select
                          aria-label={`Availability status for ${item.title}`}
                          value={item.status || 'Active'}
                          onChange={(e) => handleStatusChange(item._id, e.target.value)}
                          className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-bold border-none outline-none cursor-pointer"
                        >
                          <option value="Active" className="bg-slate-800">Active</option>
                          <option value="Paused" className="bg-slate-800">Paused</option>
                          <option value="Reserved" className="bg-slate-800">Reserved</option>
                        </select>
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-3">
                        <h3 className="font-extrabold text-slate-800 text-base line-clamp-1">{item.title}</h3>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                            <span className="font-bold">{item.quantity} {item.unit || 'kg'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                            <span className="font-bold">{item.city}</span>
                          </div>
                        </div>

                        <div className="mt-auto pt-2 flex items-center gap-2">
                          <button
                            onClick={() => setSelectedListingId(item._id)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => startEdit(item)}
                            type="button"
                            aria-label={`Edit ${item.title}`}
                            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors border border-emerald-200"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(item)}
                            type="button"
                            aria-label={`Delete ${item.title}`}
                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors border border-rose-200"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Incoming Sourcing Requests Section */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-800">Received Sourcing Requests</h2>
                    <p className="text-xs text-slate-500">Offers submitted by upcyclers against your listings.</p>
                  </div>
                  <button
                    onClick={fetchReceivedRequests}
                    disabled={loadingRequests}
                    type="button"
                    aria-label="Refresh received sourcing requests"
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                  >
                    <RefreshCw size={14} className={loadingRequests ? 'animate-spin' : ''} />
                  </button>
                </div>

                {loadingRequests ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">Loading requests...</div>
                ) : receivedRequests.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
                    No sourcing requests received yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {receivedRequests.map((req) => (
                      <div
                        key={req._id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800">{req.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Status: {req.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            <strong>Buyer:</strong> {req.buyer?.businessName || req.buyer?.email} |{' '}
                            <strong>Requested:</strong> {req.quantityRequired} {req.unit} @ ₹{req.maxBudgetPerUnit}/{req.unit}
                          </p>
                          {req.location && (
                            <p className="text-[11px] text-slate-400">
                              📍 Delivery: {req.location.locality}, {req.location.state} ({req.location.pincode})
                            </p>
                          )}
                        </div>

                        {req.status === 'OPEN' && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRequestStatus(req._id, 'FULFILLED')}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} /> Accept Offer
                            </button>
                            <button
                              onClick={() => handleRequestStatus(req._id, 'CLOSED')}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                            >
                              <XCircle size={14} /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DETAILED VIEW FOR SELECTED LISTING */
            <div>
              <div
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer mb-6"
                onClick={() => setSelectedListingId(null)}
              >
                <ArrowLeft size={16} />
                <span>Back to My Listings</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Card */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-extrabold text-slate-800">{activeListing.title}</h1>
                    <select
                      aria-label="Availability status for this listing"
                      value={activeListing.status || 'Active'}
                      onChange={(e) => handleStatusChange(activeListing._id, e.target.value)}
                      className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-extrabold border-none outline-none cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="Reserved">Reserved</option>
                    </select>
                  </div>

                  <div className="w-full h-72 bg-slate-100 rounded-2xl overflow-hidden">
                    <img src={getProductImage(activeListing)} alt={activeListing.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Category</span>
                      <span className="text-xs font-bold text-slate-800">{activeListing.category}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Quantity</span>
                      <span className="text-xs font-bold text-slate-800">{activeListing.quantity} {activeListing.unit || 'kg'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Price</span>
                      <span className="text-xs font-bold text-emerald-700">₹{activeListing.price} / {activeListing.priceUnit || 'kg'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pricing Model</span>
                      <span className="text-xs font-bold text-slate-800">{activeListing.pricingModel || 'Negotiable'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Moisture</span>
                      <span className="text-xs font-bold text-slate-800">{activeListing.moisture || 'Dry'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">City</span>
                      <span className="text-xs font-bold text-slate-800">{activeListing.city}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {activeListing.description}
                    </p>
                  </div>
                </div>

                {/* Sidebar Controls */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-4 shadow-sm">
                    <h2 className="text-base font-extrabold text-slate-800">Manage Listing</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Update listing details or generate a shareable marketplace link for buyers.
                    </p>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={() => startEdit(activeListing)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <Pencil size={15} /> Edit Details
                      </button>
                      <button
                        onClick={() => setShareOpen(true)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 size={15} /> Share Listing
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(activeListing)}
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                        <Trash2 size={15} /> Delete Listing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <Modal onClose={() => !deleting && setDeleteCandidate(null)} size="max-w-sm" ariaLabel="Confirm listing deletion">
          <div className="p-6 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Delete Listing?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove &ldquo;{deleteCandidate.title}&rdquo;? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Share Modal */}
      {shareOpen && activeListing && (
        <Modal onClose={() => setShareOpen(false)} size="max-w-sm" ariaLabel="Share listing">
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">Share Listing</h3>
              <button
                type="button"
                aria-label="Close share dialog"
                onClick={() => setShareOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">Copy the direct marketplace link to share with buyers.</p>
            {/* Showing the link means the action still works when the clipboard
                API is blocked — the user can select and copy it by hand. */}
            <input
              type="text"
              readOnly
              value={shareLink}
              aria-label="Shareable listing link"
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 font-mono"
            />
            <button
              type="button"
              onClick={copyShareLink}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
            >
              <Copy size={16} aria-hidden="true" /> Copy Link to Clipboard
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ListingsDetailsPage;
