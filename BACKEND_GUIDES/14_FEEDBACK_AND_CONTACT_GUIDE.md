# Feedback, Contact & Reviews Guide

Three small endpoints that the built frontend needs, plus reviews — which `ProfilePage.jsx` displays
from hardcoded data and which are the backbone of marketplace trust.

| Page | Today | Needs |
|------|-------|-------|
| `FeedbackPage.jsx` | Resets the form, fires a toast | `POST /api/feedback` |
| `ContactUs.jsx` | Same | `POST /api/feedback/contact` |
| `ProfilePage.jsx` | Hardcoded `REVIEWS` + `4.8 · 52 reviews` | `POST /api/reviews`, `GET /api/reviews/user/:id` |

Prerequisites: guides `01`, `02`, `10` (reviews require completed deals).

---

## 📌 What the Frontend Sends

`FeedbackPage.jsx`:

```javascript
{ type: 'suggestion' | 'issue' | 'praise',
  rating: 0-5,
  area: 'General'|'Marketplace'|'Listings'|'Messaging'|'Matching'|'Account & Billing',
  message: string,       // required
  email: string }        // optional
```

Note it works **signed out** (there is an optional email field), so the endpoint must accept
anonymous submissions but capture the user when one is signed in.

---

## 🗄️ Step 1: Models

### `src/model/feedback.js`

```javascript
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // null for anonymous submissions from the public page.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null, index: true },

    kind: {
        type: String,
        enum: ['feedback', 'contact'],
        default: 'feedback',
        index: true,
    },
    type: {
        type: String,
        enum: ['suggestion', 'issue', 'praise', 'question', 'other'],
        default: 'suggestion',
    },
    area: {
        type: String,
        enum: ['General', 'Marketplace', 'Listings', 'Messaging', 'Matching', 'Account & Billing', 'Other'],
        default: 'General',
        index: true,
    },
    rating:  { type: Number, min: 0, max: 5, default: 0 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },

    // Contact form fields; also used to reply to anonymous feedback.
    name:    { type: String, trim: true, maxlength: 120, default: '' },
    email:   { type: String, trim: true, lowercase: true, default: '' },
    subject: { type: String, trim: true, maxlength: 200, default: '' },

    /* ---- Context captured automatically. Vastly reduces the back-and-forth
            on a bug report — "which browser?" is already answered. ---- */
    meta: {
        page:      { type: String, default: '' },
        userAgent: { type: String, default: '' },
        ip:        { type: String, default: '' },
    },

    /* ---- Triage ---- */
    status: {
        type: String,
        enum: ['new', 'triaged', 'in_progress', 'resolved', 'wont_fix'],
        default: 'new',
        index: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    internalNote: { type: String, default: '' },
    assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    resolvedAt:   { type: Date, default: null },

}, { timestamps: true });

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ kind: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
```

### `src/model/review.js`

```javascript
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // A review MUST be tied to a completed deal. This is what separates a
    // credible B2B reputation system from a comment box.
    deal:     { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },

    rating:  { type: Number, required: true, min: 1, max: 5 },
    text:    { type: String, trim: true, maxlength: 1500, default: '' },

    // Sub-ratings make the aggregate actionable — "4.2 overall but 3.1 on
    // material accuracy" tells a seller exactly what to fix.
    subRatings: {
        materialAccuracy: { type: Number, min: 1, max: 5, default: null },
        communication:    { type: Number, min: 1, max: 5, default: null },
        punctuality:      { type: Number, min: 1, max: 5, default: null },
    },

    // Which side the reviewer was on, so we can show "as a buyer" / "as a seller".
    reviewerRole: { type: String, enum: ['generator', 'upcycler'], required: true },

    isHidden:   { type: Boolean, default: false },   // moderated out
    hideReason: { type: String, default: '' },

    // One reply per review, from the reviewee. Right of response is essential —
    // an unanswerable bad review on a B2B profile is commercially serious.
    reply: {
        text:  { type: String, trim: true, maxlength: 1000, default: '' },
        at:    { type: Date, default: null },
    },

}, { timestamps: true });

// One review per reviewer per deal.
reviewSchema.index({ deal: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, isHidden: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
```

