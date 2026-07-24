# EcoMatch — Product Plan & Roadmap (`changes.md`)

> **Product:** A B2B industrial symbiosis marketplace where one business's waste/byproduct
> becomes another's raw material (coffee grounds → skincare, fabric scraps → insulation,
> wood offcuts → furniture, spent grain → animal feed).
>
> **Scope of this document:** Define the full page list, the data we collect from users,
> how logistics works for both sides, the product/listing data model, and PM recommendations —
> kept in sync with what is actually built.
>
> **Guiding principle for this phase:** _Build the basic marketplace that works end-to-end first._
> Matching is powered by a **simple ML-based recommendation system** on the backend (purity, distance,
> volume, material-type scoring) — **no generative-AI / LLM features in this phase.** We can layer
> smarter intelligence later once the core loop (List → Discover → Connect → Transact → Deliver) is solid.
>
> **Status:** Front-end prototype only (no backend yet). All data is mocked; actions fire toasts.
> _Last updated: 2026-06-12._

---

## 0. Changelog — What's Been Built So Far

**15 page-level screens are now built** (up from the original 7). Recent additions and changes:

- **New pages:** Forgot Password, Dashboard, Create/Edit Listing, Profile/Company page,
  Notifications, About Us, Privacy Policy, Terms & Conditions.
- **Onboarding (Preferences) reworked:** now a two-tab stepper — **Business Info** (business type,
  industry, address + map pin, city, service radius, GST/verification + document upload) and
  **Material Preferences** (primary materials, plus role-specific Generator byproducts / Upcycler
  feedstock). **Transport/logistics options were removed** from onboarding — logistics now lives on
  each listing instead.
- **Marketplace:** clicking a product opens a **full product-detail modal** showing every core listing
  field (category, quantity, frequency, availability, purity, moisture, price, pricing model, location,
  logistics, packaging, source business + verified badge, certifications, status, compatibility score).
- **Messages:** added a **contact search bar** to the conversations list.
- **Global Footer** with a **Feedback** option (full + compact variants); footer legal/about links now
  route to the new About / Privacy / Terms pages.
- **Topnav profile dropdown** (Profile, Account Settings, Saved Listings, Help, Feedback, Sign Out) and
  **sidebar** Dashboard / Notifications / Profile entries are wired to real routes.
- **Landing redesign:** Operational Flow & Testimonials sections rebuilt in the light brand theme with
  proper spacing.
- **Branding:** renamed **"EcoMatch AI" → "EcoMatch"** everywhere.

---

## 1. Total Pages We Need

The two account types are **Generator** (has waste/byproduct to sell) and **Upcycler** (wants material
to source). Most pages are shared; a few are role-specific.

### A. Public / Marketing (no login)
| # | Page | Status | Priority | Purpose |
|---|------|--------|----------|---------|
| 1 | Landing Page | ✅ Built | P0 | Value prop, how it works, social proof, CTA |
| 2 | How It Works | ✅ Built (section) | P1 | Operational flow for both roles |
| 3 | About Us | ✅ Built | P2 | Company info, mission, trust |
| 4 | Contact | ⬜ To build | P2 | Support contact (currently a footer toast) |
| 5 | Pricing / Plans | ⬜ To build | P2 | Subscription / commission model |
| 6 | Privacy Policy | ✅ Built | P1 | Required for any real B2B platform |
| 7 | Terms & Conditions | ✅ Built | P1 | Required for any real B2B platform |

### B. Authentication & Onboarding
| # | Page | Status | Priority | Purpose |
|---|------|--------|----------|---------|
| 8 | Sign In | ✅ Built | P0 | Login |
| 9 | Sign Up | ✅ Built | P0 | Register |
| 10 | Forgot / Reset Password | ✅ Built | P1 | Account recovery (email → reset link → confirm) |
| 11 | Email / Business Verification | 🟡 Partial | P0 | GST + docs collected in onboarding; **actual verify flow pending** |
| 12 | Onboarding — Business Profile (Preferences) | ✅ Built | P0 | Tabbed: business info + material preferences |

