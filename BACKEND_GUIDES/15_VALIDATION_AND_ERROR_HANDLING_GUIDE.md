# Validation & Error Handling Guide

Read this alongside guides `01` and `02`. It replaces the try/catch pattern currently repeated in
every controller and fixes the wrong status codes the frontend already branches on.

---

## 📌 What's Wrong Today

Every method in `userController.js` looks like this:

```javascript
catch (error) {
    res.status(error instanceof Error ? 404 : 500).json({ message: error.message })
}
```

Three separate problems:

1. **`error instanceof Error` is always true.** Every `throw new Error(...)` — and every `TypeError`,
   `ReferenceError`, and Mongoose validation error — becomes a **404**.
2. **The frontend branches on status codes that never arrive.** `PreferencesPage.jsx` checks
   `err.status === 401` and `err.status === 409`; `ProfilePage.jsx` checks `401`. Neither can fire.
   The session-expiry redirect is dead code.
3. **Internal errors leak to users.** A Mongo duplicate-key error surfaces as
   `E11000 duplicate key error collection: ecomatch.users index: email_1` — meaningless to a cafe
   owner and mildly informative to an attacker.

Also: `express-validator` is installed and never used, so there is **no input validation anywhere**.

---

## 🏗️ The Pattern

```
Route
  ├─ validate(rules)      ← 400 with field-level errors, before the controller
  ├─ asyncHandler(ctrl)   ← catches rejections, forwards to next(err)
  │     └─ service throws AppError with a real status code
  ├─ notFound             ← unmatched routes → JSON 404
  └─ errorHandler         ← single place that formats every error response
```

---

## ⚠️ Step 1: `AppError` (`src/util/AppError.js`)

(Repeated from guide `02` for completeness — build it once.)

```javascript
class AppError extends Error {
    constructor(message, statusCode = 400, code = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;   // expected failure, not a bug
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(msg = 'Bad request', code)      { return new AppError(msg, 400, code); }
    static unauthorized(msg = 'Not authenticated', code) { return new AppError(msg, 401, code); }
    static forbidden(msg = 'Not allowed', code)       { return new AppError(msg, 403, code); }
    static notFound(msg = 'Not found', code)          { return new AppError(msg, 404, code); }
    static conflict(msg = 'Already exists', code)     { return new AppError(msg, 409, code); }
    static tooMany(msg = 'Too many requests', code)   { return new AppError(msg, 429, code); }
}

module.exports = AppError;
```

### Status codes we actually use

| Code | When | Frontend behaviour |
|------|------|--------------------|
| `400` | Bad input | Show the message |
| `401` | Missing / expired token | **Redirect to sign-in** (already coded) |
| `403` | Authenticated but not allowed | Show the message |
| `404` | Not found, or not yours | Show the message |
| `409` | Conflict (duplicate, already done) | **Treat as done** (already coded in `PreferencesPage`) |
| `422` | Validation failed | Show field errors |
| `423` | Account locked | Show the retry time |
| `429` | Rate limited | Show a back-off message |
| `500` | Our bug | Generic message, log the detail |
| `502` | Upstream failure (SMTP, Cloudinary) | "Try again" |

---

## 🧵 Step 2: `asyncHandler` (`src/util/asyncHandler.js`)

```javascript
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```

Express 5 (which this project uses) forwards rejected promises automatically, but wrapping is still
worth it: it works identically on Express 4, and it makes the intent explicit at every call site.

---

## ✅ Step 3: Validation Middleware (`src/middleware/validate.js`)

```javascript
const { validationResult } = require('express-validator');

/**
 * Runs express-validator rules and returns 422 with field-level errors.
 *
 * The frontend's request() wrapper reads `data.message`, so we send BOTH a
 * human-readable summary message and a structured `errors` array for
 * per-field highlighting.
 */
const validate = (rules) => async (req, res, next) => {
    await Promise.all(rules.map((rule) => rule.run(req)));

    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array().map((e) => ({
        field: e.path,
        message: e.msg,
    }));

    return res.status(422).json({
        success: false,
        // First error as the summary — matches how the UI shows one toast.
        message: errors[0].message,
        errors,
    });
};

module.exports = { validate };
```

---

## 🛡️ Step 4: Error Handler (`src/middleware/errorHandler.js`)

The one place that formats error responses.

