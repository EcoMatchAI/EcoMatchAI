# Matching Engine & Compatibility Score Guide

This is the feature the product is named for. `MarketplacePage.jsx` and `DashboardPage.jsx` already
render a **Compatibility Score** gauge — from a hardcoded `score: 94`. `ListingsDetailsPage.jsx`
shows a `matchWhy` explanation, also hardcoded.

`changes.md` is explicit about the approach and we should follow it exactly:

> Start with a **transparent, rule-weighted score** (material-type fit, purity vs need, volume fit,
> distance). Explainable, debuggable, valuable on day one. Graduate to a **learning-to-rank model**
> once enough completed-deal data exists. **Keep the explanation rule-based** so users trust matches.
> **Defer generative-AI features** until the marketplace has liquidity.

Prerequisites: guides `06` (user preferences + geo), `07` (listings), `11` (match notifications).

---

## 📌 Design Principles

1. **Explainable beats accurate at this stage.** A business will not act on "94%" alone; it acts on
   "94% — same material, 5 km away, purity exceeds your 90% requirement". `matchWhy` is not a nicety,
   it is the product.
2. **Deterministic and testable.** Same inputs → same score, always. We must be able to unit-test it.
3. **No training data exists yet.** We have zero completed deals. Any ML model today would be fitted
   to nothing. Rules first; the scoring inputs and outcomes we log now become the training set later.
4. **Cheap enough to compute on read.** Scoring 12 listings per marketplace page must add
   milliseconds, not seconds.

---

## 🧮 The Scoring Model

Five weighted factors, each normalised to 0–1, summed to a 0–100 score.

| Factor | Weight | Why this weight |
|--------|--------|-----------------|
| **Material fit** | 35% | The hard requirement. Wrong material = no deal, ever. |
| **Distance** | 25% | Freight cost frequently exceeds material value in waste. Kills more deals than price. |
| **Volume fit** | 20% | Too little isn't worth a trip; too much won't fit their process. |
| **Purity / grade** | 15% | Determines whether the buyer's process can even use it. |
| **Availability / frequency** | 5% | Timing mismatches are usually negotiable. |

**Hard filters** (score forced to 0, listing excluded rather than ranked low):
- Material not in the upcycler's interests at all
- Distance beyond their declared `maxDistance`
- Listing not `Active`
- The upcycler is the listing owner

Weights live in one config object so a product manager can tune them without touching logic.

---

## ⚡ Step 1: The Scorer (`src/services/matchingServices.js`)

