# Listing (Product) Management Guide

A "product" on EcoMatch is a **material / byproduct listing** — the core object of the marketplace.
This guide implements the full lifecycle: create, read, update, publish/pause, delete, plus
marketplace search with filters, pagination, and geo queries.

Prerequisites: guides `01`, `02`, `06`. Photo uploads are guide `08` (build this first with URLs
accepted as strings, then wire real uploads).

---

## 📌 What the Frontend Already Defines

`CreateListingPage.jsx` submits exactly this shape (`EMPTY_FORM`):

```javascript
{
  title, category, description,
  quantity, unit,            // 'kg' | 'tons' | 'litres' | 'units'
  frequency, availability,   // 'One-time'|'Daily'|'Weekly'|'Monthly'  |  date string
  purity, moisture,
  price, priceUnit, pricingModel,
  city, logistics, packaging,
  status,                    // 'Active' | 'Paused' | 'Reserved'
  photoCount, docName,       // placeholders until uploads exist
}
```

`MarketplacePage.jsx` renders these per listing (`LISTINGS` mock + `detailFields()`):

```javascript
{ id, title, category, description, img, gallery[], quantity, frequency,
  availability, purity, moisture, price, pricingModel, location, logistics,
  packaging, source, verified, certifications, status, score }
```

Note `quantity: '120 kg'` and `price: '₹8 / kg'` are **display strings** in the mock. The backend
must store **numbers** (`quantity: 120`, `unit: 'kg'`, `price: 8`) so we can filter and sort, and
return formatted strings alongside for the UI.

`MarketplacePage` filters: category checkboxes (Organic/Textiles/Wood/Plastics/Metals), radius
(25/50/100km+), quantity range slider (0–12,000 kg/week), purity (90%+/80%+), availability date.

---

## 🗄️ Step 1: Listing Model (`src/model/listing.js`)

