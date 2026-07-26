# User Model & Profile / Onboarding Guide

This guide rewrites the user schema so it actually stores what the built frontend reads, and
implements the onboarding + profile endpoints: `POST /api/profile/complete`, `GET /api/profile`,
`PATCH /api/profile`.

Prerequisites: guides `01`, `02`, `03`, `05`.

---

## 📌 The Mismatch

`PreferencesPage.jsx` sends this payload to `POST /profile/complete`:

```javascript
const payload = {
  businessTypes: { generator: isGenerator, upcycler: isUpcycler },
  businessDetails,     // { industry, companySize, address, city, serviceRadius, gstNumber, docName }
  generatorInfo,       // { byproducts, volume, frequency }
  upcyclerInfo,        // { feedstock, purity, minVolume, maxVolume, maxDistance }
  materials,           // [ { id, name, selection: 'primary'|'secondary'|'none' } ]
};
```

`ProfilePage.jsx` reads these back:

```javascript
user.personalDetails.{fullName, designation, phone, location, company}
user.businessDetails.{city, industry, companySize}
user.businessTypes.{generator, upcycler}
user.materials[]        // filtered by selection !== 'none', mapped by m.id
user.createdAt          // "Member Since"
user.profileCompleted   // gate in PreferencesPage + SignInPage + VerifyEmailPage
```

**None of those fields exist in `src/model/user.js`.** The current schema instead stores
`GSTIN`, `IMPORT_EXPORT_Code`, `preferredPortAndAirport`, `bankDetails`, `FieldOfInterest` — an
import/export seller model that does not match this product at all.

### Also wrong: the role model

```javascript
// domain/Roles.js — current
ADMIN, BUYER, SELLER
```

The product has **Generator**, **Upcycler**, or **Both** (`changes.md` §1, and
`PreferencesPage.jsx` lets a user select both). `BUYER`/`SELLER` cannot express "both", and
`completeProfile` currently *requires* one of them:

```javascript
const allowedRoles = [UserRoles.BUYER, UserRoles.SELLER];
if (!profileData.role || !allowedRoles.includes(profileData.role)) throw ...
```

The frontend never sends `role`, so **onboarding fails 100% of the time today.**

### Fix: separate access role from business type

| Concept | Field | Values | Purpose |
|---------|-------|--------|---------|
| Access control | `role` | `ROLE_USER`, `ROLE_ADMIN`, `ROLE_MODERATOR` | Who can touch admin endpoints |
| Marketplace side | `businessTypes` | `{ generator: bool, upcycler: bool }` | What actions are available |

A user can be both a generator and an upcycler — which is common (a brewery sells spent grain *and*
buys packaging material) and is exactly the "Both" case the UI already supports.

---

## 🗄️ Step 1: The Rewritten User Model (`src/model/user.js`)

