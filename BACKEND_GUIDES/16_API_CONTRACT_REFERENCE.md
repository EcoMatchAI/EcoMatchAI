# API Contract Reference

The single source of truth for every EcoMatch endpoint. **When the frontend and backend disagree,
this file decides.** Keep it updated in the same commit as any route change.

Base URL: `http://localhost:5000/api` (dev) — set via `VITE_API_URL` in the frontend.
Auth: `Authorization: Bearer <accessToken>` unless marked 🌐 public.

---

## 📐 Response Conventions

**Success**
```jsonc
{ "success": true, "message": "…", /* payload keys at the top level */ }
```

**Error**
```jsonc
{
  "success": false,
  "message": "Human-readable, safe to show the user",
  "code": "MACHINE_READABLE",          // optional
  "errors": [{ "field": "email", "message": "…" }]   // 422 only
}
```

The frontend's `request()` wrapper reads `data.message` on failure, so **every error must carry a
`message`**. Branch on `code`, never on message text.

---

## 🔑 Auth — `/api/auth`

| Method | Path | Auth | Body / Query | Returns | Guide |
|--------|------|------|--------------|---------|-------|
| POST | `/signup` | 🌐 | `{ name, email, password, confirmPassword }` | `{ token, user, message }` | `05`,`06` |
| POST | `/login` | 🌐 | `{ email, password }` | `{ token, refreshToken, user }` | `03` |
| GET | `/me` | ✅ | — | `{ user }` | `03` |
| POST | `/refresh` | 🌐 | `{ refreshToken }` | `{ token, user }` | `03` |
| POST | `/logout` | ✅ | — | `{ message }` | `03` |
| POST | `/logout-all` | ✅ | — | `{ message }` | `03` |
| POST | `/change-password` | ✅ | `{ currentPassword, newPassword, confirmPassword }` | `{ message }` | `03` |
| GET | `/verify-email` | 🌐 | `?token=` | `{ token, user, message }` | `05` |
| POST | `/resend-verification` | 🌐 | `{ email }` | `{ message }` | `05` |
| POST | `/request-email-change` | ✅ | `{ newEmail }` | `{ message }` | `05` |
| GET | `/verify-email-change` | 🌐 | `?token=` | `{ token, user, message }` | `05` |
| POST | `/forgot-password` | 🌐 | `{ email }` | `{ message }` | `04` |
| GET | `/reset-password/verify` | 🌐 | `?token=` | `{ valid, maskedEmail }` | `04` |
| POST | `/reset-password` | 🌐 | `{ token, password, confirmPassword }` | `{ message }` | `04` |
| POST | `/verify-otp` | 🌐 | `{ email, otp }` | `{ verificationToken, message }` | `05` (legacy) |

### ⚠️ Contract note: `token`, not `tempToken`

`SignUpPage.jsx` and `SignInPage.jsx` both call `setToken(data.token)`. The existing backend returns
`tempToken` from `initiateSignup`. **Rename it.** Signup must return a real session token because
`CheckEmailPage.jsx` immediately polls `/auth/me` with it.

---

## 👤 Profile — `/api/profile`

| Method | Path | Auth | Body | Returns | Guide |
|--------|------|------|------|---------|-------|
| GET | `/` | ✅ | — | `{ user }` | `06` |
| POST | `/complete` | ✅ verified | `{ businessTypes, businessDetails, generatorInfo, upcyclerInfo, materials }` | `{ user, message }` | `06` |
| PATCH | `/` | ✅ | `{ personalDetails?, businessDetails?, businessTypes?, materials?, notificationPrefs? }` | `{ user, message }` | `06` |
| GET | `/public/:id` | 🌐 | — | `{ user }` (no PII) | `06` |

`POST /complete` returns **409 `PROFILE_ALREADY_COMPLETE`** if already done — `PreferencesPage.jsx`
handles this by redirecting to the dashboard.

---

## 📦 Listings — `/api/listings`