---

## ⚡ Step 2: Feedback Service (`src/services/feedbackServices.js`)

```javascript
const Feedback = require('../model/feedback');
const AppError = require('../util/AppError');
const { sendInternalAlert, sendFeedbackAck } = require('../util/emailService');

class FeedbackServices {

    /** POST /api/feedback — works signed in or anonymously. */
    async submitFeedback(data, { user = null, ip = '', userAgent = '' } = {}) {
        if (!data.message?.trim()) {
            throw AppError.badRequest('Please write a little about your feedback first.');
        }
        if (data.message.length > 3000) {
            throw AppError.badRequest('Feedback is too long (max 3000 characters).');
        }

        // Anonymous submissions need some way to reply.
        const email = (data.email || user?.email || '').toLowerCase().trim();
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            throw AppError.badRequest('Please enter a valid email address.');
        }

        const feedback = await Feedback.create({
            user: user?._id || null,
            kind: 'feedback',
            type: ['suggestion', 'issue', 'praise'].includes(data.type) ? data.type : 'other',
            area: data.area || 'General',
            rating: Math.min(Math.max(Number(data.rating) || 0, 0), 5),
            message: data.message.trim(),
            name: data.name?.trim() || user?.name || '',
            email,
            // A reported issue is a possible outage — escalate it automatically.
            priority: data.type === 'issue' ? 'high' : 'medium',
            meta: { page: data.page || '', userAgent: userAgent.slice(0, 300), ip },
        });

        // Best-effort side effects — never fail the submission because email is down.
        if (feedback.type === 'issue') {
            sendInternalAlert('New issue reported', feedback)
                .catch((e) => console.error('Internal alert failed:', e.message));
        }
        if (email) {
            sendFeedbackAck(email, feedback.name)
                .catch((e) => console.error('Feedback ack failed:', e.message));
        }

        return {
            message: 'Thanks for your feedback! Our team will review it shortly.',
            id: feedback._id,
        };
    }

    /** POST /api/feedback/contact — the public Contact Us form. */
    async submitContact(data, meta = {}) {
        if (!data.name?.trim())    throw AppError.badRequest('Please enter your name.');
        if (!data.email?.trim())   throw AppError.badRequest('Please enter your email address.');
        if (!data.message?.trim()) throw AppError.badRequest('Please enter a message.');

        const feedback = await Feedback.create({
            user: meta.user?._id || null,
            kind: 'contact',
            type: 'question',
            area: 'General',
            name: data.name.trim(),
            email: data.email.toLowerCase().trim(),
            subject: data.subject?.trim() || 'Website enquiry',
            message: data.message.trim(),
            priority: 'high',       // an inbound enquiry may be a sales lead
            meta: { page: 'contact', userAgent: (meta.userAgent || '').slice(0, 300), ip: meta.ip || '' },
        });

        sendInternalAlert('New contact enquiry', feedback)
            .catch((e) => console.error('Internal alert failed:', e.message));
        sendFeedbackAck(feedback.email, feedback.name)
            .catch((e) => console.error('Contact ack failed:', e.message));

        return {
            message: "Thanks for reaching out! We'll get back to you within one business day.",
            id: feedback._id,
        };
    }

    /** Admin triage list. */
    async listFeedback({ kind, type, status, area, page = 1, limit = 30 } = {}) {
        const query = {};
        if (kind) query.kind = kind;
        if (type) query.type = type;
        if (status) query.status = status;
        if (area) query.area = area;

        const [items, total] = await Promise.all([
            Feedback.find(query)
                .populate('user', 'name email businessDetails.city')
                .sort({ priority: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Math.min(Number(limit), 100))
                .lean(),
            Feedback.countDocuments(query),
        ]);
        return { feedback: items, pagination: { page: Number(page), total } };
    }

    async updateStatus(id, { status, priority, internalNote, assignedTo }) {
        const update = {};
        if (status) {
            update.status = status;
            if (status === 'resolved') update.resolvedAt = new Date();
        }
        if (priority) update.priority = priority;
        if (internalNote !== undefined) update.internalNote = internalNote;
        if (assignedTo !== undefined) update.assignedTo = assignedTo;

        const feedback = await Feedback.findByIdAndUpdate(id, update, { new: true });
        if (!feedback) throw AppError.notFound('Feedback not found.');
        return feedback;
    }
}

module.exports = new FeedbackServices();
```