```javascript
const mongoose = require('mongoose');
const UserRoles = require('../domain/Roles');
const accountStatus = require('../domain/accountStatus');

/* ---------- Sub-schemas ---------- */

// Contact person. Separate from business identity: the person can change,
// the company does not.
const personalDetailsSchema = new mongoose.Schema({
    fullName:    { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    phone:       { type: String, trim: true, default: '' },
    location:    { type: String, trim: true, default: '' },
    company:     { type: String, trim: true, default: '' },
}, { _id: false });

const businessDetailsSchema = new mongoose.Schema({
    industry: {
        type: String,
        enum: ['cafe', 'brewery', 'textile', 'carpentry', 'food', 'packaging', 'manufacturing', 'other', ''],
        default: ''
    },
    companySize: {
        type: String,
        enum: ['micro', 'small', 'medium', 'large', ''],
        default: ''
    },
    address:       { type: String, trim: true, default: '' },
    city:          { type: String, trim: true, default: '', index: true },
    state:         { type: String, trim: true, default: '' },
    pincode:       { type: String, trim: true, default: '' },
    serviceRadius: { type: String, default: '25km' },      // '10km' | '25km' | '50km' | '100km' | '100km+'
    gstNumber:     { type: String, trim: true, uppercase: true, default: '' },
    documents: [{
        name: String,
        url:  String,
        type: { type: String, enum: ['registration', 'license', 'gst', 'other'], default: 'other' },
        uploadedAt: { type: Date, default: Date.now },
    }],
}, { _id: false });

// Generator = has byproducts to sell.
const generatorInfoSchema = new mongoose.Schema({
    byproducts: { type: String, trim: true, default: '' },
    volume:     { type: String, trim: true, default: '' },
    frequency:  { type: String, enum: ['One-time', 'Daily', 'Weekly', 'Monthly', ''], default: 'Weekly' },
}, { _id: false });

// Upcycler = needs feedstock. These fields are the ML matcher's inputs (guide 12).
const upcyclerInfoSchema = new mongoose.Schema({
    feedstock:   { type: String, trim: true, default: '' },
    purity:      { type: String, trim: true, default: '' },
    minVolume:   { type: String, trim: true, default: '' },
    maxVolume:   { type: String, trim: true, default: '' },
    maxDistance: { type: String, default: '50km' },
}, { _id: false });

const materialInterestSchema = new mongoose.Schema({
    id:   { type: String, required: true },   // 'coffee' | 'textiles' | 'wood' | 'plastics' | 'metals' | 'grain'
    name: { type: String, required: true },   // display label, kept so new materials need no deploy
    selection: {
        type: String,
        enum: ['primary', 'secondary', 'none'],
        default: 'secondary'
    },
}, { _id: false });

/* ---------- Main schema ---------- */

const userSchema = new mongoose.Schema({
    /* --- Identity --- */
    // SignUpPage sends `name` (company OR person). Keep `name` as canonical
    // and mirror to businessName so existing registration code keeps working.
    name:         { type: String, required: [true, 'Name is required'], trim: true },
    businessName: { type: String, trim: true },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false,               // never returned unless explicitly asked for
    },
    avatarUrl: { type: String, default: null },

    /* --- Email verification (guide 05) --- */
    isEmailVerified:          { type: Boolean, default: false },
    emailVerifiedAt:          { type: Date, default: null },
    emailVerificationToken:   { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null, select: false },
    verificationEmailsSent:   { type: Number, default: 0 },
    lastVerificationEmailAt:  { type: Date, default: null },
    pendingEmail:             { type: String, default: null, lowercase: true, trim: true },
    pendingEmailToken:        { type: String, default: null, select: false },
    pendingEmailExpires:      { type: Date, default: null, select: false },

    /* --- Phone (for logistics; OTP-verified, guide 05) --- */
    phoneNumber:     { type: String, trim: true, default: null },
    isPhoneVerified: { type: Boolean, default: false },

    /* --- Password reset (guide 04) --- */
    passwordResetToken:   { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    passwordChangedAt:    { type: Date, default: null },

    /* --- Session security (guide 03) --- */
    lastLoginAt:         { type: Date, default: null },
    lastLoginIp:         { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil:         { type: Date, default: null, select: false },
    tokenVersion:        { type: Number, default: 0, select: false },

    /* --- Onboarding / profile --- */
    profileCompleted:   { type: Boolean, default: false },   // read by 3 frontend pages
    profileCompletedAt: { type: Date, default: null },

    businessTypes: {
        generator: { type: Boolean, default: false },
        upcycler:  { type: Boolean, default: false },
    },

    personalDetails: { type: personalDetailsSchema, default: () => ({}) },
    businessDetails: { type: businessDetailsSchema, default: () => ({}) },
    generatorInfo:   { type: generatorInfoSchema,   default: () => ({}) },
    upcyclerInfo:    { type: upcyclerInfoSchema,    default: () => ({}) },
    materials:       { type: [materialInterestSchema], default: [] },

    /**
     * GeoJSON point for $near distance queries — the core input to the
     * compatibility score. NOTE: GeoJSON order is [longitude, latitude].
     * Getting that backwards silently puts every business in the wrong place.
     */
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: undefined      // undefined, not [0,0] — [0,0] is a real place in the ocean
        },
        formattedAddress: { type: String, default: '' },
    },

    /* --- Trust & verification --- */
    isBusinessVerified: { type: Boolean, default: false },   // real KYB, not email
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified',
    },
    verificationNote: { type: String, default: '' },         // admin reason on rejection

    /* --- Denormalised counters (kept in sync on write; see guide 13) --- */
    stats: {
        activeListings:  { type: Number, default: 0 },
        completedDeals:  { type: Number, default: 0 },
        totalViews:      { type: Number, default: 0 },
        ratingAvg:       { type: Number, default: 0 },
        ratingCount:     { type: Number, default: 0 },
        avgResponseMins: { type: Number, default: null },
    },

    /* --- Preferences --- */
    notificationPrefs: {
        emailMatches:  { type: Boolean, default: true },
        emailMessages: { type: Boolean, default: true },
        emailDeals:    { type: Boolean, default: true },
        emailMarketing:{ type: Boolean, default: false },
    },

    /* --- Access control --- */
    role: {
        type: String,
        enum: Object.values(UserRoles),
        default: UserRoles.USER,
    },
    accountStatus: {
        type: String,
        enum: Object.values(accountStatus),
        default: accountStatus.PENDING_VERIFICATION,
    },

    /* --- Legacy fields: kept so the existing registration code and any
           seeded data keep working. Do not build new features on these. --- */
    GSTIN:                   { type: String, default: null },
    IMPORT_EXPORT_Code:      { type: String, default: null },
    preferredPortAndAirport: { type: String, default: null },
    FieldOfInterest:         { type: String, default: null },
    bankDetails: {
        accountHolderName: { type: String, default: null },
        accountNumber:     { type: String, default: null },
        bankName:          { type: String, default: null },
        ifscCode:          { type: String, default: null },
    },
    address: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }],

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

/* ---------- Indexes ---------- */
// `email` already has a unique index from `unique: true` — do not re-declare it.
userSchema.index({ location: '2dsphere' });                       // $near queries
userSchema.index({ 'businessDetails.city': 1, profileCompleted: 1 });
userSchema.index({ 'materials.id': 1, 'businessTypes.upcycler': 1 }); // match candidates
userSchema.index({ accountStatus: 1, createdAt: -1 });            // admin lists

/* ---------- Virtuals ---------- */

// 'Generator' | 'Upcycler' | 'Both' | 'None' — mirrors PreferencesPage's roleLabel.
userSchema.virtual('roleLabel').get(function () {
    const g = this.businessTypes?.generator;
    const u = this.businessTypes?.upcycler;
    if (g && u) return 'Both';
    if (g) return 'Generator';
    if (u) return 'Upcycler';
    return 'None';
});

// Server-side twin of ProfilePage's computeCompletion(), so the frontend and
// backend can never disagree about what "80% complete" means.
userSchema.virtual('profileCompletion').get(function () {
    const pd = this.personalDetails || {};
    const bd = this.businessDetails || {};
    const fields = [
        pd.fullName || this.name, pd.designation, this.email, pd.phone || this.phoneNumber,
        pd.location || bd.city, pd.company, bd.industry, bd.companySize,
    ];
    const filled = fields.filter((v) => v && String(v).trim()).length;
    return Math.round((filled / fields.length) * 100);
});

/* ---------- Hooks ---------- */

// Keep name/businessName in sync so old code reading businessName still works.
userSchema.pre('save', function (next) {
    if (this.isModified('name') && !this.isModified('businessName')) {
        this.businessName = this.name;
    } else if (this.isModified('businessName') && !this.name) {
        this.name = this.businessName;
    }
    next();
});

module.exports = mongoose.model('user', userSchema);
```

