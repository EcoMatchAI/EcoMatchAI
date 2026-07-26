# Email Verification & Email Change Guide

This guide reconciles a **real conflict** in the project: the backend implements **6-digit OTP**
verification, while the built frontend implements **link-based** verification. Both are half-done and
they do not talk to each other.

It then adds the email-change flow (`ProfilePage.jsx` already calls it) which does not exist at all.

Prerequisites: guides `01`, `02`, `03`, `04` (shares `tokenUtil.js` and the email shell).

---

## 📌 The Conflict, Precisely

### Backend today (`userServices.js`) — OTP
```javascript
const otp = generateOtp();                              // 6 digits
const hashedOtp = await bcrypt.hash(otp, 8);
await OtpVerification.create({ email, otp: hashedOtp, expiresAt: +10min });
await sendOtpEmail(normalizedEmail, otp, data.businessName);
// verify via: POST /signup/verify-otp  { email, otp }
```

### Frontend today (`lib/api.js`, `VerifyEmailPage.jsx`, `CheckEmailPage.jsx`) — link
```javascript
export const apiVerifyEmail = (token) =>
  request(`/auth/verify-email?token=${encodeURIComponent(token)}`, { auth: false });

export const apiResendVerification = (email) =>
  request('/auth/resend-verification', { method: 'POST', body: { email }, auth: false });
```
`CheckEmailPage.jsx` says *"We've sent a verification link to …"* and **polls `/auth/me` every
5 seconds** waiting for `isEmailVerified` to flip — a pattern that only makes sense for a link.

### Decision: ship the link flow, keep OTP as a secondary path

| | Link | OTP |
|---|---|---|
| Frontend built? | ✅ 3 pages already done | ❌ no OTP input UI exists |
| Desktop UX | ✅ one click | 🟡 tab-switch, copy, paste |
| Mobile UX | 🟡 app-switch | ✅ better |
| Works for phone/SMS later | ❌ | ✅ |
| Effort to match current frontend | **low** | high (build OTP UI) |

**Do the link flow first** — it matches three already-built pages and needs no frontend redesign.
Keep the existing OTP code working behind `POST /auth/verify-otp`; we will reuse it for phone
verification (guide `10` needs a verified phone for logistics anyway).

---

## 🔄 Flow

```
[ Signup ]
    │  create user (isEmailVerified: false), issue a REAL session token
    │  generate verification token → store hash → email raw link
    ▼
[ /check-email ]  ← frontend gate page, polls GET /auth/me every 5s
    │
    │  user clicks the link in their inbox
    ▼
[ /verify-email?token=… ]  → GET /api/auth/verify-email?token=…
    │  hash + look up + check expiry → isEmailVerified = true → consume token
    ▼
[ /preferences ]  → profileCompleted ? /dashboard : /preferences
```

The polling page moves the user forward automatically even if they click the link in a different
tab or on their phone. That behaviour is already implemented in `CheckEmailPage.jsx`; we just have to
make `/auth/me` exist (guide `03`) and make the flag flip.

---

## 🗄️ Step 1: Schema Additions (`src/model/user.js`)

```javascript
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },

    // ---- Email verification (link based) ----
    emailVerificationToken:   { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date,   default: null, select: false },
    verificationEmailsSent:   { type: Number, default: 0 },   // abuse signal
    lastVerificationEmailAt:  { type: Date,   default: null }, // cooldown

    // ---- Email change (requires confirming the NEW address) ----
    pendingEmail:            { type: String, default: null, lowercase: true, trim: true },
    pendingEmailToken:       { type: String, default: null, select: false },
    pendingEmailExpires:     { type: Date,   default: null, select: false },
```

> **Why `pendingEmail` is a separate field:** we must not overwrite `email` until the new address is
> proven reachable. Otherwise a typo locks the user out of their own account permanently.

---

## 📧 Step 2: Verification Emails (`src/util/emailService.js`)

Reuses `emailShell` and `button` from guide `04`.

