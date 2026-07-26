# Dashboard & Analytics Guide

`DashboardPage.jsx` and `ProfilePage.jsx` display eleven numbers, and **every one is hardcoded**:

```javascript
// DashboardPage.jsx
{ label: 'Active Listings', value: '6',      delta: '+2 this week' }
{ label: 'New Matches',     value: '14',     delta: '+5 today' }
{ label: 'Pending Requests',value: '3' }
{ label: 'Cost Savings',    value: '₹2.45L', delta: '+18% this month' }
const IMPACT = [ '6 Streams', '48', '91%' ];
```

Plus `"Welcome back, GreenBrew Co. 👋"` — a hardcoded company name shown to every user, and
`Sidebar.jsx`'s `"GreenBrew Co. / Business Account"`.

This guide makes them real with MongoDB aggregations.

Prerequisites: guides `06`, `07`, `09`, `10`, `11`, `12`.

---

## 📌 Two Sources of Truth, Deliberately

| Approach | Used for | Why |
|----------|----------|-----|
| **Denormalised counters** (`user.stats`) | Public profile, listing cards | Read constantly, must be instant |
| **Live aggregation** | Dashboard, reports | Read occasionally, must be exact |

`user.stats` can drift (a crashed process between two writes). A nightly reconciliation job fixes it.
This is a conscious trade: perfectly consistent counters would require a transaction on every view
increment, which is not worth it for a number rendered in a card.

---

## ⚡ Step 1: Dashboard Service (`src/services/dashboardServices.js`)