---

## 🔑 Step 2: Update `src/domain/Roles.js`

```javascript
const Roles = Object.freeze({
    ADMIN:     'ROLE_ADMIN',
    MODERATOR: 'ROLE_MODERATOR',   // can review KYB / moderate listings
    USER:      'ROLE_USER',        // every marketplace participant

    // Deprecated — kept only so existing documents don't fail enum validation.
    // Business side is now expressed by businessTypes.{generator,upcycler}.
    BUYER:  'ROLE_BUYER',
    SELLER: 'ROLE_SELLER',
});

module.exports = Roles;
```

### One-off migration script (`src/util/migrations/001_roles_to_businessTypes.js`)

```javascript
/**
 * Maps legacy ROLE_BUYER / ROLE_SELLER documents onto the new model.
 * Idempotent — safe to run more than once.
 * Run with: node src/util/migrations/001_roles_to_businessTypes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../model/user');
const Roles = require('../../domain/Roles');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const sellers = await User.updateMany(
        { role: Roles.SELLER },
        { $set: { role: Roles.USER, 'businessTypes.generator': true } }
    );
    const buyers = await User.updateMany(
        { role: Roles.BUYER },
        { $set: { role: Roles.USER, 'businessTypes.upcycler': true } }
    );
    // Legacy accounts with no role at all become plain users.
    const nulls = await User.updateMany(
        { role: null },
        { $set: { role: Roles.USER } }
    );

    console.log(`sellers: ${sellers.modifiedCount}, buyers: ${buyers.modifiedCount}, nulls: ${nulls.modifiedCount}`);
    await mongoose.disconnect();
})();
```

