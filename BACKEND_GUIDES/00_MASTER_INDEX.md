# EcoMatch Backend — Master Index & Build Order

This folder contains **step-by-step implementation guides** to finish the EcoMatch backend
(Node.js + Express + MongoDB + Socket.IO). Each guide is self-contained, in the same format as
`backend/SELLER_REGISTRATION_GUIDE.md`, and can be handed to a developer as a single work ticket.

> **Read this file first.** It tells you the order to build in, and — critically — lists the
> **contract mismatches** between the already-built frontend and the current backend that must be
> fixed before anything else works end-to-end.

---

## 📊 Current State (audited)

### ✅ Already done in backend
| Area | Files | Status |
|------|-------|--------|
| DB connection | `src/config/db.js` | ✅ Working |
| User model | `src/model/user.js` | 🟡 Exists but missing ~8 fields the frontend reads |
| Address model | `src/model/address.js` | ✅ Working |
| OTP model (10-min TTL) | `src/model/otpVerification.js` | ✅ Working |
| 3-step registration | `src/services/userServices.js` | ✅ Working (OTP based) |
| Email sender | `src/util/emailService.js` | ✅ Working |
| JWT helper | `src/util/jwtProvider.js` | 🟡 Works, but token payload is too thin |
| Roles / statuses | `src/domain/*` | 🟡 Roles are BUYER/SELLER, product is Generator/Upcycler |

### ⬜ Not built at all
Login · Logout · `/auth/me` · Forgot & Reset Password · Auth middleware · Listings (products) ·
File uploads · Chat (WebSocket) · Sourcing Requests · Deals & Logistics · Notifications ·
Matching / compatibility score · Dashboard analytics · Feedback & Contact · Validation layer ·
Central error handling · CORS · Rate limiting

---

## 🔴 Blocking Contract Mismatches (fix these first)

The frontend is **already written against a specific API** in
`frontend/src/lib/api.js`. Today it would fail on every call. These are not opinions — they are
hard breaks:

| # | Frontend calls / expects | Backend currently | Fix in guide |
|---|--------------------------|-------------------|--------------|
| 1 | `POST /api/auth/signup` | `POST /api/user/signup` | `01`, `16` |
| 2 | `POST /api/auth/login` | **does not exist** | `03` |
| 3 | `GET /api/auth/me` | **does not exist** | `03` |
| 4 | Sends `{ name, email, password, confirmPassword }` | expects `businessName` | `06`, `16` |
| 5 | Reads `data.token` after signup/login | returns `tempToken` | `03`, `16` |
| 6 | `GET /api/auth/verify-email?token=…` (**link** based) | 6-digit **OTP** only | `05` |
| 7 | Polls `/auth/me` for `user.isEmailVerified` | endpoint missing | `03`, `05` |
| 8 | Reads `user.profileCompleted` | field does not exist | `06` |
| 9 | `POST /api/profile/complete` with `{ businessTypes, businessDetails, generatorInfo, upcyclerInfo, materials }` | `completeProfile` expects GSTIN / bankDetails / role | `06` |
| 10 | `PATCH /api/profile` with `{ personalDetails }` | not implemented | `06` |
| 11 | `POST /api/auth/request-email-change`, `GET /api/auth/verify-email-change` | not implemented | `05` |
| 12 | Every request sends `Authorization: Bearer <token>` | no middleware reads it | `02` |

### 🐛 Three real bugs to fix while you are in there
1. **`getUserProfile` leaks the password hash.** `userServices.getUserByEmail` returns the full
   Mongoose document, password included, and `userController` sends it straight to the client.
   Fix: `.select('-password')` — see guide `02`.
2. **`req.user` is never set.** `userController.updateUser` and `deleteUser` read `req.user`, but no
   middleware populates it, so both throw. Fix: auth middleware — guide `02`.
3. **`package.json` dev script is wrong.** `"dev": "nodemon src/index.js"` but the entry file is
   `backend/index.js`. Fix — guide `01`.