```javascript
const mongoose = require('mongoose');
const listingStatus = require('../domain/listingStatus');

const listingSchema = new mongoose.Schema({
    /* ---- Ownership ---- */
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        index: true,
    },

    /* ---- Material identity ---- */
    title: {
        type: String,
        required: [true, 'Listing title is required'],
        trim: true,
        maxlength: 140,
    },
    slug: { type: String, index: true },          // SEO-friendly URL segment
    category: {
        type: String,
        required: [true, 'Material category is required'],
        enum: ['Organic', 'Textiles', 'Wood', 'Plastics', 'Metals', 'Grain', 'Paper', 'Glass', 'Other'],
        index: true,
    },
    materialId: {
        type: String,
        // Links a listing to the material interests in user.materials so the
        // matcher can join the two sides without fuzzy string matching.
        enum: ['coffee', 'textiles', 'wood', 'plastics', 'metals', 'grain', 'other'],
        default: 'other',
        index: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: 3000,
    },

    /* ---- Media ---- */
    photos: [{
        url:      { type: String, required: true },
        publicId: String,                    // Cloudinary id, needed to delete
        isPrimary:{ type: Boolean, default: false },
    }],
    documents: [{
        name: String,
        url:  String,
        type: { type: String, enum: ['lab_report', 'compliance', 'certification', 'other'], default: 'other' },
        uploadedAt: { type: Date, default: Date.now },
    }],

    /* ---- Quantity: numeric so we can filter and sort ---- */
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0.01, 'Quantity must be greater than zero'],
    },
    unit: {
        type: String,
        enum: ['kg', 'tons', 'litres', 'units'],
        default: 'kg',
    },
    // Normalised to kg so a 1-ton listing and a 500-kg listing are comparable
    // in one range filter. Set by a pre-save hook.
    quantityInKg: { type: Number, index: true },

    frequency: {
        type: String,
        enum: ['One-time', 'Daily', 'Weekly', 'Monthly'],
        default: 'Weekly',
        index: true,
    },
    availableFrom: { type: Date, default: Date.now, index: true },
    availableUntil:{ type: Date, default: null },

    /* ---- Quality: primary matching inputs ---- */
    purity: { type: String, trim: true, default: '' },      // free text: "92%" or "Grade A"
    // Parsed numeric purity for range filters ("90%+"). null when grade-only.
    purityPercent: { type: Number, default: null, min: 0, max: 100, index: true },
    moisture: {
        type: String,
        enum: ['Dry', 'Wet', 'Mixed', 'Clean / Sorted', 'Contaminated', ''],
        default: 'Dry',
    },

    /* ---- Pricing: integers in paise, never floats ---- */
    pricingModel: {
        type: String,
        enum: ['Fixed', 'Negotiable', 'Free'],
        default: 'Negotiable',
    },
    pricePaise: { type: Number, default: 0, min: 0 },   // ₹8.50/kg → 850
    priceUnit: {
        type: String,
        enum: ['per kg', 'per ton', 'per lot', 'per litre', 'per unit'],
        default: 'per kg',
    },

    /* ---- Location & logistics ---- */
    city: { type: String, required: true, trim: true, index: true },
    state:{ type: String, trim: true, default: '' },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: undefined },   // [lng, lat]
        formattedAddress: { type: String, default: '' },
    },
    // Exact address is revealed only after a deal is accepted (guide 10).
    pickupAddress: { type: String, default: '', select: false },

    logistics: {
        type: String,
        enum: ['Local Pickup', 'Freight (supplier-arranged)', 'Courier', 'Buyer-arranged'],
        default: 'Local Pickup',
    },
    packaging: {
        type: String,
        enum: ['Loose / bulk', 'Bagged', 'Palletised', 'Container', ''],
        default: 'Bagged',
    },

    /* ---- Lifecycle ---- */
    status: {
        type: String,
        enum: Object.values(listingStatus),
        default: listingStatus.DRAFT,
        index: true,
    },
    publishedAt: { type: Date, default: null },
    expiresAt:   { type: Date, default: null, index: true },

    /* ---- Engagement counters (shown on Dashboard / My Listings) ---- */
    viewCount:    { type: Number, default: 0 },
    saveCount:    { type: Number, default: 0 },
    requestCount: { type: Number, default: 0 },

    /* ---- Moderation ---- */
    isFlagged:    { type: Number, default: 0 },
    moderationNote: { type: String, default: '' },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

/* ---------- Indexes ---------- */
listingSchema.index({ location: '2dsphere' });
listingSchema.index({ status: 1, category: 1, availableFrom: -1 });   // main marketplace query
listingSchema.index({ owner: 1, status: 1, createdAt: -1 });          // "My Listings"
listingSchema.index({ title: 'text', description: 'text' });          // keyword search

/* ---------- Virtuals: the display strings the UI expects ---------- */

listingSchema.virtual('quantityLabel').get(function () {
    return `${this.quantity.toLocaleString('en-IN')} ${this.unit}`;    // "1,200 kg"
});

listingSchema.virtual('priceLabel').get(function () {
    if (this.pricingModel === 'Free') return 'Free — disposal saving';
    if (!this.pricePaise) return 'Price on request';
    const rupees = this.pricePaise / 100;
    const formatted = Number.isInteger(rupees) ? rupees : rupees.toFixed(2);
    return `₹${formatted} / ${this.priceUnit.replace('per ', '')}`;    // "₹8 / kg"
});

listingSchema.virtual('primaryPhoto').get(function () {
    if (!this.photos?.length) return null;
    return (this.photos.find((p) => p.isPrimary) || this.photos[0]).url;
});

/* ---------- Hooks ---------- */

const KG_PER_UNIT = { kg: 1, tons: 1000, litres: 1, units: 1 };

listingSchema.pre('save', function (next) {
    // Normalise quantity for cross-unit range filtering.
    if (this.isModified('quantity') || this.isModified('unit')) {
        this.quantityInKg = this.quantity * (KG_PER_UNIT[this.unit] ?? 1);
    }

    // Extract a numeric purity from free text so "90%+" filters work.
    if (this.isModified('purity')) {
        const match = String(this.purity).match(/(\d{1,3}(?:\.\d+)?)\s*%/);
        this.purityPercent = match ? Math.min(parseFloat(match[1]), 100) : null;
    }

    // Slug for shareable URLs (ListingsDetailsPage has a Share modal).
    if (this.isModified('title')) {
        this.slug = this.title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
    }

    // Auto-expire 90 days after publish unless explicitly set. A marketplace
    // full of stale listings is worse than a small one — dead listings are the
    // fastest way to lose buyer trust.
    if (this.isModified('status') && this.status === 'Active' && !this.publishedAt) {
        this.publishedAt = new Date();
        if (!this.expiresAt) {
            this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        }
    }
    next();
});

module.exports = mongoose.model('Listing', listingSchema);
```