---

## ⚡ Step 3: Profile Service (`src/services/profileServices.js`)

```javascript
const User = require('../model/user');
const AppError = require('../util/AppError');
const { sanitizeUser } = require('./authServices');
const { geocodeAddress } = require('../util/geocode');

const VALID_MATERIAL_IDS = ['coffee', 'textiles', 'wood', 'plastics', 'metals', 'grain'];

class ProfileServices {

    async getProfile(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw AppError.notFound('User not found.');
        return sanitizeUser(user);
    }

    /**
     * POST /api/profile/complete — the onboarding submit from PreferencesPage.
     *
     * Returns 409 when already complete: PreferencesPage.jsx explicitly handles
     * `err.status === 409` by treating it as done and redirecting to /dashboard.
     */
    async completeProfile(userId, payload) {
        const user = await User.findById(userId);
        if (!user) throw AppError.notFound('User not found.');

        if (!user.isEmailVerified) {
            throw AppError.forbidden('Please verify your email address first.', 'EMAIL_NOT_VERIFIED');
        }
        if (user.profileCompleted) {
            throw AppError.conflict('Your profile is already complete.', 'PROFILE_ALREADY_COMPLETE');
        }

        const { businessTypes, businessDetails, generatorInfo, upcyclerInfo, materials } = payload;

        /* ---- Validate: mirror the client-side rules in validateBusinessStep() ---- */
        if (!businessTypes?.generator && !businessTypes?.upcycler) {
            throw AppError.badRequest('Select at least one business type (Generator or Upcycler).');
        }
        if (!businessDetails?.industry) {
            throw AppError.badRequest('Please select your industry / category.');
        }
        if (!businessDetails?.city?.trim()) {
            throw AppError.badRequest('Please enter your operating city.');
        }

        user.businessTypes = {
            generator: !!businessTypes.generator,
            upcycler:  !!businessTypes.upcycler,
        };

        user.businessDetails = {
            ...user.businessDetails.toObject(),
            industry:      businessDetails.industry,
            companySize:   businessDetails.companySize || '',
            address:       businessDetails.address?.trim() || '',
            city:          businessDetails.city.trim(),
            serviceRadius: businessDetails.serviceRadius || '25km',
            gstNumber:     businessDetails.gstNumber?.trim().toUpperCase() || '',
        };

        // PreferencesPage sends only `docName` (a filename) because uploads
        // aren't wired yet. Record it as a placeholder; guide 08 replaces this
        // with a real Cloudinary URL.
        if (businessDetails.docName) {
            user.businessDetails.documents = [{
                name: businessDetails.docName,
                url: '',
                type: 'registration',
            }];
        }

        // Declaring a GST number moves them into the KYB review queue.
        if (user.businessDetails.gstNumber) {
            user.verificationStatus = 'pending';
        }

        if (user.businessTypes.generator && generatorInfo) {
            user.generatorInfo = {
                byproducts: generatorInfo.byproducts?.trim() || '',
                volume:     generatorInfo.volume?.trim() || '',
                frequency:  generatorInfo.frequency || 'Weekly',
            };
        }

        if (user.businessTypes.upcycler && upcyclerInfo) {
            user.upcyclerInfo = {
                feedstock:   upcyclerInfo.feedstock?.trim() || '',
                purity:      upcyclerInfo.purity?.trim() || '',
                minVolume:   upcyclerInfo.minVolume?.trim() || '',
                maxVolume:   upcyclerInfo.maxVolume?.trim() || '',
                maxDistance: upcyclerInfo.maxDistance || '50km',
            };
        }

        // Whitelist material ids — never trust a client-supplied key that we
        // later use in an index lookup.
        if (Array.isArray(materials)) {
            user.materials = materials
                .filter((m) => VALID_MATERIAL_IDS.includes(m.id))
                .map((m) => ({
                    id: m.id,
                    name: m.name || m.id,
                    selection: ['primary', 'secondary', 'none'].includes(m.selection)
                        ? m.selection : 'secondary',
                }));
        }

        // Geocode for distance matching. Best-effort: a geocoder outage must
        // never block onboarding — we can backfill with a cron job.
        const addressLine = [user.businessDetails.address, user.businessDetails.city, 'India']
            .filter(Boolean).join(', ');
        try {
            const geo = await geocodeAddress(addressLine);
            if (geo) {
                user.location = {
                    type: 'Point',
                    coordinates: [geo.lng, geo.lat],   // [lng, lat] — GeoJSON order
                    formattedAddress: geo.formattedAddress,
                };
            }
        } catch (err) {
            console.warn(`Geocoding failed for user ${userId}: ${err.message}`);
        }

        user.profileCompleted = true;
        user.profileCompletedAt = new Date();
        if (user.accountStatus === 'PENDING_VERIFICATION') user.accountStatus = 'ACTIVE';

        await user.save();

        const activeCount = user.materials.filter((m) => m.selection !== 'none').length;
        return {
            message: `Profile saved as ${user.roleLabel}! ${activeCount} material interests selected.`,
            user: sanitizeUser(user),
        };
    }

    /**
     * PATCH /api/profile — partial update from ProfilePage.
     *
     * Explicit allow-list. A blind `findByIdAndUpdate(id, req.body)` would let
     * a user set their own `role: 'ROLE_ADMIN'` or `isBusinessVerified: true`.
     */
    async updateProfile(userId, payload) {
        const user = await User.findById(userId);
        if (!user) throw AppError.notFound('User not found.');

        if (payload.personalDetails) {
            const pd = payload.personalDetails;
            if (pd.fullName !== undefined) {
                if (!pd.fullName.trim()) throw AppError.badRequest('Full name cannot be empty.');
                user.personalDetails.fullName = pd.fullName.trim();
            }
            if (pd.designation !== undefined) user.personalDetails.designation = pd.designation.trim();
            if (pd.phone !== undefined) {
                const phone = pd.phone.trim();
                if (phone && !/^[+]?[\d\s-]{7,15}$/.test(phone)) {
                    throw AppError.badRequest('Please enter a valid phone number.');
                }
                user.personalDetails.phone = phone;
                // Changing the number invalidates prior verification.
                if (phone !== user.phoneNumber) {
                    user.phoneNumber = phone;
                    user.isPhoneVerified = false;
                }
            }
            if (pd.location !== undefined) user.personalDetails.location = pd.location.trim();
            if (pd.company !== undefined) user.personalDetails.company = pd.company.trim();
        }

        if (payload.businessDetails) {
            const bd = payload.businessDetails;
            const ALLOWED = ['industry', 'companySize', 'address', 'city', 'state',
                             'pincode', 'serviceRadius', 'gstNumber'];
            let addressChanged = false;
            ALLOWED.forEach((key) => {
                if (bd[key] !== undefined) {
                    user.businessDetails[key] = key === 'gstNumber'
                        ? String(bd[key]).trim().toUpperCase()
                        : bd[key];
                    if (key === 'address' || key === 'city') addressChanged = true;
                }
            });
            // Re-geocode only when the address actually moved.
            if (addressChanged) {
                try {
                    const geo = await geocodeAddress(
                        [user.businessDetails.address, user.businessDetails.city, 'India']
                            .filter(Boolean).join(', ')
                    );
                    if (geo) {
                        user.location = {
                            type: 'Point',
                            coordinates: [geo.lng, geo.lat],
                            formattedAddress: geo.formattedAddress,
                        };
                    }
                } catch { /* keep the old coordinates */ }
            }
        }

        if (payload.businessTypes) {
            const bt = payload.businessTypes;
            const next = {
                generator: bt.generator !== undefined ? !!bt.generator : user.businessTypes.generator,
                upcycler:  bt.upcycler  !== undefined ? !!bt.upcycler  : user.businessTypes.upcycler,
            };
            if (!next.generator && !next.upcycler) {
                throw AppError.badRequest('You must remain at least a Generator or an Upcycler.');
            }
            user.businessTypes = next;
        }

        if (Array.isArray(payload.materials)) {
            user.materials = payload.materials
                .filter((m) => VALID_MATERIAL_IDS.includes(m.id))
                .map((m) => ({ id: m.id, name: m.name || m.id, selection: m.selection || 'secondary' }));
        }

        if (payload.generatorInfo) Object.assign(user.generatorInfo, payload.generatorInfo);
        if (payload.upcyclerInfo)  Object.assign(user.upcyclerInfo,  payload.upcyclerInfo);
        if (payload.notificationPrefs) Object.assign(user.notificationPrefs, payload.notificationPrefs);
        if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl;

        // Deliberately NOT settable here: email (guide 05), password (guides 03/04),
        // role, accountStatus, isEmailVerified, isBusinessVerified, stats.

        await user.save();
        return { message: 'Profile details updated successfully!', user: sanitizeUser(user) };
    }

    /** GET /api/profile/:id — the public company page other businesses see. */
    async getPublicProfile(userId) {
        const user = await User.findById(userId).select(
            'name businessName avatarUrl businessTypes materials stats isBusinessVerified ' +
            'verificationStatus createdAt businessDetails.city businessDetails.industry ' +
            'businessDetails.companySize personalDetails.designation personalDetails.company'
        );
        if (!user) throw AppError.notFound('Business not found.');
        // Note the omissions: no email, no phone, no GST, no bank details.
        // A public profile is a marketing page, not a data dump.
        return user;
    }
}

module.exports = new ProfileServices();
```