```javascript
const sendVerificationEmail = async (toEmail, rawToken, name) => {
    const verifyUrl = `${env.clientUrl}/verify-email?token=${rawToken}`;

    const html = emailShell('Verify your email address', `
        <p>Welcome to EcoMatch, <strong>${name || 'there'}</strong>! 🌱</p>
        <p>Confirm this email address to activate your account and start listing or sourcing
           materials:</p>
        <p style="margin: 24px 0;">${button(verifyUrl, 'Verify Email')}</p>
        <p style="font-size: 13px; color: #475569;">
            This link expires in <strong>${env.emailTokenExpiryHours} hours</strong>.
        </p>
        <p style="font-size: 11.5px; color: #94a3b8; word-break: break-all; margin-top: 20px;">
            If the button doesn't work, paste this link into your browser:<br/>${verifyUrl}
        </p>
    `);

    return transporter.sendMail({
        from: env.emailFrom || `"EcoMatch" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'EcoMatch — Verify your email address',
        html,
    });
};

/** Sent to the NEW address when a user changes their email. */
const sendEmailChangeEmail = async (toNewEmail, rawToken, name, oldEmail) => {
    const confirmUrl = `${env.clientUrl}/verify-email-change?token=${rawToken}`;

    const html = emailShell('Confirm your new email address', `
        <p>Hello <strong>${name || 'there'}</strong>,</p>
        <p>You asked to change the email on your EcoMatch account from
           <strong>${oldEmail}</strong> to <strong>${toNewEmail}</strong>.</p>
        <p style="margin: 24px 0;">${button(confirmUrl, 'Confirm New Email')}</p>
        <p style="font-size: 13px; color: #475569;">
            Until you confirm, your account keeps using <strong>${oldEmail}</strong>.
            This link expires in ${env.emailTokenExpiryHours} hours.
        </p>
    `);

    return transporter.sendMail({
        from: env.emailFrom || `"EcoMatch" <${process.env.SMTP_USER}>`,
        to: toNewEmail,
        subject: 'EcoMatch — Confirm your new email address',
        html,
    });
};

/** Security alert to the OLD address so a hijack cannot happen silently. */
const sendEmailChangeAlert = async (toOldEmail, newEmail, name) => {
    const html = emailShell('An email change was requested', `
        <p>Hello <strong>${name || 'there'}</strong>,</p>
        <p>Someone requested to change your EcoMatch account email to
           <strong>${newEmail}</strong>. The change takes effect only after the new address is
           confirmed.</p>
        <p style="font-size: 13px; color: #b91c1c;">
            <strong>If this wasn't you</strong>, change your password immediately and email
            support@ecomatch.in.
        </p>
    `);

    return transporter.sendMail({
        from: env.emailFrom || `"EcoMatch" <${process.env.SMTP_USER}>`,
        to: toOldEmail,
        subject: 'EcoMatch — Security alert: email change requested',
        html,
    });
};

module.exports = {
    sendOtpEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
    sendVerificationEmail, sendEmailChangeEmail, sendEmailChangeAlert,
    emailShell, button,
};
```

---

## ⚡ Step 3: Verification Service (`src/services/verificationServices.js`)

```javascript
const User = require('../model/user');
const AppError = require('../util/AppError');
const jwtProvider = require('../util/jwtProvider');
const env = require('../config/env');
const { createHashedToken, hashToken } = require('../util/tokenUtil');
const {
    sendVerificationEmail, sendEmailChangeEmail, sendEmailChangeAlert,
} = require('../util/emailService');
const { sanitizeUser } = require('./authServices');

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_EMAILS = 8;

class VerificationServices {

    /**
     * Generates a fresh verification token, stores its hash, emails the link.
     * Called from signup and from "resend".
     */
    async issueVerificationToken(user) {
        const { raw, hashed } = createHashedToken();
        user.emailVerificationToken = hashed;
        user.emailVerificationExpires = new Date(
            Date.now() + env.emailTokenExpiryHours * 60 * 60 * 1000
        );
        user.verificationEmailsSent = (user.verificationEmailsSent || 0) + 1;
        user.lastVerificationEmailAt = new Date();
        await user.save();

        await sendVerificationEmail(user.email, raw, user.name);
        return raw;   // returned only so tests/dev can assert; never sent in a response
    }