| Method | Path | Auth | Params | Returns | Guide |
|--------|------|------|--------|---------|-------|
| GET | `/` | 🌐 optional | see filters below | `{ listings[], pagination }` | `07` |
| GET | `/mine` | ✅ | `?status=&page=&limit=` | `{ listings[], pagination }` | `07` |
| GET | `/:id` | 🌐 optional | — | `{ listing }` | `07` |
| POST | `/` | ✅ generator | listing fields | `{ listing, message }` | `07` |
| PATCH | `/:id` | ✅ owner | partial fields | `{ listing, message }` | `07` |
| PATCH | `/:id/status` | ✅ owner | `{ status }` | `{ listing, message }` | `07` |
| DELETE | `/:id` | ✅ owner | — | `{ message }` | `07` |

### Search query parameters

| Param | Type | Example | Notes |
|-------|------|---------|-------|
| `q` | string | `coffee` | Full-text over title + description |
| `category` | CSV | `Organic,Wood` | Maps to the filter checkboxes |
| `materialId` | CSV | `coffee,grain` | |
| `city` | string | `Pune` | Exact, case-insensitive |
| `minQuantity` / `maxQuantity` | number (kg) | `100` / `12000` | Against `quantityInKg` |
| `minPurity` | 0–100 | `90` | Includes grade-only listings |
| `pricingModel` | enum | `Free` | |
| `logistics` | enum | `Local Pickup` | |
| `frequency` | enum | `Weekly` | |
| `lat` / `lng` / `radius` | number / `25km` | | Falls back to the viewer's own location |
| `availableBefore` | ISO date | `2026-08-14` | |
| `sort` | enum | `newest`\|`priceLow`\|`priceHigh`\|`quantityHigh`\|`purityHigh`\|`match` | `match` sorts **only the current page** — see guide `12` |
| `page` / `limit` | int | `1` / `12` | `limit` capped at 50 |

### Listing object

```jsonc
{
  "_id": "…",
  "title": "120kg Spent Coffee Grounds — Daily Supply",
  "slug": "120kg-spent-coffee-grounds-daily-supply",
  "category": "Organic",
  "materialId": "coffee",
  "description": "…",
  "photos": [{ "url": "…", "thumbnailUrl": "…", "publicId": "…", "isPrimary": true }],
  "primaryPhoto": "…",            // virtual
  "quantity": 120, "unit": "kg", "quantityInKg": 120,
  "quantityLabel": "120 kg",      // virtual
  "frequency": "Daily",
  "availableFrom": "2026-08-14T00:00:00.000Z",
  "purity": "92%", "purityPercent": 92,
  "moisture": "Wet",
  "pricingModel": "Negotiable", "pricePaise": 800, "priceUnit": "per kg",
  "priceLabel": "₹8 / kg",        // virtual
  "city": "Pune",
  "location": { "type": "Point", "coordinates": [73.8567, 18.5204] },
  "logistics": "Local Pickup",
  "packaging": "Bagged (25kg sacks)",
  "status": "Active",
  "viewCount": 48, "requestCount": 3,
  "owner": { "_id": "…", "name": "GreenBrew Co.", "isBusinessVerified": true },
  "score": 94,                    // only when an upcycler is signed in
  "matchWhy": "Primary material match (Coffee) · 5 km away · Purity 92% meets your 90% requirement",
  "distanceKm": 5.2
}
```

`pickupAddress` is **never** in this payload — it appears only on an accepted `Deal`.

---

## 📤 Uploads — `/api/uploads`

| Method | Path | Auth | Body | Returns | Guide |
|--------|------|------|------|---------|-------|
| POST | `/listing-photos` | ✅ | multipart `photos[]` (≤8, 5 MB each) | `{ photos[] }` | `08` |
| POST | `/document` | ✅ | multipart `document` + `docType` | `{ document }` | `08` |
| POST | `/avatar` | ✅ | multipart `avatar` | `{ avatarUrl }` | `08` |
| DELETE | `/listing-photo` | ✅ owner | `{ listingId, publicId }` | `{ photos[] }` | `08` |

**Do not set `Content-Type` on these requests** — the browser must generate the multipart boundary.
Use the `uploadRequest()` helper, not `request()`.