```javascript
const AppError = require('../util/AppError');
const env = require('../config/env');

/* ---------- Translators for third-party error shapes ---------- */

const handleMongooseValidationError = (err) => {
    const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
    }));
    return { statusCode: 422, message: errors[0].message, code: 'VALIDATION_ERROR', errors };
};

const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    const FRIENDLY = {
        email: 'An account with this email address already exists.',
        pairKey: 'This conversation already exists.',
        reference: 'Duplicate deal reference — please retry.',
    };
    return {
        statusCode: 409,
        message: FRIENDLY[field] || `That ${field} is already in use.`,
        code: 'DUPLICATE_KEY',
    };
};

const handleCastError = (err) => ({
    // A malformed ObjectId means "no such thing", which is a 404 to the user,
    // not a 500. Users hit this by editing a URL.
    statusCode: 404,
    message: `Invalid ${err.path}. This record does not exist.`,
    code: 'INVALID_ID',
});

const handleJwtError = (err) => ({
    statusCode: 401,
    message: err.name === 'TokenExpiredError'
        ? 'Session expired. Please sign in again.'
        : 'Invalid authentication token.',
    code: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
});

/* ---------- The handler ---------- */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong.';
    let code = err.code;
    let errors;

    if (err.name === 'ValidationError' && err.errors) {
        ({ statusCode, message, code, errors } = handleMongooseValidationError(err));
    } else if (err.code === 11000) {
        ({ statusCode, message, code } = handleDuplicateKeyError(err));
    } else if (err.name === 'CastError') {
        ({ statusCode, message, code } = handleCastError(err));
    } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
        ({ statusCode, message, code } = handleJwtError(err));
    } else if (err.type === 'entity.too.large') {
        statusCode = 413;
        message = 'Request body is too large.';
    } else if (err.message?.startsWith('CORS blocked')) {
        statusCode = 403;
        message = 'Origin not allowed.';
    }

    /* ---------- Logging ----------
       Expected failures (AppError) are noise at error level; real bugs need
       a full stack trace. Distinguishing them keeps the log useful.        */
    const isOperational = err instanceof AppError || statusCode < 500;

    if (!isOperational) {
        console.error('💥 UNHANDLED ERROR', {
            method: req.method,
            path: req.originalUrl,
            userId: req.user?._id?.toString() || 'anonymous',
            message: err.message,
            stack: err.stack,
        });
    } else if (statusCode === 401 || statusCode === 403) {
        // Auth failures are a security signal — log them, but without a stack.
        console.warn(`🔒 ${statusCode} ${req.method} ${req.originalUrl}`
            + ` user=${req.user?._id || 'anon'} ip=${req.ip} — ${message}`);
    }

    /* ---------- Never leak internals ---------- */
    if (statusCode === 500 && env.isProd) {
        message = 'Something went wrong on our end. Please try again.';
        code = 'INTERNAL_ERROR';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(code && { code }),
        ...(errors && { errors }),
        // Stack traces in development only.
        ...(!env.isProd && statusCode >= 500 && { stack: err.stack }),
    });
};

module.exports = errorHandler;
```

### `src/middleware/notFound.js`

```javascript
const AppError = require('../util/AppError');

/** Unmatched route → a JSON 404, not Express's default HTML page. */
const notFound = (req, res, next) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

module.exports = notFound;
```

---

## 📋 Step 5: Validator Rule Sets (`src/validators/`)

### `src/validators/authValidators.js`

```javascript
const { body } = require('express-validator');

const signupRules = [
    body('name').trim().notEmpty().withMessage('Company or full name is required.')
        .isLength({ max: 120 }).withMessage('Name is too long.'),
    body('email').trim().isEmail().withMessage('A valid email address is required.')
        .normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match.');
        return true;
    }),
];

const loginRules = [
    body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
];

const forgotPasswordRules = [
    body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
];

const resetPasswordRules = [
    body('token').notEmpty().withMessage('Reset token is required.'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) throw new Error('Passwords do not match.');
        return true;
    }),
];

module.exports = { signupRules, loginRules, forgotPasswordRules, resetPasswordRules };
```

### `src/validators/listingValidators.js`

