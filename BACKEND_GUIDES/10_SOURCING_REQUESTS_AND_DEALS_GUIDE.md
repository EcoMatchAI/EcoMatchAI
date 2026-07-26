# Sourcing Requests & Deals Guide

This guide closes the transactional loop: **Request to Source → Accept/Decline → Deal → Pickup →
Completed**. `changes.md` §5 names this the #1 must-do, and it is the moment the platform creates
value rather than just displaying it.

Today "Request to Source" is a toast:

```javascript
// MarketplacePage.jsx
onClick={() => triggerToast(`Sourcing request sent for "${item.title}"!`)}
```

Prerequisites: guides `01`, `02`, `06`, `07`, `09` (deals create chat threads), `11` (notifications).

---

## 📌 The Two Objects

| | **SourcingRequest** | **Deal** |
|---|---|---|
| Created by | Upcycler (buyer) | System, on acceptance |
| Meaning | "I want this material" | "We agreed; now execute" |
| States | Pending → Accepted / Declined / Withdrawn / Expired | Agreed → Scheduled → PickedUp → Delivered → Completed / Cancelled / Disputed |
| Many per listing? | Yes | One active per listing |

Keeping them separate matters: a listing can attract ten requests, and only the accepted one becomes
a deal. Collapsing them into one document makes the "declined" history unreadable and breaks our
best demand signal.

---

## 🔄 Full Lifecycle

```
UPCYCLER                          SYSTEM                        GENERATOR
   │                                                                │
   │─ POST /requests ──────────────►                                │
   │  { listingId, qty, message }   ├─ notify + email ─────────────►│
   │                                                                │
   │                                                  ┌─────────────┤
   │                                    Accept ◄──────┤ or Decline  │
   │                                       │          └─────────────┤
   │◄── notify ────────────────────────────┤                        │
   │                                       ├─ create Deal           │
   │                                       ├─ listing → Reserved    │
   │                                       ├─ auto-decline others   │
   │                                       ├─ open chat thread      │
   │                                       └─ reveal addresses      │
   │                                                                │
   │◄────────── negotiate pickup slot in chat ─────────────────────►│
   │                                                                │
   │─ PATCH /deals/:id/schedule ───►  Scheduled  ◄──────────────────│
   │                                                                │
   │                            Generator marks PickedUp ◄──────────│
   │─ confirms Delivered ──────────►                                │
   │                                  Completed                     │
   │                       ├─ stats.completedDeals += 1 (both)      │
   │                       ├─ listing → Completed or back to Active │
   │                       └─ prompt both for a review              │
```

---

## 🗄️ Step 1: Models

### `src/model/sourcingRequest.js`

```javascript
const mongoose = require('mongoose');

const sourcingRequestSchema = new mongoose.Schema({
    listing:   { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    // Denormalised so "requests I received" is one indexed query, not a join.
    owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },

    /* ---- What the buyer is asking for ---- */
    requestedQuantity: { type: Number, required: true, min: 0.01 },
    unit: { type: String, enum: ['kg', 'tons', 'litres', 'units'], default: 'kg' },
    message: { type: String, trim: true, maxlength: 1000, default: '' },

    // Counter-offer, in integer paise. null = accept the listed price.
    offeredPricePaise: { type: Number, default: null, min: 0 },

    preferredLogistics: {
        type: String,
        enum: ['Local Pickup', 'Freight (supplier-arranged)', 'Courier', 'Buyer-arranged', ''],
        default: '',
    },
    preferredPickupDate: { type: Date, default: null },

    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Declined', 'Withdrawn', 'Expired'],
        default: 'Pending',
        index: true,
    },
    // Seller's reason on decline — shown to the buyer so they learn something.
    responseMessage: { type: String, trim: true, maxlength: 500, default: '' },
    respondedAt: { type: Date, default: null },

    // Auto-expire so a buyer isn't left waiting forever on a silent seller.
    expiresAt: { type: Date, index: true },

    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },

    // Compatibility score at request time — a training label for guide 12.
    matchScoreAtRequest: { type: Number, default: null },

}, { timestamps: true });

// One open request per buyer per listing. Partial index so a declined request
// doesn't block a later re-request.
sourcingRequestSchema.index(
    { listing: 1, requester: 1 },
    { unique: true, partialFilterExpression: { status: 'Pending' } }
);
sourcingRequestSchema.index({ owner: 1, status: 1, createdAt: -1 });

sourcingRequestSchema.pre('save', function (next) {
    if (this.isNew && !this.expiresAt) {
        this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);   // 7 days
    }
    next();
});

module.exports = mongoose.model('SourcingRequest', sourcingRequestSchema);
```

### `src/model/deal.js`