    /**
     * GET /auth/verify-email?token=…
     *
     * Returns a fresh session token so the user is signed in on the device
     * where they clicked the link — VerifyEmailPage.jsx already calls
     * setToken(data.token) when present.
     */
    async verifyEmailByToken(rawToken) {
        if (!rawToken) throw AppError.badRequest('No verification token provided.');

        const user = await User.findOne({
            emailVerificationToken: hashToken(rawToken),
            emailVerificationExpires: { $gt: new Date() },
        }).select('+emailVerificationToken +emailVerificationExpires');

        if (!user) {
            // Distinguish "already done" from "bad link" — clicking the link
            // twice (or a mail scanner pre-fetching it) is not an error.
            throw AppError.badRequest(
                'This verification link is invalid or has expired. Please request a new one.',
                'VERIFY_TOKEN_INVALID'
            );
        }

        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;

        // PENDING_VERIFICATION → ACTIVE once the email is proven.
        if (user.accountStatus === 'PENDING_VERIFICATION') {
            user.accountStatus = 'ACTIVE';
        }
        await user.save();

        return {
            message: 'Email verified successfully.',
            token: jwtProvider.createAuthToken(user),
            user: sanitizeUser(user),
        };
    }

    /**
     * POST /auth/resend-verification  { email }
     * Uniform response regardless of whether the account exists.
     */
    async resendVerification(email) {
        if (!email) throw AppError.badRequest('Email address is required.');

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        const GENERIC_OK = { message: 'If that account needs verification, a new link has been sent.' };
        if (!user) return GENERIC_OK;

        if (user.isEmailVerified) {
            return { message: 'This email address is already verified. You can sign in.' };
        }

        // Cooldown — stops double-clicks and inbox flooding.
        if (user.lastVerificationEmailAt) {
            const elapsed = (Date.now() - user.lastVerificationEmailAt.getTime()) / 1000;
            if (elapsed < RESEND_COOLDOWN_SECONDS) {
                throw AppError.tooMany(
                    `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} seconds before requesting another email.`,
                    'RESEND_COOLDOWN'
                );
            }
        }
        if (user.verificationEmailsSent >= MAX_VERIFICATION_EMAILS) {
            throw AppError.tooMany(
                'Too many verification emails sent. Please contact support@ecomatch.in.',
                'RESEND_LIMIT'
            );
        }

        await this.issueVerificationToken(user);
        return GENERIC_OK;
    }

    /**
     * POST /auth/request-email-change  { newEmail }   (authenticated)
     * Called by ProfilePage.jsx when the user edits the email field.
     */
    async requestEmailChange(userId, newEmail) {
        if (!newEmail) throw AppError.badRequest('A new email address is required.');

        const normalized = newEmail.toLowerCase().trim();
        const user = await User.findById(userId);
        if (!user) throw AppError.notFound('User not found.');

        if (normalized === user.email) {
            throw AppError.badRequest('That is already your current email address.');
        }
        if (await User.findOne({ email: normalized })) {
            throw AppError.conflict('That email address is already registered.', 'EMAIL_TAKEN');
        }

        const { raw, hashed } = createHashedToken();
        user.pendingEmail = normalized;
        user.pendingEmailToken = hashed;
        user.pendingEmailExpires = new Date(
            Date.now() + env.emailTokenExpiryHours * 60 * 60 * 1000
        );
        await user.save();

        await sendEmailChangeEmail(normalized, raw, user.name, user.email);
        // Alert the old address too — best effort, never blocks the request.
        sendEmailChangeAlert(user.email, normalized, user.name)
            .catch((e) => console.error('Email-change alert failed:', e.message));

        return { message: `Confirmation link sent to ${normalized}.` };
    }

    /** GET /auth/verify-email-change?token=… */
    async verifyEmailChange(rawToken) {
        if (!rawToken) throw AppError.badRequest('No confirmation token provided.');

        const user = await User.findOne({
            pendingEmailToken: hashToken(rawToken),
            pendingEmailExpires: { $gt: new Date() },
        }).select('+pendingEmailToken +pendingEmailExpires');

        if (!user) {
            throw AppError.badRequest(
                'This confirmation link is invalid or has expired.',
                'EMAIL_CHANGE_TOKEN_INVALID'
            );
        }

        // Re-check uniqueness — someone else may have claimed it since the request.
        const taken = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } });
        if (taken) {
            user.pendingEmail = null;
            user.pendingEmailToken = null;
            user.pendingEmailExpires = null;
            await user.save();
            throw AppError.conflict('That email address has since been registered by someone else.');
        }

        user.email = user.pendingEmail;
        user.isEmailVerified = true;
        user.emailVerifiedAt = new Date();
        user.pendingEmail = null;
        user.pendingEmailToken = null;
        user.pendingEmailExpires = null;
        user.tokenVersion += 1;      // old sessions reference the old identity
        await user.save();

        return {
            message: 'Email address updated successfully.',
            token: jwtProvider.createAuthToken(user),
            user: sanitizeUser(user),
        };
    }
}