---

## 🌍 Step 4: Geocoding Utility (`src/util/geocode.js`)

Distance is a primary matching input (`changes.md` §4), so an address must become coordinates.

```javascript
const env = require('../config/env');

/**
 * Address → { lat, lng, formattedAddress } or null.
 *
 * Uses OpenStreetMap Nominatim: free, no API key, good enough for Indian
 * cities. Terms of use require a real User-Agent and max 1 request/second —
 * fine for onboarding volume; swap for Google Geocoding or MapMyIndia when
 * we outgrow it.
 */
const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) return null;

    const url = 'https://nominatim.openstreetmap.org/search'
        + `?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;

    const res = await fetch(url, {
        headers: { 'User-Agent': 'EcoMatch/1.0 (support@ecomatch.in)' },
        signal: AbortSignal.timeout(5000),   // never hang onboarding on a slow third party
    });
    if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);

    const results = await res.json();
    if (!results.length) return null;

    return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        formattedAddress: results[0].display_name,
    };
};

/** Haversine distance in km — used by the matcher when we already have both points. */
const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

module.exports = { geocodeAddress, distanceKm };
```

> `fetch` is global from Node 18. Check with `node -v`; on Node 16 add `node-fetch`.

---

## 🚦 Step 5: Controller & Routes

`src/controller/profileController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const profileServices = require('../services/profileServices');