```javascript
const mongoose = require('mongoose');
const dealStatus = require('../domain/dealStatus');

const timelineEntrySchema = new mongoose.Schema({
    status:  { type: String, required: true },
    note:    { type: String, default: '' },
    actor:   { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    at:      { type: Date, default: Date.now },
}, { _id: false });

const dealSchema = new mongoose.Schema({
    // Human-readable reference for emails, invoices, and support calls.
    // "ECO-2026-00042" is quotable on the phone; an ObjectId is not.
    reference: { type: String, unique: true, index: true },

    listing:   { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    request:   { type: mongoose.Schema.Types.ObjectId, ref: 'SourcingRequest', required: true },
    generator: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    upcycler:  { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },

    /* ---- Agreed terms. Snapshotted, NOT referenced — the listing may change
            later, but what was agreed must never change retroactively. ---- */
    agreedQuantity:   { type: Number, required: true },
    unit:             { type: String, default: 'kg' },
    agreedPricePaise: { type: Number, default: 0 },
    priceUnit:        { type: String, default: 'per kg' },
    totalValuePaise:  { type: Number, default: 0 },
    materialSnapshot: {
        title: String,
        category: String,
        purity: String,
        moisture: String,
        packaging: String,
    },

    /* ---- Logistics (changes.md §3) ---- */
    logistics: {
        term: {
            type: String,
            enum: ['Local Pickup', 'Freight (supplier-arranged)', 'Courier', 'Buyer-arranged'],
            required: true,
        },
        arrangedBy: { type: String, enum: ['generator', 'upcycler', 'platform'], default: 'upcycler' },
        paidBy:     { type: String, enum: ['generator', 'upcycler', 'split'], default: 'upcycler' },
        estimatedCostPaise: { type: Number, default: 0 },

        // Revealed only once the deal exists — see the security summary.
        pickupAddress: { type: String, default: '' },
        pickupContactName:  { type: String, default: '' },
        pickupContactPhone: { type: String, default: '' },
        deliveryAddress:    { type: String, default: '' },

        scheduledAt:   { type: Date, default: null },
        scheduledSlot: { type: String, default: '' },     // "10:00–12:00"
        dockNotes:     { type: String, default: '' },     // gate, loading bay, vehicle limits
    },

    status: {
        type: String,
        enum: Object.values(dealStatus),
        default: dealStatus.AGREED,
        index: true,
    },
    // Append-only audit trail. This is what we show in a dispute.
    timeline: [timelineEntrySchema],

    /* ---- Proof of pickup / delivery ---- */
    pickupProof:   { url: String, publicId: String, uploadedAt: Date, uploadedBy: mongoose.Schema.Types.ObjectId },
    deliveryProof: { url: String, publicId: String, uploadedAt: Date, uploadedBy: mongoose.Schema.Types.ObjectId },

    /* ---- Both sides must confirm completion ---- */
    generatorConfirmedAt: { type: Date, default: null },
    upcyclerConfirmedAt:  { type: Date, default: null },
    completedAt:          { type: Date, default: null },

    cancelledBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    cancelReason:    { type: String, default: '' },
    disputeReason:   { type: String, default: '' },
    disputeRaisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },

    /* ---- Impact, computed on completion (guide 13) ---- */
    impact: {
        wasteDivertedKg: { type: Number, default: 0 },
        co2SavedKg:      { type: Number, default: 0 },
        costSavedPaise:  { type: Number, default: 0 },
    },

}, { timestamps: true });

dealSchema.index({ generator: 1, status: 1, createdAt: -1 });
dealSchema.index({ upcycler: 1, status: 1, createdAt: -1 });

/** Generates ECO-YYYY-NNNNN. */
dealSchema.pre('save', async function (next) {
    if (this.isNew && !this.reference) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Deal').countDocuments({
            createdAt: { $gte: new Date(`${year}-01-01`) },
        });
        this.reference = `ECO-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    if (this.isNew && !this.timeline.length) {
        this.timeline = [{ status: this.status, note: 'Deal created from accepted request.' }];
    }
    next();
});

module.exports = mongoose.model('Deal', dealSchema);
```

### `src/domain/dealStatus.js`

```javascript
const dealStatus = Object.freeze({
    AGREED:    'Agreed',
    SCHEDULED: 'Scheduled',
    PICKED_UP: 'PickedUp',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED:  'Disputed',
});
module.exports = dealStatus;
```

---

## ⚡ Step 2: Request Service (`src/services/requestServices.js`)

```javascript
const mongoose = require('mongoose');
const SourcingRequest = require('../model/sourcingRequest');
const Listing = require('../model/listing');
const Deal = require('../model/deal');
const User = require('../model/user');
const AppError = require('../util/AppError');
const listingStatus = require('../domain/listingStatus');
const dealStatus = require('../domain/dealStatus');
const chatServices = require('./chatServices');
const notificationServices = require('./notificationServices');

class RequestServices {

