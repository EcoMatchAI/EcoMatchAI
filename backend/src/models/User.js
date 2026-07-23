import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateRawToken, hashToken } from '../utils/cryptoToken.js';

// How long an email verification / change link stays valid (minutes).
const VERIFICATION_TTL_MIN = 30;

/* ============================================================================
   Sub-schemas — mirror the frontend "Complete Your Business Profile" form
   (PreferencesPage.jsx) and the ProfilePage personal details.
   ============================================================================ */

// Personal / contact details (ProfilePage DETAIL_FIELDS)
const personalDetailsSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Business details (PreferencesPage businessDetails)
const businessDetailsSchema = new mongoose.Schema(
  {
    industry: {
      type: String,
      enum: ['cafe', 'brewery', 'textile', 'carpentry', 'food', 'packaging', 'manufacturing', 'other', ''],
      default: '',
    },
    companySize: {
      type: String,
      enum: ['micro', 'small', 'medium', 'large', ''],
      default: '',
    },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    serviceRadius: {
      type: String,
      enum: ['10km', '25km', '50km', '100km', '100km+'],
      default: '25km',
    },
    gstNumber: { type: String, trim: true, default: '' },
    docName: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Generator-specific info (PreferencesPage generatorInfo)
const generatorInfoSchema = new mongoose.Schema(
  {
    byproducts: { type: String, trim: true, default: '' },
    volume: { type: String, trim: true, default: '' },
    frequency: {
      type: String,
      enum: ['One-time', 'Daily', 'Weekly', 'Monthly'],
      default: 'Weekly',
    },
  },
  { _id: false }
);

// Upcycler-specific info (PreferencesPage upcyclerInfo)
const upcyclerInfoSchema = new mongoose.Schema(
  {
    feedstock: { type: String, trim: true, default: '' },
    purity: { type: String, trim: true, default: '' },
    minVolume: { type: String, trim: true, default: '' },
    maxVolume: { type: String, trim: true, default: '' },
    maxDistance: {
      type: String,
      enum: ['25km', '50km', '100km', '100km+'],
      default: '50km',
    },
  },
  { _id: false }
);

// Material interest (PreferencesPage materials)
const materialSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    selection: {
      type: String,
      enum: ['primary', 'secondary', 'none'],
      default: 'secondary',
    },
  },
  { _id: false }
);

/* ============================================================================
   User schema — auth credentials + embedded business profile
   ============================================================================ */
const userSchema = new mongoose.Schema(
  {
    // --- Auth / signup fields (SignUpPage.jsx) ---
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
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
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },

    // --- Profile completion gate ---
    profileCompleted: {
      type: Boolean,
      default: false,
    },

    // --- Business role (PreferencesPage selectedBusinessTypes) ---
    businessTypes: {
      generator: { type: Boolean, default: false },
      upcycler: { type: Boolean, default: false },
    },

    // --- Embedded profile sections ---
    personalDetails: { type: personalDetailsSchema, default: () => ({}) },
    businessDetails: { type: businessDetailsSchema, default: () => ({}) },
    generatorInfo: { type: generatorInfoSchema, default: () => ({}) },
    upcyclerInfo: { type: upcyclerInfoSchema, default: () => ({}) },
    materials: { type: [materialSchema], default: [] },

    // --- Email verification (signup) ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false }, // sha256 hash of the raw token
    emailVerificationExpires: { type: Date, select: false },
    emailVerificationSentAt: { type: Date, select: false }, // used for resend cooldown

    // --- Email change (authenticated) ---
    pendingEmail: { type: String, lowercase: true, trim: true, default: null },
    emailChangeToken: { type: String, select: false }, // sha256 hash of the raw token
    emailChangeExpires: { type: Date, select: false },
    emailChangeSentAt: { type: Date, select: false }, // used for resend cooldown
  },
  { timestamps: true }
);

/* ============================================================================
   Middleware & methods
   ============================================================================ */

// Hash password before save (only when modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plaintext password against the stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Create a fresh email-verification token. Stores the HASH on the document and
 * returns the RAW token (which goes into the emailed link). Calling this again
 * overwrites any previous token, invalidating the old link.
 * @returns {string} raw (unhashed) token
 */
userSchema.methods.createEmailVerificationToken = function () {
  const rawToken = generateRawToken();
  this.emailVerificationToken = hashToken(rawToken);
  this.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MIN * 60 * 1000);
  this.emailVerificationSentAt = new Date();
  return rawToken;
};

/**
 * Create a fresh email-change token for a new address. Stores the HASH + the
 * pending email, returns the RAW token for the link sent to the NEW address.
 * @param {string} newEmail
 * @returns {string} raw (unhashed) token
 */
userSchema.methods.createEmailChangeToken = function (newEmail) {
  const rawToken = generateRawToken();
  this.emailChangeToken = hashToken(rawToken);
  this.emailChangeExpires = new Date(Date.now() + VERIFICATION_TTL_MIN * 60 * 1000);
  this.emailChangeSentAt = new Date();
  this.pendingEmail = newEmail.toLowerCase().trim();
  return rawToken;
};

// Clear all email-verification fields (after a successful verify).
userSchema.methods.clearEmailVerification = function () {
  this.emailVerificationToken = undefined;
  this.emailVerificationExpires = undefined;
  this.emailVerificationSentAt = undefined;
};

// Clear all email-change fields (after a successful change or cancellation).
userSchema.methods.clearEmailChange = function () {
  this.emailChangeToken = undefined;
  this.emailChangeExpires = undefined;
  this.emailChangeSentAt = undefined;
  this.pendingEmail = null;
};

// Derived role label ('Both' | 'Generator' | 'Upcycler' | 'None')
userSchema.virtual('roleLabel').get(function () {
  const g = this.businessTypes?.generator;
  const u = this.businessTypes?.upcycler;
  if (g && u) return 'Both';
  if (g) return 'Generator';
  if (u) return 'Upcycler';
  return 'None';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