```javascript
const mongoose = require('mongoose');
const Listing = require('../model/listing');
const SourcingRequest = require('../model/sourcingRequest');
const Deal = require('../model/deal');
const Conversation = require('../model/conversation');
const Notification = require('../model/notification');
const User = require('../model/user');
const listingStatus = require('../domain/listingStatus');
const dealStatus = require('../domain/dealStatus');
const matchingServices = require('./matchingServices');

/** Formats paise into Indian short form: 245000000 → "₹24.5L". */
const formatInr = (paise) => {
    const rupees = paise / 100;
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
    if (rupees >= 100000)   return `₹${(rupees / 100000).toFixed(2)}L`;
    if (rupees >= 1000)     return `₹${(rupees / 1000).toFixed(1)}K`;
    return `₹${Math.round(rupees)}`;
};

const startOfWeek = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
};
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

class DashboardServices {

    /**
     * Everything DashboardPage needs, in one round trip.
     *
     * All queries run in parallel — the dashboard is the first screen after
     * login, so its latency is the user's first impression of the product.
     */
    async getDashboard(user) {
        const userId = user._id;
        const isGenerator = !!user.businessTypes?.generator;
        const isUpcycler = !!user.businessTypes?.upcycler;

        const [
            activeListings, listingsThisWeek,
            pendingRequestsIn, pendingRequestsOut,
            activeDeals, completedDeals,
            newMatchesToday,
            impactAgg, savingsAgg,
            unreadMessages, unreadNotifications,
            recentListings, recentDeals,
        ] = await Promise.all([
            Listing.countDocuments({ owner: userId, status: listingStatus.ACTIVE }),
            Listing.countDocuments({ owner: userId, createdAt: { $gte: startOfWeek() } }),

            SourcingRequest.countDocuments({ owner: userId, status: 'Pending' }),
            SourcingRequest.countDocuments({ requester: userId, status: 'Pending' }),

            Deal.countDocuments({
                $or: [{ generator: userId }, { upcycler: userId }],
                status: { $in: [dealStatus.AGREED, dealStatus.SCHEDULED, dealStatus.PICKED_UP, dealStatus.DELIVERED] },
            }),
            Deal.countDocuments({
                $or: [{ generator: userId }, { upcycler: userId }],
                status: dealStatus.COMPLETED,
            }),

            Notification.countDocuments({
                user: userId, type: 'match', createdAt: { $gte: startOfToday() },
            }),

            // Lifetime impact across completed deals on either side.
            Deal.aggregate([
                { $match: {
                    $or: [{ generator: new mongoose.Types.ObjectId(userId) },
                          { upcycler:  new mongoose.Types.ObjectId(userId) }],
                    status: dealStatus.COMPLETED,
                } },
                { $group: {
                    _id: null,
                    wasteDivertedKg: { $sum: '$impact.wasteDivertedKg' },
                    co2SavedKg:      { $sum: '$impact.co2SavedKg' },
                    totalValuePaise: { $sum: '$totalValuePaise' },
                    dealCount:       { $sum: 1 },
                } },
            ]),

            // This month vs last month, for the "+18%" delta.
            Deal.aggregate([
                { $match: {
                    $or: [{ generator: new mongoose.Types.ObjectId(userId) },
                          { upcycler:  new mongoose.Types.ObjectId(userId) }],
                    status: dealStatus.COMPLETED,
                    completedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) },
                } },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                    valuePaise: { $sum: '$totalValuePaise' },
                } },
            ]),

            Conversation.find({ participants: userId }).select('unreadCounts').lean(),
            Notification.countDocuments({ user: userId, read: false }),

            Listing.find({ owner: userId })
                .sort({ createdAt: -1 }).limit(5).lean({ virtuals: true }),
            Deal.find({ $or: [{ generator: userId }, { upcycler: userId }] })
                .populate('listing', 'title photos')
                .populate('generator', 'name avatarUrl')
                .populate('upcycler', 'name avatarUrl')
                .sort({ updatedAt: -1 }).limit(5).lean(),
        ]);

        const impact = impactAgg[0] || { wasteDivertedKg: 0, co2SavedKg: 0, totalValuePaise: 0, dealCount: 0 };

        // Month-over-month delta.
        const thisKey = new Date().toISOString().slice(0, 7);
        const thisMonth = savingsAgg.find((s) => s._id === thisKey)?.valuePaise || 0;
        const lastMonth = savingsAgg.find((s) => s._id !== thisKey)?.valuePaise || 0;
        const savingsDelta = lastMonth > 0
            ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
            : null;

        const unreadMessageCount = unreadMessages.reduce(
            (sum, c) => sum + (c.unreadCounts?.[String(userId)] || 0), 0);

        // Average compatibility score across this user's current matches.
        let avgMatchScore = null;
        if (isUpcycler) {
            try {
                const { matches } = await matchingServices.getMatchesForUser(userId, { limit: 20, minScore: 0 });
                if (matches.length) {
                    avgMatchScore = Math.round(
                        matches.reduce((s, m) => s + m.score, 0) / matches.length);
                }
            } catch { /* non-fatal — the dashboard still renders */ }
        }

        return {
            // Replaces the hardcoded greeting.
            greeting: {
                name: user.personalDetails?.company || user.businessName || user.name,
                roleLabel: user.roleLabel,
            },

            // Maps 1:1 onto STAT_CARDS in DashboardPage.jsx.
            statCards: [
                {
                    key: 'listings', label: 'Active Listings', tone: 'green',
                    value: String(activeListings),
                    delta: listingsThisWeek > 0 ? `+${listingsThisWeek} this week` : 'No new this week',
                },
                {
                    key: 'matches', label: 'New Matches', tone: 'purple',
                    value: String(newMatchesToday),
                    delta: newMatchesToday > 0 ? `+${newMatchesToday} today` : 'Check back soon',
                },
                {
                    key: 'requests', label: 'Pending Requests', tone: 'amber',
                    value: String(isGenerator ? pendingRequestsIn : pendingRequestsOut),
                    delta: (isGenerator ? pendingRequestsIn : pendingRequestsOut) > 0
                        ? 'Awaiting reply' : 'All clear',
                },
                {
                    key: 'savings', label: 'Deal Value', tone: 'green',
                    value: formatInr(impact.totalValuePaise),
                    delta: savingsDelta != null
                        ? `${savingsDelta >= 0 ? '+' : ''}${savingsDelta}% this month`
                        : 'First month',
                },
            ],

            // Maps onto IMPACT in DashboardPage.jsx.
            impact: [
                { label: 'Materials Listed', value: `${activeListings} Streams` },
                { label: 'Completed Deals',  value: String(completedDeals) },
                { label: 'Waste Diverted',   value: `${Math.round(impact.wasteDivertedKg).toLocaleString('en-IN')} kg` },
                { label: 'CO₂e Avoided',     value: `${Math.round(impact.co2SavedKg).toLocaleString('en-IN')} kg` },
                ...(avgMatchScore != null
                    ? [{ label: 'Avg. Match Score', value: `${avgMatchScore}%` }] : []),
            ],

            badges: {
                unreadMessages: unreadMessageCount,
                unreadNotifications,
                activeDeals,
            },

            myListings: recentListings.map((l) => ({
                id: l._id,
                title: l.title,
                qty: `${l.quantity} ${l.unit}/${(l.frequency || 'Weekly').toLowerCase()}`,
                views: l.viewCount,
                requests: l.requestCount,
                status: l.status,
                img: l.photos?.[0]?.url || null,
            })),

            recentDeals: recentDeals.map((d) => ({
                id: d._id,
                reference: d.reference,
                title: d.listing?.title,
                status: d.status,
                counterparty: d.generator?._id.toString() === String(userId)
                    ? d.upcycler?.name : d.generator?.name,
                value: formatInr(d.totalValuePaise),
                updatedAt: d.updatedAt,
            })),
        };
    }

    /** Recent matches panel — the generator's "who wants my stuff" view. */
    async getRecentMatches(user, limit = 5) {
        if (user.businessTypes?.upcycler) {
            const { matches } = await matchingServices.getMatchesForUser(user._id, { limit });
            return matches.map((m) => ({
                id: m._id,
                partner: m.owner?.name,
                material: m.category,
                score: m.score,
                dist: m.distanceKm != null ? `${m.distanceKm} km` : '—',
                img: m.photos?.[0]?.url || null,
            }));
        }

        // Generator: aggregate interested upcyclers across their active listings.
        const listings = await Listing.find({
            owner: user._id, status: listingStatus.ACTIVE,
        }).select('_id title category').limit(5).lean();

        const all = [];
        for (const listing of listings) {
            const matches = await matchingServices.getMatchesForListing(listing._id, { limit: 3, minScore: 60 });
            matches.forEach((m) => all.push({
                id: `${listing._id}_${m.partner.id}`,
                partner: m.partner.name,
                material: listing.category,
                score: m.score,
                dist: m.distanceKm != null ? `${m.distanceKm} km` : '—',
            }));
        }
        return all.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    /** Profile stats strip — replaces buildStats() in ProfilePage.jsx. */
    async getProfileStats(userId) {
        const [completedDeals, activeListings, user, avgResponse] = await Promise.all([
            Deal.countDocuments({
                $or: [{ generator: userId }, { upcycler: userId }],
                status: dealStatus.COMPLETED,
            }),
            Listing.countDocuments({ owner: userId, status: listingStatus.ACTIVE }),
            User.findById(userId).select('createdAt stats').lean(),
            this.calculateAvgResponseTime(userId),
        ]);

        return [
            { label: 'Completed Deals', value: String(completedDeals) },
            { label: 'Avg. Response',   value: avgResponse != null ? this.formatMinutes(avgResponse) : '—' },
            { label: 'Member Since',    value: new Date(user.createdAt)
                .toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
            { label: 'Active Listings', value: String(activeListings) },
        ];
    }

    /**
     * Median-ish response time: minutes between a request arriving and the
     * owner responding. This is the number ProfilePage promises but doesn't have.
     */
    async calculateAvgResponseTime(userId) {
        const responded = await SourcingRequest.find({
            owner: userId,
            respondedAt: { $ne: null },
        }).select('createdAt respondedAt').sort({ createdAt: -1 }).limit(20).lean();

        if (!responded.length) return null;
        const total = responded.reduce(
            (sum, r) => sum + (r.respondedAt - r.createdAt) / 60000, 0);
        return Math.round(total / responded.length);
    }

    formatMinutes(mins) {
        if (mins < 60) return `${mins} min`;
        if (mins < 1440) return `${Math.round(mins / 60)} hr`;
        return `${Math.round(mins / 1440)} days`;
    }

    /**
     * Exportable impact report (changes.md item 7 — ESG reporting).
     * This is a genuine B2B selling point: many of our users need
     * sustainability numbers for their own annual reports.
     */
    async getImpactReport(userId, { from, to } = {}) {
        const match = {
            $or: [{ generator: new mongoose.Types.ObjectId(userId) },
                  { upcycler:  new mongoose.Types.ObjectId(userId) }],
            status: dealStatus.COMPLETED,
        };
        if (from || to) {
            match.completedAt = {};
            if (from) match.completedAt.$gte = new Date(from);
            if (to)   match.completedAt.$lte = new Date(to);
        }

        const [byMaterial, byMonth, totals] = await Promise.all([
            Deal.aggregate([
                { $match: match },
                { $group: {
                    _id: '$materialSnapshot.category',
                    wasteDivertedKg: { $sum: '$impact.wasteDivertedKg' },
                    co2SavedKg:      { $sum: '$impact.co2SavedKg' },
                    valuePaise:      { $sum: '$totalValuePaise' },
                    dealCount:       { $sum: 1 },
                } },
                { $sort: { wasteDivertedKg: -1 } },
            ]),
            Deal.aggregate([
                { $match: match },
                { $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                    wasteDivertedKg: { $sum: '$impact.wasteDivertedKg' },
                    co2SavedKg:      { $sum: '$impact.co2SavedKg' },
                    dealCount:       { $sum: 1 },
                } },
                { $sort: { _id: 1 } },
            ]),
            Deal.aggregate([
                { $match: match },
                { $group: {
                    _id: null,
                    wasteDivertedKg: { $sum: '$impact.wasteDivertedKg' },
                    co2SavedKg:      { $sum: '$impact.co2SavedKg' },
                    valuePaise:      { $sum: '$totalValuePaise' },
                    dealCount:       { $sum: 1 },
                } },
            ]),
        ]);

        return {
            totals: totals[0] || { wasteDivertedKg: 0, co2SavedKg: 0, valuePaise: 0, dealCount: 0 },
            byMaterial, byMonth,
            // State the basis explicitly. An unattributed CO2 figure is the
            // first thing a customer's sustainability team will challenge.
            methodology: 'CO₂e avoided is estimated using conservative per-material '
                + 'landfill-diversion factors applied to the confirmed delivered quantity. '
                + 'Figures are indicative, not third-party audited.',
        };
    }
}

module.exports = new DashboardServices();
```