    /** Upcycler sends a request. */
    async createRequest(user, { listingId, requestedQuantity, unit, message, offeredPrice, preferredLogistics, preferredPickupDate }) {
        const listing = await Listing.findById(listingId).populate('owner', 'name email notificationPrefs');
        if (!listing) throw AppError.notFound('Listing not found.');

        if (listing.owner._id.toString() === user._id.toString()) {
            throw AppError.badRequest('You cannot request your own listing.');
        }
        if (listing.status !== listingStatus.ACTIVE) {
            throw AppError.badRequest(
                `This listing is ${listing.status.toLowerCase()} and not accepting requests.`,
                'LISTING_NOT_ACTIVE'
            );
        }

        const qty = Number(requestedQuantity);
        if (!qty || qty <= 0) throw AppError.badRequest('Please specify how much you need.');
        if (qty > listing.quantity) {
            throw AppError.badRequest(
                `Only ${listing.quantity} ${listing.unit} is available.`,
                'QUANTITY_EXCEEDS_AVAILABLE'
            );
        }

        try {
            const request = await SourcingRequest.create({
                listing: listing._id,
                requester: user._id,
                owner: listing.owner._id,
                requestedQuantity: qty,
                unit: unit || listing.unit,
                message: message?.trim() || '',
                offeredPricePaise: offeredPrice != null
                    ? Math.round(Number(offeredPrice) * 100) : null,
                preferredLogistics: preferredLogistics || listing.logistics,
                preferredPickupDate: preferredPickupDate ? new Date(preferredPickupDate) : null,
            });

            await Listing.updateOne({ _id: listing._id }, { $inc: { requestCount: 1 } });

            // Open a chat thread immediately — the negotiation happens there.
            const convo = await chatServices.getOrCreateConversation(
                user._id, listing.owner._id, listing._id
            );
            await chatServices.sendMessage({
                conversationId: convo._id,
                senderId: user._id,
                type: 'system',
                text: `${user.name} requested ${qty} ${unit || listing.unit} of "${listing.title}".`
                    + (message ? `\n\n"${message.trim()}"` : ''),
                meta: { requestId: request._id, listingId: listing._id },
            });

            await notificationServices.create({
                user: listing.owner._id,
                type: 'request',
                title: 'Sourcing request received',
                body: `${user.name} requested ${qty} ${unit || listing.unit} of your ${listing.title}.`,
                link: { page: 'requests', id: request._id },
                sendEmail: listing.owner.notificationPrefs?.emailDeals !== false,
            });

            return request;
        } catch (err) {
            if (err.code === 11000) {
                throw AppError.conflict(
                    'You already have a pending request on this listing.',
                    'DUPLICATE_REQUEST'
                );
            }
            throw err;
        }
    }

    /** Requests I received (seller inbox) or sent (buyer's outbox). */
    async listRequests(userId, { direction = 'received', status, page = 1, limit = 20 }) {
        const query = direction === 'sent' ? { requester: userId } : { owner: userId };
        if (status) query.status = status;

        const [requests, total] = await Promise.all([
            SourcingRequest.find(query)
                .populate('listing', 'title category quantity unit photos city priceLabel')
                .populate('requester', 'name businessName avatarUrl isBusinessVerified stats.ratingAvg')
                .populate('owner', 'name businessName avatarUrl isBusinessVerified')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Math.min(Number(limit), 50))
                .lean({ virtuals: true }),
            SourcingRequest.countDocuments(query),
        ]);