---

## ⚡ Step 3: Review Service (`src/services/reviewServices.js`)

```javascript
const Review = require('../model/review');
const Deal = require('../model/deal');
const User = require('../model/user');
const AppError = require('../util/AppError');
const dealStatus = require('../domain/dealStatus');
const notificationServices = require('./notificationServices');

class ReviewServices {

    /** Only a participant in a COMPLETED deal may review, and only once. */
    async createReview(userId, { dealId, rating, text, subRatings }) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');

        const isGenerator = deal.generator.toString() === String(userId);
        const isUpcycler = deal.upcycler.toString() === String(userId);
        if (!isGenerator && !isUpcycler) throw AppError.notFound('Deal not found.');

        if (deal.status !== dealStatus.COMPLETED) {
            throw AppError.badRequest(
                'You can review a counterparty only after the deal is completed.',
                'DEAL_NOT_COMPLETED'
            );
        }

        const numericRating = Number(rating);
        if (!numericRating || numericRating < 1 || numericRating > 5) {
            throw AppError.badRequest('Please give a rating between 1 and 5.');
        }

        const reviewee = isGenerator ? deal.upcycler : deal.generator;

        try {
            const review = await Review.create({
                deal: deal._id,
                reviewer: userId,
                reviewee,
                rating: numericRating,
                text: text?.trim() || '',
                subRatings: subRatings || {},
                reviewerRole: isGenerator ? 'generator' : 'upcycler',
            });

            await this.recalculateRating(reviewee);

            await notificationServices.create({
                user: reviewee,
                type: 'system',
                title: 'You received a review',
                body: `A counterparty left you a ${numericRating}-star review for deal ${deal.reference}.`,
                link: { page: 'profile' },
                sendEmail: true,
            });

            return review;
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict('You have already reviewed this deal.', 'ALREADY_REVIEWED');
            }
            throw err;
        }
    }

    /**
     * Recompute the cached average on the user document.
     * Called after every create/hide so `stats.ratingAvg` stays honest.
     */
    async recalculateRating(userId) {
        const agg = await Review.aggregate([
            { $match: { reviewee: userId, isHidden: false } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]);

        const { avg = 0, count = 0 } = agg[0] || {};
        await User.findByIdAndUpdate(userId, {
            'stats.ratingAvg': Math.round(avg * 10) / 10,
            'stats.ratingCount': count,
        });
        return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: count };
    }

    /** Public review list for a company profile. */
    async getReviewsForUser(userId, { page = 1, limit = 10 } = {}) {
        const [reviews, total, agg] = await Promise.all([
            Review.find({ reviewee: userId, isHidden: false })
                .populate('reviewer', 'name businessName avatarUrl')
                .populate('deal', 'reference materialSnapshot.category')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Math.min(Number(limit), 50))
                .lean(),
            Review.countDocuments({ reviewee: userId, isHidden: false }),
            Review.aggregate([
                { $match: { reviewee: userId, isHidden: false } },
                { $group: { _id: '$rating', count: { $sum: 1 } } },
            ]),
        ]);

        // 5→1 star distribution, for a bar chart on the profile.
        const distribution = [5, 4, 3, 2, 1].reduce((acc, star) => {
            acc[star] = agg.find((a) => a._id === star)?.count || 0;
            return acc;
        }, {});

        return {
            reviews: reviews.map((r) => ({
                id: r._id,
                name: r.reviewer?.name || r.reviewer?.businessName || 'A business',
                initials: (r.reviewer?.name || 'EM').split(' ')
                    .map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
                avatarUrl: r.reviewer?.avatarUrl || null,
                rating: r.rating,
                text: r.text,
                material: r.deal?.materialSnapshot?.category || null,
                reviewerRole: r.reviewerRole,
                reply: r.reply?.text ? r.reply : null,
                createdAt: r.createdAt,
            })),
            total, distribution,
            pagination: { page: Number(page), totalPages: Math.ceil(total / limit) },
        };
    }

    /** Deals this user can still review — powers a "Leave a review" prompt. */
    async getPendingReviews(userId) {
        const completed = await Deal.find({
            $or: [{ generator: userId }, { upcycler: userId }],
            status: dealStatus.COMPLETED,
        }).select('reference materialSnapshot.title completedAt').lean();

        const reviewed = await Review.find({ reviewer: userId }).select('deal').lean();
        const reviewedIds = new Set(reviewed.map((r) => r.deal.toString()));

        return completed.filter((d) => !reviewedIds.has(d._id.toString()));
    }

    /** The reviewee's single right of reply. */
    async replyToReview(reviewId, userId, text) {
        if (!text?.trim()) throw AppError.badRequest('Reply cannot be empty.');

        const review = await Review.findOne({ _id: reviewId, reviewee: userId });
        if (!review) throw AppError.notFound('Review not found.');
        if (review.reply?.text) throw AppError.badRequest('You have already replied to this review.');

        review.reply = { text: text.trim(), at: new Date() };
        await review.save();
        return review;
    }
}

module.exports = new ReviewServices();
```