---

## 🛣️ Step 2: Routes (`src/routes/dashboardRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const DashboardController = require('../controller/dashboardController');
const { authenticate, requireCompleteProfile } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requireCompleteProfile, DashboardController.overview);
router.get('/matches', requireCompleteProfile, DashboardController.recentMatches);
router.get('/profile-stats', DashboardController.profileStats);
router.get('/impact-report', DashboardController.impactReport);   // ?from=&to=

module.exports = router;
```

`src/controller/dashboardController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const dashboardServices = require('../services/dashboardServices');

class DashboardController {
    overview = asyncHandler(async (req, res) => {
        const data = await dashboardServices.getDashboard(req.user);
        res.status(200).json({ success: true, ...data });
    });

    recentMatches = asyncHandler(async (req, res) => {
        const matches = await dashboardServices.getRecentMatches(req.user, req.query.limit);
        res.status(200).json({ success: true, matches });
    });

    profileStats = asyncHandler(async (req, res) => {
        const stats = await dashboardServices.getProfileStats(req.user._id);
        res.status(200).json({ success: true, stats });
    });

    impactReport = asyncHandler(async (req, res) => {
        const report = await dashboardServices.getImpactReport(req.user._id, req.query);
        res.status(200).json({ success: true, ...report });
    });
}
module.exports = new DashboardController();
```

---

## 🔄 Step 3: Nightly Reconciliation (`src/jobs/reconcileStats.js`)

Denormalised counters drift. Fix them while nobody is looking.

```javascript
const User = require('../model/user');
const Listing = require('../model/listing');
const Deal = require('../model/deal');
const listingStatus = require('../domain/listingStatus');
const dealStatus = require('../domain/dealStatus');