---

## 💬 Chat — `/api/chat`

| Method | Path | Auth | Body / Query | Returns | Guide |
|--------|------|------|--------------|---------|-------|
| GET | `/conversations` | ✅ | `?archived=&page=` | `{ conversations[] }` | `09` |
| POST | `/conversations` | ✅ | `{ otherUserId, listingId? }` | `{ conversationId }` | `09` |
| GET | `/conversations/:id/messages` | ✅ | `?limit=&before=` | `{ messages[], hasMore, oldestAt }` | `09` |
| POST | `/conversations/:id/messages` | ✅ | `{ text, type?, attachments? }` | `{ message }` | `09` |
| PATCH | `/conversations/:id/read` | ✅ | — | `{ message }` | `09` |
| PATCH | `/conversations/:id/archive` | ✅ | `{ archived }` | `{ message }` | `09` |
| GET | `/unread-count` | ✅ | — | `{ count }` | `09` |

### Socket.IO events

Connect: `io(SOCKET_URL, { auth: { token } })`

**Client → server** (all take an optional ack callback)

| Event | Payload | Ack |
|-------|---------|-----|
| `conversation:join` | `{ conversationId }` | `{ success }` |
| `conversation:leave` | `{ conversationId }` | — |
| `message:send` | `{ conversationId, text, type?, clientId? }` | `{ success, message, clientId }` |
| `typing:start` / `typing:stop` | `{ conversationId }` | — |
| `message:read` | `{ conversationId }` | `{ success }` |
| `presence:check` | `{ userIds[] }` | `{ statuses }` |

**Server → client**

| Event | Payload |
|-------|---------|
| `message:new` | `{ conversationId, message }` |
| `conversation:updated` | `{ conversationId, lastMessage, unreadCount }` |
| `typing:start` / `typing:stop` | `{ conversationId, userId, name }` |
| `message:read` | `{ conversationId, readBy, readAt }` |
| `presence:online` / `presence:offline` | `{ userId, lastSeen? }` |
| `notification:new` | notification object |
| `notification:count` | `{ count }` |

### Message object

```jsonc
{
  "id": "…", "senderId": "…", "senderName": "BioPack Solutions",
  "sender": "me",                // "me" | "them" — matches MessagesPage.jsx
  "text": "Yes, 10am at the side entrance.",
  "type": "text",                // text|image|file|system|listing_share|pickup_proposal
  "attachments": [], "meta": null,
  "time": "1:31 PM",             // pre-formatted for display
  "createdAt": "2026-07-26T08:01:00.000Z",
  "status": "Read"               // Sent | Read | Received
}
```

---

## 📨 Sourcing Requests — `/api/requests`

| Method | Path | Auth | Body / Query | Returns | Guide |
|--------|------|------|--------------|---------|-------|
| POST | `/` | ✅ upcycler | `{ listingId, requestedQuantity, unit?, message?, offeredPrice?, preferredPickupDate? }` | `{ request }` | `10` |
| GET | `/` | ✅ | `?direction=received\|sent&status=&page=` | `{ requests[], pagination }` | `10` |
| GET | `/:id` | ✅ party | — | `{ request }` | `10` |
| PATCH | `/:id/accept` | ✅ owner | `{ responseMessage?, logisticsOverride? }` | `{ deal }` | `10` |
| PATCH | `/:id/decline` | ✅ owner | `{ responseMessage? }` | `{ request }` | `10` |
| PATCH | `/:id/withdraw` | ✅ requester | — | `{ message }` | `10` |

Error codes: `LISTING_NOT_ACTIVE`, `QUANTITY_EXCEEDS_AVAILABLE`, `DUPLICATE_REQUEST` (409).

---

## 🤝 Deals — `/api/deals`