        return { requests, pagination: { page: Number(page), total, totalPages: Math.ceil(total / limit) } };
    }

    /**
     * Seller accepts → a Deal is born.
     *
     * Wrapped in a transaction: creating the deal, reserving the listing, and
     * auto-declining rival requests must all succeed or all fail. A listing
     * reserved with no deal attached is an unrecoverable support problem.
     * (Requires a MongoDB replica set — Atlas provides one by default.)
     */
    async acceptRequest(requestId, ownerId, { responseMessage, logisticsOverride } = {}) {
        const session = await mongoose.startSession();
        try {
            let deal;
            await session.withTransaction(async () => {
                const request = await SourcingRequest.findById(requestId)
                    .populate('listing')
                    .populate('requester', 'name email phoneNumber personalDetails notificationPrefs')
                    .session(session);

                if (!request) throw AppError.notFound('Request not found.');
                if (request.owner.toString() !== String(ownerId)) {
                    throw AppError.forbidden('This request is not yours to respond to.');
                }
                if (request.status !== 'Pending') {
                    throw AppError.badRequest(`This request was already ${request.status.toLowerCase()}.`);
                }
                if (request.expiresAt < new Date()) {
                    throw AppError.badRequest('This request has expired.');
                }

                const listing = request.listing;
                const owner = await User.findById(ownerId).session(session);

                const pricePaise = request.offeredPricePaise ?? listing.pricePaise;
                const term = logisticsOverride?.term || request.preferredLogistics || listing.logistics;

                // Default responsibility matrix from changes.md §3.
                const RESPONSIBILITY = {
                    'Local Pickup':                  { arrangedBy: 'upcycler',  paidBy: 'upcycler' },
                    'Freight (supplier-arranged)':   { arrangedBy: 'generator', paidBy: 'upcycler' },
                    'Courier':                       { arrangedBy: 'upcycler',  paidBy: 'upcycler' },
                    'Buyer-arranged':                { arrangedBy: 'upcycler',  paidBy: 'upcycler' },
                };

                [deal] = await Deal.create([{
                    listing: listing._id,
                    request: request._id,
                    generator: ownerId,
                    upcycler: request.requester._id,
                    agreedQuantity: request.requestedQuantity,
                    unit: request.unit,
                    agreedPricePaise: pricePaise,
                    priceUnit: listing.priceUnit,
                    totalValuePaise: Math.round(pricePaise * request.requestedQuantity),
                    materialSnapshot: {
                        title: listing.title, category: listing.category,
                        purity: listing.purity, moisture: listing.moisture,
                        packaging: listing.packaging,
                    },
                    logistics: {
                        term,
                        ...RESPONSIBILITY[term],
                        ...(logisticsOverride || {}),
                        // Contact details become visible now — both sides opted in.
                        pickupAddress: listing.pickupAddress
                            || owner.businessDetails?.address || '',
                        pickupContactName: owner.personalDetails?.fullName || owner.name,
                        pickupContactPhone: owner.personalDetails?.phone || owner.phoneNumber || '',
                    },
                    status: dealStatus.AGREED,
                }], { session });

                request.status = 'Accepted';
                request.responseMessage = responseMessage?.trim() || '';
                request.respondedAt = new Date();
                request.deal = deal._id;
                await request.save({ session });

                // Reserve the listing so nobody else transacts on it.
                listing.status = listingStatus.RESERVED;
                await listing.save({ session });

                // Auto-decline the rest — leaving them Pending means other buyers
                // wait on something that can never happen.
                await SourcingRequest.updateMany(
                    { listing: listing._id, status: 'Pending', _id: { $ne: request._id } },
                    {
                        $set: {
                            status: 'Declined',
                            responseMessage: 'The material was committed to another buyer.',
                            respondedAt: new Date(),
                        },
                    },
                    { session }
                );
            });

            /* ---- Side effects AFTER the transaction commits. Never send an
                    email inside a transaction that might still roll back. ---- */
            const convo = await chatServices.getOrCreateConversation(
                deal.generator, deal.upcycler, deal.listing
            );
            deal.conversation = convo._id;
            await deal.save();

            await chatServices.sendMessage({
                conversationId: convo._id,
                senderId: deal.generator,
                type: 'system',
                text: `✅ Request accepted. Deal ${deal.reference} created for `
                    + `${deal.agreedQuantity} ${deal.unit}. Logistics: ${deal.logistics.term} `
                    + `(arranged by ${deal.logistics.arrangedBy}, paid by ${deal.logistics.paidBy}). `
                    + `Next step: agree a pickup slot.`,
                meta: { dealId: deal._id, reference: deal.reference },
            });

            await notificationServices.create({
                user: deal.upcycler,
                type: 'deal',
                title: 'Your sourcing request was accepted 🎉',
                body: `Deal ${deal.reference} is open. Agree a pickup slot to proceed.`,
                link: { page: 'deals', id: deal._id },
                sendEmail: true,
            });

            return deal;
        } finally {
            await session.endSession();
        }
    }

    async declineRequest(requestId, ownerId, responseMessage) {
        const request = await SourcingRequest.findById(requestId)
            .populate('listing', 'title')
            .populate('requester', 'name notificationPrefs');
        if (!request) throw AppError.notFound('Request not found.');
        if (request.owner.toString() !== String(ownerId)) {
            throw AppError.forbidden('This request is not yours to respond to.');
        }
        if (request.status !== 'Pending') {
            throw AppError.badRequest(`This request was already ${request.status.toLowerCase()}.`);
        }

        request.status = 'Declined';
        request.responseMessage = responseMessage?.trim() || '';
        request.respondedAt = new Date();
        await request.save();

        await notificationServices.create({
            user: request.requester._id,
            type: 'request',
            title: 'Sourcing request declined',
            body: `Your request for "${request.listing.title}" was declined.`
                + (request.responseMessage ? ` Reason: ${request.responseMessage}` : ''),
            link: { page: 'requests', id: request._id },
            sendEmail: true,
        });

        return request;
    }

    /** Buyer withdraws their own pending request. */
    async withdrawRequest(requestId, requesterId) {
        const request = await SourcingRequest.findOne({ _id: requestId, requester: requesterId });
        if (!request) throw AppError.notFound('Request not found.');
        if (request.status !== 'Pending') {
            throw AppError.badRequest('Only a pending request can be withdrawn.');
        }
        request.status = 'Withdrawn';
        await request.save();
        return { message: 'Request withdrawn.' };
    }
}

module.exports = new RequestServices();
```

---

## ⚡ Step 3: Deal Service (`src/services/dealServices.js`)

```javascript
const Deal = require('../model/deal');
const Listing = require('../model/listing');
const User = require('../model/user');
const AppError = require('../util/AppError');
const dealStatus = require('../domain/dealStatus');
const listingStatus = require('../domain/listingStatus');
const chatServices = require('./chatServices');
const notificationServices = require('./notificationServices');

/**
 * Who may drive each transition. Encoding this as data (rather than scattering
 * `if` statements) means the rules are auditable in one place.
 */