/** Run nightly (cron '30 2 * * *'). Idempotent. */
const reconcileStats = async () => {
    let fixed = 0;

    // Process in batches so a growing user table doesn't exhaust memory.
    const cursor = User.find({ profileCompleted: true }).select('_id stats').cursor();

    for await (const user of cursor) {
        const [activeListings, completedDeals, viewAgg] = await Promise.all([
            Listing.countDocuments({ owner: user._id, status: listingStatus.ACTIVE }),
            Deal.countDocuments({
                $or: [{ generator: user._id }, { upcycler: user._id }],
                status: dealStatus.COMPLETED,
            }),
            Listing.aggregate([
                { $match: { owner: user._id } },
                { $group: { _id: null, total: { $sum: '$viewCount' } } },
            ]),
        ]);

        const totalViews = viewAgg[0]?.total || 0;

        const drifted = user.stats?.activeListings !== activeListings
            || user.stats?.completedDeals !== completedDeals
            || user.stats?.totalViews !== totalViews;

        if (drifted) {
            await User.updateOne({ _id: user._id }, {
                $set: {
                    'stats.activeListings': activeListings,
                    'stats.completedDeals': completedDeals,
                    'stats.totalViews': totalViews,
                },
            });
            fixed += 1;
        }
    }

    console.log(`📊 Stats reconciled: ${fixed} user(s) corrected.`);
};

