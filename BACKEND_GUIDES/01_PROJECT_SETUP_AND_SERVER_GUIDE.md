# Project Setup & Server Bootstrap Guide

This guide fixes the server entry point for **EcoMatch**: environment config, CORS (the frontend
cannot talk to the backend without it), route mounting, security middleware, a central error
handler, and an HTTP server that Socket.IO can attach to later.

Do this **before any feature work**. Every other guide assumes this is in place.

---

## 📌 What's Wrong Today

```javascript
// backend/index.js — current
const express = require('express');
const connectDb = require('./src/config/db');

const app = express();
app.use(express.json());

const userRoutes = require('./src/routes/userRoutes')
app.use('/api/user',userRoutes)

app.listen(5000, async () => {
    console.log("Backend started on port 5000");
    await connectDb();
});
```

| Problem | Consequence |
|---------|-------------|
| No `cors` | Browser blocks **every** request from `localhost:5173`. Nothing works. |
| Route prefix is `/api/user` | Frontend calls `/api/auth/*` and `/api/profile/*` → 404 on all of them |
| DB connects **after** the server starts listening | First requests hit a disconnected DB |
| Hardcoded port `5000` | Cannot deploy (hosts inject `process.env.PORT`) |
| No error handler | An unhandled throw crashes the process |
| No `app.listen` on an `http.Server` | Socket.IO (guide `09`) cannot attach |
| `"dev": "nodemon src/index.js"` | Wrong path — `npm run dev` fails immediately |

---

## 🛠️ Step 1: Install Missing Dependencies

```bash
cd backend
npm install helmet compression morgan cookie-parser socket.io
npm install --save-dev nodemon
```

Already installed and ready to use: `cors`, `express-rate-limit`, `express-validator`, `bcrypt`,
`jsonwebtoken`, `mongoose`, `nodemailer`, `dotenv`.

---

## 🔑 Step 2: Environment Variables (`backend/.env`)

Create `backend/.env`. **Never commit it** — add `.env` to `.gitignore` and commit a
`.env.example` with the keys but no values.

```env
# ---- Server ----
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# ---- Database ----
MONGO_URI=mongodb://127.0.0.1:27017/ecomatch

# ---- Auth ----
JWT_KEY=replace_with_a_long_random_64_char_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_KEY=a_different_long_random_secret
JWT_REFRESH_EXPIRES_IN=30d

# ---- Email (SMTP) ----
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="EcoMatch <no-reply@ecomatch.in>"

# ---- Uploads (guide 08) ----
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ---- Tokens ----
OTP_EXPIRY_MINUTES=10
EMAIL_TOKEN_EXPIRY_HOURS=24
RESET_TOKEN_EXPIRY_MINUTES=30
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Fail fast on missing config — `src/config/env.js`

```javascript
require('dotenv').config();

const REQUIRED = ['MONGO_URI', 'JWT_KEY', 'SMTP_USER', 'SMTP_PASS'];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
}

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    mongoUri: process.env.MONGO_URI,
    jwtKey: process.env.JWT_KEY,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    jwtRefreshKey: process.env.JWT_REFRESH_KEY,
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 10,
    emailTokenExpiryHours: parseInt(process.env.EMAIL_TOKEN_EXPIRY_HOURS, 10) || 24,
    resetTokenExpiryMinutes: parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES, 10) || 30,
    isProd: process.env.NODE_ENV === 'production',
};
```

Silent misconfiguration is the single most common cause of "it works on my machine".

---

## 🗄️ Step 3: Harden the DB Connection (`src/config/db.js`)

The current version **swallows the error and keeps running**, so the server boots with no database.

```javascript
const mongoose = require('mongoose');
const env = require('./env');