const TRANSITIONS = {
    [dealStatus.AGREED]:    { [dealStatus.SCHEDULED]: ['generator', 'upcycler'],
                              [dealStatus.CANCELLED]: ['generator', 'upcycler'] },
    [dealStatus.SCHEDULED]: { [dealStatus.PICKED_UP]: ['generator'],
                              [dealStatus.AGREED]:    ['generator', 'upcycler'],
                              [dealStatus.CANCELLED]: ['generator', 'upcycler'] },
    [dealStatus.PICKED_UP]: { [dealStatus.DELIVERED]: ['generator', 'upcycler'],
                              [dealStatus.DISPUTED]:  ['generator', 'upcycler'] },
    [dealStatus.DELIVERED]: { [dealStatus.COMPLETED]: ['generator', 'upcycler'],
                              [dealStatus.DISPUTED]:  ['generator', 'upcycler'] },
    [dealStatus.COMPLETED]: {},
    [dealStatus.CANCELLED]: {},
    [dealStatus.DISPUTED]:  { [dealStatus.COMPLETED]: ['admin'],
                              [dealStatus.CANCELLED]: ['admin'] },
};

// Rough CO2e avoided per kg diverted from landfill/incineration, by material.
// Deliberately conservative — an inflated ESG number that a customer's
// sustainability team can debunk costs more credibility than it buys.
const CO2_FACTOR_PER_KG = {
    Organic: 0.5, Grain: 0.5, Textiles: 3.0, Wood: 0.9,
    Plastics: 1.8, Metals: 2.5, Paper: 0.7, Glass: 0.3, Other: 0.5,
};

class DealServices {

    /** Determine the caller's side, or throw if they aren't in this deal. */
    roleOf(deal, userId) {
        if (deal.generator.toString() === String(userId)) return 'generator';
        if (deal.upcycler.toString() === String(userId)) return 'upcycler';
        throw AppError.notFound('Deal not found.');
    }

    async getDeal(dealId, userId) {
        const deal = await Deal.findById(dealId)
            .populate('generator', 'name businessName avatarUrl personalDetails.phone isBusinessVerified')
            .populate('upcycler',  'name businessName avatarUrl personalDetails.phone isBusinessVerified')
            .populate('listing', 'title category photos');
        if (!deal) throw AppError.notFound('Deal not found.');

        const role = this.roleOf(deal, userId);
        return { deal, role };
    }

    async listDeals(userId, { status, role, page = 1, limit = 20 }) {
        const query = role === 'generator' ? { generator: userId }
            : role === 'upcycler' ? { upcycler: userId }
            : { $or: [{ generator: userId }, { upcycler: userId }] };
        if (status) query.status = status;

        const [deals, total] = await Promise.all([
            Deal.find(query)
                .populate('listing', 'title category photos')
                .populate('generator', 'name avatarUrl')
                .populate('upcycler', 'name avatarUrl')
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(Math.min(Number(limit), 50))
                .lean(),
            Deal.countDocuments(query),
        ]);
        return { deals, pagination: { page: Number(page), total, totalPages: Math.ceil(total / limit) } };
    }

    /** Agree a pickup slot. changes.md §3 step 4. */
    async schedulePickup(dealId, userId, { scheduledAt, scheduledSlot, dockNotes, deliveryAddress }) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');
        const role = this.roleOf(deal, userId);

        if (![dealStatus.AGREED, dealStatus.SCHEDULED].includes(deal.status)) {
            throw AppError.badRequest(`Cannot schedule a deal that is ${deal.status}.`);
        }
        if (!scheduledAt) throw AppError.badRequest('A pickup date and time is required.');

        const when = new Date(scheduledAt);
        if (when < new Date()) throw AppError.badRequest('Pickup cannot be scheduled in the past.');

        deal.logistics.scheduledAt = when;
        deal.logistics.scheduledSlot = scheduledSlot || '';
        deal.logistics.dockNotes = dockNotes || deal.logistics.dockNotes;
        if (deliveryAddress) deal.logistics.deliveryAddress = deliveryAddress;

        deal.status = dealStatus.SCHEDULED;
        deal.timeline.push({
            status: dealStatus.SCHEDULED,
            note: `Pickup scheduled for ${when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                + (scheduledSlot ? ` (${scheduledSlot})` : ''),
            actor: userId,
        });
        await deal.save();

        if (deal.conversation) {
            await chatServices.sendMessage({
                conversationId: deal.conversation,
                senderId: userId,
                type: 'system',
                text: `📅 Pickup scheduled: ${when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
                    + (scheduledSlot ? ` (${scheduledSlot})` : '')
                    + (dockNotes ? `\nNotes: ${dockNotes}` : ''),
                meta: { dealId: deal._id },
            });
        }

        const otherParty = role === 'generator' ? deal.upcycler : deal.generator;
        await notificationServices.create({
            user: otherParty,
            type: 'logistics',
            title: 'Pickup scheduled',
            body: `Deal ${deal.reference}: pickup on `
                + `${when.toLocaleDateString('en-IN')} ${scheduledSlot || ''}.`,
            link: { page: 'deals', id: deal._id },
            sendEmail: true,
        });