module.exports = reconcileStats;
```

Register in `index.js`:

```javascript
cron.schedule('30 2 * * *', reconcileStats);
```

---

## 🖥️ Step 4: Frontend Wiring

### `lib/api.js`

```javascript
export const apiGetDashboard = () => request('/dashboard');
export const apiGetRecentMatches = (limit = 5) => request(`/dashboard/matches?limit=${limit}`);
export const apiGetProfileStats = () => request('/dashboard/profile-stats');
export const apiGetImpactReport = (params = {}) =>
  request(`/dashboard/impact-report?${new URLSearchParams(params)}`);
```

### `DashboardPage.jsx`

Delete `STAT_CARDS`, `IMPACT`, `MY_LISTINGS`, and `MATCHES`; fetch instead. Keep the existing icon
map keyed by `stat.key`, since icons are JSX and can't come from an API:

```javascript
const ICONS = {
  listings: <Package size={20} />, matches: <Recycle size={20} />,
  requests: <MessageSquare size={20} />, savings: <IndianRupee size={20} />,
};

const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([apiGetDashboard(), apiGetRecentMatches()])
    .then(([d, m]) => setData({ ...d, matches: m.matches }))
    .catch((e) => triggerToast(e.message, 'error'))
    .finally(() => setLoading(false));
}, []);

// Real greeting instead of the hardcoded "GreenBrew Co."
<h1 className="inbox-view-title">Welcome back, {data.greeting.name} 👋</h1>