class ProfileController {
    getProfile = asyncHandler(async (req, res) => {
        const user = await profileServices.getProfile(req.user._id);
        res.status(200).json({ success: true, user });
    });

    completeProfile = asyncHandler(async (req, res) => {
        const result = await profileServices.completeProfile(req.user._id, req.body);
        res.status(200).json({ success: true, ...result });
    });

    updateProfile = asyncHandler(async (req, res) => {
        const result = await profileServices.updateProfile(req.user._id, req.body);
        res.status(200).json({ success: true, ...result });
    });

    getPublicProfile = asyncHandler(async (req, res) => {
        const user = await profileServices.getPublicProfile(req.params.id);
        res.status(200).json({ success: true, user });
    });
}
module.exports = new ProfileController();
```

`src/routes/profileRoutes.js` — mounted at `/api/profile`:

```javascript
const express = require('express');
const router = express.Router();

const ProfileController = require('../controller/profileController');
const { authenticate, requireVerifiedEmail, optionalAuth } = require('../middleware/auth');

// Public company page — anyone can view a business.
router.get('/public/:id', optionalAuth, ProfileController.getPublicProfile);

router.use(authenticate);

router.get('/', ProfileController.getProfile);                                  // GET  /api/profile
router.post('/complete', requireVerifiedEmail, ProfileController.completeProfile); // POST /api/profile/complete
router.patch('/', ProfileController.updateProfile);                             // PATCH /api/profile

