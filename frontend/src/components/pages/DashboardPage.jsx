import { useState, useEffect } from 'react';
import {
  Plus, Package, ShoppingBag, Truck,
  MessageSquare, ArrowRight, RefreshCw, Loader2
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import { useAuth } from '../../context/useAuth';
import {
  apiGetMyProducts,
  apiGetReceivedSourcingRequests,
  apiGetMyShipments,
  apiGetMyOrders
} from '../../lib/api';

import coffeeImg from '../../assets/coffee_grounds.png';
import fabricImg from '../../assets/fabric_waste.png';
import woodImg from '../../assets/wood_offcuts.png';

export const DashboardPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const { user } = useAuth();
  const [myProducts, setMyProducts] = useState([]);
  const [receivedRequestsCount, setReceivedRequestsCount] = useState(0);
  const [shipmentsCount, setShipmentsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [prodRes, reqRes, shipRes, ordRes] = await Promise.allSettled([
        apiGetMyProducts(),
        apiGetReceivedSourcingRequests(),
        apiGetMyShipments(),
        apiGetMyOrders()
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value?.products) {
        setMyProducts(prodRes.value.products);
      }
      if (reqRes.status === 'fulfilled' && typeof reqRes.value?.count === 'number') {
        setReceivedRequestsCount(reqRes.value.count);
      }
      if (shipRes.status === 'fulfilled' && typeof shipRes.value?.count === 'number') {
        setShipmentsCount(shipRes.value.count);
      }
      if (ordRes.status === 'fulfilled' && ordRes.value) {
        const total = (ordRes.value.purchases?.length || 0) + (ordRes.value.sales?.length || 0);
        setOrdersCount(total);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  const greetingName = user?.businessName || user?.email?.split('@')[0] || 'Member';

  const getProductImage = (p) => {
    if (p.photos && p.photos.length > 0 && p.photos[0]) return p.photos[0];
    if (p.category === 'Organic' || p.category === 'Grain') return coffeeImg;
    if (p.category === 'Textiles') return fabricImg;
    return woodImg;
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {/* Welcome Header */}
          <div className="dash-header flex items-center justify-between">
            <div>
              <h1 className="inbox-view-title mb-1">Welcome back, {greetingName}! 👋</h1>
              <p className="dash-subtitle">
                Overview of your industrial byproduct listings, received requests, orders, and active freight shipments.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchDashboardData}
                type="button"
                aria-label="Refresh dashboard"
                disabled={loading}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setCurrentPage('createListing')}
                className="dash-primary-btn"
              >
                <Plus size={18} />
                Create Listing
              </button>
            </div>
          </div>

          {/* Sourced Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">My Listings</span>
                <span className="text-2xl font-extrabold text-slate-800">{myProducts.length}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Received Requests</span>
                <span className="text-2xl font-extrabold text-slate-800">{receivedRequestsCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Shipments</span>
                <span className="text-2xl font-extrabold text-slate-800">{shipmentsCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShoppingBag size={22} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Orders & Deals</span>
                <span className="text-2xl font-extrabold text-slate-800">{ordersCount}</span>
              </div>
            </div>
          </div>

          {/* Section: My Listings Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">My Active Inventory</h2>
                <p className="text-xs text-slate-500">Listings currently published on the marketplace.</p>
              </div>
              <button
                onClick={() => setCurrentPage('listingsDetails')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-600" /> Loading inventory...
              </div>
            ) : myProducts.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center flex flex-col items-center gap-3">
                <Package size={28} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-700">No active listings found.</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Create your first listing to showcase available byproducts to upcyclers.
                </p>
                <button
                  onClick={() => setCurrentPage('createListing')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  + Add New Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myProducts.slice(0, 3).map((p) => (
                  <div
                    key={p._id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                        <img src={getProductImage(p)} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-xs truncate">{p.title}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {p.quantity} {p.unit || 'kg'} • {p.city}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                      <span className="font-bold text-emerald-700">
                        {p.price === 0 ? 'Free' : `₹${p.price} / ${p.unit || 'kg'}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {p.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};

export default DashboardPage;
