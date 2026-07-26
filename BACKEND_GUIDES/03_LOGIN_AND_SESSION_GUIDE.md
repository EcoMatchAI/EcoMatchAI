# Login & Session Management Guide

This guide implements the endpoints `frontend/src/lib/api.js` already calls but the backend does not
have: **`POST /api/auth/login`**, **`GET /api/auth/me`**, plus logout and token refresh.

Prerequisites: guides `01` (server + CORS) and `02` (auth middleware, `AppError`, `asyncHandler`).

---

## 📌 What the Frontend Already Expects

From `frontend/src/lib/api.js`:

```javascript
export const apiLogin = (payload) =>
  request('/auth/login', { method: 'POST', body: payload, auth: false });

export const apiGetMe = () => request('/auth/me');
```

From `SignInPage.jsx` — this is the exact response shape we must return:

```javascript
const data = await apiLogin({ email: email.trim(), password });
setToken(data.token);                        // ← data.token (NOT tempToken)
const verified = data.user?.isEmailVerified; // ← data.user.isEmailVerified
const done = data.user?.profileCompleted;    // ← data.user.profileCompleted
```

And `CheckEmailPage.jsx` **polls `/auth/me` every 5 seconds**, reading `{ user }`:

```javascript
const { user } = await apiGetMe();
if (user?.isEmailVerified) { … }
```

### Required response contract

```jsonc
// POST /api/auth/login  → 200
{
  "success": true,
  "message": "Signed in successfully.",
  "token": "eyJhbGciOi...",          // top-level, named `token`
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "_id": "…",
    "name": "GreenBrew Co.",
    "email": "hello@greenbrew.in",
    "isEmailVerified": true,
    "profileCompleted": false,       // drives the redirect decision
    "role": "ROLE_USER",
    "businessTypes": { "generator": true, "upcycler": false },
    "accountStatus": "ACTIVE"
    // password MUST NOT be present
  }
}
```

```jsonc
// GET /api/auth/me  → 200
{ "success": true, "user": { … same shape … } }
```

---

## 🔄 Login Flow

```
[ POST /auth/login ]
        │
        ├─ validate email + password present ────────────► 400
        ├─ find user (+password) ────────── not found ───► 401 "Invalid credentials"
        ├─ account locked? ─────────────────── yes ─────► 423 "Try again in N minutes"
        ├─ bcrypt.compare ──────────────── mismatch ────► 401 + increment failed count
        ├─ accountStatus BANNED/SUSPENDED ── yes ───────► 403
        │
        ▼  success
   reset failed-login counter · stamp lastLoginAt
   issue access token (+ refresh token)
   return { token, refreshToken, user }
        │
        ▼  frontend decides where to go
   !isEmailVerified  → /check-email
   !profileCompleted → /preferences
   else              → /dashboard
```

> **Design note:** we sign the user in *even when their email is unverified*, and let the frontend
> route them to the gate page. That is what `SignInPage.jsx` already does, and it is the right
> product call — a user who can't log in also can't resend their verification email.

---

## 🗄️ Step 1: Schema Additions

Add to `src/model/user.js` (full schema in guide `06`):

```javascript
    // ---- Session & security ----
    password: {
        type: String,
        required: true,
        select: false          // never returned unless explicitly requested
    },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },

    // Brute-force protection: lock the account after repeated failures.
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },

    // Bumping this invalidates every refresh token — "sign out everywhere".
    tokenVersion: { type: Number, default: 0 },
```

---

## ⚡ Step 2: Auth Service (`src/services/authServices.js`)

`authServices.js` currently exists but is **empty**. Fill it in.