module.exports = new VerificationServices();
```

---

## 🚦 Step 4: Controller (`src/controller/authController.js`)

```javascript
const verificationServices = require('../services/verificationServices');

    verifyEmail = asyncHandler(async (req, res) => {
        const result = await verificationServices.verifyEmailByToken(req.query.token);
        res.status(200).json({ success: true, ...result });
    });

    resendVerification = asyncHandler(async (req, res) => {
        const result = await verificationServices.resendVerification(req.body.email);
        res.status(200).json({ success: true, ...result });
    });

    requestEmailChange = asyncHandler(async (req, res) => {
        const result = await verificationServices.requestEmailChange(req.user._id, req.body.newEmail);
        res.status(200).json({ success: true, ...result });
    });

    verifyEmailChange = asyncHandler(async (req, res) => {
        const result = await verificationServices.verifyEmailChange(req.query.token);
        res.status(200).json({ success: true, ...result });
    });
```

---

## 🛣️ Step 5: Routes (`src/routes/authRoutes.js`)

Paths must match `lib/api.js` exactly.

```javascript
/* ---------- Email verification (public — user isn't signed in yet) ---------- */
router.get('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', emailLimiter, AuthController.resendVerification);

/* ---------- Email change (authenticated request, public confirm) ---------- */
router.post('/request-email-change', authenticate, emailLimiter, AuthController.requestEmailChange);
router.get('/verify-email-change', AuthController.verifyEmailChange);

/* ---------- Legacy OTP path — kept working, reused for phone later ---------- */
router.post('/verify-otp', authLimiter, UserController.verifyEmailOtp);
```

---

## 🔁 Step 6: Update Signup to Issue a Link

In `src/services/userServices.js`, replace the OTP block in `initiateSignup`. Full rewritten signup
in guide `06`; this is the verification-specific change:

```javascript
// ---- REMOVE ----
// const otp = generateOtp();
// const hashedOtp = await bcrypt.hash(otp, 8);
// await OtpVerification.deleteMany({ email: normalizedEmail });
// await OtpVerification.create({ email: normalizedEmail, otp: hashedOtp,
//                                expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
// await sendOtpEmail(normalizedEmail, otp, data.businessName);
// const tempToken = jwtProvider.createJwt({ email: normalizedEmail, step: 'OTP_PENDING' });
// return { email: normalizedEmail, tempToken, message: "OTP sent to email..." };

// ---- ADD ----
const verificationServices = require('./verificationServices');
await verificationServices.issueVerificationToken(userRecord);

// SignUpPage.jsx does setToken(data.token) then routes to /check-email, which
// polls /auth/me — so it needs a REAL session token, not a temp one.
return {
    message: 'Account created! Please check your email to verify your address.',
    token: jwtProvider.createAuthToken(userRecord),
    user: sanitizeUser(userRecord),
};
```

---

## 🖥️ Step 7: Frontend — What Already Works

Good news: **all three pages are built and need no changes** once the endpoints exist.

| Page | Behaviour | Status |
|------|-----------|--------|
| `CheckEmailPage.jsx` | Polls `/auth/me` every 5s, resend button, sign-out | ✅ works as-is |
| `VerifyEmailPage.jsx` | Reads `?token=`, calls verify, `setToken(data.token)`, redirects | ✅ works as-is |
| `VerifyEmailChangePage.jsx` | Reads `?token=`, calls verify-email-change | ✅ works as-is |

One small robustness note: `VerifyEmailPage.jsx` already guards against React 18 StrictMode's
double-invoke with a `ran` ref. Keep that — without it the second call consumes an
already-consumed token and shows a false failure.

### ⚠️ Polling cost

`CheckEmailPage` polls `/auth/me` every 5 seconds indefinitely. With 500 users idling on that page
that is 100 req/s of pure overhead, and it will trip the `apiLimiter` from guide `01` (300 requests
/ 15 min ≈ one every 3s). Two fixes:

1. **Short term:** exempt `/auth/me` from the general limiter, or raise its window.
2. **Better:** back off — poll every 5s for the first minute, then every 15s, and stop after
   5 minutes with a "Check again" button.

```javascript
// CheckEmailPage.jsx — replace the fixed setInterval
const attemptsRef = useRef(0);
useEffect(() => {
  let timer;
  const tick = async () => {
    attemptsRef.current += 1;
    try {
      const { user } = await apiGetMe();
      if (proceedIfVerified(user)) return;           // done
    } catch { /* transient */ }
    if (attemptsRef.current > 40) return;            // give up after ~5 min
    const delay = attemptsRef.current < 12 ? 5000 : 15000;
    timer = setTimeout(tick, delay);
  };
  timer = setTimeout(tick, 5000);
  return () => clearTimeout(timer);
}, []);
```

---

## 🧪 Step 8: Test

```bash
# 1. Signup → check the inbox for the link
curl -X POST http://localhost:5000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"name":"GreenBrew Co.","email":"you@example.com","password":"Test@1234","confirmPassword":"Test@1234"}'