| Method | Path | Auth | Body | Returns | Guide |
|--------|------|------|------|---------|-------|
| GET | `/` | ✅ | `?status=&role=&page=` | `{ deals[], pagination }` | `10` |
| GET | `/:id` | ✅ party | — | `{ deal, role }` | `10` |
| PATCH | `/:id/schedule` | ✅ party | `{ scheduledAt, scheduledSlot?, dockNotes?, deliveryAddress? }` | `{ deal }` | `10` |
| PATCH | `/:id/status` | ✅ party | `{ status, note?, proofUrl? }` | `{ deal }` | `10` |
| PATCH | `/:id/confirm` | ✅ party | — | `{ deal, completed, message }` | `10` |
| PATCH | `/:id/cancel` | ✅ party | `{ reason }` (required) | `{ deal }` | `10` |
| PATCH | `/:id/dispute` | ✅ party | `{ reason }` | `{ deal }` | `10` |

Status flow: `Agreed → Scheduled → PickedUp → Delivered → Completed`
(plus `Cancelled`, `Disputed`). Only the **generator** may set `PickedUp`.
Error codes: `INVALID_TRANSITION`, `WRONG_PARTY`.

---

## 🔔 Notifications — `/api/notifications`

| Method | Path | Auth | Query | Returns | Guide |
|--------|------|------|-------|---------|-------|
| GET | `/` | ✅ | `?type=&unreadOnly=&page=` | `{ notifications[], unreadCount, pagination }` | `11` |
| GET | `/unread-count` | ✅ | — | `{ count }` | `11` |
| PATCH | `/read-all` | ✅ | — | `{ message, updated }` | `11` |
| PATCH | `/:id/read` | ✅ | — | `{ notification }` | `11` |
| DELETE | `/:id` | ✅ | — | `{ message }` | `11` |

`?type=system` also matches `deal` and `logistics` — this mirrors the existing frontend filter.

### Notification object

```jsonc
{
  "id": "…", "type": "match", "title": "New match found",
  "body": "BioSkins Skincare Co. is a 95% match for your Spent Coffee Grounds listing.",
  "read": false,
  "time": "12m ago",             // pre-formatted
  "group": "Today",              // Today | Earlier
  "action": "listingsDetails",   // a PAGE_TO_PATH key from App.jsx
  "actionId": "…"
}
```

---

## 🎯 Matches — `/api/matches`

| Method | Path | Auth | Query | Returns | Guide |
|--------|------|------|-------|---------|-------|
| GET | `/` | ✅ upcycler | `?limit=&minScore=` | `{ matches[], total }` | `12` |
| GET | `/listing/:id` | ✅ owner | `?limit=&minScore=` | `{ matches[] }` | `12` |
| GET | `/explain/:listingId` | ✅ | — | `{ score, breakdown, weights, reasons, distanceKm }` | `12` |

---

## 📊 Dashboard — `/api/dashboard`

| Method | Path | Auth | Query | Returns | Guide |
|--------|------|------|-------|---------|-------|
| GET | `/` | ✅ complete | — | `{ greeting, statCards[], impact[], badges, myListings[], recentDeals[] }` | `13` |
| GET | `/matches` | ✅ complete | `?limit=` | `{ matches[] }` | `13` |
| GET | `/profile-stats` | ✅ | — | `{ stats[] }` | `13` |
| GET | `/impact-report` | ✅ | `?from=&to=` | `{ totals, byMaterial[], byMonth[], methodology }` | `13` |

---

## ⭐ Reviews — `/api/reviews`

| Method | Path | Auth | Body | Returns | Guide |
|--------|------|------|------|---------|-------|
| GET | `/user/:id` | 🌐 | `?page=&limit=` | `{ reviews[], total, distribution }` | `14` |
| POST | `/` | ✅ | `{ dealId, rating, text?, subRatings? }` | `{ review }` | `14` |
| GET | `/pending` | ✅ | — | `{ deals[] }` | `14` |
| POST | `/:id/reply` | ✅ reviewee | `{ text }` | `{ review }` | `14` |

Error codes: `DEAL_NOT_COMPLETED`, `ALREADY_REVIEWED` (409).

---

## 💬 Feedback — `/api/feedback`