```javascript
const bcrypt = require('bcrypt');
const User = require('../model/user');
const jwtProvider = require('../util/jwtProvider');
const AppError = require('../util/AppError');
const accountStatus = require('../domain/accountStatus');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Strip every sensitive field before a user object leaves the backend. */
const sanitizeUser = (userDoc) => {
    const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
    delete u.password;
    delete u.failedLoginAttempts;
    delete u.lockedUntil;
    delete u.tokenVersion;
    delete u.emailVerificationToken;
    delete u.passwordResetToken;
    delete u.pendingEmailToken;
    return u;
};

class AuthServices {

    /**
     * Verifies credentials and issues tokens.
     * Deliberately returns the same message for "no such user" and "wrong
     * password" — a different message tells an attacker which emails are
     * registered, which on a B2B platform is competitive intelligence.
     */
    async login({ email, password }, meta = {}) {
        if (!email || !password) {
            throw AppError.badRequest('Email and password are both required.');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        const GENERIC = 'Invalid email or password.';
        if (!user) throw AppError.unauthorized(GENERIC, 'BAD_CREDENTIALS');

        // ---- Lockout check ----
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
            throw new AppError(
                `Too many failed attempts. Try again in ${mins} minute(s).`,
                423, 'ACCOUNT_LOCKED'
            );
        }

        // ---- Password check ----
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
                user.failedLoginAttempts = 0;
            }
            await user.save();
            throw AppError.unauthorized(GENERIC, 'BAD_CREDENTIALS');
        }

        // ---- Account status ----
        if ([accountStatus.BANNED, accountStatus.CLOSED, accountStatus.DEACTIVATED]
            .includes(user.accountStatus)) {
            throw AppError.forbidden(
                `This account is ${user.accountStatus.toLowerCase()}. Please contact support.`,
                'ACCOUNT_' + user.accountStatus
            );
        }
        if (user.accountStatus === accountStatus.SUSPENDED) {
            throw AppError.forbidden(
                'Your account is temporarily suspended. Please contact support.',
                'ACCOUNT_SUSPENDED'
            );
        }

        // ---- Success ----
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        user.lastLoginAt = new Date();
        user.lastLoginIp = meta.ip || null;
        await user.save();

        return {
            token: jwtProvider.createAuthToken(user),
            refreshToken: jwtProvider.createRefreshToken(user),
            user: sanitizeUser(user),
        };
    }

    /** Fresh user document for GET /auth/me. Called on a 5s poll — keep it cheap. */
    async getCurrentUser(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) throw AppError.unauthorized('Account no longer exists.');
        return sanitizeUser(user);
    }

    /** Exchange a valid refresh token for a new access token. */
    async refreshAccessToken(refreshToken) {
        if (!refreshToken) throw AppError.unauthorized('No refresh token provided.');

        let decoded;
        try {
            decoded = jwtProvider.verifyRefreshToken(refreshToken);
        } catch {
            throw AppError.unauthorized('Refresh token expired. Please sign in again.', 'REFRESH_EXPIRED');
        }
        if (decoded.type !== 'refresh') {
            throw AppError.unauthorized('Invalid token type.', 'WRONG_TOKEN_TYPE');
        }

        const user = await User.findById(decoded.id);
        if (!user) throw AppError.unauthorized('Account no longer exists.');

        return { token: jwtProvider.createAuthToken(user), user: sanitizeUser(user) };
    }

    /**
     * Password change for a signed-in user (Account Settings).
     * Requires the current password — otherwise a stolen session becomes a
     * stolen account.
     */
    async changePassword(userId, { currentPassword, newPassword, confirmPassword }) {
        if (!currentPassword || !newPassword) {
            throw AppError.badRequest('Current and new password are both required.');
        }
        if (newPassword !== confirmPassword) {
            throw AppError.badRequest('New passwords do not match.');
        }
        if (newPassword.length < 8) {
            throw AppError.badRequest('New password must be at least 8 characters.');
        }

        const user = await User.findById(userId).select('+password');
        if (!user) throw AppError.notFound('User not found.');

        if (!await bcrypt.compare(currentPassword, user.password)) {
            throw AppError.unauthorized('Your current password is incorrect.');
        }
        if (await bcrypt.compare(newPassword, user.password)) {
            throw AppError.badRequest('New password must be different from the current one.');
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.tokenVersion += 1;   // invalidate refresh tokens elsewhere
        await user.save();

        return { message: 'Password changed successfully.' };
    }

    /** "Sign out everywhere" — invalidates all refresh tokens for this user. */
    async logoutAll(userId) {
        await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
        return { message: 'Signed out of all devices.' };
    }
}

module.exports = new AuthServices();
module.exports.sanitizeUser = sanitizeUser;
```

---

## 🚦 Step 3: Controller (`src/controller/authController.js`)

```javascript
const asyncHandler = require('../util/asyncHandler');
const authServices = require('../services/authServices');

class AuthController {

    login = asyncHandler(async (req, res) => {
        const result = await authServices.login(req.body, { ip: req.ip });
        res.status(200).json({
            success: true,
            message: 'Signed in successfully.',
            token: result.token,               // top-level — SignInPage reads data.token
            refreshToken: result.refreshToken,
            user: result.user,
        });
    });

    // Protected by `authenticate`, so req.user is already loaded and sanitised.
    me = asyncHandler(async (req, res) => {
        res.status(200).json({ success: true, user: req.user });
    });

    refresh = asyncHandler(async (req, res) => {
        const token = req.body.refreshToken || req.cookies?.refreshToken;
        const result = await authServices.refreshAccessToken(token);
        res.status(200).json({ success: true, ...result });
    });

    /**
     * Stateless JWTs cannot be revoked server-side, so logout is mostly a
     * client-side token wipe. We still expose it for audit logging and to
     * clear any httpOnly cookie.
     */
    logout = asyncHandler(async (req, res) => {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.status(200).json({ success: true, message: 'Signed out.' });
    });

    logoutAll = asyncHandler(async (req, res) => {
        const result = await authServices.logoutAll(req.user._id);
        res.status(200).json({ success: true, ...result });
    });

    changePassword = asyncHandler(async (req, res) => {
        const result = await authServices.changePassword(req.user._id, req.body);
        res.status(200).json({ success: true, ...result });
    });
}

module.exports = new AuthController();
```