```javascript
const { body, query, param } = require('express-validator');

const CATEGORIES = ['Organic', 'Textiles', 'Wood', 'Plastics', 'Metals', 'Grain', 'Paper', 'Glass', 'Other'];

const createListingRules = [
    body('title').trim().notEmpty().withMessage('Listing title is required.')
        .isLength({ max: 140 }).withMessage('Title must be under 140 characters.'),
    body('category').isIn(CATEGORIES).withMessage('Please select a valid material category.'),
    body('description').trim().notEmpty().withMessage('Description is required.')
        .isLength({ max: 3000 }).withMessage('Description is too long.'),
    body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than zero.'),
    body('unit').optional().isIn(['kg', 'tons', 'litres', 'units']),
    body('city').trim().notEmpty().withMessage('Location / city is required.'),
    body('price').optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('Price cannot be negative.'),
    body('availability').optional({ checkFalsy: true })
        .isISO8601().withMessage('Availability must be a valid date.'),
];

const searchListingRules = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('minQuantity').optional().isFloat({ min: 0 }).toFloat(),
    query('maxQuantity').optional().isFloat({ min: 0 }).toFloat(),
    query('minPurity').optional().isFloat({ min: 0, max: 100 }).toFloat(),
    // Guard the geo params: a NaN in a $centerSphere throws a Mongo error.
    query('lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    query('lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
];

const objectIdParam = (name = 'id') => [
    param(name).isMongoId().withMessage('Invalid id.'),
];

module.exports = { createListingRules, searchListingRules, objectIdParam };
```

### `src/validators/profileValidators.js`

```javascript
const { body } = require('express-validator');

const completeProfileRules = [
    body('businessTypes').custom((v) => {
        if (!v || (!v.generator && !v.upcycler)) {
            throw new Error('Select at least one business type (Generator or Upcycler).');
        }
        return true;
    }),
    body('businessDetails.industry').notEmpty().withMessage('Please select your industry / category.'),
    body('businessDetails.city').trim().notEmpty().withMessage('Please enter your operating city.'),
    body('businessDetails.gstNumber').optional({ checkFalsy: true })
        .matches(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/i)
        .withMessage('Please enter a valid 15-character GSTIN.'),
    body('materials').optional().isArray().withMessage('Materials must be a list.'),
];

const updateProfileRules = [
    body('personalDetails.fullName').optional().trim().notEmpty()
        .withMessage('Full name cannot be empty.'),
    body('personalDetails.phone').optional({ checkFalsy: true })
        .matches(/^[+]?[\d\s-]{7,15}$/).withMessage('Please enter a valid phone number.'),
    // Explicitly reject fields a user must never set on themselves. Rejecting
    // loudly is better than silently ignoring — it surfaces a client bug.
    body('role').not().exists().withMessage('Role cannot be changed here.'),
    body('accountStatus').not().exists().withMessage('Account status cannot be changed here.'),
    body('isBusinessVerified').not().exists().withMessage('Verification cannot be self-assigned.'),
    body('stats').not().exists().withMessage('Stats cannot be set directly.'),
];

module.exports = { completeProfileRules, updateProfileRules };
```

---

## 🔧 Step 6: Apply It

```javascript
// src/routes/listingRoutes.js
const { validate } = require('../middleware/validate');
const { createListingRules, searchListingRules, objectIdParam } = require('../validators/listingValidators');

router.get('/', optionalAuth, validate(searchListingRules), ListingController.search);

router.post('/',
    authenticate, requireVerifiedEmail, requireCompleteProfile,
    requireBusinessType('generator'),
    validate(createListingRules),
    ListingController.create);

router.get('/:id', optionalAuth, validate(objectIdParam()), ListingController.getOne);
```

Then delete the try/catch blocks. Before:

```javascript
async initiateSignup(req, res) {
    try {
        const init = await userServices.initiateSignup(req.body);
        res.status(200).json(init)
    } catch (error) {
        res.status(error instanceof Error ? 404 : 500).json({ message: error.message })
    }
}
```

After:

```javascript
initiateSignup = asyncHandler(async (req, res) => {
    const result = await userServices.initiateSignup(req.body);
    res.status(201).json({ success: true, ...result });
});
```

---

## 🖥️ Step 7: Frontend — Handle the Codes

The `request()` wrapper in `lib/api.js` already attaches `err.status` and `err.data`. Add a global
401 handler so session expiry is handled once instead of in fifteen components:

```javascript
if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    err.code = data?.code;
    err.fieldErrors = data?.errors;      // 422 field-level errors

    // One place to react to an expired session.
    if (res.status === 401 && data?.code === 'TOKEN_EXPIRED') {
        clearToken();
        window.dispatchEvent(new CustomEvent('ecomatch:session-expired'));
    }
    throw err;
}
```

In `App.jsx`:

```javascript
useEffect(() => {
  const onExpired = () => {
    triggerToast('Session expired. Please sign in again.', 'error');
    navigate('/signin');
  };
  window.addEventListener('ecomatch:session-expired', onExpired);
  return () => window.removeEventListener('ecomatch:session-expired', onExpired);
}, []);
```

Use `err.fieldErrors` to highlight the specific input instead of showing only a toast — on a form as
long as `CreateListingPage`, a toast that says "Quantity must be greater than zero" without
indicating which field is genuinely unhelpful.

---

## 🧪 Step 8: Test

```bash
# 422 with field-level errors
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" -d '{"email":"not-an-email","password":"123"}'
# → 422, errors: [{field:"name",…},{field:"email",…},{field:"password",…}]

# 404, not 500, for a malformed ObjectId
curl -i http://localhost:5000/api/listings/not-a-valid-id

# 409, not 500, for a duplicate email
# 404 JSON for an unknown route
curl -i http://localhost:5000/api/does-not-exist
```

Checklist:
- [ ] Missing required fields → `422` with an `errors` array
- [ ] Duplicate email → `409` with a friendly message (no `E11000` text)
- [ ] Bad ObjectId → `404`, not `500`
- [ ] Expired token → `401` with `code: TOKEN_EXPIRED`
- [ ] Unknown route → JSON `404`, not an HTML page
- [ ] A deliberate `throw new Error('boom')` → `500` and, in production, a generic message
- [ ] Production responses contain **no** `stack` field
- [ ] `PATCH /api/profile` with `{ role: 'ROLE_ADMIN' }` → `422`
- [ ] Every `500` is logged with method, path, and user id
- [ ] `401`/`403` are logged with the IP
- [ ] The frontend redirects to sign-in on `TOKEN_EXPIRED` without a manual check in each page
- [ ] `?lat=abc` → `422`, not a MongoDB error

---

## 🔒 Security Summary

1. **Never send raw internal errors to the client in production.** Stack traces and Mongo error text
   reveal schema, index names, and library versions.
2. **Validate before the controller, always.** Reaching business logic with unvalidated input is how
   `NaN` ends up in a geo query and how injection-shaped strings reach an aggregation.
3. **Reject privileged fields loudly.** `role`, `accountStatus`, `isBusinessVerified`, `stats` are
   explicitly rejected in the validator *and* excluded by the service allow-list. Two layers.
4. **`normalizeEmail()` and `.trim()` at the edge**, so `" User@Gmail.com "` and `"user@gmail.com"`
   cannot become two accounts.
5. **Log auth failures with IP and user id.** Repeated `401`s from one IP is our brute-force signal.
6. **Do not log request bodies on auth routes** — that writes passwords to disk.
7. **Bound every numeric query param.** `limit`, `page`, `lat`, `lng` are all range-checked.
8. **`entity.too.large` → 413** with a clear message, rather than a hung request.
9. **Machine-readable `code` alongside the human `message`**, so the frontend never has to
   string-match error text — a pattern that silently breaks the moment we reword a message.

---

## 💼 CEO Review Notes

- **Error messages are product copy, and users read them at their worst moment.** "Passwords do not
  match" is fine; `E11000 duplicate key error collection: ecomatch.users` costs us a support ticket
  and some credibility. Every message in these validators should read as if a person wrote it,
  because a person will read it.
- **This guide is what makes the frontend's existing error handling work.** `PreferencesPage` and
  `ProfilePage` already contain thoughtful `401`/`409` branches that are currently dead code, because
  the backend can't emit those codes. We are not adding polish here; we are activating work already
  paid for.
- **Field-level errors measurably increase form completion.** `CreateListingPage` has ~18 inputs. A
  single toast saying "Quantity must be greater than zero" with no indication of where sends the user
  hunting, and some of them just leave. Wire `err.fieldErrors` to input highlighting.
- **Get structured logging in before launch, not after the first incident.** `console.error` is fine
  today; the day a pilot customer says "it didn't work yesterday afternoon" we will need searchable
  logs with a user id and a timestamp. Pino to a hosted log service is a half-day of work and the
  cheapest insurance we can buy.
- **Watch the `500` rate as a release-quality gate.** If it rises after a deploy, roll back. That one
  number is a better signal of "did we break something" than any test suite we currently have.
- **Do not let a validation rule contradict the frontend.** `SignUpPage` enforces 6 characters and
  guide `03` proposes 8. Whichever we choose, both sides must agree, or users get rejected *after*
  passing the form — which reads as a broken product rather than a strict policy.
