# Notifications System Guide

`NotificationsPage.jsx` is fully built with filters, grouping, unread dots, and "mark all as read" —
on top of a hardcoded `INITIAL` array. This guide makes it real, adds real-time delivery over the
socket from guide `09`, and adds email fallback for offline users.

Prerequisites: guides `01`, `02`, `09`.

---

## 📌 What the Frontend Already Defines

From `NotificationsPage.jsx`:

```javascript
const ICONS = { match, message, request, deal, logistics, system };   // the 6 types
const INITIAL = [
  { id, type, group: 'Today'|'Earlier', title, body, time, read, action: 'listingsDetails' },
];
const FILTERS = [ 'all', 'match', 'request', 'message', 'system' ];
// note: the 'system' filter also matches type 'deal' and 'logistics'
```

Our model must supply `type`, `title`, `body`, `read`, a relative `time`, and an `action` page key.

`Topnav.jsx` also shows a bell — it needs an unread count.

---

## 🗄️ Step 1: Model (`src/model/notification.js`)

```javascript
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['match', 'message', 'request', 'deal', 'logistics', 'system'],
        required: true,
        index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body:  { type: String, required: true, trim: true, maxlength: 500 },

    /**
     * Where clicking it should go. Uses the frontend's page keys from
     * App.jsx's PAGE_TO_PATH so the existing `setCurrentPage(n.action)`
     * call keeps working unchanged.
     */
    link: {
        page: { type: String, default: 'dashboard' },
        id:   { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    read:   { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },

    /* ---- Email delivery tracking ---- */
    emailQueued: { type: Boolean, default: false },
    emailSentAt: { type: Date, default: null },

    // Groups related notifications so we can collapse "3 new messages"
    // instead of showing three rows. e.g. "message:<conversationId>"
    groupKey: { type: String, default: null, index: true },

    // TTL: notifications self-delete after 90 days. Nobody reads a
    // three-month-old alert, and the collection grows fastest of all.
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        index: { expires: 0 },
    },

}, { timestamps: true });

// The main query: this user's notifications, newest first.
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });        // unread badge count

module.exports = mongoose.model('Notification', notificationSchema);
```

---

## ⚡ Step 2: Service (`src/services/notificationServices.js`)

Called from guides `07`, `09`, `10`, and `12`, so keep the interface stable.