const connectDb = async () => {
    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(env.mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    } catch (error) {
        // A backend with no database is not "degraded" — it is down. Fail loudly.
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

// Surface connection drops instead of hanging requests silently.
mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

module.exports = connectDb;
```

---

## 🚦 Step 4: The Express App (`src/app.js`)

Separating `app` from the server makes the app importable in tests without opening a port.

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();

/* ---------- Security & parsing ---------- */
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (!env.isProd) app.use(morgan('dev'));

/* ---------- CORS ----------
   The frontend runs on a different origin (Vite :5173) and sends an
   Authorization header, so an explicit allow-list is required.            */
const allowedOrigins = [env.clientUrl, 'http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow non-browser clients (Postman, curl, server-to-server) which send no Origin.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ---------- Health check (for uptime monitors & load balancers) ---------- */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'ok',
        env: env.nodeEnv,
        uptime: Math.round(process.uptime()),
    });
});

/* ---------- Rate limiting on the whole API surface ---------- */
app.use('/api', apiLimiter);

/* ---------- Routes ----------
   Mount paths MUST match frontend/src/lib/api.js. See guide 16.          */
app.use('/api/auth', require('./routes/authRoutes'));              // guides 03, 04, 05
app.use('/api/profile', require('./routes/profileRoutes'));        // guide 06
app.use('/api/users', require('./routes/userRoutes'));             // admin / directory
app.use('/api/listings', require('./routes/listingRoutes'));       // guide 07
app.use('/api/uploads', require('./routes/uploadRoutes'));         // guide 08
app.use('/api/chat', require('./routes/chatRoutes'));              // guide 09
app.use('/api/requests', require('./routes/requestRoutes'));       // guide 10
app.use('/api/deals', require('./routes/dealRoutes'));             // guide 10
app.use('/api/notifications', require('./routes/notificationRoutes')); // guide 11
app.use('/api/matches', require('./routes/matchRoutes'));          // guide 12
app.use('/api/dashboard', require('./routes/dashboardRoutes'));    // guide 13
app.use('/api/feedback', require('./routes/feedbackRoutes'));      // guide 14

/* ---------- 404 + central error handler (MUST be last) ---------- */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
```

> **Build incrementally:** comment out route lines for guides you haven't done yet, or Node will
> throw `MODULE_NOT_FOUND` on boot.

---

## 🔌 Step 5: The Server Entry Point (`backend/index.js`)

```javascript
const http = require('http');
const env = require('./src/config/env');
const connectDb = require('./src/config/db');
const app = require('./src/app');
const initSocket = require('./src/config/socket'); // guide 09

const startServer = async () => {
    // 1. Database FIRST — never accept traffic we cannot serve.
    await connectDb();

    // 2. Wrap Express in a raw http server so Socket.IO can share the port.
    const server = http.createServer(app);

    // 3. Attach the WebSocket layer (guide 09).
    initSocket(server);

    server.listen(env.port, () => {
        console.log(`🚀 EcoMatch API running on port ${env.port} [${env.nodeEnv}]`);
    });

    /* ---------- Graceful shutdown ----------
       Lets in-flight requests finish on deploy instead of dropping them.  */
    const shutdown = (signal) => {
        console.log(`\n${signal} received — shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
        // Hard-stop if connections refuse to drain.
        setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
        console.error('💥 Unhandled promise rejection:', reason);
        shutdown('unhandledRejection');
    });
};

startServer();
```

---

## 📦 Step 6: Fix `package.json`

The current `dev` script points at a file that does not exist.

```json
{
  "name": "ecomatch-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "seed": "node src/util/seed.js"
  }
}
```

Add `nodemon.json` so restarts don't fire on every log write:

```json
{
  "watch": ["index.js", "src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js", "uploads/*"]
}
```

---

## 🛡️ Step 7: Rate Limiting (`src/middleware/rateLimit.js`)

`express-rate-limit` is already installed. Auth endpoints need a much tighter limit than reads —
they are what credential-stuffing bots target.

```javascript
const rateLimit = require('express-rate-limit');

// Broad protection for the whole API.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Login / signup / reset — brute-force surface.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true, // only failed attempts count
    message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// Anything that sends an email — abuse here costs real money and reputation.
const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Email limit reached. Please try again in an hour.' },
});

module.exports = { apiLimiter, authLimiter, emailLimiter };
```

---

## ✅ Step 8: Verify

```bash
cd backend
npm run dev
curl http://localhost:5000/api/health
```

Expected:

```json
{ "success": true, "status": "ok", "env": "development", "uptime": 3 }
```

Checklist:
- [ ] `✅ MongoDB connected` prints **before** `🚀 EcoMatch API running`
- [ ] `/api/health` returns 200
- [ ] An unknown path (`/api/nope`) returns a JSON 404, not an HTML stack trace
- [ ] The frontend at `:5173` gets no CORS error in the browser console
- [ ] Killing with `Ctrl+C` prints "shutting down gracefully"

---

## 🔒 Security Summary

1. **`helmet()`** sets sane security headers (XSS, clickjacking, MIME sniffing).
2. **CORS is an allow-list**, never `origin: '*'` — that combination with `credentials: true` is
   rejected by browsers anyway and is unsafe.
3. **JSON body capped at 2 MB** so a giant payload can't exhaust memory. Files go through the
   upload route (guide `08`), not JSON.
4. **`.env` is never committed.** Rotate `JWT_KEY` if it ever leaks — it invalidates all tokens.
5. **Fail fast on missing env vars** rather than discovering it in production.
6. **`process.exit(1)` on DB failure** so your orchestrator restarts the container instead of
   serving a broken API.
7. **Rate limits are tiered:** general reads ≠ auth attempts ≠ outbound email.

---

## 💼 CEO Review Notes

- **The `/api/health` endpoint is not optional.** Uptime monitoring is what lets us claim
  reliability to B2B buyers. Enterprise waste generators ask about it in procurement.
- **Log requests from day one** (`morgan` now, structured JSON logs before launch). Our first
  hundred users' behaviour is the most valuable data the company will ever have.
- **Budget line item:** managed MongoDB Atlas over self-hosted. An engineer restoring a dropped
  database costs more than the subscription, and losing supplier listings is unrecoverable trust.
- **Region matters.** Deploy in `ap-south-1` (Mumbai). Our launch market is Pune; latency and
  India data-residency questions both go away.
