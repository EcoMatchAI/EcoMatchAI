import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, MapPin, X, Package, IndianRupee, Loader2, AlertCircle,
  Search, RefreshCw, ShoppingBag, Send, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import Modal from '../common/Modal';
import {
  apiGetProducts,
  apiCreateSourcingRequest,
  apiGetPaymentConfig,
  apiGetPaymentQuote
} from '../../lib/api';
import { startCheckout, formatRupees } from '../../lib/razorpay';
import { useAuth } from '../../context/useAuth';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

const CATEGORIES = ['Organic', 'Textiles', 'Wood', 'Plastics', 'Metals', 'Grain'];

/* Product categories and sourcing-request materialCategory are two different
   enums on the backend. Blindly upper-casing the product category produced
   TEXTILES / PLASTICS / METALS / WOOD / GRAIN, none of which the sourcing schema
   accepts, so submitting a request failed validation for every category but
   Organic. This maps one enum onto the other. */
const SOURCING_CATEGORY = {
  Organic: 'ORGANIC',
  Textiles: 'TEXTILE',
  Wood: 'OTHER',
  Plastics: 'PLASTIC',
  Metals: 'METAL',
  Grain: 'ORGANIC',
};

export const MarketplacePage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const { user } = useAuth();

  // The top-nav search box and shared listing links both arrive as
  // `/marketplace?search=…&city=…&category=…`. Seeding the filters from the URL
  // is what makes those entry points do anything at all.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCity = searchParams.get('city') || '';
  const initialCategories = (searchParams.get('category') || '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => CATEGORIES.includes(c));

  // Filter state
  const [selectedCategories, setSelectedCategories] = useState(initialCategories);
  const [cityInput, setCityInput] = useState(initialCity);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [minQty, setMinQty] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 9;

  // Debounced filters state
  const [debouncedFilters, setDebouncedFilters] = useState({
    city: initialCity,
    search: initialSearch,
    minQuantity: 0
  });

  // API Products State
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected product detail modal
  const [activeProduct, setActiveProduct] = useState(null);

  // Request to Source Modal State
  const [sourcingModalOpen, setSourcingModalOpen] = useState(false);
  const [sourcingSubmitting, setSourcingSubmitting] = useState(false);
  const [sourcingSuccess, setSourcingSuccess] = useState(false);
  const [sourcingForm, setSourcingForm] = useState({
    quantityRequired: '',
    unit: 'KG',
    maxBudgetPerUnit: '',
    urgencyLevel: 'MEDIUM',
    description: '',
    locationName: '',
    address: '',
    locality: '',
    pincode: '',
    state: '',
    phoneNumber: ''
  });

  // Buy & Ship Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({ configured: true });
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [destinationPincode, setDestinationPincode] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [checkoutStage, setCheckoutStage] = useState('idle'); // 'idle' | 'creating' | 'awaiting-payment' | 'verifying' | 'paid' | 'failed'
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  // A search submitted from the top nav changes the query string without
  // remounting this page, so the URL has to be watched, not just read once.
  const urlSearch = searchParams.get('search') || '';
  const urlCity = searchParams.get('city') || '';
  useEffect(() => {
    // The URL is an external system this page subscribes to, which is exactly the
    // case the lint rule cannot distinguish from derived-state duplication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(urlSearch);
    setCityInput(urlCity);
  }, [urlSearch, urlCity]);

  // Debounce inputs. Only commit when a value really changed — building a fresh
  // object every time gave it a new identity, which refetched on mount and again
  // on any unrelated re-render. The last committed value lives in a ref so this
  // stays out of the effect's dependency list.
  const committedFiltersRef = useRef(debouncedFilters);
  useEffect(() => {
    const handler = setTimeout(() => {
      const next = {
        city: cityInput.trim(),
        search: searchInput.trim(),
        minQuantity: Number(minQty) || 0
      };
      const prev = committedFiltersRef.current;
      if (
        prev.city === next.city &&
        prev.search === next.search &&
        prev.minQuantity === next.minQuantity
      ) {
        return;
      }
      committedFiltersRef.current = next;
      setDebouncedFilters(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [cityInput, searchInput, minQty]);

  // Fetch products from API
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const categoryParam = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined;
      const params = {
        category: categoryParam,
        city: debouncedFilters.city || undefined,
        search: debouncedFilters.search || undefined,
        minQuantity: debouncedFilters.minQuantity > 0 ? debouncedFilters.minQuantity : undefined,
        page,
        limit
      };

      // GET /api/product answers { products, total, page, totalPages } — there is
      // no `success` flag and no `pagination` wrapper. Testing for those made the
      // page throw its own error on every successful response.
      const res = await apiGetProducts(params);
      const list = Array.isArray(res?.products) ? res.products : [];
      setProducts(list);
      setTotalCount(typeof res?.total === 'number' ? res.total : list.length);
      setTotalPages(Math.max(1, res?.totalPages || 1));
    } catch (err) {
      setError(err.message || 'Could not connect to marketplace server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Data fetching necessarily writes loading/result state; fetchProducts closes
    // over the current filters and is recreated each render, so the effect always
    // calls an up-to-date copy.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategories, debouncedFilters, page]);

  // Mirror the active filters back into the address bar so the view can be
  // bookmarked and shared. `replace` keeps typing out of the history stack.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedFilters.search) next.set('search', debouncedFilters.search);
    if (debouncedFilters.city) next.set('city', debouncedFilters.city);
    if (selectedCategories.length) next.set('category', selectedCategories.join(','));
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, selectedCategories]);

  // Check Payment Config when opening checkout
  const checkPaymentSetup = async () => {
    setCheckingConfig(true);
    try {
      const res = await apiGetPaymentConfig();
      if (res) {
        setPaymentConfig(res);
      }
    } catch (err) {
      console.warn('Payment config check failed:', err.message);
    } finally {
      setCheckingConfig(false);
    }
  };

  // Toggle Category Selection
  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  };

  const getProductImage = (p) => {
    if (p.photos && p.photos.length > 0 && p.photos[0]) return p.photos[0];
    if (p.category === 'Organic' || p.category === 'Grain') return coffeeImg;
    if (p.category === 'Textiles') return fabricImg;
    return woodImg;
  };

  // Open Sourcing Request Modal
  const handleOpenSourcingModal = (product) => {
    setActiveProduct(product);
    setSourcingSuccess(false);
    setSourcingForm({
      quantityRequired: product.quantity ? String(product.quantity) : '100',
      unit: product.unit || 'KG',
      maxBudgetPerUnit: product.price ? String(product.price) : '10',
      urgencyLevel: 'MEDIUM',
      description: `Requesting to source material from listing: ${product.title}`,
      locationName: user?.businessName || '',
      address: '',
      locality: product.city || '',
      pincode: '',
      state: 'Maharashtra',
      phoneNumber: user?.phoneNumber || ''
    });
    setSourcingModalOpen(true);
  };

  // Submit Sourcing Request Form
  const handleSubmitSourcing = async (e) => {
    e.preventDefault();
    if (!sourcingForm.quantityRequired || Number(sourcingForm.quantityRequired) <= 0) {
      triggerToast('Please enter a valid quantity required.', 'error');
      return;
    }
    if (!sourcingForm.maxBudgetPerUnit || Number(sourcingForm.maxBudgetPerUnit) < 0) {
      triggerToast('Please enter a valid budget per unit.', 'error');
      return;
    }
    if (!sourcingForm.pincode || !/^\d{6}$/.test(sourcingForm.pincode)) {
      triggerToast('Please enter a valid 6-digit pincode.', 'error');
      return;
    }

    setSourcingSubmitting(true);
    try {
      const payload = {
        title: `Sourcing Request: ${activeProduct?.title || 'Material'}`,
        materialCategory: SOURCING_CATEGORY[activeProduct?.category] || 'OTHER',
        specificMaterial: activeProduct?.title || 'Byproduct',
        quantityRequired: Number(sourcingForm.quantityRequired),
        unit: sourcingForm.unit,
        maxBudgetPerUnit: Number(sourcingForm.maxBudgetPerUnit),
        urgencyLevel: sourcingForm.urgencyLevel,
        description: sourcingForm.description,
        location: {
          name: sourcingForm.locationName || user?.businessName || 'Delivery Location',
          address: sourcingForm.address || 'Factory / Depot Address',
          locality: sourcingForm.locality || activeProduct?.city || 'City',
          pincode: sourcingForm.pincode,
          state: sourcingForm.state || 'State',
          phoneNumber: sourcingForm.phoneNumber || '9999999999'
        },
        product: activeProduct?._id
      };

      const res = await apiCreateSourcingRequest(payload);
      if (res?.success) {
        setSourcingSuccess(true);
        triggerToast('Sourcing request submitted successfully!');
      } else {
        throw new Error(res?.message || 'Failed to submit sourcing request.');
      }
    } catch (err) {
      triggerToast(err.message || 'Sourcing request failed.', 'error');
    } finally {
      setSourcingSubmitting(false);
    }
  };

  // Open Checkout Modal
  const handleOpenCheckoutModal = async (product) => {
    setActiveProduct(product);
    setCheckoutQty(product.quantity ? Math.min(product.quantity, 100) : 1);
    setDestinationPincode('');
    setQuoteData(null);
    setQuoteError(null);
    setCheckoutStage('idle');
    setCheckoutResult(null);
    setCheckoutError(null);
    setCheckoutModalOpen(true);
    await checkPaymentSetup();
  };

  // Refuse to close while an order is being created or verified — dropping the
  // dialog mid-flight would leave the buyer with no record of what happened.
  const checkoutBusy = ['creating', 'awaiting-payment', 'verifying'].includes(checkoutStage);
  const closeCheckout = () => {
    if (checkoutBusy) {
      triggerToast('Payment in progress — please wait for it to finish.', 'error');
      return;
    }
    setCheckoutModalOpen(false);
    setActiveProduct(null);
  };

  // Get Payment Quote
  const handleGetQuote = async (e) => {
    if (e) e.preventDefault();
    if (!destinationPincode || !/^\d{6}$/.test(destinationPincode)) {
      setQuoteError('Please enter a valid 6-digit delivery pincode.');
      return;
    }
    const qty = Number(checkoutQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setQuoteError('Please enter a quantity of at least 1.');
      return;
    }
    if (activeProduct?.quantity && qty > activeProduct.quantity) {
      setQuoteError(`Only ${activeProduct.quantity} ${activeProduct.unit || 'kg'} is available in this listing.`);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const res = await apiGetPaymentQuote({
        productId: activeProduct._id,
        quantity: Number(checkoutQty),
        destinationPincode
      });
      // The endpoint wraps its payload as { success, quote }. Storing `res`
      // directly left breakdown undefined, and reading .materialCost off it
      // threw a TypeError that blanked the modal.
      const quote = res?.quote || res;
      if (!quote?.breakdown) {
        throw new Error('The server did not return a price breakdown. Please try again.');
      }
      setQuoteData(quote);
    } catch (err) {
      setQuoteError(err.message || 'Failed to calculate quote.');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Execute Razorpay Checkout
  const handleStartPayment = async () => {
    if (!quoteData) return;
    setCheckoutError(null);

    try {
      const result = await startCheckout({
        productId: activeProduct._id,
        quantity: Number(checkoutQty),
        destinationPincode,
        buyer: {
          name: user?.businessName || '',
          email: user?.email || '',
          contact: user?.phoneNumber || ''
        },
        onStage: (stage) => setCheckoutStage(stage)
      });

      if (result.status === 'paid') {
        setCheckoutStage('paid');
        setCheckoutResult(result.order);
        triggerToast('Payment successful! Order and shipment confirmed.');
        // The listing's availability changed server-side; the grid behind the
        // dialog would otherwise keep showing pre-purchase numbers.
        fetchProducts();
      } else if (result.status === 'dismissed') {
        setCheckoutStage('idle');
        triggerToast('Checkout was closed.');
      }
    } catch (err) {
      setCheckoutStage('failed');
      setCheckoutError(err.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {/* Header */}
          <div className="dash-header">
            <div>
              <h1 className="inbox-view-title mb-1">Waste Marketplace</h1>
              <p className="dash-subtitle">
                Discover, source, and purchase verified industrial byproducts and organic waste streams.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('createListing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors"
            >
              + List Waste Stream
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search text */}
              <div className="relative flex items-center">
                <Search size={18} className="absolute left-3.5 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search listings by title or material"
                  placeholder="Search by title or material..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* City Filter */}
              <div className="relative flex items-center">
                <MapPin size={18} className="absolute left-3.5 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  aria-label="Filter listings by city"
                  placeholder="Filter by city (e.g. Pune)..."
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Min Quantity Slider */}
              <div className="flex flex-col justify-center px-1">
                <label htmlFor="min-qty" className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Min Quantity</span>
                  <span>{minQty} kg</span>
                </label>
                <input
                  id="min-qty"
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                  className="accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">Categories:</span>
              <button
                onClick={() => setSelectedCategories([])}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  selectedCategories.length === 0
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid section */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col gap-4 animate-pulse">
                  <div className="w-full h-44 bg-slate-200 rounded-2xl" />
                  <div className="w-3/4 h-5 bg-slate-200 rounded" />
                  <div className="w-1/2 h-4 bg-slate-200 rounded" />
                  <div className="w-full h-12 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center flex flex-col items-center gap-3 my-6">
              <AlertCircle size={32} className="text-rose-600" />
              <p className="font-bold text-rose-800 text-base">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-5 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
              >
                Retry Loading
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center gap-4 my-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Box size={32} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">No Listings Found</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Try adjusting your category selections, search keyword, or city filter.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setCityInput('');
                  setSearchInput('');
                  setMinQty(0);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {products.map((p) => {
                  const isFree = p.price === 0 || p.pricingModel === 'Free — disposal saving';

                  return (
                    <div
                      key={p._id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col"
                    >
                      {/* Image header */}
                      <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                        <img
                          src={getProductImage(p)}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-emerald-800 border border-emerald-100 shadow-sm">
                          {p.category}
                        </div>
                        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">
                          {isFree ? 'Free' : `₹${p.price} / ${p.unit || 'kg'}`}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col gap-3">
                        <h3 className="font-extrabold text-slate-800 text-base line-clamp-2 leading-snug">
                          {p.title}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <Package size={14} className="text-emerald-600 flex-shrink-0" />
                            <span>{p.quantity} {p.unit || 'kg'} ({p.frequency || 'Weekly'})</span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                            <span>{p.city}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>

                        <div className="mt-auto pt-2 flex items-center gap-2">
                          <button
                            onClick={() => setActiveProduct(p)}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                          >
                            View Details
                          </button>

                          {isFree ? (
                            <button
                              onClick={() => handleOpenSourcingModal(p)}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                            >
                              Request to Source
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenCheckoutModal(p)}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1"
                            >
                              <ShoppingBag size={14} /> Buy & Ship
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-bold text-slate-600">
                    Page {page} of {totalPages} ({totalCount} items)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* PRODUCT DETAILS MODAL */}
        {/* ------------------------------------------------------------------ */}
        {activeProduct && !sourcingModalOpen && !checkoutModalOpen && (
          <Modal onClose={() => setActiveProduct(null)} size="max-w-2xl" ariaLabel={`Listing details: ${activeProduct.title}`}>
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
                    {activeProduct.category}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-lg">{activeProduct.title}</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close listing details"
                  onClick={() => setActiveProduct(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex flex-col gap-6">
                <div className="w-full h-56 bg-slate-100 rounded-2xl overflow-hidden">
                  <img src={getProductImage(activeProduct)} alt={activeProduct.title} className="w-full h-full object-cover" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Price</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {activeProduct.price === 0 ? 'Free' : `₹${activeProduct.price} / ${activeProduct.unit || 'kg'}`}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Pricing Model</span>
                    <span className="text-xs font-bold text-slate-700">{activeProduct.pricingModel || 'Negotiable'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Moisture State</span>
                    <span className="text-xs font-bold text-slate-700">{activeProduct.moisture || 'Dry'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Logistics</span>
                    <span className="text-xs font-bold text-slate-700">{activeProduct.logistics || 'Local Pickup'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Packaging</span>
                    <span className="text-xs font-bold text-slate-700">{activeProduct.packaging || 'Bagged'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                    <span className="text-xs font-bold text-slate-700">{activeProduct.city}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {activeProduct.description}
                  </p>
                </div>

                {activeProduct.seller && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">Listed By</span>
                      <span className="text-sm font-extrabold text-slate-800">
                        {activeProduct.seller.businessName || 'EcoMatch Seller'}
                      </span>
                    </div>
                    {activeProduct.seller.email && (
                      <a
                        href={`mailto:${activeProduct.seller.email}?subject=Enquiry regarding ${encodeURIComponent(activeProduct.title)}`}
                        className="text-xs font-bold text-emerald-700 underline hover:text-emerald-800"
                      >
                        Email Seller
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                <button
                  onClick={() => handleOpenSourcingModal(activeProduct)}
                  className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                >
                  Request to Source
                </button>
                {activeProduct.price > 0 && activeProduct.pricingModel !== 'Free — disposal saving' && (
                  <button
                    onClick={() => handleOpenCheckoutModal(activeProduct)}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={15} /> Buy & Ship Now
                  </button>
                )}
              </div>
            </>
          </Modal>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* REQUEST TO SOURCE MODAL */}
        {/* ------------------------------------------------------------------ */}
        {sourcingModalOpen && (
          <Modal onClose={() => setSourcingModalOpen(false)} size="max-w-xl" ariaLabel="Create sourcing request">
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Create Sourcing Request</h3>
                  <p className="text-xs text-slate-500">Target Listing: {activeProduct?.title}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close sourcing request form"
                  onClick={() => setSourcingModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {sourcingSuccess ? (
                <div className="p-8 flex flex-col items-center justify-center text-center gap-4 my-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800">Sourcing Request Sent!</h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Your sourcing offer has been submitted to the seller. They can accept or decline it from their dashboard.
                  </p>
                  <button
                    onClick={() => setSourcingModalOpen(false)}
                    className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitSourcing} className="p-6 overflow-y-auto flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Required Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={sourcingForm.quantityRequired}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, quantityRequired: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Unit</label>
                      <select
                        value={sourcingForm.unit}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="KG">KG</option>
                        <option value="TON">TON</option>
                        <option value="LITERS">LITERS</option>
                        <option value="PIECES">PIECES</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Max Budget / Unit (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={sourcingForm.maxBudgetPerUnit}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, maxBudgetPerUnit: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Urgency</label>
                      <select
                        value={sourcingForm.urgencyLevel}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, urgencyLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="IMMEDIATE">IMMEDIATE</option>
                      </select>
                    </div>
                  </div>

                  {/* Inline Location Object */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Pickup / Delivery Address
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Company / Contact Name"
                        required
                        value={sourcingForm.locationName}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, locationName: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number"
                        required
                        value={sourcingForm.phoneNumber}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, phoneNumber: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Street Address"
                      required
                      value={sourcingForm.address}
                      onChange={(e) => setSourcingForm({ ...sourcingForm, address: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Locality"
                        required
                        value={sourcingForm.locality}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, locality: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="6-Digit Pincode"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={sourcingForm.pincode}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, pincode: e.target.value.replace(/\D/g, '') })}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        required
                        value={sourcingForm.state}
                        onChange={(e) => setSourcingForm({ ...sourcingForm, state: e.target.value })}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Additional Notes</label>
                    <textarea
                      rows={2}
                      value={sourcingForm.description}
                      onChange={(e) => setSourcingForm({ ...sourcingForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSourcingModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sourcingSubmitting}
                      className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {sourcingSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Submit Sourcing Request
                    </button>
                  </div>
                </form>
              )}
            </>
          </Modal>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* BUY & SHIP CHECKOUT MODAL (RAZORPAY) */}
        {/* ------------------------------------------------------------------ */}
        {checkoutModalOpen && (
          <Modal onClose={closeCheckout} size="max-w-lg" ariaLabel="Buy and freight checkout">
            <>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-emerald-600" aria-hidden="true" />
                  <h3 className="font-extrabold text-slate-800 text-base">Buy &amp; Freight Checkout</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close checkout"
                  onClick={closeCheckout}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto flex flex-col gap-5">
                {checkingConfig ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold">Checking payment gateway setup...</span>
                  </div>
                ) : !paymentConfig.configured ? (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-center flex flex-col items-center gap-3">
                    <AlertCircle size={28} />
                    <p className="text-xs font-semibold leading-relaxed">
                      Payment gateway is not currently configured on the server. Please use <strong>Request to Source</strong> to negotiate directly with the seller.
                    </p>
                    <button
                      onClick={() => {
                        setCheckoutModalOpen(false);
                        handleOpenSourcingModal(activeProduct);
                      }}
                      className="px-4 py-2 bg-amber-700 text-white text-xs font-bold rounded-xl hover:bg-amber-800"
                    >
                      Switch to Request to Source
                    </button>
                  </div>
                ) : activeProduct?.price === 0 || activeProduct?.pricingModel === 'Free — disposal saving' ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-center flex flex-col items-center gap-3">
                    <CheckCircle2 size={28} />
                    <p className="text-xs font-semibold leading-relaxed">
                      This waste stream is listed for free! Please use <strong>Request to Source</strong> to arrange pickup details with the seller.
                    </p>
                    <button
                      onClick={() => {
                        setCheckoutModalOpen(false);
                        handleOpenSourcingModal(activeProduct);
                      }}
                      className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800"
                    >
                      Request Free Pickup
                    </button>
                  </div>
                ) : checkoutStage === 'paid' ? (
                  /* Paid Success Screen */
                  <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={36} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Order & Freight Confirmed!</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Your payment was processed and shipment booked with the logistics carrier.
                      </p>
                    </div>

                    {checkoutResult?.shipment?.waybillNumber && (
                      <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs font-mono">
                        <span className="text-slate-400 block font-bold text-[10px] uppercase font-sans">Waybill Number</span>
                        <span className="text-emerald-700 font-extrabold text-sm">
                          {checkoutResult.shipment.waybillNumber}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setCheckoutModalOpen(false);
                        setCurrentPage('orders');
                      }}
                      className="w-full py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      View Order & Track Shipment
                    </button>
                  </div>
                ) : checkoutStage === 'failed' ? (
                  /* Failure Screen */
                  <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <AlertCircle size={36} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Payment Failed</h3>
                      <p className="text-xs text-rose-600 mt-1 font-semibold">
                        {checkoutError || 'The transaction could not be completed.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setCheckoutStage('idle')}
                      className="px-6 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  /* Checkout Quote & Payment Form */
                  <form onSubmit={handleGetQuote} className="flex flex-col gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-extrabold text-slate-800 block">{activeProduct.title}</span>
                      <span className="text-slate-500">Unit Price: ₹{activeProduct.price} / {activeProduct.unit || 'kg'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="checkout-qty" className="text-xs font-bold text-slate-700 block mb-1">
                          Quantity <span className="font-medium text-slate-400">(max {activeProduct.quantity})</span>
                        </label>
                        <input
                          id="checkout-qty"
                          type="number"
                          min="1"
                          max={activeProduct.quantity}
                          required
                          value={checkoutQty}
                          onChange={(e) => setCheckoutQty(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label htmlFor="checkout-pincode" className="text-xs font-bold text-slate-700 block mb-1">
                          Destination Pincode
                        </label>
                        <input
                          id="checkout-pincode"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          placeholder="e.g. 411001"
                          value={destinationPincode}
                          onChange={(e) => setDestinationPincode(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={quoteLoading}
                      className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      {quoteLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Calculate Quote Breakdown
                    </button>

                    {quoteError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                        {quoteError}
                      </div>
                    )}

                    {/* Breakdown display */}
                    {quoteData && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col gap-3">
                        <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                          Price & Freight Breakdown
                        </h4>
                        <div className="space-y-1.5 text-xs text-slate-700">
                          <div className="flex justify-between">
                            <span>Material Cost ({quoteData.quantity} {activeProduct.unit || 'kg'}):</span>
                            <span className="font-bold">{formatRupees(quoteData.breakdown.materialCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Freight / Delivery Charge:</span>
                            <span className="font-bold">{formatRupees(quoteData.breakdown.freightCost)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>GST (18%):</span>
                            <span>{formatRupees(quoteData.breakdown.gstAmount)}</span>
                          </div>
                          <div className="pt-2 border-t border-emerald-200 flex justify-between text-sm font-extrabold text-emerald-900">
                            <span>Total Amount Payable:</span>
                            <span>{formatRupees(quoteData.breakdown.total)}</span>
                          </div>
                        </div>

                        {quoteData.deliveryEstimate && (
                          <div className="text-[11px] text-emerald-800 pt-1">
                            {/* The API field is `formattedEDD` / `estimatedDeliveryDate`.
                                Reading `estimatedDate` rendered "Invalid Date". */}
                            🚚 Est. Delivery:{' '}
                            <strong>
                              {quoteData.deliveryEstimate.formattedEDD
                                || (quoteData.deliveryEstimate.estimatedDeliveryDate
                                  ? new Date(quoteData.deliveryEstimate.estimatedDeliveryDate).toLocaleDateString('en-IN')
                                  : 'To be confirmed')}
                            </strong>{' '}
                            to {quoteData.destination?.city || 'destination'}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleStartPayment}
                          disabled={checkoutStage !== 'idle'}
                          className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {checkoutStage !== 'idle' ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Processing ({checkoutStage})...</span>
                            </>
                          ) : (
                            <>
                              <IndianRupee size={16} /> Pay {formatRupees(quoteData.breakdown.total)} via Razorpay
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </>
          </Modal>
        )}

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};

export default MarketplacePage;