```javascript
const Notification = require('../model/notification');
const User = require('../model/user');
const AppError = require('../util/AppError');
const { emitToUser, isUserOnline } = require('../config/socket');
const { sendNotificationEmail } = require('../util/emailService');

/** Which notification types respect which user preference. */
const PREF_FOR_TYPE = {
    match: 'emailMatches',
    message: 'emailMessages',
    request: 'emailDeals',
    deal: 'emailDeals',
    logistics: 'emailDeals',
    system: null,          // system alerts always send
};

class NotificationServices {

    /**
     * Create + deliver a notification.
     *
     * Deliberately never throws: a failed notification must never fail the
     * business action that triggered it. A deal must not roll back because
     * SMTP was down.
     */
    async create({ user, type, title, body, link = {}, groupKey = null, sendEmail = false }) {
        try {
            if (!user || !type || !title || !body) {
                console.warn('notificationServices.create: missing required fields');
                return null;
            }

            /* ---- Collapse duplicates ----
               Three chat messages in a minute should be one "3 new messages"
               row, not three. Update the existing unread row instead.       */
            if (groupKey) {
                const existing = await Notification.findOne({
                    user, groupKey, read: false,
                    createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) },
                });
                if (existing) {
                    existing.title = title;
                    existing.body = body;
                    existing.createdAt = new Date();     // bump to the top
                    await existing.save();
                    emitToUser(user, 'notification:updated', this.toWire(existing));
                    return existing;
                }
            }

            const notification = await Notification.create({
                user, type, title, body,
                link: { page: link.page || 'dashboard', id: link.id || null },
                groupKey,
            });

            // Real-time push to every open tab.
            emitToUser(user, 'notification:new', this.toWire(notification));

            const unreadCount = await this.getUnreadCount(user);
            emitToUser(user, 'notification:count', { count: unreadCount });

            /* ---- Email fallback ----
               Only when they're offline. Emailing someone who is actively
               looking at the notification in-app is how you train users to
               filter your domain into spam.                                */
            if (sendEmail && !isUserOnline(user)) {
                const recipient = await User.findById(user).select('email name notificationPrefs');
                const prefKey = PREF_FOR_TYPE[type];
                const allowed = !prefKey || recipient?.notificationPrefs?.[prefKey] !== false;

                if (recipient && allowed) {
                    notification.emailQueued = true;
                    await notification.save();

                    sendNotificationEmail(recipient.email, recipient.name, title, body, link)
                        .then(() => Notification.updateOne(
                            { _id: notification._id }, { emailSentAt: new Date() }
                        ))
                        .catch((e) => console.error('Notification email failed:', e.message));
                }
            }

            return notification;
        } catch (err) {
            console.error('notificationServices.create failed:', err.message);
            return null;
        }
    }

    /** Fan out one notification to several users (e.g. both sides of a deal). */
    async createMany(userIds, payload) {
        return Promise.all(userIds.map((user) => this.create({ ...payload, user })));
    }

    async list(userId, { type, unreadOnly, page = 1, limit = 30 } = {}) {
        const query = { user: userId };

        // Mirror the frontend's grouping: its 'system' tab includes deal + logistics.
        if (type && type !== 'all') {
            query.type = type === 'system' ? { $in: ['system', 'deal', 'logistics'] } : type;
        }
        if (unreadOnly === 'true' || unreadOnly === true) query.read = false;

        const [items, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Math.min(Number(limit), 50))
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ user: userId, read: false }),
        ]);

        return {
            notifications: items.map((n) => this.toWire(n)),
            unreadCount,
            pagination: { page: Number(page), total, totalPages: Math.ceil(total / limit) },
        };
    }

    async getUnreadCount(userId) {
        return Notification.countDocuments({ user: userId, read: false });
    }

    async markRead(notificationId, userId) {
        // Scope by user in the query itself, so one user can never mark
        // another's notification read.
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, user: userId },
            { read: true, readAt: new Date() },
            { new: true }
        );
        if (!notification) throw AppError.notFound('Notification not found.');

        const count = await this.getUnreadCount(userId);
        emitToUser(userId, 'notification:count', { count });
        return this.toWire(notification);
    }

    async markAllRead(userId) {
        const result = await Notification.updateMany(
            { user: userId, read: false },
            { read: true, readAt: new Date() }
        );
        emitToUser(userId, 'notification:count', { count: 0 });
        return { message: 'All notifications marked as read.', updated: result.modifiedCount };
    }

    async remove(notificationId, userId) {
        const deleted = await Notification.findOneAndDelete({ _id: notificationId, user: userId });
        if (!deleted) throw AppError.notFound('Notification not found.');
        return { message: 'Notification removed.' };
    }

    /** Shapes a document into what NotificationsPage.jsx renders. */
    toWire(n) {
        return {
            id: n._id,
            type: n.type,
            title: n.title,
            body: n.body,
            read: n.read,
            time: this.relativeTime(n.createdAt),
            group: this.dayGroup(n.createdAt),       // 'Today' | 'Earlier'
            action: n.link?.page || 'dashboard',     // setCurrentPage(n.action)
            actionId: n.link?.id || null,
            createdAt: n.createdAt,
        };
    }

    /** "12m ago", "3h ago", "Yesterday", "2 days ago" — matches the mock data. */
    relativeTime(date) {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    dayGroup(date) {
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString() ? 'Today' : 'Earlier';
    }
}

module.exports = new NotificationServices();
```

---

## 📧 Step 3: Notification Email (`src/util/emailService.js`)