        return deal;
    }

    /** Generic guarded transition. */
    async advanceStatus(dealId, userId, nextStatus, { note, proofUrl, proofPublicId } = {}) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');
        const role = this.roleOf(deal, userId);

        const allowedRoles = TRANSITIONS[deal.status]?.[nextStatus];
        if (!allowedRoles) {
            throw AppError.badRequest(
                `Cannot move a deal from ${deal.status} to ${nextStatus}.`,
                'INVALID_TRANSITION'
            );
        }
        if (!allowedRoles.includes(role)) {
            throw AppError.forbidden(
                `Only the ${allowedRoles.join(' or ')} can mark this deal as ${nextStatus}.`,
                'WRONG_PARTY'
            );
        }

        if (nextStatus === dealStatus.PICKED_UP && proofUrl) {
            deal.pickupProof = { url: proofUrl, publicId: proofPublicId, uploadedAt: new Date(), uploadedBy: userId };
        }
        if (nextStatus === dealStatus.DELIVERED && proofUrl) {
            deal.deliveryProof = { url: proofUrl, publicId: proofPublicId, uploadedAt: new Date(), uploadedBy: userId };
        }

        deal.status = nextStatus;
        deal.timeline.push({ status: nextStatus, note: note || '', actor: userId });
        await deal.save();

        if (deal.conversation) {
            await chatServices.sendMessage({
                conversationId: deal.conversation,
                senderId: userId,
                type: 'system',
                text: `Deal ${deal.reference} is now **${nextStatus}**.${note ? `\n${note}` : ''}`,
                meta: { dealId: deal._id },
            });
        }

        const otherParty = role === 'generator' ? deal.upcycler : deal.generator;
        await notificationServices.create({
            user: otherParty,
            type: 'deal',
            title: `Deal ${nextStatus.toLowerCase()}`,
            body: `Deal ${deal.reference} was marked ${nextStatus}.`,
            link: { page: 'deals', id: deal._id },
        });

        return deal;
    }

    /**
     * Completion requires BOTH sides to confirm. A one-sided "completed" is how
     * ratings get gamed and how disputes become he-said-she-said.
     */
    async confirmCompletion(dealId, userId) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');
        const role = this.roleOf(deal, userId);

        if (![dealStatus.DELIVERED, dealStatus.PICKED_UP].includes(deal.status)) {
            throw AppError.badRequest('The material must be picked up or delivered before completion.');
        }

        if (role === 'generator') deal.generatorConfirmedAt = new Date();
        else deal.upcyclerConfirmedAt = new Date();

        deal.timeline.push({ status: 'ConfirmationReceived', note: `Confirmed by ${role}.`, actor: userId });

        const bothConfirmed = deal.generatorConfirmedAt && deal.upcyclerConfirmedAt;
        if (!bothConfirmed) {
            await deal.save();
            const otherParty = role === 'generator' ? deal.upcycler : deal.generator;
            await notificationServices.create({
                user: otherParty,
                type: 'deal',
                title: 'Confirm deal completion',
                body: `The other party confirmed deal ${deal.reference}. Please confirm to close it.`,
                link: { page: 'deals', id: deal._id },
                sendEmail: true,
            });
            return { deal, completed: false, message: 'Your confirmation was recorded. Waiting for the other party.' };
        }

        /* ---- Both confirmed: close it out ---- */
        deal.status = dealStatus.COMPLETED;
        deal.completedAt = new Date();

        const kg = deal.unit === 'tons' ? deal.agreedQuantity * 1000 : deal.agreedQuantity;
        deal.impact = {
            wasteDivertedKg: kg,
            co2SavedKg: Math.round(kg * (CO2_FACTOR_PER_KG[deal.materialSnapshot?.category] || 0.5) * 10) / 10,
            costSavedPaise: deal.totalValuePaise,
        };
        deal.timeline.push({ status: dealStatus.COMPLETED, note: 'Both parties confirmed.' });
        await deal.save();

        // Credit both sides.
        await User.updateMany(
            { _id: { $in: [deal.generator, deal.upcycler] } },
            { $inc: { 'stats.completedDeals': 1 } }
        );

        // Return remaining stock to the market, or close the listing out.
        const listing = await Listing.findById(deal.listing);
        if (listing) {
            const remaining = listing.quantity - deal.agreedQuantity;
            if (remaining > 0) {
                listing.quantity = remaining;
                listing.status = listingStatus.ACTIVE;
            } else {
                listing.status = listingStatus.COMPLETED;
            }
            await listing.save();
        }

        await Promise.all([deal.generator, deal.upcycler].map((uid) =>
            notificationServices.create({
                user: uid,
                type: 'deal',
                title: 'Deal completed ✅',
                body: `Deal ${deal.reference} is complete. ${deal.impact.wasteDivertedKg} kg diverted, `
                    + `~${deal.impact.co2SavedKg} kg CO₂e avoided. Leave a review?`,
                link: { page: 'deals', id: deal._id },
                sendEmail: true,
            })
        ));

        return { deal, completed: true, message: 'Deal completed. Thank you!' };
    }

    async cancelDeal(dealId, userId, reason) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');
        this.roleOf(deal, userId);

        if ([dealStatus.COMPLETED, dealStatus.CANCELLED].includes(deal.status)) {
            throw AppError.badRequest(`This deal is already ${deal.status.toLowerCase()}.`);
        }
        if (!reason?.trim()) {
            // Requiring a reason is deliberate: cancellation data tells us why
            // deals fail, which is the most actionable metric we have.
            throw AppError.badRequest('Please give a reason for cancelling.');
        }

        deal.status = dealStatus.CANCELLED;
        deal.cancelledBy = userId;
        deal.cancelReason = reason.trim();
        deal.timeline.push({ status: dealStatus.CANCELLED, note: reason.trim(), actor: userId });
        await deal.save();

        // Put the material back on the market.
        await Listing.findByIdAndUpdate(deal.listing, { status: listingStatus.ACTIVE });

        const otherParty = deal.generator.toString() === String(userId) ? deal.upcycler : deal.generator;
        await notificationServices.create({
            user: otherParty,
            type: 'deal',
            title: 'Deal cancelled',
            body: `Deal ${deal.reference} was cancelled. Reason: ${reason.trim()}`,
            link: { page: 'deals', id: deal._id },
            sendEmail: true,
        });

        return deal;
    }

    async raiseDispute(dealId, userId, reason) {
        const deal = await Deal.findById(dealId);
        if (!deal) throw AppError.notFound('Deal not found.');
        this.roleOf(deal, userId);
        if (!reason?.trim()) throw AppError.badRequest('Please describe the problem.');

        deal.status = dealStatus.DISPUTED;
        deal.disputeReason = reason.trim();
        deal.disputeRaisedBy = userId;
        deal.timeline.push({ status: dealStatus.DISPUTED, note: reason.trim(), actor: userId });
        await deal.save();

        // TODO: alert the ops team — a disputed deal needs a human, fast.
        return deal;
    }
}