### C. Core Application (logged-in)
| # | Page | Status | Priority | Purpose |
|---|------|--------|----------|---------|
| 13 | Dashboard / Home | ✅ Built | **P0** | Snapshot: listings, matches, pending requests, impact, quick actions |
| 14 | Marketplace / Browse | ✅ Built | P0 | Discover listings + filters + **full product-detail modal** |
| 15 | Listing Details | ✅ Built | P0 | Full product info + match/compatibility + map |
| 16 | Create / Edit Listing | ✅ Built | **P0** | Generator posts/edits a byproduct (full form + photos) |
| 17 | My Listings (manage) | ✅ Built | P0 | Grid of own listings with views/requests, edit, create entry |
| 18 | Matches / Recommendations | 🟡 Partial | P0 | Dashboard shows recent matches; **dedicated ranked page pending** |
| 19 | Requests / Inquiries | ⬜ To build | **P0** | Incoming/outgoing "request to source" with accept/decline |
| 20 | Messages / Inbox | ✅ Built | P0 | 1:1 chat per deal + **contact search** |
| 21 | Deal / Order Page | ⬜ To build | **P0** | Single agreed transaction: status, qty, price, pickup, docs |
| 22 | Logistics / Shipment Tracking | ⬜ To build | P1 | Pickup scheduling + status timeline for a deal |
| 23 | Contracts / Agreements | ⬜ To build | P2 | Simple agreement record + downloadable PDF |
| 24 | Analytics / Impact Reports | 🟡 Partial | P2 | Impact shown on Dashboard + Profile; **dedicated reports pending** |

### D. Account & Settings
| # | Page | Status | Priority | Purpose |
|---|------|--------|----------|---------|
| 25 | Profile / Company Page | ✅ Built | P1 | Public company profile, role tags, stats, listings, reviews |
| 26 | Account Settings | 🟡 Interim | P1 | Profile dropdown currently routes to Preferences; **dedicated page pending** |
| 27 | Notifications | ✅ Built | P1 | Match / request / message / deal / system alerts with filters |
| 28 | Billing / Subscription | ⬜ To build | P2 | Invoices, plan management |
| 29 | Help / Support | ⬜ To build | P2 | FAQ + support (Feedback already in footer & dropdown) |

> **Legend:** ✅ Built · 🟡 Partial / interim · ⬜ To build
>
> **Remaining MVP-critical gaps:** Requests/Inquiries (19), Deal/Order Page (21), Logistics scheduling
> (22), and real Business Verification (11). These close the transactional loop.

---

## 2. Information We Need to Ask the User

Collected progressively — **don't ask everything at sign-up.** (a) + minimal onboarding first; the rest
is filled when posting/sourcing the first listing.

### a) Account & Identity (Sign Up) — ✅ built (name, email, password)
- Full name / contact person · Work email + password · Company / business name
- ⬜ Phone number (for logistics coordination & OTP) — _not yet collected_

### b) Business Profile (Onboarding "Business Info" tab) — ✅ built
- **Business type / role:** Generator, Upcycler, or **Both** (select one or both)
- Industry / category (cafe, brewery, textile, carpentry, food processing, …)
- Business address + **"Pin on map"** action (→ used for distance matching)
- Operating city / service radius
- **Verification:** GST / business registration number + optional document upload (KYB-lite)
- Company size / scale

### c) Material Preferences (Onboarding "Material Preferences" tab) — ✅ built
- **Primary material interests** (Coffee, Textiles, Wood, Plastics, Metals, Brewery Grain, …)
- For a **Generator:** byproducts generated + typical volume + frequency (daily/weekly/monthly)
- For an **Upcycler:** required feedstock + purity/grade + min/max volume + max sourcing distance

### d) Logistics — moved out of onboarding ⚠️
- Transport capabilities are **no longer asked during onboarding** (removed).
- **Logistics term is now captured per-listing** in the Create Listing form
  (`Local Pickup` / `Freight (supplier-arranged)` / `Courier` / `Buyer-arranged`) plus packaging format.
- ⬜ Still to add at deal time: pickup days/times, dock/loading info, who arranges & pays.

### e) Per-Listing Info (Create Listing form) — ✅ built (see §4)
- Title, category, description, photos, quantity + unit, frequency, availability date, purity, moisture,
  price + pricing model, location, logistics term, packaging, certifications, status.