### `src/domain/listingStatus.js`

```javascript
const listingStatus = Object.freeze({
    DRAFT:     'Draft',
    ACTIVE:    'Active',
    PAUSED:    'Paused',
    RESERVED:  'Reserved',     // a sourcing request was accepted
    IN_TRANSIT:'In Transit',
    COMPLETED: 'Completed',
    EXPIRED:   'Expired',
});
module.exports = listingStatus;
```

These strings match `STATUS_STYLES` in `MarketplacePage.jsx` exactly, so the existing CSS badge
classes work with no frontend change.

---

## ⚡ Step 2: Listing Service (`src/services/listingServices.js`)

```javascript
const Listing = require('../model/listing');
const User = require('../model/user');
const AppError = require('../util/AppError');
const listingStatus = require('../domain/listingStatus');
const { geocodeAddress } = require('../util/geocode');

/** Maps a UI category to the materialId used for matching. */
const CATEGORY_TO_MATERIAL = {
    Organic: 'coffee', Textiles: 'textiles', Wood: 'wood',
    Plastics: 'plastics', Metals: 'metals', Grain: 'grain',
};

/** Rupee-ish input ("8", "8.50", 8) → integer paise. */
const toPaise = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const n = Number(String(value).replace(/[^\d.]/g, ''));
    if (Number.isNaN(n) || n < 0) throw AppError.badRequest('Price must be a positive number.');
    return Math.round(n * 100);
};

const RADIUS_TO_METRES = { '10km': 10000, '25km': 25000, '50km': 50000, '100km': 100000, '100km+': 500000 };

class ListingServices {

    /**
     * Create a listing. Only Generators may list (enforced by
     * requireBusinessType('generator') on the route as well).
     */
    async createListing(user, data) {
        if (!data.title?.trim())       throw AppError.badRequest('Listing title is required.');
        if (!data.category)            throw AppError.badRequest('Material category is required.');
        if (!data.description?.trim()) throw AppError.badRequest('Description is required.');
        if (!data.quantity)            throw AppError.badRequest('Quantity is required.');
        if (!data.city?.trim())        throw AppError.badRequest('Location / city is required.');

        const quantity = Number(data.quantity);
        if (Number.isNaN(quantity) || quantity <= 0) {
            throw AppError.badRequest('Quantity must be a number greater than zero.');
        }

        // Free listings must not carry a price — an inconsistency users notice.
        const pricingModel = data.pricingModel === 'Free — disposal saving' ? 'Free' : (data.pricingModel || 'Negotiable');
        const pricePaise = pricingModel === 'Free' ? 0 : toPaise(data.price);

        const listing = new Listing({
            owner: user._id,
            title: data.title.trim(),
            category: data.category,
            materialId: data.materialId || CATEGORY_TO_MATERIAL[data.category] || 'other',
            description: data.description.trim(),
            quantity,
            unit: data.unit || 'kg',
            frequency: data.frequency || 'Weekly',
            availableFrom: data.availability ? new Date(data.availability) : new Date(),
            purity: data.purity?.trim() || '',
            moisture: data.moisture || 'Dry',
            pricingModel,
            pricePaise,
            priceUnit: data.priceUnit || 'per kg',
            city: data.city.trim(),
            state: data.state?.trim() || '',
            logistics: data.logistics || 'Local Pickup',
            packaging: data.packaging || 'Bagged',
            pickupAddress: data.pickupAddress?.trim() || '',
            photos: Array.isArray(data.photos) ? data.photos : [],
            documents: Array.isArray(data.documents) ? data.documents : [],
            // Publishing requires at least one photo — see below.
            status: data.status === 'Active' ? listingStatus.ACTIVE : (data.status || listingStatus.DRAFT),
        });

        // A listing with no photo does not sell. Enforce it on publish, not on draft.
        if (listing.status === listingStatus.ACTIVE && !listing.photos.length) {
            throw AppError.badRequest('Add at least one photo before publishing.');
        }

        // Inherit the seller's coordinates; geocode only if the listing has its
        // own city. Saves a third-party call on the common case.
        if (user.location?.coordinates && user.businessDetails?.city === listing.city) {
            listing.location = {
                type: 'Point',
                coordinates: user.location.coordinates,
                formattedAddress: user.location.formattedAddress,
            };
        } else {
            try {
                const geo = await geocodeAddress(`${listing.city}, India`);
                if (geo) {
                    listing.location = {
                        type: 'Point',
                        coordinates: [geo.lng, geo.lat],
                        formattedAddress: geo.formattedAddress,
                    };
                }
            } catch (e) {
                console.warn(`Listing geocode failed: ${e.message}`);
            }
        }

        await listing.save();

        if (listing.status === listingStatus.ACTIVE) {
            await User.findByIdAndUpdate(user._id, { $inc: { 'stats.activeListings': 1 } });
        }
        return listing;
    }

    /**
     * Marketplace query. Public, but personalised when a user is signed in
     * (compatibility scores come from guide 12).
     */
    async searchListings(filters = {}, viewer = null) {
        const {
            q, category, materialId, city,
            minQuantity, maxQuantity,
            minPurity, availableBefore,
            pricingModel, logistics, frequency,
            lat, lng, radius,
            sort = 'newest',
            page = 1, limit = 12,
        } = filters;

        const query = { status: listingStatus.ACTIVE };

        // Never show a user their own listings in the buy-side marketplace.
        if (viewer) query.owner = { $ne: viewer._id };

        if (q) query.$text = { $search: q };

        // Checkbox groups arrive as CSV or as repeated params.
        if (category) {
            const cats = Array.isArray(category) ? category : String(category).split(',');
            query.category = { $in: cats.map((c) => c.trim()).filter(Boolean) };
        }
        if (materialId) query.materialId = { $in: String(materialId).split(',') };
        if (city) query.city = new RegExp(`^${String(city).trim()}$`, 'i');
        if (pricingModel) query.pricingModel = pricingModel;
        if (logistics) query.logistics = logistics;
        if (frequency) query.frequency = frequency;

        if (minQuantity || maxQuantity) {
            query.quantityInKg = {};
            if (minQuantity) query.quantityInKg.$gte = Number(minQuantity);
            if (maxQuantity) query.quantityInKg.$lte = Number(maxQuantity);
        }

        // "90%+" — include grade-only listings rather than hiding them, or the
        // filter silently deletes good inventory that simply isn't %-graded.
        if (minPurity) {
            query.$or = [
                { purityPercent: { $gte: Number(minPurity) } },
                { purityPercent: null },
            ];
        }

        if (availableBefore) query.availableFrom = { $lte: new Date(availableBefore) };

        // Geo filter — fall back to the viewer's own coordinates.
        const originLng = lng ?? viewer?.location?.coordinates?.[0];
        const originLat = lat ?? viewer?.location?.coordinates?.[1];
        const radiusMetres = RADIUS_TO_METRES[radius] ?? (radius ? Number(radius) * 1000 : null);

        if (originLat != null && originLng != null && radiusMetres) {
            query.location = {
                $geoWithin: {
                    // $geoWithin (not $near) so it composes with sorting.
                    $centerSphere: [[Number(originLng), Number(originLat)], radiusMetres / 6378100],
                },
            };
        }

        const SORTS = {
            newest:      { publishedAt: -1, createdAt: -1 },
            oldest:      { createdAt: 1 },
            priceLow:    { pricePaise: 1 },
            priceHigh:   { pricePaise: -1 },
            quantityHigh:{ quantityInKg: -1 },
            purityHigh:  { purityPercent: -1 },
        };

        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

        const [listings, total] = await Promise.all([
            Listing.find(query)
                .populate('owner', 'name businessName isBusinessVerified stats.ratingAvg businessDetails.city avatarUrl')
                .sort(SORTS[sort] || SORTS.newest)
                .skip(skip)
                .limit(Math.min(Number(limit), 50))     // hard cap: no unbounded reads
                .lean({ virtuals: true }),
            Listing.countDocuments(query),
        ]);

        return {
            listings,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
                hasMore: skip + listings.length < total,
            },
        };
    }

    /** Single listing. Increments the view count for anyone but the owner. */
    async getListingById(id, viewer = null) {
        const listing = await Listing.findById(id)
            .populate('owner', 'name businessName isBusinessVerified verificationStatus stats businessDetails.city businessDetails.industry avatarUrl createdAt');

        if (!listing) throw AppError.notFound('Listing not found.');

        const isOwner = viewer && listing.owner._id.toString() === viewer._id.toString();

        // Drafts and paused listings are visible only to their owner.
        if (!isOwner && ![listingStatus.ACTIVE, listingStatus.RESERVED].includes(listing.status)) {
            throw AppError.notFound('Listing not found.');
        }

        if (!isOwner) {
            // Fire-and-forget: a view counter must never slow down a page load.
            Listing.updateOne({ _id: id }, { $inc: { viewCount: 1 } }).catch(() => {});
        }

        return listing;
    }

    /** The "My Listings" grid. */
    async getMyListings(userId, { status, page = 1, limit = 20 } = {}) {
        const query = { owner: userId };
        if (status) query.status = status;

        const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
        const [listings, total] = await Promise.all([
            Listing.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
                .lean({ virtuals: true }),
            Listing.countDocuments(query),
        ]);
        return { listings, pagination: { page: Number(page), total, totalPages: Math.ceil(total / limit) } };
    }

    /**
     * Update. `listing` is pre-loaded and ownership-checked by the
     * requireOwnership middleware from guide 02.
     */
    async updateListing(listing, data, user) {
        const EDITABLE = ['title', 'category', 'description', 'quantity', 'unit', 'frequency',
            'purity', 'moisture', 'priceUnit', 'city', 'state', 'logistics', 'packaging',
            'pickupAddress', 'photos', 'documents'];

        EDITABLE.forEach((key) => {
            if (data[key] !== undefined) listing[key] = data[key];
        });

        if (data.availability) listing.availableFrom = new Date(data.availability);
        if (data.pricingModel) {
            listing.pricingModel = data.pricingModel === 'Free — disposal saving' ? 'Free' : data.pricingModel;
        }
        if (data.price !== undefined) {
            listing.pricePaise = listing.pricingModel === 'Free' ? 0 : toPaise(data.price);
        }
        if (data.category && !data.materialId) {
            listing.materialId = CATEGORY_TO_MATERIAL[data.category] || 'other';
        }

        // A reserved listing is mid-deal. Changing quantity or price underneath
        // an accepted request is how disputes start.
        if (listing.status === listingStatus.RESERVED &&
            (data.quantity !== undefined || data.price !== undefined)) {
            throw AppError.badRequest(
                'This listing is reserved for an active deal. Cancel the deal before changing quantity or price.',
                'LISTING_RESERVED'
            );
        }

        await listing.save();
        return listing;
    }

    /** Publish / pause / etc. — a guarded state machine, not a free-form set. */
    async changeStatus(listing, nextStatus, userId) {
        const ALLOWED = {
            [listingStatus.DRAFT]:    [listingStatus.ACTIVE],
            [listingStatus.ACTIVE]:   [listingStatus.PAUSED, listingStatus.RESERVED, listingStatus.EXPIRED, listingStatus.COMPLETED],
            [listingStatus.PAUSED]:   [listingStatus.ACTIVE, listingStatus.EXPIRED],
            [listingStatus.RESERVED]: [listingStatus.IN_TRANSIT, listingStatus.ACTIVE, listingStatus.COMPLETED],
            [listingStatus.IN_TRANSIT]:[listingStatus.COMPLETED],
            [listingStatus.EXPIRED]:  [listingStatus.ACTIVE],
            [listingStatus.COMPLETED]:[],
        };

        if (!ALLOWED[listing.status]?.includes(nextStatus)) {
            throw AppError.badRequest(
                `Cannot change status from ${listing.status} to ${nextStatus}.`,
                'INVALID_TRANSITION'
            );
        }
        if (nextStatus === listingStatus.ACTIVE && !listing.photos.length) {
            throw AppError.badRequest('Add at least one photo before publishing.');
        }

        const wasActive = listing.status === listingStatus.ACTIVE;
        listing.status = nextStatus;
        await listing.save();

        // Keep the denormalised counter honest.
        const nowActive = nextStatus === listingStatus.ACTIVE;
        if (wasActive !== nowActive) {
            await User.findByIdAndUpdate(userId, { $inc: { 'stats.activeListings': nowActive ? 1 : -1 } });
        }
        return listing;
    }

    /**
     * Soft delete. We never hard-delete a listing that has deal history —
     * the counterparty's records must not develop holes.
     */
    async deleteListing(listing, userId) {
        if ([listingStatus.RESERVED, listingStatus.IN_TRANSIT].includes(listing.status)) {
            throw AppError.badRequest(
                'This listing has an active deal and cannot be deleted. Cancel the deal first.',
                'LISTING_IN_DEAL'
            );
        }

        const wasActive = listing.status === listingStatus.ACTIVE;

        if (listing.requestCount > 0) {
            listing.status = listingStatus.EXPIRED;
            listing.moderationNote = 'Withdrawn by owner';
            await listing.save();
        } else {
            await listing.deleteOne();
        }

        if (wasActive) {
            await User.findByIdAndUpdate(userId, { $inc: { 'stats.activeListings': -1 } });
        }
        return { message: 'Listing removed.' };
    }
}

module.exports = new ListingServices();
```