---

## 🛣️ Step 4: Routes

`src/routes/feedbackRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const FeedbackController = require('../controller/feedbackController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const Roles = require('../domain/Roles');

// Public forms are spam magnets — tighter than the general API limit.
const formLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many submissions. Please try again later.' },
});

/* ---- Public (works signed out; captures the user when signed in) ---- */
router.post('/', formLimiter, optionalAuth, FeedbackController.submit);
router.post('/contact', formLimiter, optionalAuth, FeedbackController.contact);

/* ---- Admin ---- */
router.get('/', authenticate, authorize(Roles.ADMIN, Roles.MODERATOR), FeedbackController.list);
router.patch('/:id', authenticate, authorize(Roles.ADMIN, Roles.MODERATOR), FeedbackController.update);

module.exports = router;
```

`src/routes/reviewRoutes.js` (mount at `/api/reviews` in `app.js`):

```javascript
const express = require('express');
const router = express.Router();
const ReviewController = require('../controller/reviewController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public: anyone evaluating a business can read its reviews.
router.get('/user/:id', optionalAuth, ReviewController.forUser);

router.use(authenticate);
router.post('/', ReviewController.create);
router.get('/pending', ReviewController.pending);
router.post('/:id/reply', ReviewController.reply);

module.exports = router;
```

---

## 📧 Step 5: Internal Alert Emails (`src/util/emailService.js`)

```javascript
/** Routes inbound feedback to the team inbox. */
const sendInternalAlert = async (subject, feedback) => {
    const to = process.env.INTERNAL_ALERT_EMAIL || process.env.SMTP_USER;

    const html = emailShell(subject, `
        <table style="font-size:14px; line-height:1.7;">
            <tr><td><strong>Kind</strong></td><td>${feedback.kind} / ${feedback.type}</td></tr>
            <tr><td><strong>Area</strong></td><td>${feedback.area}</td></tr>
            <tr><td><strong>Rating</strong></td><td>${feedback.rating || '—'}</td></tr>
            <tr><td><strong>From</strong></td><td>${feedback.name || 'Anonymous'} &lt;${feedback.email || 'no email'}&gt;</td></tr>
            <tr><td><strong>Page</strong></td><td>${feedback.meta?.page || '—'}</td></tr>
        </table>
        <p style="background:#f8fafc; padding:14px; border-radius:8px; white-space:pre-wrap;">${feedback.message}</p>
        <p style="font-size:12px; color:#64748b;">Ref: ${feedback._id}</p>
    `);

    return transporter.sendMail({
        from: env.emailFrom, to, subject: `[EcoMatch] ${subject}`, html,
    });
};

/** Acknowledgement to the submitter. Sets a response expectation. */
const sendFeedbackAck = async (toEmail, name) => {
    const html = emailShell('We received your message', `
        <p>Hello <strong>${name || 'there'}</strong>,</p>
        <p>Thanks for getting in touch. A real person will read this and reply within
           <strong>one business day</strong>.</p>
        <p style="font-size:13px; color:#475569;">— The EcoMatch team</p>
    `);
    return transporter.sendMail({
        from: env.emailFrom, to: toEmail, subject: 'EcoMatch — We received your message', html,
    });
};
```

