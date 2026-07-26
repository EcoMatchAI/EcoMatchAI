# Authentication Middleware Guide

This guide builds the middleware layer that turns a `Bearer` token into `req.user`. **Every
protected route in every later guide depends on this file.** Build it second, right after `01`.

---

## 📌 Why This Is Urgent

`src/controller/userController.js` already does this:

```javascript
async updateUser(req, res) {
    const existingUser = req.user          // ← always undefined
    const user = await userServices.updateUser(existingUser, req.body);
```

Nothing populates `req.user`, so `updateUser` and `deleteUser` throw on every call. Meanwhile
`getUserProfile` hand-rolls token parsing:

```javascript
const jwt = req.headers.authorization.split(" ")[1];   // TypeError if header absent
```

If a client omits the header, that line throws `Cannot read properties of undefined`, which the
catch block reports as a **404** — a confusing, wrong status code. Both problems disappear with one
middleware.

---

## 🏗️ Architecture

```
Request
   │  Authorization: Bearer <jwt>
   ▼
┌─────────────────┐   verify signature + expiry
│  authenticate   │   load user from DB (minus password)
└────────┬────────┘   check accountStatus
         │  sets req.user
         ▼
┌─────────────────┐
│ requireVerified │   403 unless isEmailVerified
└────────┬────────┘
         ▼
┌─────────────────┐
│  authorize(...) │   403 unless role is allowed
└────────┬────────┘
         ▼
     Controller
```

---

## 🔑 Step 1: Upgrade the JWT Provider (`src/util/jwtProvider.js`)

The current token payload holds only `email`, so **every** authenticated request needs an extra
`findOne({ email })`. Put the user id and role in the token.

```javascript
const jwt = require('jsonwebtoken');
const env = require('../config/env');

class JwtProvider {
    /**
     * Access token — short-lived, sent on every request.
     * Keep the payload small: it travels with each call.
     */
    createJwt(payload, expiresIn = env.jwtExpiresIn) {
        return jwt.sign(payload, env.jwtKey, { expiresIn });
    }

    /** Standard access token for a fully signed-in user. */
    createAuthToken(user) {
        return this.createJwt({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            type: 'access',
        });
    }

    /**
     * Short-lived token for a half-finished flow (e.g. email verified but
     * profile not completed). `type` lets middleware reject it on real routes.
     */
    createTempToken(email, step) {
        return this.createJwt({ email, step, type: 'temp' }, '30m');
    }

    /** Refresh token — long-lived, used only against /auth/refresh. */
    createRefreshToken(user) {
        return jwt.sign(
            { id: user._id.toString(), type: 'refresh' },
            env.jwtRefreshKey,
            { expiresIn: env.jwtRefreshExpiresIn }
        );
    }

    verifyJwt(token) {
        return jwt.verify(token, env.jwtKey); // throws — callers handle it
    }

    verifyRefreshToken(token) {
        return jwt.verify(token, env.jwtRefreshKey);
    }

    /** Kept for backward compatibility with the existing registration code. */
    getEmailFromjwt(token) {
        try {
            return jwt.verify(token, env.jwtKey).email;
        } catch {
            throw new Error('Invalid token, please re-login');
        }
    }
}

module.exports = new JwtProvider();
```

> **Note on `type`:** tagging tokens prevents a token issued for "you may verify your email" from
> being replayed as a full session token. Cheap to add, expensive to retrofit.

---

## ⚠️ Step 2: The `AppError` Class (`src/util/AppError.js`)

Replaces `err instanceof Error ? 404 : 500` — which labels every failure a 404 — with real codes.

```javascript
class AppError extends Error {
    constructor(message, statusCode = 400, code = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;            // machine-readable, e.g. 'EMAIL_NOT_VERIFIED'
        this.isOperational = true;   // expected failure, not a bug
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(msg = 'Bad request', code) { return new AppError(msg, 400, code); }
    static unauthorized(msg = 'Not authenticated', code) { return new AppError(msg, 401, code); }
    static forbidden(msg = 'Not allowed', code) { return new AppError(msg, 403, code); }
    static notFound(msg = 'Not found', code) { return new AppError(msg, 404, code); }
    static conflict(msg = 'Already exists', code) { return new AppError(msg, 409, code); }
    static tooMany(msg = 'Too many requests', code) { return new AppError(msg, 429, code); }
}

module.exports = AppError;
```

The frontend already branches on `err.status === 401` and `err.status === 409`
(`PreferencesPage.jsx`, `ProfilePage.jsx`), so correct codes make the existing UI behave correctly
with no frontend change.

---

## 🧵 Step 3: `asyncHandler` (`src/util/asyncHandler.js`)

Removes the try/catch from every controller and routes rejections into the error handler.

```javascript
/**
 * Wraps an async route handler so a rejected promise reaches next(err)
 * instead of becoming an unhandled rejection.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```

---

## 🛡️ Step 4: The Auth Middleware (`src/middleware/auth.js`)