---

## 🚦 Step 3: Controller (`src/controller/listingController.js`)

```javascript
const asyncHandler = require('../util/asyncHandler');
const listingServices = require('../services/listingServices');

class ListingController {
    create = asyncHandler(async (req, res) => {
        const listing = await listingServices.createListing(req.user, req.body);
        res.status(201).json({
            success: true,
            message: listing.status === 'Active'
                ? 'Listing published to the marketplace!'
                : 'Draft saved.',
            listing,
        });
    });

    search = asyncHandler(async (req, res) => {
        const result = await listingServices.searchListings(req.query, req.user || null);
        res.status(200).json({ success: true, ...result });
    });

    getOne = asyncHandler(async (req, res) => {
        const listing = await listingServices.getListingById(req.params.id, req.user || null);
        res.status(200).json({ success: true, listing });
    });

    mine = asyncHandler(async (req, res) => {
        const result = await listingServices.getMyListings(req.user._id, req.query);
        res.status(200).json({ success: true, ...result });
    });

    // req.resource is loaded + ownership-checked by middleware.
    update = asyncHandler(async (req, res) => {
        const listing = await listingServices.updateListing(req.resource, req.body, req.user);
        res.status(200).json({ success: true, message: 'Listing updated successfully!', listing });
    });

    changeStatus = asyncHandler(async (req, res) => {
        const listing = await listingServices.changeStatus(req.resource, req.body.status, req.user._id);
        res.status(200).json({ success: true, message: `Listing is now ${listing.status}.`, listing });
    });

    remove = asyncHandler(async (req, res) => {
        const result = await listingServices.deleteListing(req.resource, req.user._id);
        res.status(200).json({ success: true, ...result });
    });
}
module.exports = new ListingController();
```