```javascript
const Listing = require('../model/listing');
const User = require('../model/user');
const AppError = require('../util/AppError');
const listingStatus = require('../domain/listingStatus');
const { distanceKm } = require('../util/geocode');

/**
 * Tunable weights. Keep them summing to 1.0 so the result is a clean
 * percentage and each factor's contribution is directly comparable.
 */
const WEIGHTS = {
    material:     0.35,
    distance:     0.25,
    volume:       0.20,
    purity:       0.15,
    availability: 0.05,
};

/** Parse "50km" / "100km+" / 50 → kilometres. */
const parseRadiusKm = (value, fallback = 50) => {
    if (value == null) return fallback;
    const n = parseInt(String(value).replace(/[^\d]/g, ''), 10);
    return Number.isNaN(n) ? fallback : n;
};

/** Parse "50 kg/week" / "500" / 500 → a number, or null. */
const parseVolume = (value) => {
    if (value == null || value === '') return null;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
};

/** Parse "90%+" / "Grade A" → a percentage, or null when grade-only. */
const parsePurity = (value) => {
    if (!value) return null;
    const pct = String(value).match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    if (pct) return Math.min(parseFloat(pct[1]), 100);
    // Map letter grades onto rough percentages so they're comparable.
    const grade = String(value).toUpperCase().match(/GRADE\s*([A-D])/);
    if (grade) return ({ A: 95, B: 85, C: 70, D: 55 })[grade[1]] ?? null;
    return null;
};

class MatchingServices {

    /**
     * Scores one listing for one upcycler.
     * Returns { score, breakdown, reasons, distanceKm, excluded }.
     *
     * `breakdown` exists so we can debug a surprising score without
     * re-deriving it by hand — and so we can log it as future training data.
     */
    scoreListing(listing, upcycler) {
        const breakdown = {};
        const reasons = [];
        let excluded = null;

        /* ---------- 1. Material fit (35%) ---------- */
        const interests = (upcycler.materials || []).filter((m) => m.selection !== 'none');
        const match = interests.find((m) => m.id === listing.materialId);

        if (!match) {
            // Hard filter: no amount of proximity makes the wrong material useful.
            excluded = 'MATERIAL_MISMATCH';
            breakdown.material = 0;
        } else {
            // A 'primary' interest is a stronger signal than 'secondary'.
            breakdown.material = match.selection === 'primary' ? 1.0 : 0.65;
            reasons.push(match.selection === 'primary'
                ? `Primary material match (${match.name})`
                : `Secondary material match (${match.name})`);
        }

        /* ---------- 2. Distance (25%) ---------- */
        const maxKm = parseRadiusKm(upcycler.upcyclerInfo?.maxDistance, 50);
        let km = null;

        if (listing.location?.coordinates?.length && upcycler.location?.coordinates?.length) {
            km = distanceKm(upcycler.location.coordinates, listing.location.coordinates);

            if (km > maxKm) {
                excluded = excluded || 'TOO_FAR';
                breakdown.distance = 0;
            } else {
                // Linear decay to the limit. Simple, and users can reason about it —
                // an exponential curve scores better on paper and is impossible to explain.
                breakdown.distance = Math.max(0, 1 - km / maxKm);
                reasons.push(`${Math.round(km)} km away (within your ${maxKm} km range)`);
            }
        } else if (listing.city && upcycler.businessDetails?.city
                   && listing.city.toLowerCase() === upcycler.businessDetails.city.toLowerCase()) {
            // No coordinates but the same city — a good proxy, slightly discounted
            // so genuinely geocoded listings rank above guesses.
            breakdown.distance = 0.7;
            reasons.push(`Same city (${listing.city})`);
        } else {
            // Unknown distance: neutral, not zero. Punishing missing data would
            // bury new listings that simply haven't been geocoded yet.
            breakdown.distance = 0.4;
        }

        /* ---------- 3. Volume fit (20%) ---------- */
        const minWant = parseVolume(upcycler.upcyclerInfo?.minVolume);
        const maxWant = parseVolume(upcycler.upcyclerInfo?.maxVolume);
        const available = listing.quantityInKg ?? listing.quantity;

        if (minWant == null && maxWant == null) {
            breakdown.volume = 0.6;                       // no stated need — neutral
        } else if (minWant != null && available < minWant) {
            // Below their minimum: not worth a truck. Partial credit if close.
            breakdown.volume = Math.max(0, available / minWant) * 0.5;
            reasons.push(`Below your ${minWant} kg minimum`);
        } else if (maxWant != null && available > maxWant) {
            // More than they can take — still usable, they just buy part of it.
            breakdown.volume = 0.75;
            reasons.push(`Large supply (${available} kg available, you need up to ${maxWant} kg)`);
        } else {
            breakdown.volume = 1.0;
            reasons.push(`Volume matches your requirement (${available} kg)`);
        }

        /* ---------- 4. Purity (15%) ---------- */
        const needed = parsePurity(upcycler.upcyclerInfo?.purity);
        const offered = parsePurity(listing.purity);

        if (needed == null || offered == null) {
            breakdown.purity = 0.6;                        // unknown on either side — neutral
        } else if (offered >= needed) {
            // Small bonus for exceeding the requirement, capped.
            breakdown.purity = Math.min(1.0, 0.85 + (offered - needed) / 100);
            reasons.push(`Purity ${offered}% meets your ${needed}% requirement`);
        } else {
            const shortfall = needed - offered;
            breakdown.purity = Math.max(0, 1 - shortfall / 30);   // 30pts below = unusable
            reasons.push(`Purity ${offered}% is below your ${needed}% target`);
        }

        /* ---------- 5. Availability / frequency (5%) ---------- */
        const wantFreq = upcycler.generatorInfo?.frequency;    // reused as cadence preference
        const now = new Date();

        if (listing.availableFrom && listing.availableFrom > now) {
            const daysAway = (listing.availableFrom - now) / 86400000;
            breakdown.availability = daysAway <= 7 ? 0.9 : daysAway <= 30 ? 0.7 : 0.4;
        } else {
            breakdown.availability = 1.0;
            reasons.push('Available now');
        }
        if (wantFreq && listing.frequency === wantFreq) {
            breakdown.availability = Math.min(1, breakdown.availability + 0.1);
        }

        /* ---------- Total ---------- */
        const score = excluded ? 0 : Math.round(
            Object.entries(WEIGHTS).reduce(
                (sum, [key, weight]) => sum + (breakdown[key] || 0) * weight, 0
            ) * 100
        );

        return {
            score,
            breakdown,
            reasons,
            distanceKm: km != null ? Math.round(km * 10) / 10 : null,
            excluded,
            // Short human-readable summary — this is ListingsDetailsPage's `matchWhy`.
            matchWhy: reasons.slice(0, 3).join(' · ') || 'Limited match data available',
        };
    }

    /**
     * Attaches scores to a page of listings. Called by the marketplace after
     * the DB query, so scoring never affects pagination correctness.
     */
    scoreListings(listings, upcycler) {
        if (!upcycler?.businessTypes?.upcycler) {
            // A generator browsing the marketplace has no scoring basis.
            return listings.map((l) => ({ ...l, score: null, matchWhy: null }));
        }
        return listings.map((listing) => {
            const result = this.scoreListing(listing, upcycler);
            return {
                ...listing,
                score: result.score,
                matchWhy: result.matchWhy,
                matchBreakdown: result.breakdown,
                distanceKm: result.distanceKm,
            };
        });
    }

    /**
     * The dedicated Matches page (changes.md page 18): ranked recommendations
     * for one upcycler across the whole marketplace.
     *
     * Pre-filters in MongoDB on the hard constraints (material + geo) so we
     * only score a few hundred candidates, never the entire collection.
     */
    async getMatchesForUser(userId, { limit = 20, minScore = 50 } = {}) {
        const user = await User.findById(userId);
        if (!user) throw AppError.notFound('User not found.');
        if (!user.businessTypes?.upcycler) {
            throw AppError.badRequest(
                'Matches are generated for Upcycler accounts. Enable Upcycler in your profile.',
                'NOT_AN_UPCYCLER'
            );
        }

        const materialIds = (user.materials || [])
            .filter((m) => m.selection !== 'none')
            .map((m) => m.id);

        if (!materialIds.length) {
            return { matches: [], message: 'Select your material interests to get matches.' };
        }

        const query = {
            status: listingStatus.ACTIVE,
            materialId: { $in: materialIds },
            owner: { $ne: user._id },
        };

        // Geo pre-filter — the cheapest way to cut the candidate set.
        const maxKm = parseRadiusKm(user.upcyclerInfo?.maxDistance, 50);
        if (user.location?.coordinates?.length === 2) {
            query.location = {
                $geoWithin: { $centerSphere: [user.location.coordinates, maxKm / 6378.1] },
            };
        }

        const candidates = await Listing.find(query)
            .populate('owner', 'name businessName isBusinessVerified stats.ratingAvg avatarUrl')
            .limit(300)                    // bound the work; 300 is plenty at our scale
            .lean({ virtuals: true });

        const scored = candidates
            .map((listing) => ({ listing, ...this.scoreListing(listing, user) }))
            .filter((m) => !m.excluded && m.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, Number(limit));

        return {
            matches: scored.map((m) => ({
                ...m.listing,
                score: m.score,
                matchWhy: m.matchWhy,
                matchBreakdown: m.breakdown,
                distanceKm: m.distanceKm,
            })),
            total: scored.length,
        };
    }

    /**
     * The reverse direction: which upcyclers would want THIS listing.
     * Powers "Recent Matches" on the generator's dashboard and the
     * "new match" notification when a listing is published.
     */
    async getMatchesForListing(listingId, { limit = 10, minScore = 60 } = {}) {
        const listing = await Listing.findById(listingId).lean({ virtuals: true });
        if (!listing) throw AppError.notFound('Listing not found.');

        const candidates = await User.find({
            'businessTypes.upcycler': true,
            profileCompleted: true,
            accountStatus: 'ACTIVE',
            'materials.id': listing.materialId,
            _id: { $ne: listing.owner },
        }).limit(300).lean();

        const scored = candidates
            .map((upcycler) => ({ upcycler, ...this.scoreListing(listing, upcycler) }))
            .filter((m) => !m.excluded && m.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, Number(limit));

        return scored.map((m) => ({
            partner: {
                id: m.upcycler._id,
                name: m.upcycler.name || m.upcycler.businessName,
                avatarUrl: m.upcycler.avatarUrl,
                city: m.upcycler.businessDetails?.city,
                isVerified: m.upcycler.isBusinessVerified,
            },
            material: listing.category,
            score: m.score,
            matchWhy: m.matchWhy,
            distanceKm: m.distanceKm,
        }));
    }
}

module.exports = new MatchingServices();
module.exports.WEIGHTS = WEIGHTS;
```

