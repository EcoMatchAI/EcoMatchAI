# Deployment & Testing Guide

How to seed, test, deploy, and monitor the EcoMatch backend.

Prerequisites: all previous guides.

---

## 🌱 Part 1: Seed Data

An empty marketplace is impossible to demo and impossible to test. Seed realistic Pune-based data.

### `src/util/seed.js`

```javascript
/**
 * Seeds a demo dataset. Destructive — refuses to run against production.
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../model/user');
const Listing = require('../model/listing');
const Roles = require('../domain/Roles');

const PUNE_LOCATIONS = [
    { area: 'Koregaon Park', lng: 73.8938, lat: 18.5362 },
    { area: 'Hadapsar',      lng: 73.9260, lat: 18.5089 },
    { area: 'Bhosari MIDC',  lng: 73.8478, lat: 18.6298 },
    { area: 'Viman Nagar',   lng: 73.9143, lat: 18.5679 },
    { area: 'Chakan',        lng: 73.8630, lat: 18.7606 },
    { area: 'Pimpri',        lng: 73.7997, lat: 18.6279 },
];

const BUSINESSES = [
    { name: 'GreenBrew Co.',           industry: 'cafe',        generator: true,  upcycler: false, materials: ['coffee'] },
    { name: 'Pune Textiles Guild',     industry: 'textile',     generator: true,  upcycler: false, materials: ['textiles'] },
    { name: 'Apex Woodworks',          industry: 'carpentry',   generator: true,  upcycler: true,  materials: ['wood'] },
    { name: 'CleanPoly Ltd',           industry: 'packaging',   generator: true,  upcycler: false, materials: ['plastics'] },
    { name: 'IronWorks Fabrication',   industry: 'manufacturing', generator: true, upcycler: false, materials: ['metals'] },
    { name: 'BioSkins Skincare Co.',   industry: 'manufacturing', generator: false, upcycler: true, materials: ['coffee'] },
    { name: 'EcoInsulate Ltd.',        industry: 'manufacturing', generator: false, upcycler: true, materials: ['textiles'] },
    { name: 'Artisan Toys Inc.',       industry: 'manufacturing', generator: false, upcycler: true, materials: ['wood'] },
    { name: 'GreenFeed Farms',         industry: 'food',        generator: false, upcycler: true,  materials: ['grain', 'coffee'] },
    { name: 'BioPack Solutions',       industry: 'packaging',   generator: true,  upcycler: true,  materials: ['coffee', 'wood'] },
];

const LISTINGS = [
    { title: '120kg Spent Coffee Grounds — Daily Supply', category: 'Organic', materialId: 'coffee',
      quantity: 120, unit: 'kg', frequency: 'Daily', purity: '92%', moisture: 'Wet',
      pricePaise: 800, pricingModel: 'Negotiable', logistics: 'Local Pickup', packaging: 'Bagged',
      description: 'Freshly extracted spent coffee grounds from a high-volume cafe. Collected daily, high in nitrogen and antioxidants.' },
    { title: '350kg Recycled Textile Fabric — Assorted', category: 'Textiles', materialId: 'textiles',
      quantity: 350, unit: 'kg', frequency: 'Monthly', purity: '85% (Grade B)', moisture: 'Dry',
      pricePaise: 1500, pricingModel: 'Fixed', logistics: 'Freight (supplier-arranged)', packaging: 'Palletised',
      description: 'Clean, sorted fabric scraps from clothing manufacturing. Mixed cotton/polyester blends.' },
    { title: '500kg Premium Wood Offcuts — Hardwood Mix', category: 'Wood', materialId: 'wood',
      quantity: 500, unit: 'kg', frequency: 'Monthly', purity: 'Grade A (untreated)', moisture: 'Dry',
      pricePaise: 0, pricingModel: 'Free', logistics: 'Buyer-arranged', packaging: 'Loose / bulk',
      description: 'Assorted pine, oak, and plywood offcuts from furniture production. Untreated and clean.' },
    { title: '800kg Spent Brewery Grain — Feed Quality', category: 'Grain', materialId: 'grain',
      quantity: 800, unit: 'kg', frequency: 'Weekly', purity: '90% (high protein)', moisture: 'Wet',
      pricePaise: 500, pricingModel: 'Negotiable', logistics: 'Local Pickup', packaging: 'Container',
      description: 'Wet spent barley grains from craft brewing. High moisture and protein content.' },
    { title: '200kg Mixed PET Plastic Scraps', category: 'Plastics', materialId: 'plastics',
      quantity: 200, unit: 'kg', frequency: 'Weekly', purity: '95% (Grade A)', moisture: 'Dry',
      pricePaise: 2200, pricingModel: 'Fixed', logistics: 'Courier', packaging: 'Bagged',
      description: 'Clean post-industrial PET scraps from a packaging line. Sorted by colour.' },
    { title: '1.2T Steel Turnings & Metal Offcuts', category: 'Metals', materialId: 'metals',
      quantity: 1200, unit: 'kg', frequency: 'Monthly', purity: 'Grade A (segregated)', moisture: 'Dry',
      pricePaise: 4000, pricingModel: 'Negotiable', logistics: 'Freight (supplier-arranged)', packaging: 'Palletised',
      description: 'Mild-steel machining turnings and offcuts from a fabrication unit. Oil-free and segregated.' },
];

const seed = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ Refusing to seed a production database.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected. Clearing demo data...');

    // Only remove seeded records — never touch anything else.
    await User.deleteMany({ email: /@ecomatch-demo\.in$/ });
    await Listing.deleteMany({ title: { $in: LISTINGS.map((l) => l.title) } });

    const password = await bcrypt.hash('Demo@1234', 12);
    const created = [];

    for (let i = 0; i < BUSINESSES.length; i++) {
        const b = BUSINESSES[i];
        const loc = PUNE_LOCATIONS[i % PUNE_LOCATIONS.length];

        const user = await User.create({
            name: b.name,
            businessName: b.name,
            email: `${b.name.toLowerCase().replace(/[^a-z]/g, '')}@ecomatch-demo.in`,
            password,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            profileCompleted: true,
            profileCompletedAt: new Date(),
            accountStatus: 'ACTIVE',
            role: Roles.USER,
            isBusinessVerified: i % 3 !== 0,          // a realistic mix
            verificationStatus: i % 3 !== 0 ? 'verified' : 'unverified',
            businessTypes: { generator: b.generator, upcycler: b.upcycler },
            personalDetails: {
                fullName: `Owner ${i + 1}`, designation: 'Founder',
                phone: `+9198${String(76543210 + i)}`,
                location: `${loc.area}, Pune`, company: b.name,
            },
            businessDetails: {
                industry: b.industry, companySize: 'small',
                address: `Unit ${i + 1}, ${loc.area}`, city: 'Pune', state: 'Maharashtra',
                serviceRadius: '50km', gstNumber: `27ABCDE${1000 + i}F1Z5`,
            },
            generatorInfo: b.generator
                ? { byproducts: b.materials.join(', '), volume: '200 kg', frequency: 'Weekly' } : {},
            upcyclerInfo: b.upcycler
                ? { feedstock: b.materials.join(', '), purity: '85%+',
                    minVolume: '50 kg', maxVolume: '1000 kg', maxDistance: '50km' } : {},
            materials: b.materials.map((id) => ({
                id, name: id.charAt(0).toUpperCase() + id.slice(1), selection: 'primary',
            })),
            location: { type: 'Point', coordinates: [loc.lng, loc.lat], formattedAddress: `${loc.area}, Pune, India` },
        });
        created.push(user);
    }
    console.log(`✅ Created ${created.length} demo businesses (password: Demo@1234)`);

    const generators = created.filter((u) => u.businessTypes.generator);
    let count = 0;
    for (let i = 0; i < LISTINGS.length; i++) {
        const owner = generators[i % generators.length];
        const loc = PUNE_LOCATIONS[i % PUNE_LOCATIONS.length];

        await Listing.create({
            ...LISTINGS[i],
            owner: owner._id,
            city: 'Pune', state: 'Maharashtra',
            location: { type: 'Point', coordinates: [loc.lng, loc.lat], formattedAddress: `${loc.area}, Pune` },
            // Placeholder images so the UI renders. Replace with real Cloudinary
            // URLs once guide 08 is wired.
            photos: [{ url: `https://placehold.co/800x600?text=${encodeURIComponent(LISTINGS[i].category)}`, isPrimary: true }],
            status: 'Active',
            publishedAt: new Date(),
            viewCount: Math.floor(Math.random() * 60),
        });
        count++;
    }
    console.log(`✅ Created ${count} demo listings`);

    // Keep the denormalised counters correct from the start.
    for (const owner of generators) {
        const n = await Listing.countDocuments({ owner: owner._id, status: 'Active' });
        await User.updateOne({ _id: owner._id }, { 'stats.activeListings': n });
    }

    await mongoose.disconnect();
    console.log('🌱 Seed complete.');
};