> **PM note:** Add a **profile completeness meter** — more complete profiles → better ML match scores →
> faster deals. Make completeness a visible incentive.

---

## 3. How We Manage Logistics for Both Users

Logistics is the make-or-break of physical B2B marketplaces. Keep **Phase 1 simple** (self-coordinated),
add structure in Phase 2, partner integrations in Phase 3.

### The two sides
- **Generator (Supplier):** has the material at a location, available on certain days, in a certain format.
- **Upcycler (Buyer):** needs the material delivered or will pick it up, within a max distance.

### Phase 1 — Self-coordinated (MVP)
1. Every listing declares a **logistics term** — ✅ _now captured in Create Listing._
2. On a confirmed deal, both parties get a **Deal Page** (page 21) showing pickup/delivery address
   (revealed only after both accept), agreed slot, quantity, packaging, and who transports. ⬜ _pending._
3. **Distance & route** on a map (already rendered on Listing Details). Distance is a key **ML input**.
4. Coordination in **Messages**, with a structured "Schedule Pickup" action. ⬜ _pending._
5. **Status timeline:** `Requested → Accepted → Scheduled → Picked Up → Delivered → Completed`. ⬜ _pending._

### Phase 2 — Assisted logistics
- Logistics **quote helper** (distance × volume × vehicle, lookup table — not AI).
- **Pickup calendar** + reminders (email/SMS) · **proof of pickup/delivery** (photo + OTP/e-signature).
- Standard **packaging guidance** per material type.

### Phase 3 — Partner network
- Integrate **3rd-party local transporters** ("EcoMatch-partnered transport").
- In-app booking + live tracking + consolidated invoicing.
- Optional **route consolidation** (nearby pickups on one trip) to cut cost & emissions.

### Responsibility matrix (default, configurable per deal)
| Logistics term | Who arranges | Who pays (default) | Platform role |
|----------------|--------------|--------------------|---------------|
| Local Pickup | Upcycler | Upcycler | Show address + schedule slot |
| Freight (supplier) | Generator | Negotiable | Track shipment status |
| Courier | Either | Negotiable | Provide carrier options |
| Platform-partnered | Platform | Buyer (incl. in price) | Book + track + invoice |

> **PM note:** Always make transport responsibility & cost **explicit before the deal is accepted** —
> ambiguity here is the #1 cause of failed B2B waste exchanges.

---

## 4. Product (Material) Information & Listing Model

A "product" here = a **material/byproduct listing** — the core object of the marketplace.
**All core fields below are now implemented** in the Create/Edit Listing form and surfaced in the
Marketplace product-detail modal.

### Core listing fields — ✅ built
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | text | ✅ | e.g. "120kg Spent Coffee Grounds — Daily Supply" |
| Material category | enum | ✅ | Organic, Textiles, Wood, Plastics, Metals, Grain… (drives matching) |
| Description | text | ✅ | Condition, source process, suitable uses |
| Photos | image[] | ✅ | Min 1, gallery supported |
| Quantity | number + unit | ✅ | e.g. 120 kg / tons / litres / units |
| Frequency / availability | enum | ✅ | One-time / Daily / Weekly / Monthly |
| Availability date / window | date | ✅ | When it's ready for pickup |
| Purity / grade | % or grade | ✅ | Key ML input & trust signal |
| Moisture / condition | enum | optional | Dry / Wet / Mixed / Clean / Contaminated |
| Price | number + unit | ✅ | Per kg / per ton / per lot |
| Pricing model | enum | ✅ | Fixed / Negotiable / Free — disposal saving |
| Location | geo + city | ✅ | Map pin → distance matching |
| Logistics term | enum | ✅ | See §3 |
| Packaging format | enum | optional | Loose / bagged / palletised / container |
| Source business | ref | ✅ (auto) | Linked to verified company profile |
| Certifications / docs | file[] | optional | Lab report, compliance docs |
| Status | enum | ✅ (auto) | Active / Paused / Reserved / Completed / Expired |

### Derived / system fields
- **Compatibility score** (ML): per viewing-upcycler from material-type fit, purity vs requirement,
  volume fit, and distance. Visualised as a score gauge — **labelled "Compatibility Score" and to be
  powered by the ML recommendation model, not generative AI.**