Also: `cors` and `express-rate-limit` are installed but never used, and `authServices.js` is an
empty file.

---

## 🗺️ Build Order

Build in this order. Each phase leaves the app in a working, demo-able state.

### Phase 1 — Foundations (do not skip)
| # | Guide | Why it's first |
|---|-------|----------------|
| 01 | `01_PROJECT_SETUP_AND_SERVER_GUIDE.md` | Folder structure, `.env`, CORS, route mounting, error handler |
| 02 | `02_AUTH_MIDDLEWARE_GUIDE.md` | Everything downstream needs `req.user` |
| 15 | `15_VALIDATION_AND_ERROR_HANDLING_GUIDE.md` | Read alongside 01–02; stops error-handling debt |

### Phase 2 — Complete the Authentication System
| # | Guide | Delivers |
|---|-------|----------|
| 03 | `03_LOGIN_AND_SESSION_GUIDE.md` | Login, `/auth/me`, logout, refresh tokens |
| 04 | `04_FORGOT_PASSWORD_GUIDE.md` | Forgot → email link → reset → change password |
| 05 | `05_EMAIL_VERIFICATION_GUIDE.md` | Link-based verify + resend + email change (matches frontend) |

### Phase 3 — Profile & Onboarding
| # | Guide | Delivers |
|---|-------|----------|
| 06 | `06_USER_MODEL_AND_PROFILE_GUIDE.md` | Extended schema, `/profile/complete`, `PATCH /profile`, geocoding |

### Phase 4 — The Product (this *is* the marketplace)
| # | Guide | Delivers |
|---|-------|----------|
| 07 | `07_LISTING_MANAGEMENT_GUIDE.md` | Listing CRUD, search, filters, pagination, geo queries |
| 08 | `08_FILE_UPLOAD_GUIDE.md` | Photos + certification docs (Cloudinary) |

### Phase 5 — Communication
| # | Guide | Delivers |
|---|-------|----------|
| 09 | `09_CHAT_WEBSOCKET_GUIDE.md` | Socket.IO chat, conversations, unread counts, read receipts |
| 11 | `11_NOTIFICATIONS_GUIDE.md` | In-app notification centre + real-time push |

### Phase 6 — Close the transaction loop
| # | Guide | Delivers |
|---|-------|----------|
| 10 | `10_SOURCING_REQUESTS_AND_DEALS_GUIDE.md` | Request → Accept → Deal → pickup → Completed |
| 12 | `12_MATCHING_ENGINE_GUIDE.md` | Rule-weighted compatibility score (the "AI" users see) |
| 13 | `13_DASHBOARD_AND_ANALYTICS_GUIDE.md` | Real dashboard/profile numbers, impact metrics |

### Phase 7 — Polish & ship
| # | Guide | Delivers |
|---|-------|----------|
| 14 | `14_FEEDBACK_AND_CONTACT_GUIDE.md` | Feedback + Contact Us endpoints |
| 16 | `16_API_CONTRACT_REFERENCE.md` | The single source of truth for every endpoint |
| 17 | `17_DEPLOYMENT_AND_TESTING_GUIDE.md` | Indexes, seeding, Postman, deploy, monitoring |

### 💼 Read at the end (and before you plan a sprint)
| # | Guide | Purpose |
|---|-------|---------|
| 18 | `18_CEO_REVIEW_AND_RECOMMENDATIONS.md` | Business review of the whole plan: what to cut, what to add, what order actually makes money |

---

## 💼 CEO-Revised Sequencing (supersedes the phases above for planning)

Guide `18` reviewed this plan from a business angle and **re-scoped it into milestones**. The phase
list above is ordered by *technical dependency*; the milestones below are ordered by *what we need to
learn first*. **Plan sprints against the milestones.**

### 🔴 Do this week — three non-negotiables
1. **Fix the live security hole.** `GET /api/users` is unauthenticated and returns every user
   document including password hashes. Guide `02`.
2. **Make onboarding work at all.** `completeProfile` demands a `role` the frontend never sends, so
   signup cannot be completed by anyone. Guide `06`.