seed().catch((e) => { console.error(e); process.exit(1); });
```

Run with `npm run seed`. Sign in as `greenbrewco@ecomatch-demo.in` / `Demo@1234`.

---

## 🗂️ Part 2: Verify Indexes

Missing indexes are the difference between a 5 ms and a 5,000 ms query. Mongoose creates them from
the schema on connect (in dev), but **verify** rather than assume.

### `src/util/checkIndexes.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');

const EXPECTED = {
    users: ['email_1', 'location_2dsphere', 'businessDetails.city_1_profileCompleted_1'],
    listings: ['owner_1', 'location_2dsphere', 'status_1_category_1_availableFrom_-1',
               'quantityInKg_1', 'title_text_description_text'],
    conversations: ['pairKey_1', 'participants_1_updatedAt_-1'],
    messages: ['conversation_1_createdAt_-1'],
    sourcingrequests: ['listing_1_requester_1', 'owner_1_status_1_createdAt_-1'],
    deals: ['reference_1', 'generator_1_status_1_createdAt_-1', 'upcycler_1_status_1_createdAt_-1'],
    notifications: ['user_1_createdAt_-1', 'user_1_read_1', 'expiresAt_1'],
    reviews: ['deal_1_reviewer_1', 'reviewee_1_isHidden_1_createdAt_-1'],
};

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    // Loading the models registers their schemas so ensureIndexes has something to build.
    require('../model/user'); require('../model/listing'); require('../model/conversation');
    require('../model/message'); require('../model/sourcingRequest'); require('../model/deal');
    require('../model/notification'); require('../model/review');

    await Promise.all(Object.values(mongoose.models).map((m) => m.ensureIndexes()));

    let missing = 0;
    for (const [collection, expected] of Object.entries(EXPECTED)) {
        const existing = (await mongoose.connection.db.collection(collection).indexes())
            .map((i) => i.name);
        for (const name of expected) {
            if (!existing.includes(name)) {
                console.warn(`⚠️  ${collection}: missing index "${name}"`);
                missing++;
            }
        }
        console.log(`${collection}: ${existing.length} index(es)`);
    }
    console.log(missing ? `❌ ${missing} index(es) missing` : '✅ All expected indexes present');
    await mongoose.disconnect();
})();
```

> **In production, do not rely on `autoIndex`.** Set `autoIndex: false` in the connection options and
> build indexes deliberately during a deploy step. Index builds on a large live collection can block
> writes; discovering that in production is a bad afternoon.

Confirm a query actually uses its index:

```javascript
// In mongosh
db.listings.find({ status: 'Active', category: 'Organic' }).explain('executionStats')
// Look for stage: 'IXSCAN', not 'COLLSCAN'
```

---

## 🧪 Part 3: Testing

### Setup

```bash
npm install --save-dev jest supertest mongodb-memory-server
```

`package.json`:

```json
{
  "scripts": {
    "test": "jest --runInBand --detectOpenHandles",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "testTimeout": 20000
  }
}
```

`tests/setup.js` — an in-memory MongoDB, so tests never touch a real database:

```javascript
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