---

## 🛣️ Step 4: Routes (`src/routes/authRoutes.js`)

This is the file mounted at `/api/auth` in `src/app.js`. Guides `04` and `05` add to it.

```javascript
const express = require('express');
const router = express.Router();

const AuthController = require('../controller/authController');
const UserController = require('../controller/userController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');
const { loginRules, changePasswordRules } = require('../validators/authValidators');

/* ---------- Public ---------- */
router.post('/signup', authLimiter, UserController.initiateSignup);           // guide 06
router.post('/login', authLimiter, validate(loginRules), AuthController.login);
router.post('/refresh', AuthController.refresh);

/* ---------- Authenticated ---------- */
router.get('/me', authenticate, AuthController.me);
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);
router.post('/change-password', authenticate, validate(changePasswordRules), AuthController.changePassword);

module.exports = router;
```

---

## ✅ Step 5: Validation Rules (`src/validators/authValidators.js`)

```javascript
const { body } = require('express-validator');

const loginRules = [
    body('email').trim().isEmail().withMessage('A valid email address is required.')
        .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
];

const changePasswordRules = [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters.')
        .matches(/[a-z]/).withMessage('Include at least one lowercase letter.')
        .matches(/[A-Z]/).withMessage('Include at least one uppercase letter.')
        .matches(/\d/).withMessage('Include at least one number.'),
    body('confirmPassword').notEmpty().withMessage('Please confirm your new password.'),
];

module.exports = { loginRules, changePasswordRules };
```

> ⚠️ **Note:** `SignUpPage.jsx` currently enforces only `length >= 6`. If you adopt the stronger
> rule above, update the frontend validation to match or users will hit a confusing server error
> after passing the client check.

---

## 🧪 Step 6: Test

```bash
# Happy path
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"hello@greenbrew.in","password":"Test@1234"}'

# Wrong password ×6 → expect 423 ACCOUNT_LOCKED on the 6th
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"hello@greenbrew.in","password":"wrong"}'
done

# Session check
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Checklist:
- [ ] Response has `token` at the **top level** (not nested, not `tempToken`)
- [ ] Response has `user.isEmailVerified` and `user.profileCompleted`
- [ ] Response contains **no** `password` field
- [ ] Unknown email and wrong password give the **identical** message
- [ ] 6th wrong attempt → `423`
- [ ] Successful login resets `failedLoginAttempts` to 0
- [ ] `GET /auth/me` works, and returns 401 with no token
- [ ] Sign in from the real UI at `/signin` and land on the correct page

---

## 🔒 Security Summary

1. **Identical error for unknown-email and wrong-password.** Prevents account enumeration — on a
   B2B platform, "is Company X registered?" is information worth money to a competitor.
2. **Account lockout: 5 failures → 15-minute lock**, layered under the 10-request `authLimiter`
   from guide `01`. Rate limiting is per-IP; lockout is per-account. You need both.
3. **`bcrypt` cost factor 12** for new hashes. The existing registration code uses 10 — acceptable,
   but standardise on 12 going forward.
4. **`select: false` on `password`**, and `sanitizeUser()` on every path a user object exits by.
5. **`bcrypt.compare` is constant-time.** Never compare password strings with `===`.
6. **`tokenVersion`** gives us real revocation — the only way to make "sign out everywhere" true
   with JWTs.
7. **Never log the request body on auth routes.** `morgan('dev')` logs the path only; do not
   "temporarily" add body logging to debug login.
8. **Prefer 1h access + 30d refresh** over a single long-lived token, and store the refresh token
   in an httpOnly cookie in production. The frontend currently keeps the token in `localStorage`,
   which is XSS-readable — see the CEO notes.

---

## 💼 CEO Review Notes

- **"Remember Me" is in the UI but does nothing.** `SignInPage.jsx` tracks `rememberMe` state and
  never sends it. Either wire it (short token when unchecked, long refresh when checked) or remove
  the checkbox. A control that visibly does nothing erodes trust in everything else on the page.
- **Google / LinkedIn sign-in are decorative buttons today.** For a B2B audience, LinkedIn OAuth is
  genuinely valuable — it is a free, lightweight business-identity signal that reduces our
  verification burden. I'd prioritise LinkedIn OAuth above Google. Until then, remove the buttons
  rather than shipping toasts that say "Connecting…".
- **`localStorage` token storage is our known accepted risk.** Fine for the pilot; must move to
  httpOnly cookies before we hold bank details for real money movement. Put it on the record now so
  it isn't "discovered" during a customer security review.
- **Account lockout will generate support tickets.** Before launch we need a documented unlock path
  (self-serve password reset clears the lock — make sure guide `04` does that) or our first
  frustrated supplier is also our first churned supplier.
- **Log `lastLoginAt`.** It is how we will measure real weekly-active businesses rather than
  vanity signups, and it tells sales who has gone quiet and needs a call.