module.exports = new DealServices();
```

---

## 🛣️ Step 4: Routes

`src/routes/requestRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const RequestController = require('../controller/requestController');
const {
    authenticate, requireVerifiedEmail, requireCompleteProfile, requireBusinessType,
} = require('../middleware/auth');

router.use(authenticate, requireVerifiedEmail, requireCompleteProfile);

// Only upcyclers source material.
router.post('/', requireBusinessType('upcycler'), RequestController.create);

router.get('/', RequestController.list);                  // ?direction=received|sent&status=Pending
router.get('/:id', RequestController.getOne);
router.patch('/:id/accept', RequestController.accept);
router.patch('/:id/decline', RequestController.decline);
router.patch('/:id/withdraw', RequestController.withdraw);

module.exports = router;
```

`src/routes/dealRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const DealController = require('../controller/dealController');
const { authenticate, requireVerifiedEmail } = require('../middleware/auth');

router.use(authenticate, requireVerifiedEmail);

router.get('/', DealController.list);
router.get('/:id', DealController.getOne);
router.patch('/:id/schedule', DealController.schedule);
router.patch('/:id/status', DealController.advance);      // { status, note, proofUrl }
router.patch('/:id/confirm', DealController.confirm);
router.patch('/:id/cancel', DealController.cancel);
router.patch('/:id/dispute', DealController.dispute);

module.exports = router;
```

---

## ⏰ Step 5: Expiry Job (`src/jobs/expireRequests.js`)

A pending request that nobody answers must not hang forever.

```javascript
const SourcingRequest = require('../model/sourcingRequest');
const notificationServices = require('../services/notificationServices');

/** Run hourly (node-cron in-process, or an external scheduler). */
const expireStaleRequests = async () => {
    const stale = await SourcingRequest.find({
        status: 'Pending',
        expiresAt: { $lt: new Date() },
    }).populate('listing', 'title');

    for (const req of stale) {
        req.status = 'Expired';
        req.responseMessage = 'No response within 7 days.';
        await req.save();

        await notificationServices.create({
            user: req.requester,
            type: 'request',
            title: 'Sourcing request expired',
            body: `Your request for "${req.listing?.title}" expired with no response.`,
            link: { page: 'requests', id: req._id },
        });
    }

    if (stale.length) console.log(`⏰ Expired ${stale.length} stale sourcing request(s).`);
};

module.exports = expireStaleRequests;
```

Wire it up in `index.js`:

```bash
npm install node-cron
```

```javascript
const cron = require('node-cron');
const expireStaleRequests = require('./src/jobs/expireRequests');
const expireListings = require('./src/jobs/expireListings');

cron.schedule('0 * * * *', expireStaleRequests);   // hourly
cron.schedule('0 2 * * *', expireListings);        // daily at 02:00
```

---

## 🖥️ Step 6: Frontend — New Pages Needed

`changes.md` already lists these as ⬜ To build. Both are required for the loop to be usable:

### `RequestsPage.jsx` (page 19)
Two tabs — **Received** / **Sent**. Each card: material thumbnail, requester (with verified badge
and rating), quantity, message, and Accept / Decline buttons. Reuse the `dash-panel` and
`listing-status-badge` classes that already exist.

### `DealPage.jsx` (page 21)
The single source of truth for one transaction:
- Header: `deal.reference`, status badge, counterparty
- Agreed terms (snapshotted quantity, price, total)
- **Logistics panel**: term, who arranges, who pays, pickup address + contact (revealed now),
  "Schedule Pickup" action
- **Status timeline** rendered from `deal.timeline` — reuse the `notif-group` styling
- Action buttons gated by `role` and `status`
- Impact summary once completed

### Wire the existing button

```javascript
// MarketplacePage.jsx — CURRENT
onClick={() => triggerToast(`Sourcing request sent for "${item.title}"!`)}