---

## 🔗 Step 2: Wire Scores Into the Marketplace

In `listingServices.searchListings` (guide `07`), score the page after fetching:

```javascript
const matchingServices = require('./matchingServices');

// …after the Listing.find() query…
const scored = viewer
    ? matchingServices.scoreListings(listings, viewer)
    : listings.map((l) => ({ ...l, score: null }));

// Optional: sort=match reorders the fetched page by score.
// NOTE: this only sorts within the current page, because the score is computed
// in Node, not in MongoDB. For a true global match sort, use /api/matches.
if (sort === 'match' && viewer) scored.sort((a, b) => (b.score || 0) - (a.score || 0));

return { listings: scored, pagination: { … } };
```

> **Be honest about this limitation in the UI.** Label the marketplace sort "Best match on this page"
> or simply route a "Best matches" tab to `/api/matches`, which ranks globally. Silently sorting only
> the visible 12 while implying a global ranking is the kind of small dishonesty users eventually
> notice.

---

## 🛣️ Step 3: Routes (`src/routes/matchRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const MatchController = require('../controller/matchController');
const { authenticate, requireCompleteProfile } = require('../middleware/auth');

router.use(authenticate, requireCompleteProfile);

router.get('/', MatchController.myMatches);                    // ranked for me (upcycler)
router.get('/listing/:id', MatchController.listingMatches);    // who wants my listing
router.get('/explain/:listingId', MatchController.explain);    // full breakdown for one listing