3. **Delete every fabricated number in the UI** — the always-on "Verified" badge, `4.8 · 52 reviews`,
   `48` completed deals, `₹2.45L` savings, and the hardcoded `GreenBrew Co.` name. No external demo
   until these are gone; see guide `18` §2.3.

### Milestone 1 — a real user can complete the core loop (4–5 weeks)
`01` → `02` → `15` → `03` → `05` → `06` → `07` → `08` → `10` → `04`

**Deliberately cut from Milestone 1:** chat, notifications, matching, analytics, feedback. Two
businesses can finish a deal by phone once we have introduced them; they cannot finish one if the
listing doesn't exist or the request goes nowhere.

### Milestone 2 — good enough to grow (3–4 weeks)
`09` Chat · `11` Notifications · `12` Matching · `13` Dashboard

### Milestone 3 — ready to charge (2–3 weeks)
`14` Reviews + Feedback · `16` Contract docs · `17` Deploy hardening · internal admin dashboard

### Plan changes from the CEO review
- **Collect a phone number and add WhatsApp notifications** — highest-ROI addition; reuse the OTP
  code we already wrote for phone verification (guides `05`, `06`, `11`).
- **Don't gate marketplace browsing behind email verification** — gate only actions that create
  obligations (guide `05`).
- **Treat the ESG impact report as a monetisable product**, not a by-product (guide `13`).
- **No payments yet** — record `totalValuePaise` so we can price a commission later (guide `10`).
- **Cut:** auctions, group chat, public listing Q&A, Google OAuth (do LinkedIn instead), Redis
  scaling, and all generative-AI features.
- **Add:** an internal admin dashboard, and a named human owning disputed deals with a 24-hour SLA.

Every guide also ends with its own **💼 CEO Review Notes** section covering the business reasoning
specific to that area.

---

## 🎯 Definition of "Backend Done" for MVP

A user can, with **zero mocked data**:

1. Sign up → verify email → complete business profile → land on the dashboard.
2. Log out, log back in, and recover a forgotten password.
3. Publish a listing with photos, then edit / pause / delete it.
4. Browse the marketplace with filters and see a **real** compatibility score per listing.
5. Send a "Request to Source", and the other side accepts or declines it.
6. Chat in real time with that counterparty over WebSocket.
7. Receive notifications for match / request / message / deal events.
8. See a dashboard whose numbers are computed from the database.

Anything beyond that list is Phase 2 of the business, not of the MVP.

---

## 🧱 Target Folder Structure

```
backend/
├── index.js                  # entry: express + http + socket.io
├── .env
├── src/
│   ├── config/
│   │   ├── db.js
│   │   ├── cloudinary.js
│   │   └── socket.js
│   ├── domain/               # frozen enums (Roles, accountStatus, listingStatus, …)
│   ├── model/
│   ├── services/             # business logic — no req/res in here
│   ├── controller/           # thin: parse req → call service → send res
│   ├── routes/
│   ├── middleware/           # auth, validate, errorHandler, upload, rateLimit
│   ├── socket/               # socket handlers (chat, presence)
│   ├── util/
│   └── validators/
└── BACKEND_GUIDES/           # ← you are here (lives at EcoMatchAI/ root)
```

---

## 📌 Conventions used across all guides

- **CommonJS** (`require`) — matches the existing code. Do not mix in ESM.
- **Services never touch `req`/`res`.** Controllers do that. Keeps services testable.
- **Every error is an `AppError` with a real status code** — not the current
  `err instanceof Error ? 404 : 500`, which labels every failure a 404.
- **Response envelope:** `{ success, message, data }` for new endpoints. The frontend's
  `request()` wrapper reads `data.message` on failure, so **always** send a `message` on errors.
- **Never return `password`, `resetToken`, or `verificationToken`** in any response.
- **Money in paise / smallest unit** as an integer. Never floats for currency.
- **All timestamps UTC**, formatted in the frontend.