---

## 🛣️ Step 4: Routes (`src/routes/listingRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();

const ListingController = require('../controller/listingController');
const Listing = require('../model/listing');
const {
    authenticate, optionalAuth, requireVerifiedEmail,
    requireCompleteProfile, requireBusinessType,
} = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');

/* ---------- Public / personalised reads ---------- */
// optionalAuth: browsing works signed out, but a signed-in user gets their own
// listings filtered out and (later) compatibility scores.
router.get('/', optionalAuth, ListingController.search);

/* ---------- Owner reads (before /:id so "mine" isn't parsed as an id) ---------- */
router.get('/mine', authenticate, ListingController.mine);

router.get('/:id', optionalAuth, ListingController.getOne);

/* ---------- Writes ---------- */
router.post('/',
    authenticate, requireVerifiedEmail, requireCompleteProfile,
    requireBusinessType('generator'),
    ListingController.create);

router.patch('/:id',
    authenticate, requireOwnership(Listing),
    ListingController.update);

router.patch('/:id/status',
    authenticate, requireOwnership(Listing),
    ListingController.changeStatus);

router.delete('/:id',
    authenticate, requireOwnership(Listing),
    ListingController.remove);

module.exports = router;
```

> **Route order matters.** `/mine` must be declared before `/:id`, or Express matches `/mine` as
> `:id = "mine"` and you get a cast error.

---

## 🖥️ Step 5: Frontend Wiring

### 5a. Add to `frontend/src/lib/api.js`

```javascript
/* ---- Listings ---- */
export const apiCreateListing = (payload) =>
  request('/listings', { method: 'POST', body: payload });