Add `INTERNAL_ALERT_EMAIL=team@ecomatch.in` to `.env`.

---

## 🖥️ Step 6: Frontend Wiring

### `lib/api.js`

```javascript
export const apiSubmitFeedback = (payload) =>
  request('/feedback', { method: 'POST', body: payload, auth: false });
export const apiSubmitContact = (payload) =>
  request('/feedback/contact', { method: 'POST', body: payload, auth: false });
export const apiGetReviews = (userId, params = {}) =>
  request(`/reviews/user/${userId}?${new URLSearchParams(params)}`, { auth: false });
export const apiCreateReview = (payload) =>
  request('/reviews', { method: 'POST', body: payload });
export const apiGetPendingReviews = () => request('/reviews/pending');
```

> `auth: false` still works when signed in: the `request()` wrapper simply omits the header, and
> `optionalAuth` on the server treats it as anonymous. If you want submissions attributed to the
> signed-in user, drop `auth: false` so the token is sent.

### `FeedbackPage.jsx`

```javascript
const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
        triggerToast('Please write a little about your feedback first.', 'error');
        return;
    }
    setSubmitting(true);
    try {
        const data = await apiSubmitFeedback({
            type, rating, area, message, email,
            page: window.location.pathname,
        });
        // Only clear the form on success — wiping it on a network error loses
        // the user's writing, which guarantees they never resubmit.
        setType('suggestion'); setRating(0); setArea('General');
        setMessage(''); setEmail('');
        triggerToast(data.message);
    } catch (err) {
        triggerToast(err.message || 'Could not submit your feedback.', 'error');
    } finally {
        setSubmitting(false);
    }
};
```

The current implementation clears the form **before** the (fake) submission. Fix that ordering.

### `ProfilePage.jsx`

Replace the hardcoded `REVIEWS` array and the `4.8 · 52 reviews` string:

```javascript
const [reviews, setReviews] = useState([]);
const [ratingSummary, setRatingSummary] = useState(null);

useEffect(() => {
  if (!user?._id) return;
  apiGetReviews(user._id)
    .then((d) => { setReviews(d.reviews); setRatingSummary({ total: d.total, distribution: d.distribution }); })
    .catch(() => {});
}, [user?._id]);

// Real rating, and hide it entirely when there are none.
{user?.stats?.ratingCount > 0 ? (
  <span className="profile-hero-rating">
    <Star size={13} fill="currentColor" /> {user.stats.ratingAvg} · {user.stats.ratingCount} reviews
  </span>
) : (
  <span className="profile-hero-rating">New to EcoMatch</span>
)}
```

Also fix the hardcoded **Verified** badge in the same header — it currently shows for everyone:

```javascript
{user?.isBusinessVerified && <span className="profile-verified"><BadgeCheck size={15} /> Verified</span>}
```

### New: `ReviewPromptModal`

After a deal completes, `apiGetPendingReviews()` returns deals awaiting a review. Prompt on the next
dashboard visit — at completion is the only time response rates are decent.

---

## 🧪 Step 7: Test