module.exports = router;
```

These paths match `lib/api.js` exactly (`apiGetProfile`, `apiCompleteProfile`, `apiUpdateProfile`).

---

## 🔁 Step 6: Rewrite `initiateSignup`

The current version expects `businessName`; the frontend sends `name`. Accept both.

```javascript
async initiateSignup(data) {
    const name = (data.name || data.businessName || '').trim();
    if (!name) throw AppError.badRequest('Company or full name is required.');
    if (!data.email) throw AppError.badRequest('Email address is required.');
    if (!data.password) throw AppError.badRequest('Password is required.');
    if (data.password !== data.confirmPassword) {
        throw AppError.badRequest('Passwords do not match.');
    }
    if (data.password.length < 8) {
        throw AppError.badRequest('Password must be at least 8 characters.');
    }

    const normalizedEmail = data.email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

    if (existingUser?.isEmailVerified) {
        throw AppError.conflict('An account with this email address already exists.', 'EMAIL_TAKEN');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // An unverified record can be re-registered — someone who typo'd their
    // password and abandoned signup must not be permanently blocked.
    let userRecord = existingUser;
    if (!userRecord) {
        userRecord = await User.create({
            name,
            businessName: name,
            email: normalizedEmail,
            password: hashedPassword,
            personalDetails: { company: name },
        });
    } else {
        userRecord.name = name;
        userRecord.businessName = name;
        userRecord.password = hashedPassword;
        await userRecord.save();
    }

    await verificationServices.issueVerificationToken(userRecord);

    return {
        message: 'Account created! Please check your email to verify your address.',
        token: jwtProvider.createAuthToken(userRecord),   // SignUpPage does setToken(data.token)
        user: sanitizeUser(userRecord),
    };
}
```

---

## 🖥️ Step 7: Frontend Notes

`PreferencesPage.jsx` and `ProfilePage.jsx` need **no changes** — they already send and read the
right shapes. Two small gaps worth closing:

1. **`PreferencesPage` never collects a phone number**, but `changes.md` §2a flags it as needed for
   logistics and OTP, and `ProfilePage` displays it. Add a phone field to the Business Info step.
2. **`ProfilePage` hardcodes** `LISTINGS`, `REVIEWS`, and `4.8 · 52 reviews` while correctly
   deriving materials and role tags from the API. Wire those to `/api/listings/mine` (guide `07`)
   and `user.stats` once populated. The hardcoded "Verified" badge in particular should read
   `user.isBusinessVerified` — see the CEO note in guide `05`.

---

## 🧪 Step 8: Test

```bash
# Complete onboarding with the exact payload PreferencesPage sends
curl -X POST http://localhost:5000/api/profile/complete \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "businessTypes": { "generator": true, "upcycler": true },
    "businessDetails": { "industry":"cafe","companySize":"micro",
      "address":"Lane 5, Koregaon Park","city":"Pune","serviceRadius":"25km",
      "gstNumber":"27ABCDE1234F1Z5","docName":"gst.pdf" },
    "generatorInfo": { "byproducts":"Spent coffee grounds","volume":"120 kg","frequency":"Daily" },
    "upcyclerInfo": { "feedstock":"Compostable packaging","purity":"90%+","maxDistance":"50km" },
    "materials": [ {"id":"coffee","name":"Coffee","selection":"primary"},
                   {"id":"wood","name":"Wood","selection":"none"} ]
  }'

