import { useState, useEffect } from 'react';
import {
  Package, CheckCircle2, Bell, Truck, CheckCheck, RefreshCw, Loader2
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import {
  apiGetReceivedSourcingRequests,
  apiGetMyShipments,
  apiGetMyOrders
} from '../../lib/api';

// `tone` used to be declared and then ignored, so every notification rendered in
// the same emerald circle and the types were indistinguishable at a glance.
const ICONS = {
  request: { node: <Package size={18} />, tone: 'bg-amber-100 text-amber-700' },
  deal: { node: <CheckCircle2 size={18} />, tone: 'bg-emerald-100 text-emerald-700' },
  logistics: { node: <Truck size={18} />, tone: 'bg-blue-100 text-blue-700' },
  system: { node: <Bell size={18} />, tone: 'bg-slate-100 text-slate-600' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'request', label: 'Requests' },
  { key: 'logistics', label: 'Shipments' },
  { key: 'deal', label: 'Orders' },
];

export const NotificationsPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchRealNotifications = async () => {
    setLoading(true);
    try {
      const [reqRes, shipRes, ordRes] = await Promise.allSettled([
        apiGetReceivedSourcingRequests(),
        apiGetMyShipments(),
        apiGetMyOrders()
      ]);

      const items = [];

      // 1. Sourcing Requests
      if (reqRes.status === 'fulfilled' && reqRes.value?.requests) {
        reqRes.value.requests.forEach((req) => {
          items.push({
            id: `req_${req._id}`,
            type: 'request',
            title: 'Sourcing request received',
            body: `${req.buyer?.businessName || 'An upcycler'} requested to source ${req.quantityRequired}${req.unit} of "${req.title}".`,
            time: new Date(req.createdAt).toLocaleDateString(),
            timestamp: new Date(req.createdAt).getTime(),
            action: 'listingsDetails',
            read: req.status !== 'OPEN'
          });
        });
      }

      // 2. Shipments
      if (shipRes.status === 'fulfilled' && shipRes.value?.shipments) {
        shipRes.value.shipments.forEach((ship) => {
          items.push({
            id: `ship_${ship._id}`,
            type: 'logistics',
            title: `Shipment status: ${ship.status}`,
            body: `Freight shipment #${ship.waybillNumber} is currently ${ship.status}.`,
            time: new Date(ship.createdAt || Date.now()).toLocaleDateString(),
            timestamp: new Date(ship.createdAt || Date.now()).getTime(),
            action: 'orders',
            read: true
          });
        });
      }

      // 3. Orders
      if (ordRes.status === 'fulfilled' && ordRes.value) {
        const purchases = ordRes.value.purchases || [];
        const sales = ordRes.value.sales || [];
        [...purchases, ...sales].forEach((ord) => {
          if (ord.status === 'PAID') {
            items.push({
              id: `ord_${ord._id}`,
              type: 'deal',
              title: 'Paid order confirmed',
              body: `Order for ${ord.quantity} ${ord.unit || 'kg'} of "${ord.productTitle || 'material'}" was confirmed.`,
              time: new Date(ord.createdAt).toLocaleDateString(),
              timestamp: new Date(ord.createdAt).getTime(),
              action: 'orders',
              read: true
            });
          }
        });
      }

      // Sort newest first
      items.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(items);
    } catch (err) {
      console.warn('Notifications fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRealNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const visible = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'request') return n.type === 'request';
    if (filter === 'logistics') return n.type === 'logistics';
    if (filter === 'deal') return n.type === 'deal';
    return true;
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerToast('All notifications marked as read.');
  };

  const openNotification = (n) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.action) setCurrentPage(n.action);
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container">
          {/* Header */}
          <div className="dash-header flex items-center justify-between">
            <div>
              <h1 className="inbox-view-title mb-1">Notifications</h1>
              <p className="dash-subtitle">
                {unreadCount > 0 ? `You have ${unreadCount} unread update${unreadCount > 1 ? 's' : ''}.` : 'You\'re all caught up.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchRealNotifications}
                type="button"
                aria-label="Refresh notifications"
                disabled={loading}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="notif-markall-btn"
              >
                <CheckCheck size={16} /> Mark all read
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="notif-filters mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                className={`notif-filter-chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm mb-8">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Loading notification feed...</span>
              </div>
            ) : visible.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                <Bell size={28} className="text-slate-400" />
                <span className="text-sm font-semibold">No notifications in your feed yet.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visible.map((n) => {
                  const iconObj = ICONS[n.type] || ICONS.system;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNotification(n)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                        n.read
                          ? 'bg-white border-slate-100 hover:border-slate-200'
                          : 'bg-emerald-50/50 border-emerald-200 font-semibold'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconObj.tone}`} aria-hidden="true">
                        {iconObj.node}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-slate-800">{n.title}</h4>
                          <span className="text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.body}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};

export default NotificationsPage;