```javascript
const jwtProvider = require('../util/jwtProvider');
const AppError = require('../util/AppError');
const asyncHandler = require('../util/asyncHandler');
const User = require('../model/user');
const accountStatus = require('../domain/accountStatus');

/** Pull the raw token out of the Authorization header (or an httpOnly cookie). */
const extractToken = (req) => {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    return null;
};

/**
 * Verifies the token and attaches the live user document to req.user.
 *
 * We re-read the user from the DB on every request rather than trusting the
 * token body, so a ban or a status change takes effect immediately instead of
 * whenever the token happens to expire.
 */
const authenticate = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        throw AppError.unauthorized('No authentication token provided.', 'NO_TOKEN');
    }

    let decoded;
    try {
        decoded = jwtProvider.verifyJwt(token);
    } catch (err) {
        const expired = err.name === 'TokenExpiredError';
        throw AppError.unauthorized(
            expired ? 'Session expired. Please sign in again.' : 'Invalid authentication token.',
            expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
        );
    }

    if (decoded.type === 'refresh') {
        throw AppError.unauthorized('Refresh tokens cannot be used for API access.', 'WRONG_TOKEN_TYPE');
    }

    // `id` on new tokens; `email` on legacy/temp tokens.
    const user = decoded.id
        ? await User.findById(decoded.id).select('-password')
        : await User.findOne({ email: decoded.email }).select('-password');

    if (!user) {
        throw AppError.unauthorized('Account no longer exists.', 'USER_GONE');
    }

    if ([accountStatus.BANNED, accountStatus.CLOSED, accountStatus.DEACTIVATED].includes(user.accountStatus)) {
        throw AppError.forbidden(
            `Your account is ${user.accountStatus.toLowerCase()}. Contact support.`,
            'ACCOUNT_' + user.accountStatus
        );
    }

    req.user = user;
    req.tokenType = decoded.type || 'access';
    next();
});

/**
 * Attaches req.user when a token is present but never rejects.
 * Use on public endpoints that personalise when signed in — e.g. the
 * marketplace, which shows compatibility scores only to logged-in upcyclers.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return next();
    try {
        const decoded = jwtProvider.verifyJwt(token);
        const user = decoded.id
            ? await User.findById(decoded.id).select('-password')
            : await User.findOne({ email: decoded.email }).select('-password');
        if (user) req.user = user;
    } catch {
        /* ignore — treat as anonymous */
    }
    next();
});

/** Blocks unverified emails. The frontend gates on this too, but never trust the client. */
const requireVerifiedEmail = (req, res, next) => {
    if (!req.user?.isEmailVerified) {
        return next(AppError.forbidden('Please verify your email address first.', 'EMAIL_NOT_VERIFIED'));
    }
    next();
};

/** Blocks users who skipped onboarding — needed before they can list or transact. */
const requireCompleteProfile = (req, res, next) => {
    if (!req.user?.profileCompleted) {
        return next(AppError.forbidden('Please complete your business profile first.', 'PROFILE_INCOMPLETE'));
    }
    next();
};

/** Role gate. Usage: authorize(Roles.ADMIN) */
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
        return next(AppError.forbidden('You do not have permission to perform this action.', 'ROLE_FORBIDDEN'));
    }
    next();
};

/**
 * Business-type gate. Only Generators can create listings; only Upcyclers
 * send sourcing requests. A "Both" account passes either check.
 */
const requireBusinessType = (type) => (req, res, next) => {
    if (!req.user?.businessTypes?.[type]) {
        return next(AppError.forbidden(
            `This action is only available to ${type} accounts.`,
            'WRONG_BUSINESS_TYPE'
        ));
    }
    next();
};

module.exports = {
    authenticate,
    optionalAuth,
    requireVerifiedEmail,
    requireCompleteProfile,
    authorize,
    requireBusinessType,
};
```

---

## 🔐 Step 5: Resource Ownership (`src/middleware/ownership.js`)

Authentication answers *who are you*. This answers *is this yours*. Skipping it is the most common
serious bug in marketplace backends — user A editing user B's listing by changing the URL id.

```javascript
const AppError = require('../util/AppError');
const asyncHandler = require('../util/asyncHandler');
const Roles = require('../domain/Roles');

/**
 * Loads a document by :id (or a custom param) and asserts req.user owns it.
 * Attaches the document to req[attachAs] so the controller doesn't refetch.
 */
const requireOwnership = (Model, {
    ownerField = 'owner',
    param = 'id',
    attachAs = 'resource',
} = {}) => asyncHandler(async (req, res, next) => {
    const doc = await Model.findById(req.params[param]);
    if (!doc) throw AppError.notFound(`${Model.modelName} not found.`);

    const ownerId = doc[ownerField]?._id?.toString() || doc[ownerField]?.toString();
    const isOwner = ownerId === req.user._id.toString();
    const isAdmin = req.user.role === Roles.ADMIN;

    if (!isOwner && !isAdmin) {
        // 404, not 403 — don't confirm the resource exists to someone who
        // has no business knowing about it.
        throw AppError.notFound(`${Model.modelName} not found.`);
    }

    req[attachAs] = doc;
    next();
});

module.exports = { requireOwnership };
```

---