# 2. Verify
curl "http://localhost:5000/api/auth/verify-email?token=<RAW>"

# 3. Replay → must fail
curl "http://localhost:5000/api/auth/verify-email?token=<RAW>"   # 400

# 4. Resend twice within 60s → second is 429
curl -X POST http://localhost:5000/api/auth/resend-verification \
  -H "Content-Type: application/json" -d '{"email":"you@example.com"}'
```

Checklist:
- [ ] Signup response has a **real** `token` (usable on `/auth/me`), not a `tempToken`
- [ ] `isEmailVerified` is `false` immediately after signup
- [ ] Clicking the link flips it to `true` and sets `accountStatus: ACTIVE`
- [ ] `/check-email` moves on **by itself** within ~5s of clicking the link in another tab
- [ ] Token is single-use and expires after `EMAIL_TOKEN_EXPIRY_HOURS`
- [ ] Resend cooldown is 60s; hard cap at 8 emails
- [ ] Email change: old address keeps working until the new one is confirmed
- [ ] Email change to an address already in use → `409`
- [ ] Old address receives the security alert
- [ ] `POST /auth/verify-otp` still works (regression check on existing code)

---

## 🔒 Security Summary

1. **Token hashes only in the DB** (SHA-256, same rule as guide `04`).
2. **Single-use, 24-hour expiry.** Longer than a password reset because signup verification is less
   sensitive and users check email less promptly.
3. **Uniform resend response** — no account enumeration.
4. **60-second cooldown + 8-email cap + hourly rate limit.** Three layers, because outbound email
   is the most expensive endpoint we own.
5. **`pendingEmail` never overwrites `email` until confirmed.** Prevents a typo — or an attacker
   with a stolen session — from locking the real owner out.
6. **Both addresses are notified on an email change.** The old address is the owner's only channel
   to notice a hijack.
7. **Email change bumps `tokenVersion`**, revoking sessions tied to the old identity.
8. **Server-side gating, always.** `PreferencesPage.jsx` checks `isEmailVerified` client-side, but
   `requireVerifiedEmail` (guide `02`) is what actually enforces it.
9. **Expect mail scanners to pre-fetch links.** Corporate spam filters issue a GET before the human
   clicks. That is why verification is idempotent-ish and why the frontend must handle
   "already verified" gracefully rather than showing an error.

---

## 💼 CEO Review Notes

- **Verification is our #1 signup funnel leak.** Every extra step loses users. Measure
  signup → verified conversion from day one and treat anything under 70% as a fire.
- **Do not gate browsing behind verification.** Right now an unverified user is trapped on
  `/check-email` and cannot see a single listing. Let them browse the marketplace read-only and
  gate only the actions that create obligations (listing, requesting, messaging). Seeing 200 real
  listings is the strongest possible motivation to finish verifying.
- **Send from our own domain, not Gmail.** `no-reply@ecomatch.in` with SPF/DKIM/DMARC. A
  verification email from a Gmail address to a business inbox reads as phishing and lands in spam —
  that alone can halve activation.
- **Email verification ≠ business verification.** These are two different trust tiers and we should
  not let users confuse them. The "Verified" badge on `ProfilePage.jsx` is currently hardcoded and
  shown to everyone. That is a trust-integrity problem: it makes our most valuable signal
  meaningless. Either wire it to real KYB (GST check) or remove the badge until we do.
- **The OTP code we already wrote is not wasted.** Redirect it to phone verification. For logistics
  coordination — the thing that actually makes deals complete — a verified mobile number matters
  more than a verified email, and our users live on WhatsApp.