// FIXED — open a modal that collects quantity + message, then:
const data = await apiCreateRequest({
  listingId: item._id,
  requestedQuantity: qty,
  unit: item.unit,
  message,
});
triggerToast('Sourcing request sent!');
```

Don't send the request on a bare click. Quantity and a short message roughly double acceptance
rates versus a contentless ping, and a one-click request with no quantity is not actionable by the
seller.

---

## 🧪 Step 7: Test

Checklist:
- [ ] Request for more than the available quantity → `400 QUANTITY_EXCEEDS_AVAILABLE`
- [ ] Request on your own listing → `400`
- [ ] A generator-only account gets `403 WRONG_BUSINESS_TYPE`
- [ ] Two requests on the same listing from the same buyer → `409 DUPLICATE_REQUEST`
- [ ] Accepting creates a Deal with a `reference` like `ECO-2026-00001`
- [ ] Accepting sets the listing to `Reserved`
- [ ] Accepting **auto-declines** all other pending requests on that listing
- [ ] Accepting reveals the pickup address and phone in `GET /deals/:id`
- [ ] Before acceptance, the address is **not** in any API response
- [ ] A third party gets `404` on `GET /deals/:id`
- [ ] Only the generator can mark `PickedUp` (`403 WRONG_PARTY` for the upcycler)
- [ ] `Agreed → Completed` directly → `400 INVALID_TRANSITION`
- [ ] Completion requires **both** confirmations
- [ ] On completion both users' `stats.completedDeals` increments
- [ ] Partial quantity: the listing returns to `Active` with the remainder
- [ ] Cancelling returns the listing to `Active`
- [ ] Cancelling with no reason → `400`
- [ ] Kill the DB mid-accept: no listing is left `Reserved` without a deal (transaction works)
- [ ] The expiry job flips a 7-day-old pending request to `Expired`

---

## 🔒 Security Summary

1. **Addresses and phone numbers are revealed only after acceptance.** This is a physical-safety
   control, not a privacy nicety — a public pickup address invites theft and unwanted visitors.
2. **`roleOf()` returns 404, not 403,** for non-participants. A third party should not learn that a
   deal between two other companies exists.
3. **Transitions are a table of (from → to → allowed roles).** Only the generator can say the
   material left; only both together can say it's done.
4. **Both-party completion.** One-sided completion enables rating manipulation and false ESG claims.
5. **Terms are snapshotted onto the deal.** If the listing is edited afterwards, the agreement does
   not silently change under either party.
6. **Transactional accept.** Deal creation + listing reservation + rival auto-decline are atomic.
   A half-applied acceptance is an unrecoverable support case.
7. **Append-only timeline.** Never mutate or delete history — it is the dispute record.
8. **Money as integer paise** everywhere, including `totalValuePaise`.
9. **Emails are sent after the transaction commits**, never inside it.
10. **`maxlength` on every free-text field** (`message`, `responseMessage`, `cancelReason`).

---

## 💼 CEO Review Notes

- **This is where we finally earn a commission.** Everything before it is table stakes; this is the
  monetisable event. `totalValuePaise` on a completed deal is our GMV, and GMV is the number
  investors will ask about. Instrument it from the first deal.
- **The metric that matters is request → completed conversion.** Track drop-off at every step:
  requests never answered (seller-side problem), deals never scheduled (logistics problem), deals
  cancelled after scheduling (trust or price problem). Each has a different fix, and we cannot tell
  them apart without the funnel.
- **Requiring a cancellation reason is a product decision I insist on.** Cancellation data is the
  highest-signal, lowest-cost research we will ever get. Make the reasons a short enum plus free
  text so they are analysable, not just readable.
- **Auto-declining rival requests is right but must be communicated well.** A buyer who gets
  "declined" with no explanation churns. The message must say "the material was committed to another
  buyer" **and** immediately show 3 similar listings. A decline is a retention moment, not a dead end.
- **Do not take payments yet.** Let the two businesses settle directly for the pilot. Payments mean
  KYC, escrow, refunds, chargebacks, and GST invoicing — months of work and real regulatory exposure.
  We should first prove deals complete at all. But **do** record `totalValuePaise` so that when we
  introduce a commission we can price it from real data rather than a guess.
- **Logistics is the make-or-break, exactly as `changes.md` says.** The single highest-leverage
  feature in this guide is making "who arranges and who pays" explicit *before* acceptance. Ambiguity
  there is the #1 cause of failed waste exchanges, and it costs us nothing but a clear UI.
- **Disputes need a human on day one.** `raiseDispute` currently just flags the record. Before we
  launch publicly, one named person owns disputed deals with a 24-hour response SLA. Our entire value
  proposition over an informal WhatsApp group is that someone is accountable when it goes wrong.
- **`ECO-2026-00042` references are worth the small effort.** Businesses quote reference numbers on
  the phone, in emails, and on invoices. It makes us look like infrastructure rather than an app —
  and that perception is what gets us into procurement conversations.
- **Ask for a review at completion, not later.** The completion notification already prompts for one.
  Reviews are the trust flywheel: `ProfilePage` displays them, they raise conversion, and asking at
  the moment of success is the only time response rates are decent.