## 🔧 Step 6: Refactor the Existing Controller

Apply the middleware to the routes that already exist. **This is the fix for the two broken
handlers and the password leak.**

`src/routes/userRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();

const UserController = require('../controller/userController');
const {
    authenticate, authorize, requireVerifiedEmail,
} = require('../middleware/auth');
const Roles = require('../domain/Roles');

// Signup flow stays public (see guides 05, 06 for the reworked versions).
router.post('/signup', UserController.initiateSignup);
router.post('/signup/verify-otp', UserController.verifyEmailOtp);

// Protected from here down.
router.use(authenticate);

router.post('/signup/complete-profile', requireVerifiedEmail, UserController.completeProfile);
router.get('/me', UserController.getMe);
router.patch('/me', UserController.updateUser);
router.delete('/me', UserController.deleteUser);

// Admin only — this used to be wide open to the internet.
router.get('/', authorize(Roles.ADMIN), UserController.getAllUsers);
router.patch('/:id/status/:status', authorize(Roles.ADMIN), UserController.updateAccountStatus);

module.exports = router;
```

Controllers become one-liners:

```javascript
const asyncHandler = require('../util/asyncHandler');
const userServices = require('../services/userServices');

class UserController {
    // req.user is already the sanitised document — no token parsing, no DB hit.
    getMe = asyncHandler(async (req, res) => {
        res.status(200).json({ success: true, user: req.user });
    });

    updateUser = asyncHandler(async (req, res) => {
        const user = await userServices.updateUser(req.user, req.body);
        res.status(200).json({ success: true, message: 'Profile updated.', user });
    });

    deleteUser = asyncHandler(async (req, res) => {
        await userServices.deleteUser(req.user._id);
        res.status(200).json({ success: true, message: 'User account deleted.' });
    });
}
module.exports = new UserController();
```

### 🐛 Fix the password leak

In `src/services/userServices.js`, **every** read must exclude the hash:

```javascript
async getUserByEmail(email) {
    const user = await User.findOne({ email }).select('-password');   // ← was leaking
    if (!user) throw AppError.notFound('User not found');
    return user;
}

async getUserById(id) {
    const user = await User.findById(id).select('-password');         // ← was leaking
    if (!user) throw AppError.notFound('User not found');
    return user;
}
```

Belt and braces — make the field opt-in at the schema level (guide `06`):

```javascript
password: { type: String, required: true, select: false }
```

With `select: false`, login must explicitly ask for it:
`User.findOne({ email }).select('+password')`.

---

## 🧪 Step 7: Test It

```bash
# No token → 401 with a clear message (previously a confusing 404)
curl -i http://localhost:5000/api/users/me

# Garbage token → 401 TOKEN_INVALID
curl -i http://localhost:5000/api/users/me -H "Authorization: Bearer not-a-token"

# Valid token → 200, and the JSON must NOT contain "password"
curl -s http://localhost:5000/api/users/me -H "Authorization: Bearer $TOKEN" | grep -c password
# expected: 0
```

Checklist:
- [ ] Missing header → `401`, not a crash
- [ ] Expired token → `401` with code `TOKEN_EXPIRED` (frontend then redirects to sign-in)
- [ ] Banned user → `403`
- [ ] Non-admin hitting `GET /api/users` → `403`
- [ ] No response anywhere contains `password`
- [ ] User A cannot `PATCH` user B's resource

---

## 🔒 Security Summary

1. **Re-read the user from the DB per request.** A token is a claim, not the truth. This is what
   makes "ban a bad actor" take effect instantly.
2. **Tokens are typed** (`access` / `refresh` / `temp`) so a low-privilege token can't be replayed
   as a session.
3. **`select('-password')` on every read**, plus `select: false` in the schema as a backstop.
4. **Ownership is checked separately from authentication.** Authenticated ≠ authorised.
5. **Return 404, not 403, for other people's resources** — a 403 confirms the record exists.
6. **`authorize()` on admin routes.** `GET /api/users` currently dumps the whole user table to
   anyone who asks.
7. **Do not put secrets in the JWT payload.** It is signed, not encrypted — anyone can read it.
8. **Short access-token lifetime** (7d max; prefer 1h + refresh token, guide `03`).

---

## 💼 CEO Review Notes

- **This guide is the highest-risk item in the whole backlog.** A leaked password hash or a
  cross-tenant data leak on a B2B platform is not a bug, it is an existential event — our users are
  companies whose GST numbers, bank details, and supplier relationships sit in our database.
  Nothing else ships before this is reviewed by a second pair of eyes.
- **`requireBusinessType` is a product control, not just security.** It is the hook we will use
  later to gate premium features by plan (e.g. "Verified Suppliers only"). Build it now even if
  every account passes today.
- **Log every 401/403 with the user id and route.** That log is our first fraud-detection signal
  and, later, evidence in a dispute between two businesses.
- **Session length is a business decision, not just a technical one.** Warehouse and cafe staff
  will use this on a shared tablet. Prefer a 1-hour access token plus refresh over a 7-day token,
  and add an explicit "sign out everywhere".