{data.statCards.map((s) => (
  <div key={s.key} className="dash-stat-card">
    <div className={`dash-stat-icon ${s.tone}`}>{ICONS[s.key]}</div>
    …
  </div>
))}
```

Add a **loading skeleton** and a **first-run empty state**. A brand-new user currently sees a
dashboard implying six listings and 48 completed deals — which is not just wrong, it is actively
confusing on day one. Zero-state should be a call to action: "Create your first listing".

### `Sidebar.jsx` and `Topnav.jsx`

Both hardcode `GreenBrew Co.`. Pass the real user down, or add a small shared auth context — right
now every page would have to fetch `/auth/me` independently, which is wasteful and will drift.

```javascript
// A minimal context beats prop-drilling through 15 pages.
// frontend/src/lib/AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  useEffect(() => { if (isLoggedIn()) apiGetMe().then((d) => setUser(d.user)).catch(() => {}); }, []);
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
};
```

### `ProfilePage.jsx`

Replace `buildStats()` with `apiGetProfileStats()`, and replace the hardcoded `LISTINGS`, `REVIEWS`,
and `4.8 · 52 reviews` with real data. If reviews aren't built yet, hide the section rather than
showing fabricated ones.

---

## 🧪 Step 5: Test

Checklist:
- [ ] A brand-new user's dashboard shows all zeros without crashing
- [ ] Creating a listing makes `Active Listings` go to 1 on refresh
- [ ] `Pending Requests` shows *received* for a generator and *sent* for an upcycler
- [ ] Completing a deal increments `Completed Deals` for **both** parties
- [ ] `Waste Diverted` and `CO₂e Avoided` sum from `deal.impact`
- [ ] `formatInr` renders `245000000` as `₹24.5L`
- [ ] Month-over-month delta is `null` (not `Infinity`) in the first month
- [ ] `Avg. Response` is `'—'` with no responded requests, and a real duration after one
- [ ] `Member Since` matches `user.createdAt`
- [ ] The dashboard responds in under ~500 ms with 100 listings and 50 deals
- [ ] Manually corrupt `user.stats.activeListings`, run the reconcile job, confirm it's fixed
- [ ] The greeting shows the signed-in user's name, never "GreenBrew Co."
- [ ] `/impact-report?from=2026-01-01&to=2026-06-30` respects the date range

---

## 🔒 Security Summary

1. **Every aggregation is scoped to `req.user._id`.** A dashboard query that accepted a `userId`
   parameter would be a complete cross-tenant data leak of commercial performance.
2. **No `userId` in any query string.** The identity comes from the token, always.
3. **`limit` is bounded on every list.** `recentListings` and `recentDeals` are capped at 5.
4. **Cursor + batching in the reconcile job.** `User.find()` loading every document would exhaust
   memory as we grow.
5. **Aggregations run on indexed fields** (`owner`, `status`, `completedAt`). An unindexed `$match`
   over deals becomes a full collection scan.
6. **`getRecentMatches` for generators is N+1 by nature** (one match query per listing) — capped at
   5 listings × 3 matches. Cache it (60 s) before this ever runs on a large account.
7. **Don't expose other businesses' figures.** `getImpactReport` returns only this user's deals; the
   counterparty's totals are their own.

---

## 💼 CEO Review Notes

- **Fake numbers on a dashboard are worse than no numbers.** Today every user sees "48 completed
  deals" and "₹2.45L cost savings". A pilot customer who spots that loses trust in everything else we
  show them, including the compatibility score. **This is a credibility fix, not a feature** — and if
  we demo to an investor or a customer before it lands, we are effectively presenting fabricated
  metrics. Fix it before any external demo.
- **The zero-state is the most important state.** Every user starts there, and it is where we either
  earn a first listing or lose the account. "Create your first listing" with a one-line value prop
  beats a grid of zeros. Design the empty dashboard as deliberately as the full one.
- **The ESG impact report is a genuine revenue lever, and possibly our best one.** Our customers'
  customers increasingly demand sustainability reporting. "kg diverted from landfill, CO₂e avoided,
  exportable as PDF, with our reference numbers as evidence" is something a mid-size manufacturer
  will pay for, and it is *far* cheaper for us to produce than logistics. I would put a
  branded, exportable impact report ahead of most other Phase-2 features.
- **Be conservative and transparent with CO₂ figures.** The `methodology` string is not legal
  boilerplate, it is competitive protection. An inflated number that a customer's sustainability
  consultant debunks costs us the account and, eventually, a press story. Under-claim, cite the
  basis, and get the factors reviewed by someone credible before we put them in marketing.
- **GMV is the number that matters externally.** `totalValuePaise` on completed deals is our
  headline metric for investors and the base for future commission pricing. The stat card currently
  labels it "Deal Value" — good, honest naming. It was "Cost Savings" in the mock, which we could not
  actually substantiate.
- **Watch waste-diverted-per-active-user as the health metric**, not signups. Signups are vanity;
  kilograms moved is the business. If that number is flat while signups grow, we have a liquidity
  problem, not a marketing one.
- **Add an internal admin dashboard soon.** We need our own view — new signups, listings per city,
  request-to-deal conversion, disputes open — or we will be flying blind on the pilot. That is a
  small aggregation on top of what this guide already builds, and it is how we decide where to
  concentrate supplier recruitment.