module.exports = router;
```

`src/controller/matchController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const matchingServices = require('../services/matchingServices');
const Listing = require('../model/listing');
const AppError = require('../util/AppError');

class MatchController {
    myMatches = asyncHandler(async (req, res) => {
        const result = await matchingServices.getMatchesForUser(req.user._id, req.query);
        res.status(200).json({ success: true, ...result });
    });

    listingMatches = asyncHandler(async (req, res) => {
        // Only the owner may see who is interested in their listing.
        const listing = await Listing.findOne({ _id: req.params.id, owner: req.user._id });
        if (!listing) throw AppError.notFound('Listing not found.');

        const matches = await matchingServices.getMatchesForListing(req.params.id, req.query);
        res.status(200).json({ success: true, matches });
    });

    /** Transparency endpoint: "why is this 94%?" */
    explain = asyncHandler(async (req, res) => {
        const listing = await Listing.findById(req.params.listingId).lean({ virtuals: true });
        if (!listing) throw AppError.notFound('Listing not found.');

        const result = matchingServices.scoreListing(listing, req.user);
        res.status(200).json({
            success: true,
            score: result.score,
            breakdown: result.breakdown,
            weights: matchingServices.WEIGHTS,
            reasons: result.reasons,
            distanceKm: result.distanceKm,
            excluded: result.excluded,
        });
    });
}
module.exports = new MatchController();
```

---

## 🔔 Step 4: Notify on New Matches

When a listing is published, tell the upcyclers who would want it. This is our strongest
re-engagement trigger — it is the only notification that is unambiguously good news.

Add to `listingServices.changeStatus` (guide `07`) after a transition to `Active`:

```javascript
const matchingServices = require('./matchingServices');
const notificationServices = require('./notificationServices');

