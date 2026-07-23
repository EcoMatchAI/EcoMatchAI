import React, { useState } from 'react';
import {
  Recycle, MessageSquare, Package, CheckCircle2, Bell, Truck, CheckCheck
} from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';

const ICONS = {
  match: { node: <Recycle size={18} />, tone: 'green' },
  message: { node: <MessageSquare size={18} />, tone: 'purple' },
  request: { node: <Package size={18} />, tone: 'amber' },
  deal: { node: <CheckCircle2 size={18} />, tone: 'green' },
  logistics: { node: <Truck size={18} />, tone: 'blue' },
  system: { node: <Bell size={18} />, tone: 'gray' },
};

const INITIAL = [
  { id: 1, type: 'match', group: 'Today', title: 'New match found', body: 'BioSkins Skincare Co. is a 95% match for your Spent Coffee Grounds listing.', time: '12m ago', read: false, action: 'listingsDetails' },
  { id: 2, type: 'request', group: 'Today', title: 'Sourcing request received', body: 'EcoInsulate Ltd. requested to source 350kg of your Recycled Textile Fabric.', time: '1h ago', read: false, action: 'messages' },
  { id: 3, type: 'message', group: 'Today', title: 'New message', body: 'BioPack Solutions: "Yes, 10am at the side entrance works for pickup."', time: '3h ago', read: false, action: 'messages' },
  { id: 4, type: 'deal', group: 'Earlier', title: 'Deal completed', body: 'Your deal with GreenFeed Farms for 800kg Brewery Grain was marked completed.', time: 'Yesterday', read: true, action: 'listingsDetails' },
  { id: 5, type: 'logistics', group: 'Earlier', title: 'Pickup scheduled', body: 'Pickup for Wood Offcuts confirmed for Mon, 19 Aug, 11:00 AM.', time: '2 days ago', read: true, action: 'messages' },
  { id: 6, type: 'system', group: 'Earlier', title: 'Profile verified', body: 'Your business has been verified. You now have a Verified badge.', time: '3 days ago', read: true, action: 'profile' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'match', label: 'Matches' },
  { key: 'request', label: 'Requests' },
  { key: 'message', label: 'Messages' },
  { key: 'system', label: 'System' },
];

export const NotificationsPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [items, setItems] = useState(INITIAL);
  const [filter, setFilter] = useState('all');

  const unreadCount = items.filter(n => !n.read).length;

  const visible = items.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'system') return n.type === 'system' || n.type === 'deal' || n.type === 'logistics';
    return n.type === filter;
  });

  const groups = ['Today', 'Earlier'].map(g => ({ group: g, list: visible.filter(n => n.group === g) }));

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    triggerToast('All notifications marked as read.');
  };

  const openNotification = (n) => {
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    if (n.action) setCurrentPage(n.action);
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />

      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />

        <div className="inbox-view-container" style={{ overflowY: 'auto' }}>
          {/* Header */}
          <div className="dash-header">
            <div>
              <h1 className="inbox-view-title" style={{ marginBottom: '4px' }}>Notifications</h1>
              <p className="dash-subtitle">
                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'You\'re all caught up.'}
              </p>
            </div>
            <button className="notif-markall-btn" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck size={16} /> Mark all as read
            </button>
          </div>

          {/* Filter tabs */}
          <div className="notif-filters">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`notif-filter-chip ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="notif-card">
            {visible.length === 0 ? (
              <div className="notif-empty">
                <Bell size={28} />
                <span>No notifications here.</span>
              </div>
            ) : groups.map(({ group, list }) => (
              list.length > 0 && (
                <div key={group} className="notif-group">
                  <div className="notif-group-label">{group}</div>
                  {list.map(n => {
                    const ic = ICONS[n.type] || ICONS.system;
                    return (
                      <button
                        key={n.id}
                        className={`notif-item ${n.read ? '' : 'unread'}`}
                        onClick={() => openNotification(n)}
                      >
                        <div className={`notif-icon ${ic.tone}`}>{ic.node}</div>
                        <div className="notif-content">
                          <div className="notif-title-row">
                            <span className="notif-title">{n.title}</span>
                            <span className="notif-time">{n.time}</span>
                          </div>
                          <p className="notif-body">{n.body}</p>
                        </div>
                        {!n.read && <span className="notif-unread-dot" />}
                      </button>
                    );
                  })}
                </div>
              )
            ))}
          </div>
        </div>

        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};
export default NotificationsPage;
