import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import { hashToken } from '../utils/cryptoToken.js';
import { sendVerificationEmail, sendEmailChangeVerification } from '../utils/email.js';

const FRONTEND_URL = () => process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
const RESEND_COOLDOWN_SECONDS = () => {
  const v = Number(process.env.RESEND_COOLDOWN_SECONDS);
  return Number.isFinite(v) ? v : 60; // allow an explicit 0 (no cooldown)
};

/**
 * Shape a user document for API responses (omits password, exposes essentials).
 */
const toAuthResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isEmailVerified: user.isEmailVerified,
  pendingEmail: user.pendingEmail || null,
  profileCompleted: user.profileCompleted,
  roleLabel: user.roleLabel,
});

/**
 * Seconds remaining before another email may be sent, given the last-sent time.
 * Returns 0 when the cooldown has elapsed (or no email was sent yet).
 */
const cooldownRemaining = (sentAt) => {
  if (!sentAt) return 0;
  const elapsed = (Date.now() - new Date(sentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS() - elapsed));
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Signup page) and return a JWT.
 * @access  Public
 *
 * Flow: Signup -> (profileCompleted=false) -> frontend redirects to Complete Profile.
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const user = new User({
      name,
      email,
      password,
      isEmailVerified: false,
      // Pre-fill personal details from signup so the profile form has a head start
      personalDetails: { fullName: name },
    });

    // Generate + store hashed verification token, then send the link.
    const rawToken = user.createEmailVerificationToken();
    await user.save();

    const verifyLink = `${FRONTEND_URL()}/verify-email?token=${rawToken}`;
    try {
      await sendVerificationEmail({ to: user.email, name: user.name, link: verifyLink });
    } catch (mailErr) {
      // Don't fail signup if the email provider hiccups — the user can resend.
      console.error('Failed to send verification email:', mailErr.message);
    }

    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'Account created! Please check your email to verify your address.',
      token,
      user: toAuthResponse(user),
    });
  } catch (error) {
    // Handle duplicate key / validation errors gracefully
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors)[0]?.message || 'Invalid input.';
      return res.status(400).json({ message: msg });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error during signup.' });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate a user (Sign In page) and return a JWT.
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // password has select:false in the schema, so explicitly include it here
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Welcome back! Successfully logged in.',
      token,
      user: toAuthResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Return the currently authenticated user (used to decide routing:
 *          dashboard vs. complete-profile).
 * @access  Private
 */
export const getMe = async (req, res) => {
  // req.user is attached by the `protect` middleware
  return res.status(200).json({ user: req.user });
};

/* ============================================================================
   EMAIL VERIFICATION
   ============================================================================ */

/**
 * @route   GET /api/auth/verify-email?token=RAW_TOKEN
 * @desc    Verify a signup email. Hashes the incoming token, matches it against
 *          a non-expired stored hash, marks the email verified, clears the
 *          token fields, and auto-logs-in the user with a fresh JWT.
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is missing.' });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired.' });
    }

    if (user.isEmailVerified) {
      // Token matched but already verified — treat as success (idempotent).
      user.clearEmailVerification();
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({ message: 'Email already verified. You can sign in.' });
    }

    user.isEmailVerified = true;
    user.clearEmailVerification();
    await user.save({ validateBeforeSave: false });

    // Optional auto-login
    const jwt = generateToken(user._id);
    return res.status(200).json({
      message: 'Email verified successfully!',
      token: jwt,
      user: toAuthResponse(user),
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Server error during email verification.' });
  }
};

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend the signup verification email. Generating a new token
 *          invalidates the previous one. Enforces a resend cooldown.
 * @access  Public (body: { email })
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+emailVerificationSentAt'
    );

    // Generic response to avoid leaking which emails are registered.
    const genericMsg = 'If an unverified account exists for this email, a new link has been sent.';

    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: genericMsg });
    }

    const wait = cooldownRemaining(user.emailVerificationSentAt);
    if (wait > 0) {
      return res.status(429).json({
        message: `Please wait ${wait}s before requesting another verification email.`,
        retryAfter: wait,
      });
    }

    // New token invalidates the previous one.
    const rawToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyLink = `${FRONTEND_URL()}/verify-email?token=${rawToken}`;
    await sendVerificationEmail({ to: user.email, name: user.name, link: verifyLink });

    return res.status(200).json({ message: genericMsg });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Server error while resending verification.' });
  }
};

/* ============================================================================
   EMAIL CHANGE (authenticated)
   ============================================================================ */

/**
 * @route   POST /api/auth/request-email-change
 * @desc    Start changing the logged-in user's email. Stores the new address as
 *          `pendingEmail`, generates a token, and emails a confirmation link to
 *          the NEW address. The current email stays active until confirmed.
 * @access  Private (body: { newEmail })
 */
export const requestEmailChange = async (req, res) => {
  try {
    const user = req.user;
    const { newEmail } = req.body;

    if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail)) {
      return res.status(400).json({ message: 'A valid new email address is required.' });
    }

    const normalized = newEmail.toLowerCase().trim();
    if (normalized === user.email) {
      return res.status(400).json({ message: 'That is already your current email address.' });
    }

    // Ensure the new address isn't already used by someone else.
    const taken = await User.findOne({ email: normalized });
    if (taken) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }

    // Respect the resend cooldown for repeated change requests.
    const existing = await User.findById(user._id).select('+emailChangeSentAt');
    const wait = cooldownRemaining(existing?.emailChangeSentAt);
    if (wait > 0) {
      return res.status(429).json({
        message: `Please wait ${wait}s before requesting another change email.`,
        retryAfter: wait,
      });
    }

    const rawToken = user.createEmailChangeToken(normalized);
    await user.save({ validateBeforeSave: false });

    const changeLink = `${FRONTEND_URL()}/verify-email-change?token=${rawToken}`;
    await sendEmailChangeVerification({ to: normalized, name: user.name, link: changeLink });

    return res.status(200).json({
      message: `A confirmation link has been sent to ${normalized}.`,
      pendingEmail: normalized,
    });
  } catch (error) {
    console.error('Request email change error:', error);
    return res.status(500).json({ message: 'Server error while requesting email change.' });
  }
};

/**
 * @route   GET /api/auth/verify-email-change?token=RAW_TOKEN
 * @desc    Confirm an email change. Verifies the token, swaps email <-
 *          pendingEmail, marks the new email verified, and clears the temp
 *          fields.
 * @access  Public
 */
export const verifyEmailChange = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is missing.' });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      emailChangeToken: hashed,
      emailChangeExpires: { $gt: new Date() },
    });

    if (!user || !user.pendingEmail) {
      return res.status(400).json({ message: 'This email-change link is invalid or has expired.' });
    }

    // Guard against the address being claimed by someone else in the meantime.
    const taken = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } });
    if (taken) {
      user.clearEmailChange();
      await user.save({ validateBeforeSave: false });
      return res.status(409).json({ message: 'That email address is no longer available.' });
    }

    user.email = user.pendingEmail;
    user.isEmailVerified = true; // confirmed via this link
    user.clearEmailChange();
    await user.save();

    return res.status(200).json({
      message: 'Your email address has been updated successfully.',
      user: toAuthResponse(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'That email address is already in use.' });
    }
    console.error('Verify email change error:', error);
    return res.status(500).json({ message: 'Server error during email-change verification.' });
  }
};