# Second call → 409 (frontend treats this as "already done")
```

Checklist:
- [ ] `profileCompleted` flips to `true`; `roleLabel` is `"Both"`
- [ ] `location.coordinates` is populated `[lng, lat]` for a Pune address
- [ ] Repeat call → `409` and the UI redirects to `/dashboard`
- [ ] Unverified email → `403 EMAIL_NOT_VERIFIED`
- [ ] Neither business type selected → `400`
- [ ] `PATCH /api/profile` with `{ role: 'ROLE_ADMIN' }` **silently ignores it** (verify in the DB)
- [ ] An unknown material id is dropped, not stored
- [ ] `GET /api/profile/public/:id` returns **no** email, phone, GST, or bank details
- [ ] Run the migration; no legacy user is left on `ROLE_BUYER`/`ROLE_SELLER`

---

## 🔒 Security Summary

1. **Explicit field allow-lists on update.** Never `findByIdAndUpdate(id, req.body)` — that is
   privilege escalation waiting to happen (`role`, `isBusinessVerified`, `stats`).
2. **`password` is `select: false`** at the schema level, so forgetting `-password` once is no
   longer a breach.
3. **Public profiles omit PII.** GST number, bank details, email, and phone are never in the public
   payload. Contact details are revealed only after both sides accept a deal (guide `10`).
4. **Material ids are whitelisted** before they reach an indexed query.
5. **Server-side validation mirrors the client's.** `validateBusinessStep()` in the browser is UX;
   this is the enforcement.
6. **Changing a phone number resets `isPhoneVerified`.** A verification flag must never survive the
   value it verified.
7. **GST numbers are stored uppercase and trimmed** so KYB lookups are deterministic. Format
   validation: `/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/`.
8. **Geocoding has a 5-second timeout** and can never block onboarding.

---

## 💼 CEO Review Notes

- **Fixing this schema unblocks everything.** Onboarding fails 100% of the time today because
  `completeProfile` demands a `role` the frontend never sends. Until this ships we have a marketplace
  where nobody can finish signing up. Top of the backlog, no debate.
- **Two-step onboarding is already good; do not add a third.** Every field we add costs completion
  rate. If a field isn't used by the matching engine, the trust badge, or logistics, it does not
  belong in onboarding — collect it later, in context.
- **Collect the phone number here.** It is the one field I would add, because it is the difference
  between a deal that completes and a deal that stalls. Indian SMB coordination happens on WhatsApp,
  not email.
- **"Both" accounts are our best users, not an edge case.** A brewery that sells spent grain and
  buys packaging is two-sided liquidity in one signup. The schema now supports it — make sure the
  dashboard and marketplace UI treat "Both" as first-class rather than showing a generator-only view.
- **`profileCompletion` is a growth lever.** `changes.md` already suggests it: show the percentage,
  tell them exactly which field is missing, and state the benefit ("+12% match accuracy"). Nudging
  a 60% profile to 90% costs us nothing and measurably improves match quality.
- **`stats` denormalisation is a deliberate trade.** Live `countDocuments` on every dashboard load
  will not survive growth. Accept counters that can drift slightly, and run a nightly reconciliation
  job (guide `13`).
- **Do not collect bank details until we actually move money.** The legacy `bankDetails` fields are
  dormant — leave them that way. Holding financial data we don't use is pure liability: it raises
  our compliance burden and our breach blast radius with zero product benefit.