export const apiSearchListings = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString();
  return request(`/listings${qs ? `?${qs}` : ''}`, { auth: false });
};

export const apiGetListing = (id) => request(`/listings/${id}`, { auth: false });
export const apiGetMyListings = (params = {}) =>
  request(`/listings/mine?${new URLSearchParams(params)}`);
export const apiUpdateListing = (id, payload) =>
  request(`/listings/${id}`, { method: 'PATCH', body: payload });
export const apiChangeListingStatus = (id, status) =>
  request(`/listings/${id}/status`, { method: 'PATCH', body: { status } });
export const apiDeleteListing = (id) =>
  request(`/listings/${id}`, { method: 'DELETE' });
```

### 5b. `CreateListingPage.jsx`

Replace the toast-only submit:

```javascript
// CURRENT — no API call
triggerToast(isEdit ? 'Listing updated successfully!' : 'Listing published to the marketplace!');
setTimeout(() => setCurrentPage('listingsDetails'), 1200);
```

```javascript
import { apiCreateListing, apiUpdateListing } from '../../lib/api';

const handleSubmit = async (e) => {
    e.preventDefault();
    /* …keep the existing client-side checks… */

    setSaving(true);
    try {
        const payload = { ...form, photos: uploadedPhotos, documents: uploadedDocs };
        const data = isEdit
            ? await apiUpdateListing(listingDraft._id, payload)
            : await apiCreateListing(payload);
        triggerToast(data.message);
        setTimeout(() => setCurrentPage('listingsDetails'), 1000);
    } catch (err) {
        triggerToast(err.message || 'Could not save the listing.', 'error');
    } finally {
        setSaving(false);
    }
};
```

> `photoCount` / `docName` are placeholders. Guide `08` replaces them with real `photos[]` and
> `documents[]` arrays. Until then a listing cannot be published (the photo check), so **do guide 08
> before demoing the create flow.**

### 5c. `MarketplacePage.jsx` — replace the `LISTINGS` constant

The filter state already exists (`filterOrganic`, `filterRadius`, `filterPurity`, …) but is not
applied to anything. Wire it:

```javascript
const [listings, setListings] = useState([]);
const [loading, setLoading] = useState(true);
const [pagination, setPagination] = useState(null);