```javascript
const sendNotificationEmail = async (toEmail, name, title, body, link = {}) => {
    const url = `${env.clientUrl}/${(link.page || 'dashboard').replace(/^\//, '')}`;

    const html = emailShell(title, `
        <p>Hello <strong>${name || 'there'}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">${body}</p>
        <p style="margin: 24px 0;">${button(url, 'Open EcoMatch')}</p>
        <p style="font-size: 11.5px; color: #94a3b8;">
            Don't want these emails?
            <a href="${env.clientUrl}/profile" style="color:#15803d;">Manage notification settings</a>.
        </p>
    `);

    return transporter.sendMail({
        from: env.emailFrom || `"EcoMatch" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `EcoMatch — ${title}`,
        html,
    });
};
```

> Add `sendNotificationEmail` to the module exports alongside the guide `04`/`05` senders.

---

## 🛣️ Step 4: Controller & Routes

`src/controller/notificationController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const notificationServices = require('../services/notificationServices');

class NotificationController {
    list = asyncHandler(async (req, res) => {
        const result = await notificationServices.list(req.user._id, req.query);
        res.status(200).json({ success: true, ...result });
    });

    unreadCount = asyncHandler(async (req, res) => {
        const count = await notificationServices.getUnreadCount(req.user._id);
        res.status(200).json({ success: true, count });
    });

    markRead = asyncHandler(async (req, res) => {
        const notification = await notificationServices.markRead(req.params.id, req.user._id);
        res.status(200).json({ success: true, notification });
    });

    markAllRead = asyncHandler(async (req, res) => {
        const result = await notificationServices.markAllRead(req.user._id);
        res.status(200).json({ success: true, ...result });
    });

    remove = asyncHandler(async (req, res) => {
        const result = await notificationServices.remove(req.params.id, req.user._id);
        res.status(200).json({ success: true, ...result });
    });
}
module.exports = new NotificationController();
```

`src/routes/notificationRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const NotificationController = require('../controller/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', NotificationController.list);                    // ?type=match&unreadOnly=true
router.get('/unread-count', NotificationController.unreadCount);
router.patch('/read-all', NotificationController.markAllRead);   // before /:id/read
router.patch('/:id/read', NotificationController.markRead);
router.delete('/:id', NotificationController.remove);

module.exports = router;
```

---

## 🖥️ Step 5: Frontend Wiring

### 5a. `lib/api.js`

```javascript
/* ---- Notifications ---- */
export const apiGetNotifications = (params = {}) =>
  request(`/notifications?${new URLSearchParams(params)}`);
export const apiGetUnreadCount = () => request('/notifications/unread-count');
export const apiMarkNotificationRead = (id) =>
  request(`/notifications/${id}/read`, { method: 'PATCH' });
export const apiMarkAllNotificationsRead = () =>
  request('/notifications/read-all', { method: 'PATCH' });
export const apiDeleteNotification = (id) =>
  request(`/notifications/${id}`, { method: 'DELETE' });
```

### 5b. `NotificationsPage.jsx`

Replace the `INITIAL` constant with a fetch; the rest of the component works unchanged because
`toWire()` produces the same field names.

```javascript
import { getSocket } from '../../lib/socket';
import {
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
} from '../../lib/api';

const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  setLoading(true);
  apiGetNotifications({ type: filter })
    .then((d) => setItems(d.notifications))
    .catch((e) => triggerToast(e.message, 'error'))
    .finally(() => setLoading(false));
}, [filter]);

// Live: a new notification appears without a refresh.
useEffect(() => {
  const socket = getSocket();
  const onNew = (n) => setItems((prev) => [n, ...prev]);
  socket.on('notification:new', onNew);
  return () => socket.off('notification:new', onNew);
}, []);

const markAllRead = async () => {
  try {
    await apiMarkAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerToast('All notifications marked as read.');
  } catch (e) { triggerToast(e.message, 'error'); }
};

const openNotification = async (n) => {
  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  apiMarkNotificationRead(n.id).catch(() => {});   // optimistic; don't block navigation
  if (n.action) setCurrentPage(n.action);
};
```

Add a loading skeleton and keep the existing empty state — it is already well handled.

### 5c. `Topnav.jsx` — live badge

```javascript
const [unread, setUnread] = useState(0);

useEffect(() => {
  apiGetUnreadCount().then((d) => setUnread(d.count)).catch(() => {});

  const socket = getSocket();
  const onCount = ({ count }) => setUnread(count);
  socket.on('notification:count', onCount);
  return () => socket.off('notification:count', onCount);
}, []);
```

Render a dot/count on the bell when `unread > 0`. Do the same for the chat unread count from guide
`09` on the Messages sidebar item — an unread badge is the single most effective re-engagement
mechanism we have that costs nothing.

---

## 🔔 Step 6: Where Notifications Get Created

A checklist so no event is silently missing:

| Event | Type | Recipient | Guide | Email? |
|-------|------|-----------|-------|--------|
| New sourcing request | `request` | Listing owner | `10` | ✅ |
| Request accepted | `deal` | Requester | `10` | ✅ |
| Request declined | `request` | Requester | `10` | ✅ |
| Request expired | `request` | Requester | `10` | ✅ |
| New chat message (recipient offline) | `message` | Recipient | `09` | ✅ grouped |
| Pickup scheduled | `logistics` | Other party | `10` | ✅ |
| Deal status advanced | `deal` | Other party | `10` | ⬜ |
| Deal completed | `deal` | Both | `10` | ✅ |
| Deal cancelled | `deal` | Other party | `10` | ✅ |
| New high match found | `match` | Upcycler | `12` | ✅ digest |
| Listing about to expire (day 75) | `system` | Owner | `07` | ✅ |
| Business verified / rejected | `system` | Owner | `06` | ✅ |
| Email or password changed | `system` | Owner | `04`, `05` | ✅ always |

Add to guide `09`'s `sendMessage` so offline recipients get an email:

```javascript
// chatServices.sendMessage — after the message is persisted
const recipients = convo.participants.filter((p) => p.toString() !== String(senderId));
await Promise.all(recipients.map((rid) =>
    notificationServices.create({
        user: rid,
        type: 'message',
        title: 'New message',
        body: `${senderName}: ${text.slice(0, 80)}`,
        link: { page: 'messages', id: conversationId },
        groupKey: `message:${conversationId}`,   // collapses a burst into one row
        sendEmail: true,                          // only fires if they're offline
    })
));
```

---

## 🧪 Step 7: Test

Checklist:
- [ ] Creating a notification pushes `notification:new` over the socket within ~100 ms
- [ ] The `Topnav` badge increments without a page refresh
- [ ] Three chat messages in the same thread within 30 min → **one** grouped notification
- [ ] `?type=system` returns `system` + `deal` + `logistics` (matches the frontend filter)
- [ ] Marking read decrements the badge on every open tab
- [ ] Marking **another user's** notification read → `404`
- [ ] An **online** user gets no email; an offline user does
- [ ] `notificationPrefs.emailMessages = false` suppresses message emails but not `system` ones
- [ ] `relativeTime` renders "Just now", "12m ago", "Yesterday" correctly
- [ ] A notification with a broken `link.page` still navigates somewhere sane (`dashboard`)
- [ ] A DB failure inside `create()` does **not** fail the deal that triggered it
- [ ] Setting `expiresAt` in the past → the document is removed by Mongo's TTL monitor (~60 s)

---

## 🔒 Security Summary

1. **Every query is scoped by `user: userId`** in the filter itself, not checked afterwards. A user
   can never read, mark, or delete another's notifications.
2. **`emitToUser` targets the `user:<id>` room** created at socket handshake, so pushes cannot be
   redirected by a client-supplied id.
3. **`create()` never throws.** Notification failure must not roll back a deal or a message.
4. **Bounded `title`/`body` lengths** — these come from other services, but a template could
   interpolate unbounded user input (a listing title, a chat message) if we don't cap it.
5. **React escapes on render.** Notification bodies contain user-generated strings (listing titles,
   business names); never render them with `dangerouslySetInnerHTML`.
6. **Email respects `notificationPrefs`**, with an unsubscribe link in every email. Ignoring
   preferences is both an anti-spam violation and the fastest route to being blocklisted.
7. **90-day TTL.** The notification collection grows faster than any other; unbounded growth is a
   cost and a backup-time problem.
8. **Don't leak into notifications what the recipient can't see.** Bodies must not include a pickup
   address or phone number before a deal is accepted (guide `10`).

---

## 💼 CEO Review Notes

- **Notifications are our re-engagement engine, and B2B users do not sit in our app all day.** A cafe
  owner checks once a day at best. If a sourcing request only appears in-app, we lose the deal to a
  slower response. The **email fallback is the feature**, not the bell icon.
- **Ruthlessly protect the notification budget.** Every unnecessary email trains users to ignore all
  of them. My rule: notify only when the user must *act* (a request needs an answer, a pickup needs
  confirming) or when something *irreversible* happened (deal completed, cancelled). Everything else
  is a weekly digest. Grouping and the online-check in this guide are exactly right — don't dilute
  them later "just to boost engagement".
- **WhatsApp Business API is the highest-ROI addition here**, once we collect phone numbers. Indian
  SMBs read WhatsApp within minutes and email within days. A "new sourcing request" WhatsApp message
  could plausibly halve our response time, and response time is what determines whether deals
  complete. Cost is roughly ₹0.35–0.80 per message — trivial against the value of one completed deal.
  This is the single feature I would fund next after the transactional loop.
- **Response time should be public.** Once notifications are reliable we can honestly show "typically
  responds within 4 hours" on `ProfilePage`. That both rewards responsive sellers and sets buyer
  expectations, and it costs us nothing to compute from data we already have.
- **Give users real control.** `notificationPrefs` exists in the schema but there is no settings UI —
  `changes.md` lists Account Settings as still pending. A user who cannot turn off emails
  unsubscribes from *everything*, and we lose the channel permanently. Ship the toggles with the
  first email we send, not after complaints.
- **Watch the "notified but didn't act" cohort.** Users who receive three notifications and act on
  none are our clearest churn signal, weeks before they stop logging in. That list should go to
  whoever does customer success — a phone call at that moment saves an account.