beforeAll(async () => {
    // A replica set (not a standalone) because guide 10 uses transactions.
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
});

afterEach(async () => {
    // Clean slate between tests — order-dependent tests are worse than no tests.
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
});
```

### Priority: test the scorer and the state machines

These are pure logic with real consequences, and they are cheap to test.

`tests/matching.test.js`:

```javascript
const matchingServices = require('../src/services/matchingServices');

const upcycler = {
    businessTypes: { upcycler: true },
    materials: [{ id: 'coffee', name: 'Coffee', selection: 'primary' }],
    upcyclerInfo: { purity: '90%+', minVolume: '50 kg', maxVolume: '500 kg', maxDistance: '50km' },
    location: { coordinates: [73.8567, 18.5204] },
};

const listing = (over = {}) => ({
    materialId: 'coffee', quantityInKg: 120, quantity: 120, purity: '92%',
    city: 'Pune', location: { coordinates: [73.8600, 18.5250] },
    availableFrom: new Date(), frequency: 'Daily', status: 'Active', ...over,
});

describe('compatibility score', () => {
    it('scores a perfect match above 90', () => {
        const { score, excluded } = matchingServices.scoreListing(listing(), upcycler);
        expect(excluded).toBeNull();
        expect(score).toBeGreaterThan(90);
    });

    it('excludes a material the upcycler does not want', () => {
        const { score, excluded } = matchingServices.scoreListing(
            listing({ materialId: 'metals' }), upcycler);
        expect(excluded).toBe('MATERIAL_MISMATCH');
        expect(score).toBe(0);
    });

    it('excludes a listing beyond maxDistance', () => {
        // Mumbai — roughly 150 km from Pune.
        const { excluded } = matchingServices.scoreListing(
            listing({ location: { coordinates: [72.8777, 19.0760] } }), upcycler);
        expect(excluded).toBe('TOO_FAR');
    });

    it('is neutral, not zero, when coordinates are missing', () => {
        const { breakdown } = matchingServices.scoreListing(
            listing({ location: undefined, city: 'Nashik' }), upcycler);
        expect(breakdown.distance).toBeGreaterThan(0);
    });

    it('is deterministic', () => {
        const a = matchingServices.scoreListing(listing(), upcycler).score;
        const b = matchingServices.scoreListing(listing(), upcycler).score;
        expect(a).toBe(b);
    });
});
```

`tests/auth.test.js` — the security-critical paths:

```javascript
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/model/user');
const bcrypt = require('bcrypt');