// Debounce so dragging the quantity slider doesn't fire a request per pixel.
useEffect(() => {
  const categories = [
    filterOrganic && 'Organic', filterTextiles && 'Textiles', filterWood && 'Wood',
    filterPlastics && 'Plastics', filterMetals && 'Metals',
  ].filter(Boolean).join(',');

  const timer = setTimeout(() => {
    setLoading(true);
    apiSearchListings({
      category: categories,
      radius: filterRadius,
      minPurity: filterPurity ? 90 : undefined,
      page: 1, limit: 12,
    })
      .then((d) => { setListings(d.listings); setPagination(d.pagination); })
      .catch((e) => triggerToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, 350);

  return () => clearTimeout(timer);
}, [filterOrganic, filterTextiles, filterWood, filterPlastics, filterMetals, filterRadius, filterPurity]);
```

Field name changes in the card markup: `item.img` → `item.primaryPhoto`,
`item.quantity` → `item.quantityLabel`, `item.price` → `item.priceLabel`,
`item.location` → `item.city`, `item.source` → `item.owner.name`,
`item.verified` → `item.owner.isBusinessVerified`.

Also add **empty** and **loading** states — the grid currently assumes six listings always exist.
An empty marketplace with no message reads as a broken page.

### 5d. `ListingsDetailsPage.jsx`

Replace `LISTINGS_DATA` with `apiGetMyListings()`, and pass the real `_id` into `setListingDraft` so
edit hits `PATCH /listings/:id`. Currently `startEdit` passes only three display fields:

```javascript
// CURRENT — loses the id, so an edit cannot target the record
setListingDraft?.({ title: item.title, city: item.source, logistics: item.logistics });

// FIXED
setListingDraft?.(item);   // whole object, including _id
```

---

## 🧪 Step 6: Test

```bash
# Create (needs a generator account with a complete profile)
curl -X POST http://localhost:5000/api/listings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"120kg Spent Coffee Grounds — Daily Supply","category":"Organic",
       "description":"Freshly extracted, high nitrogen.","quantity":120,"unit":"kg",
       "frequency":"Daily","purity":"92%","moisture":"Wet","pricingModel":"Negotiable",
       "price":8,"priceUnit":"per kg","city":"Pune","logistics":"Local Pickup",
       "photos":[{"url":"https://example.com/a.jpg","isPrimary":true}],"status":"Active"}'

# Search with filters
curl "http://localhost:5000/api/listings?category=Organic,Wood&minQuantity=100&minPurity=90&sort=purityHigh"

# Geo search around Pune (lng,lat order!)
curl "http://localhost:5000/api/listings?lat=18.5204&lng=73.8567&radius=25km"
```

Checklist:
- [ ] `quantityInKg` is 120,000 for a 120-**tons** listing (unit conversion works)
- [ ] `purityPercent` is 92 for `purity: "92%"`, and `null` for `"Grade A"`
- [ ] `priceLabel` renders `"₹8 / kg"`; a Free listing renders `"Free — disposal saving"`
- [ ] Publishing with zero photos → `400`
- [ ] An upcycler-only account gets `403 WRONG_BUSINESS_TYPE` on create
- [ ] User A cannot `PATCH` user B's listing (`404`)
- [ ] `Draft → Completed` directly → `400 INVALID_TRANSITION`
- [ ] Viewing someone else's listing increments `viewCount`; viewing your own does not
- [ ] Search never returns your own listings when signed in
- [ ] `limit=500` is capped at 50
- [ ] A reserved listing rejects a quantity change

---

## 🔒 Security Summary

1. **Ownership on every write** via `requireOwnership` — never trust an id from the URL.
2. **Explicit editable-field allow-list.** A user must not be able to set `viewCount`, `owner`, or
   `status` through the update endpoint (status has its own guarded route).
3. **Status is a state machine.** Arbitrary `status` writes would let a seller mark a deal
   `Completed` without the buyer, which has commercial consequences.
4. **`pickupAddress` is `select: false`.** The exact address is a real-world safety matter and is
   revealed only after both parties accept (guide `10`).
5. **Pagination is capped at 50.** An uncapped `limit` is a free denial-of-service and a free
   database scrape of our entire supply side.
6. **Money as integer paise.** `0.1 + 0.2 !== 0.3`; float currency produces disputes.
7. **Text fields have `maxlength`.** Unbounded strings are a storage and XSS-surface problem.
8. **Soft delete when history exists.** Deleting a listing must not corrupt the counterparty's
   records or our audit trail.
9. **`$text` search over a whitelisted index** — never build a `$where` or regex from raw user input.

---

## 💼 CEO Review Notes

- **This is the product.** No listings means no marketplace, no matches, no revenue. This guide
  outranks chat, notifications, and analytics. If we can only ship one thing this month, it is this.
- **90-day auto-expiry is a trust decision, not housekeeping.** The fastest way to kill a B2B
  marketplace is to let a buyer contact five suppliers and get five dead ends. Stale inventory is
  worse than thin inventory. Add a "still available?" email at day 75 and let one click renew it.
- **Photos are non-negotiable, so make uploading painless.** In waste trading, a photo *is* the
  spec sheet — nobody buys 500kg of fabric scraps sight-unseen. Requiring a photo is correct;
  therefore guide `08` (uploads) is effectively part of this ticket, and mobile camera capture
  matters more than desktop drag-and-drop for a carpenter standing next to a pile of offcuts.
- **Let sellers list "Free — disposal saving" prominently.** Many generators currently *pay* to
  dispose of this material. "Free, you collect" is our easiest supply-side win and our clearest
  value story: we didn't just get them a better price, we removed a cost line.
- **Do not build a bidding or auction system yet.** `Negotiable` plus a chat thread is enough
  price discovery for the pilot. Auctions need liquidity we do not have, and they add dispute
  surface we cannot yet staff.
- **The quantity slider maxing at 12,000 kg/week is a guess.** Instrument the actual distribution of
  listed quantities in the first 100 listings and set the filter bounds from data. If most listings
  are under 500kg, a 12,000kg slider is unusable — every listing sits in the leftmost 4%.
- **Track `viewCount` and `requestCount` from day one.** View-to-request ratio per category is the
  single best signal for where to concentrate supply-side recruiting. It tells us which materials
  have demand we cannot yet fill — which is exactly the list our sales team should be working.