if (nextStatus === listingStatus.ACTIVE) {
    // Fire and forget — a slow match sweep must never delay the publish response.
    setImmediate(async () => {
        try {
            const matches = await matchingServices.getMatchesForListing(listing._id, {
                limit: 20, minScore: 75,      // high bar: only notify strong matches
            });
            await Promise.all(matches.map((m) =>
                notificationServices.create({
                    user: m.partner.id,
                    type: 'match',
                    title: 'New match found',
                    body: `${listing.title} is a ${m.score}% match for you — ${m.matchWhy}.`,
                    link: { page: 'marketplace', id: listing._id },
                    groupKey: `match:${listing.materialId}`,   // don't spam per listing
                    sendEmail: true,
                })
            ));
        } catch (err) {
            console.error('Match notification sweep failed:', err.message);
        }
    });
}
```

---

## 📊 Step 5: Log Scores as Future Training Data

The score at the moment a request is sent is our label. Guide `10` already reserves
`matchScoreAtRequest` on `SourcingRequest` — populate it:

```javascript
// requestServices.createRequest
const { score, breakdown } = matchingServices.scoreListing(listing, user);
// …then on create: matchScoreAtRequest: score
```

Over time this gives us the dataset we lack today:

| Signal | Meaning |
|--------|---------|
| High score → request sent → deal completed | The weights are right |
| High score → never requested | We are over-weighting something |
| Low score → request sent → completed | We are under-weighting something |

Once there are a few hundred completed deals, fit a logistic regression or gradient-boosted ranker
on `breakdown` → completion, and use it to **retune the weights**. Keep the rule-based explanation
either way, exactly as `changes.md` requires.

---

## 🖥️ Step 6: Frontend Wiring

`MarketplacePage.jsx` already renders the gauge — just use the real value:

```javascript
// Already present, now fed by the API:
<path className="circular-score-bar" strokeDasharray={`${item.score}, 100`} … />
<span className="circular-score-text">{item.score}%</span>
```

Handle `score === null` (signed out, or a generator browsing) by hiding the gauge rather than
rendering `null%`.

Add a **"Why this match?"** disclosure on the product modal that calls `/api/matches/explain/:id` and
renders the breakdown as bars. `changes.md` calls the explanation a trust feature — and it is our
cheapest defence against "your AI is wrong". Showing our reasoning invites correction; hiding it
invites disbelief.

`DashboardPage.jsx`'s `MATCHES` array maps directly onto `getMatchesForListing` output
(`partner`, `material`, `score`, `dist` → `distanceKm`).

The sidebar has **Matches** and **AI Recommendations** as separate items that both fire toasts.
Merge them into one "Matches" page backed by `/api/matches`. Two navigation entries for one feature
is confusing, and `changes.md` is clear that the landing page's "AI MATCHING" graphic is decorative —
we should not build UI that implies two distinct engines exist.

---

## 🧪 Step 7: Test

The scorer is a pure function, so it is genuinely unit-testable — write these tests.

```javascript
// Perfect match → 90+
scoreListing(
  { materialId: 'coffee', quantityInKg: 120, purity: '92%', city: 'Pune',
    location: { coordinates: [73.8567, 18.5204] }, availableFrom: new Date(), status: 'Active' },
  { materials: [{ id: 'coffee', name: 'Coffee', selection: 'primary' }],
    upcyclerInfo: { purity: '90%+', minVolume: '50 kg', maxVolume: '500 kg', maxDistance: '50km' },
    location: { coordinates: [73.8500, 18.5100] }, businessTypes: { upcycler: true } }
);
// → score ≈ 95+, excluded: null
```

Checklist:
- [ ] Wrong material → `excluded: 'MATERIAL_MISMATCH'`, `score: 0`
- [ ] Beyond `maxDistance` → `excluded: 'TOO_FAR'`
- [ ] `primary` interest scores higher than `secondary`, all else equal
- [ ] Missing coordinates → neutral 0.4, **not** 0
- [ ] Same-city fallback works with no coordinates
- [ ] Purity 85% vs a 90% requirement → reduced but non-zero
- [ ] "Grade A" maps to ~95%
- [ ] Quantity below minimum → penalised; above maximum → mild 0.75
- [ ] `score` is always an integer 0–100
- [ ] The same inputs always produce the same score (deterministic)
- [ ] A generator viewing the marketplace gets `score: null`, not a crash
- [ ] `/api/matches` for a user with no material interests returns a helpful message, not an error
- [ ] `/api/matches/listing/:id` on someone else's listing → `404`
- [ ] Publishing a listing notifies matching upcyclers within a few seconds
- [ ] Scoring 300 candidates completes in well under 100 ms

---

## 🔒 Security Summary

1. **`getMatchesForListing` is owner-only.** "Which businesses want this material" is competitive
   intelligence — exposing it would let a competitor enumerate our demand side.
2. **Match results expose no PII.** Only business name, city, and verification status — never email,
   phone, or address. Contact details unlock at deal acceptance (guide `10`).
3. **Candidate queries are bounded (`limit(300)`).** An unbounded scan over every user or listing is
   a self-inflicted denial of service.
4. **Geo pre-filter runs in MongoDB**, not Node, so we never load the whole collection into memory.
5. **`requireCompleteProfile` on all match routes.** Scoring an empty profile produces nonsense and
   wastes compute.
6. **Numeric parsing is defensive.** `parseVolume`/`parsePurity` handle arbitrary free text (users
   type "approx 50-60kg") and return `null` rather than `NaN`. A `NaN` propagating into the score
   would render as "NaN%" in the UI.
7. **Don't leak the exact weights to unauthenticated callers.** The `/explain` endpoint is
   authenticated. Full transparency to *users* is good; publishing the ranking formula to anyone is
   an invitation to game listings.

---

## 💼 CEO Review Notes

- **This is our differentiator, and the name of the company.** But it only has value if there is
  inventory to match. A perfect matching engine over 6 listings is worthless; a mediocre one over
  600 is a business. **Supply-side liquidity beats algorithm quality for at least the first year** —
  do not let engineering effort here crowd out supplier recruitment.
- **We must be precise in our language.** `changes.md` already renamed this "Compatibility Score"
  rather than "AI Match", and that was the right call. This is a transparent weighted-rules engine.
  Calling it AI in a sales conversation with a manufacturer who then asks about the model is a
  credibility loss we do not need. The landing page's "AI MATCHING" graphic is decorative — keep it
  decorative and never claim capability we don't have. When we do ship a learned ranker, that will be
  a real announcement.
- **"Why this match?" is the most valuable UI in this guide.** B2B buyers are professionals who
  distrust black boxes. "5 km away, purity exceeds your requirement, volume fits your process" is
  what earns a click; a bare 94% is what earns scepticism. Ship the explanation with the score, not
  after.
- **The weights are guesses and should be treated as such.** My prior — freight cost matters more in
  waste than anywhere else, because material value per kg is low. If pilot data shows deals
  completing at 60 km but stalling at 30 km on price, we have the weights wrong. Review them monthly
  against completed deals for the first six months. `matchScoreAtRequest` is what makes that review
  possible, so make sure it is actually populated.
- **Do not build the ML model yet.** We have zero completed deals; there is nothing to learn from.
  Logging the breakdown now is the highest-value ML work available to us — the dataset is the asset,
  the model is a commodity. Revisit at ~300 completed deals.
- **Match notifications are our best retention loop, so protect them.** "New 95% match for your
  coffee grounds" is genuinely welcome news. Which is exactly why the `minScore: 75` threshold and
  the `groupKey` grouping matter: the moment we send a 55% match to hit an engagement target, the
  channel is dead and we cannot get it back.
- **Merge "Matches" and "AI Recommendations" in the sidebar.** Two menu items for one feature makes
  us look like we shipped a roadmap instead of a product.
- **Local density is the strategy, and this engine proves it.** The distance factor is why
  `changes.md` says win Pune first. Nothing in matching gets better by spreading thin across five
  cities — a 5 km match in one city beats a 200 km match in three.