const makeUser = async (over = {}) => User.create({
    name: 'Test Co', email: 'test@example.com',
    password: await bcrypt.hash('Test@1234', 12),
    isEmailVerified: true, accountStatus: 'ACTIVE', ...over,
});

describe('POST /api/auth/login', () => {
    it('returns a top-level token and a user without a password', async () => {
        await makeUser();
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'Test@1234' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();          // `token`, not `tempToken`
        expect(res.body.user.password).toBeUndefined();
        expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);  // no bcrypt hash anywhere
    });

    it('gives the same message for a wrong password and an unknown email', async () => {
        await makeUser();
        const a = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' });
        const b = await request(app).post('/api/auth/login')
            .send({ email: 'nobody@example.com', password: 'wrong' });

        expect(a.status).toBe(401);
        expect(b.status).toBe(401);
        expect(a.body.message).toBe(b.body.message);   // no account enumeration
    });

    it('locks the account after 5 failures', async () => {
        await makeUser();
        for (let i = 0; i < 5; i++) {
            await request(app).post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrong' });
        }
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'Test@1234' });
        expect(res.status).toBe(423);
    });
});

describe('authorisation', () => {
    it('rejects a request with no token', async () => {
        const res = await request(app).get('/api/profile');
        expect(res.status).toBe(401);
    });

    it('stops one user editing another user\'s listing', async () => {
        // …create two users and a listing, then PATCH as the wrong user…
        // expect(res.status).toBe(404);
    });
});
```

### Manual API testing

Keep a Postman/Insomnia collection in `backend/postman/EcoMatch.json`, committed to the repo, with an
environment variable for `{{token}}` and a login request that sets it automatically. A shared
collection is the difference between "works on my machine" and a reproducible bug report.

### Minimum coverage before launch

| Area | Must be tested |
|------|----------------|
| Auth | Login, lockout, no password in responses, no enumeration |
| Authorisation | Cross-user access on listings, deals, chat, notifications |
| Matching | The five scorer cases above |
| Deals | Every invalid transition; both-party completion |
| Listings | Publish without a photo; reserved-listing edits |
| Uploads | Oversize file, wrong MIME, disguised extension |
| Validation | 422 shapes; privileged fields rejected |

---

## 🚀 Part 4: Deployment

### Recommended stack for the pilot

| Component | Choice | Why |
|-----------|--------|-----|
| Backend host | Railway / Render | Persistent WebSocket connections; Vercel serverless cannot hold them |
| Database | MongoDB Atlas M10, `ap-south-1` (Mumbai) | Replica set (needed for transactions), backups, low latency to Pune |
| Files | Cloudinary | Guide `08` |
| Frontend | Vercel / Netlify | Static Vite build |
| Email | AWS SES or Resend | Gmail SMTP will rate-limit and land in spam |
| Logs | Better Stack / Papertrail | Searchable when a customer reports "yesterday afternoon" |

> ⚠️ **Do not deploy the backend to a serverless platform.** Socket.IO (guide `09`) needs a
> long-lived process. This constraint decides the hosting choice.

### Production environment variables

```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://app.ecomatch.in

MONGO_URI=mongodb+srv://…@cluster.mongodb.net/ecomatch?retryWrites=true&w=majority
JWT_KEY=<64-byte random, different from dev>
JWT_REFRESH_KEY=<different again>
JWT_EXPIRES_IN=7d

SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<SES SMTP username>
SMTP_PASS=<SES SMTP password>
EMAIL_FROM="EcoMatch <no-reply@ecomatch.in>"
INTERNAL_ALERT_EMAIL=team@ecomatch.in

CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
```

### Pre-launch checklist

**Security**
- [ ] `JWT_KEY` is 64+ random bytes and **different from development**
- [ ] `.env` is in `.gitignore`; no secret has ever been committed
- [ ] `GET /api/users` is admin-only (guide `02`)
- [ ] No endpoint returns `password` — verify with `grep -c password` on real responses
- [ ] `helmet` is active; CORS allow-lists only the production origin
- [ ] Rate limits active on auth, email, and upload routes
- [ ] Error responses in production contain no stack traces
- [ ] MongoDB Atlas IP allow-list configured; database user is least-privilege
- [ ] TLS on the API domain (the platform handles this; verify)

**Correctness**
- [ ] `npm test` passes
- [ ] `node src/util/checkIndexes.js` reports no missing indexes
- [ ] `GET /api/health` returns 200 from the public URL
- [ ] Full flow works against production: signup → verify email → complete profile → create listing →
      request → accept → chat → complete deal
- [ ] Verification and reset emails arrive in Gmail **and** Outlook, not in spam
- [ ] SPF, DKIM, and DMARC configured on the sending domain
- [ ] WebSocket connects over `wss://` from the deployed frontend

**Operations**
- [ ] Atlas automated backups on, with a restore actually tested once
- [ ] Uptime monitor on `/api/health`, alerting to a phone
- [ ] Log aggregation receiving events
- [ ] Cron jobs registered (`expireRequests`, `expireListings`, `reconcileStats`)
- [ ] Cloudinary usage alert configured
- [ ] A named person owns disputed deals (guide `10`)

### `Dockerfile` (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Never run as root.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "index.js"]
```

### GitHub Actions CI (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: EcoMatchAI/backend/package-lock.json
      - run: npm ci
        working-directory: EcoMatchAI/backend
      - run: npm test
        working-directory: EcoMatchAI/backend
        env:
          JWT_KEY: test_secret_not_used_in_production
          SMTP_USER: test@example.com
          SMTP_PASS: test
          MONGO_URI: mongodb://127.0.0.1:27017/test
```

---

## 📈 Part 5: Monitoring

### Watch these from day one

| Metric | Why | Alarm at |
|--------|-----|----------|
| `5xx` rate | Our bugs | > 1% of requests |
| p95 latency | Perceived speed | > 1 s |
| `401` rate | Broken sessions or an attack | Sudden spike |
| DB connections | Leaks | > 80% of the pool |
| Socket count | Chat health | Sudden drop to 0 |
| Email bounces | Deliverability | > 5% |
| Signup → verified | Funnel leak (guide `05`) | < 70% |
| Request → deal | Marketplace health (guide `10`) | Track the trend |

### Structured logging (before launch)

```bash
npm install pino pino-http
```

```javascript
const pino = require('pino');
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    // Never let a password or token reach the log store.
    redact: ['req.headers.authorization', 'req.body.password',
             'req.body.confirmPassword', 'req.body.newPassword', 'req.body.token'],
});

app.use(require('pino-http')({ logger }));
```

The `redact` list is not optional. A log aggregator with a password in it is a breach with extra
steps.

---

## 💼 CEO Review Notes

- **Seed data is a sales tool, not just a dev convenience.** Nobody signs up to an empty marketplace.
  For the actual pilot launch we need ~50 real listings in Pune before we invite a single buyer, even
  if we have to enter them by hand from phone calls with cafes and carpenters. Manual supply seeding
  is normal and correct at this stage — it is how every marketplace started.
- **Deliverability is our conversion rate.** If verification emails land in spam, our signup funnel is
  broken and no amount of UI work fixes it. SES with SPF/DKIM/DMARC on `ecomatch.in` is a
  half-day of work that protects everything else. Test into Gmail *and* Outlook — our users are
  businesses, and many are on Microsoft 365.
- **Deploy in Mumbai (`ap-south-1`).** Latency to Pune, and India data-residency questions that will
  come up in any enterprise procurement conversation. There is no upside to a US region for us.
- **Test the backup restore before launch, not after an incident.** An untested backup is a hope.
  Losing our supplier listings is unrecoverable — those relationships were built by phone, one at a
  time, and we cannot re-derive them from anything.
- **The two funnel numbers at the bottom of the monitoring table are the business.** Signup → verified
  tells us whether onboarding works; request → completed deal tells us whether the *marketplace*
  works. Everything else is engineering hygiene. Put those two on a screen someone looks at daily.
- **Budget honestly.** Atlas M10 + Railway + Cloudinary + SES is roughly $80–120/month for the pilot.
  That is the correct amount to spend — self-hosting to save $60 costs engineering hours worth far
  more, and the failure modes land on the customer.
- **Do not skip the pre-launch security checklist.** `GET /api/users` currently returns every user
  record including password hashes. If that ships to production we are one curl command away from an
  incident that ends the company's credibility with the exact B2B customers we are courting. It is the
  single most important line in this document.