Checklist:
- [ ] Anonymous feedback submits successfully with no token
- [ ] Empty message → `400`
- [ ] Signed-in submission records `user` on the document
- [ ] `type: 'issue'` sets `priority: 'high'` and sends the internal alert
- [ ] Ack email arrives when an email address was given
- [ ] 6 submissions in an hour → `429`
- [ ] Non-admin hitting `GET /api/feedback` → `403`
- [ ] Reviewing a non-completed deal → `400 DEAL_NOT_COMPLETED`
- [ ] Reviewing the same deal twice → `409 ALREADY_REVIEWED`
- [ ] Reviewing a deal you weren't part of → `404`
- [ ] Rating of 0 or 6 → `400`
- [ ] `user.stats.ratingAvg` updates after a review
- [ ] Hiding a review recalculates the average
- [ ] Replying twice to the same review → `400`
- [ ] A new user's profile shows "New to EcoMatch", not a fabricated 4.8
- [ ] A user with `isBusinessVerified: false` shows **no** Verified badge

---

## 🔒 Security Summary

1. **Public forms are rate-limited to 5/hour per IP.** An unthrottled public form becomes a spam
   relay and burns our SMTP reputation. Consider a honeypot field or CAPTCHA if abuse appears.
2. **Reviews require a completed deal.** This is the single most important rule here — it makes
   fake-review farming structurally impossible, not merely detectable.
3. **Unique index on `(deal, reviewer)`** enforces one review per deal at the database level, not in
   application logic that can race.
4. **`maxlength` on every free-text field.** These are the widest unauthenticated input surface we
   have.
5. **Never render feedback or review text as HTML.** React escapes by default — keep it that way.
   Also escape when interpolating into the internal alert email, or a submitter can inject markup
   into our team's inbox.
6. **`ip` and `userAgent` are captured for abuse investigation** — declare this in the privacy policy
   (`PrivacyPolicy.jsx` already exists; make sure it says so).
7. **Feedback listing is admin/moderator only.** It contains other users' email addresses and
   complaints.
8. **Right of reply is limited to the reviewee**, and to one reply, so a review thread cannot become
   a public argument.
9. **Moderation is `isHidden`, not delete.** In a dispute over a removed review we need the record.

---

## 💼 CEO Review Notes

- **The reviews system is worth more than the feedback form, and I would sequence it first.** Trust
  is the actual product in a waste marketplace — nobody wires money to a stranger for 500 kg of
  fabric scraps without a reason to believe them. Verified reviews from completed deals are that
  reason, and they are a moat: a competitor can copy our UI in a week and cannot copy two years of
  transaction history.
- **The hardcoded "4.8 · 52 reviews" and the always-on "Verified" badge must go before any external
  demo.** Showing fabricated trust signals is materially worse than showing none. If a pilot customer
  discovers we display invented ratings, every other number we show becomes suspect — including the
  compatibility score, which is our differentiator. This is a five-minute fix with an outsized
  downside if we get it wrong.
- **Sub-ratings are the ones that will actually improve the marketplace.** "Material accuracy" is the
  single biggest failure mode in waste trading — the buyer arrives and the material is wetter,
  dirtier, or less of it than listed. Measuring it publicly will fix seller behaviour faster than any
  policy we could write.
- **Right of reply is not optional.** A bad review on a small business's profile with no way to
  respond is commercially serious and will generate angry calls. One reply, publicly visible, defuses
  almost all of it and reads as fairness.
- **Read every single piece of feedback for the first year.** Personally. At our stage, 20 pieces of
  qualitative feedback beat any dashboard. The `area` field tells us where the product hurts; the
  `issue` count trend tells us whether we are shipping faster than we are breaking.
- **A one-business-day response SLA on the contact form is a real commitment.** Our inbound contacts
  will be a mix of confused users and genuine sales leads, and we cannot tell them apart without
  replying. That is why `priority: 'high'` is set on contact submissions.
- **Do not build a public Q&A or comment section on listings.** It looks like engagement and is
  actually a moderation liability plus a channel for competitors to snipe each other's listings.
  Private chat (guide `09`) plus deal-backed reviews cover every legitimate need.