| Method | Path | Auth | Body | Returns | Guide |
|--------|------|------|------|---------|-------|
| POST | `/` | 🌐 | `{ type, rating, area, message, email?, page? }` | `{ message, id }` | `14` |
| POST | `/contact` | 🌐 | `{ name, email, subject?, message }` | `{ message, id }` | `14` |
| GET | `/` | ✅ admin | `?kind=&type=&status=&page=` | `{ feedback[], pagination }` | `14` |
| PATCH | `/:id` | ✅ admin | `{ status?, priority?, internalNote?, assignedTo? }` | `{ feedback }` | `14` |

---

## 👥 Users (admin) — `/api/users`

| Method | Path | Auth | Query | Returns | Guide |
|--------|------|------|-------|---------|-------|
| GET | `/` | ✅ admin | `?status=&page=` | `{ users[], pagination }` | `02` |
| GET | `/:id` | ✅ admin | — | `{ user }` | `02` |
| PATCH | `/:id/status/:status` | ✅ admin | — | `{ message }` | `02` |
| PATCH | `/:id/verify` | ✅ admin/mod | `{ verificationStatus, note? }` | `{ user }` | `06` |

> `GET /api/users` is currently **unprotected** and dumps every user document, password hashes
> included. Guide `02` fixes both problems. Treat it as a live incident until it ships.

---

## 🩺 System

| Method | Path | Auth | Returns |
|--------|------|------|---------|
| GET | `/api/health` | 🌐 | `{ success, status, env, uptime }` |

---

## 🔄 Migration Map: Old Routes → New

The existing `/api/user/*` routes stay mounted as deprecated aliases for one release, then are
removed.

| Deprecated | Replacement |
|------------|-------------|
| `POST /api/user/signup/` | `POST /api/auth/signup` |
| `POST /api/user/signup/verify-otp` | `GET /api/auth/verify-email?token=` (or `POST /api/auth/verify-otp`) |
| `POST /api/user/signup/complete-profile` | `POST /api/profile/complete` |
| `GET /api/user/profile` | `GET /api/auth/me` or `GET /api/profile` |
| `GET /api/user/` | `GET /api/users` (**now admin-only**) |
| `PATCH /api/user/` | `PATCH /api/profile` |
| `DELETE /api/user/` | `DELETE /api/users/me` |
| `PATCH /api/user/:id/status/:status` | `PATCH /api/users/:id/status/:status` |

---

## ✅ Contract Checklist Before Merging Any Route

- [ ] Path matches what `frontend/src/lib/api.js` calls
- [ ] Response has `success` and, on error, `message`
- [ ] Auth middleware applied (`authenticate`, and ownership where relevant)
- [ ] Validator attached
- [ ] `password` and every token field excluded from the response
- [ ] Pagination on any list endpoint, with `limit` capped
- [ ] Status codes follow the table in guide `15`
- [ ] Machine-readable `code` on any error the frontend must branch on
- [ ] **This file updated in the same commit**

---

## 💼 CEO Review Notes

- **This file is the interface between two halves of the team.** Whoever adds a route and doesn't
  update this document creates a bug in the other half of the codebase. Make it a review requirement,
  not a suggestion — it costs 30 seconds and prevents the class of problem currently blocking the
  entire product (a frontend written against an API that doesn't exist).
- **The mismatch table in guide `00` is the whole lesson.** We built a complete frontend against an
  imagined API and a partial backend against a different one. That cost us real weeks. The fix is
  cultural, not technical: agree the contract first, write it here, then build both sides against it.
- **Publish this as our API docs when we need partners.** Waste aggregators, logistics providers, and
  ERP integrations will all eventually want programmatic access, and a partner API is a genuine moat —
  once a manufacturer's system posts listings to us automatically, they do not switch. Wiring this
  file into Swagger/OpenAPI later is a small step from here.
- **`GET /api/users` returning every user with password hashes is a live, exploitable incident**, not
  a backlog item. It is the single most urgent line in this document.
- **Keep the deprecated aliases for exactly one release, then delete them.** Two ways to do the same
  thing is how a codebase becomes unmaintainable, and we are too small to carry that cost.
