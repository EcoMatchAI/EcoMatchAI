import { useState, useEffect } from 'react';
import {
  ShoppingBag, Package, Truck, Clock, MapPin, RefreshCw, X, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import Modal from '../common/Modal';
import { apiGetMyOrders, apiTrackShipment } from '../../lib/api';
import { formatPaise } from '../../lib/razorpay';

export const OrdersPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [activeTab, setActiveTab] = useState('purchases'); // 'purchases' | 'sales'
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracking modal state
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingWaybill, setTrackingWaybill] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetMyOrders();
      if (res) {
        setPurchases(res.purchases || []);
        setSales(res.sales || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
     
  }, []);

  const handleTrackShipment = async (waybillNumber) => {
    if (!waybillNumber) return;
    setTrackingWaybill(waybillNumber);
    setTrackingModalOpen(true);
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);

    try {
      // GET /api/logistics/track/:waybill answers a FLAT object — no `shipment`
      // wrapper — with `trackingMilestones` for the timeline and `destination` as
      // a formatted string. Looking for res.shipment made tracking fail every time.
      const res = await apiTrackShipment(waybillNumber);
      if (!res?.waybillNumber) {
        throw new Error(res?.message || 'Could not fetch shipment tracking data.');
      }
      setTrackingData(res);
    } catch (err) {
      setTrackingError(err.message || 'Tracking information unavailable.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const currentList = activeTab === 'purchases' ? purchases : sales;

  const renderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={13} /> Paid & Confirmed
        </span>
      );
    }
    if (s === 'CREATED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock size={13} /> Pending Payment
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <AlertCircle size={13} /> Payment Failed
      </span>
    );
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
              <h1 className="inbox-view-title mb-1">My Orders & Fulfillments</h1>
              <p className="dash-subtitle">
                Track material purchases, sales history, freight quotes, and live shipments.
              </p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'purchases'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShoppingBag size={16} /> My Purchases ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'sales'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package size={16} /> Sales & Fulfillments ({sales.length})
            </button>
          </div>

          {/* Content area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Fetching orders...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-center flex flex-col items-center gap-3">
              <AlertCircle size={28} />
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchOrders}
                className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : currentList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-4 my-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag size={32} />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-extrabold text-slate-800">
                  {activeTab === 'purchases' ? 'No Purchases Yet' : 'No Sales Recorded Yet'}
                </h3>
                <p className="text-slate-500 text-sm mt-1">
                  {activeTab === 'purchases'
                    ? 'Explore the waste marketplace to source byproducts and arrange freight delivery directly.'
                    : 'List your industrial waste streams to receive purchase orders from verified upcyclers.'}
                </p>
              </div>
              {activeTab === 'purchases' && (
                <button
                  onClick={() => setCurrentPage('marketplace')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  Browse Marketplace
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-8">
              {currentList.map((order) => {
                const product = order.product || {};
                const partner = activeTab === 'purchases' ? order.seller : order.buyer;
                const shipment = order.shipment;

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    {/* Left: Product & Partner info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {product.photos?.[0] ? (
                          <img src={product.photos[0]} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-slate-400" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-extrabold text-slate-800 truncate">
                            {order.productTitle || product.title || 'Material Order'}
                          </h3>
                          {renderStatusBadge(order.status)}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span>
                            <strong>Quantity:</strong> {order.quantity} {order.unit || 'kg'}
                          </span>
                          <span>
                            <strong>{activeTab === 'purchases' ? 'Seller:' : 'Buyer:'}</strong>{' '}
                            {partner?.businessName || partner?.email || 'EcoMatch Member'}
                          </span>
                          <span>
                            <strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {order.destinationPincode && (
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-400" /> Destination Pincode: {order.destinationPincode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Pricing breakdown & tracking action */}
                    <div className="flex flex-col md:items-end gap-3 flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                        <span className="text-xl font-extrabold text-emerald-700">
                          {formatPaise(order.amount)}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          Mat: {formatPaise(order.materialCost)} | Freight: {formatPaise(order.freightCost)} | GST: {formatPaise(order.gstAmount)}
                        </div>
                      </div>

                      {/* Only offer tracking when the waybill is actually present.
                          The old `typeof shipment === 'string'` fallback passed a raw
                          ObjectId to the tracking endpoint, which can never match. */}
                      {shipment?.waybillNumber && (
                        <button
                          onClick={() => handleTrackShipment(shipment.waybillNumber)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          <Truck size={14} /> Track Shipment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tracking Modal */}
        {trackingModalOpen && (
          <Modal onClose={() => setTrackingModalOpen(false)} size="max-w-lg" ariaLabel={`Tracking for waybill ${trackingWaybill}`}>
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Truck size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Shipment Tracking</h3>
                    <p className="text-xs text-slate-500 font-mono">Waybill: {trackingWaybill}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close tracking details"
                  onClick={() => setTrackingModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                {trackingLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 size={28} className="animate-spin text-emerald-600" />
                    <p className="text-xs font-medium">Fetching real-time location & carrier details...</p>
                  </div>
                ) : trackingError ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
                    {trackingError}
                  </div>
                ) : trackingData ? (
                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Status</span>
                        <span className="font-extrabold text-emerald-700 text-sm">{trackingData.status}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Est. Delivery</span>
                        <span className="font-extrabold text-slate-800 text-sm">
                          {trackingData.estimatedDeliveryDate
                            ? new Date(trackingData.estimatedDeliveryDate).toLocaleDateString()
                            : 'Pending dispatch'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Carrier</span>
                        <span className="font-semibold text-slate-700">{trackingData.carrier || 'EcoMatch Express'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold uppercase text-[10px]">Route</span>
                        <span className="font-semibold text-slate-700">
                          {trackingData.origin ? `${trackingData.origin} → ` : ''}
                          {trackingData.destination || 'India'}
                        </span>
                      </div>
                    </div>

                    {/* Timeline — the API calls this `trackingMilestones`. */}
                    {Array.isArray(trackingData.trackingMilestones) && trackingData.trackingMilestones.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Tracking Timeline</h4>
                        <ol className="relative pl-6 flex flex-col gap-4 border-l-2 border-slate-200 list-none">
                          {trackingData.trackingMilestones.map((step, idx) => (
                            <li key={`${step.status}-${step.timestamp || idx}`} className="relative">
                              <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" aria-hidden="true" />
                              <div className="text-xs font-bold text-slate-800">{step.status}</div>
                              {step.location && <div className="text-[11px] text-slate-500">{step.location}</div>}
                              {step.remarks && <div className="text-[11px] text-slate-500">{step.remarks}</div>}
                              <div className="text-[10px] text-slate-400">
                                {step.timestamp ? new Date(step.timestamp).toLocaleString('en-IN') : ''}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No details available.</p>
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

export default OrdersPage;