- **Match reason** ("Why it matches"): short, rule-based explanation (distance, purity, volume) — in UI.
- **Estimated impact:** CO₂ saved, waste diverted, ₹ saved (simple formula per material × volume).
- Views, saves, and active-request counts (shown on Dashboard / My Listings).

### Listing lifecycle
`Draft → Published (Active) → Reserved (request accepted) → In Transit → Completed`
(plus `Paused` and `Expired` side-states). Status badges already render across Marketplace / Dashboard /
My Listings.

### Trust & quality signals (B2B)
- Verified-business badge ✅, purity/lab docs, company rating & reviews ✅ (shown on Profile),
  response time ✅, completed-deal count ✅.

---

## 5. PM Recommendations — Making This Best in the Market

The supply side (Create Listing, My Listings), the home base (Dashboard), discovery (Marketplace + detail
modal), the company/trust layer (Profile, verification fields), and engagement (Notifications) are now in
place as UI. **The remaining priority is the transactional loop and real logistics — then back it with a
backend.**

### 🔴 Must-do next (close the core loop)
1. **Request → Accept/Decline → Deal Page.** "Request to Source" is still a toast. Make it a stateful
   flow with a single source-of-truth Deal Page. _This is the moment value is created._
2. **Deal / Order Page + logistics scheduling.** Pickup slot, address reveal, responsibility & cost,
   status timeline (Phase 1 in §3).
3. **Real Business Verification.** GST/docs are collected; add the actual verify step that grants the
   Verified badge.
4. **Backend + persistence.** Everything is mocked today — wire real auth, listings CRUD, messages, and
   the ML matching service.

### 🟡 High-value differentiators
5. **Dedicated Matches/Recommendations page** (Dashboard only previews them).
6. **Ratings & reviews** captured after completed deals (Profile already displays them).
7. **Impact reporting / exports** (ESG) — make the Dashboard/Profile numbers data-driven and exportable.
8. **Notifications delivery** (email + SMS) on top of the in-app center that exists.
9. **Account Settings** page (dropdown currently routes to Preferences as interim).
10. **Saved searches & alerts** for Upcyclers (sidebar already hints at "Saved Searches").

### 🟢 Sequence the ML recommendation system right
- Start with a **transparent, rule-weighted score** (material-type fit, purity vs need, volume fit,
  distance). Explainable, debuggable, valuable on day one.
- Graduate to a **learning-to-rank model** once enough completed-deal data exists (accepted/completed
  deals = positive signals). **Keep the explanation rule-based** so users trust matches.
- **Defer generative-AI features** (auto-descriptions, chatbots) until the marketplace has liquidity.
  _(Note: the Landing "AI MATCHING" graphic is decorative — the engine is ML ranking.)_

### Strategic moats
- **Local liquidity:** win one city/region deeply (e.g. Pune) — density within a small radius is what
  makes industrial symbiosis economical.
- **Logistics as a service:** whoever solves "how the material actually gets there cheaply" wins.
- **Trust infrastructure:** verification, purity proof, ratings, clear deal terms.

### Quick wins (low effort, high polish)
- Contact page, Pricing page, dedicated Help/FAQ.
- Empty + loading states across pages; make hardcoded stats data-driven.
- Mobile pass on the dashboard-style pages (Marketplace / Messages / Dashboard are desktop-first).
- Collect phone number at sign-up (needed for logistics/OTP).

---

## Appendix — Current Progress Snapshot

- **Built (15 screens):** Landing (+ How It Works, Testimonials), Sign In, Sign Up, Forgot Password,
  Onboarding/Preferences, Dashboard, Marketplace (+ product-detail modal), Listing Details, My Listings,
  Create/Edit Listing, Profile/Company, Notifications, Messages (+ search), About Us, Privacy Policy,
  Terms & Conditions.
- **Cross-cutting:** site-wide Footer with Feedback, expanded Topnav profile dropdown, wired sidebar
  navigation, light-theme Operational Flow & Testimonials, full rename to **EcoMatch**.
- **Biggest remaining gaps:** Requests/Inquiries flow, Deal/Order page, logistics scheduling, real
  verification, and a backend to persist it all.
