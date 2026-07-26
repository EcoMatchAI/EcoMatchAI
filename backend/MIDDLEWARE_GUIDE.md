# EcoMatch — Middleware & Route Protection Guide

This guide details step-by-step how to implement **Authentication, Authorization (RBAC), Account Security Checks, Centralized Error Handling, and Rate Limiting Middleware** for **EcoMatchAI** using **Node.js, Express, MongoDB (Mongoose), and JWT**.

The code structure, file placement, and design patterns strictly follow the existing **EcoMatchAI** project backend architecture.

---

## 📌 1. Architecture & Middleware Pipeline Flow

Every HTTP request to a protected endpoint passes through a sequential pipeline of middlewares before reaching the controller:

```
Incoming Request
   │
   ├──► 1. RateLimiter             (Prevents brute-force attacks & API abuse)
   │
   ├──► 2. Express JSON / CORS      (Parses body & handles cross-origin requests)
   │
   ├──► 3. authenticate            (Parses 'Bearer <token>', verifies JWT, sets req.user)
   │
   ├──► 4. checkAccountStatus      (Blocks BANNED, SUSPENDED, or CLOSED accounts)
   │
   ├──► 5. requireVerifiedEmail    (Ensures user has verified email via OTP)
   │
   ├──► 6. authorize('ADMIN', ...) (Enforces Role-Based Access Control)
   │
   ▼
Controller Handler
   │ (If an error is thrown)
   ▼
errorHandler                       (Centralized JSON error response formatter)
```

---

## 📁 2. File & Directory System Arrangement

The middleware components fit directly into the existing `backend/src/` folder arrangement:

```text
backend/
├── index.js                            <-- Registers global middleware & error handlers
├── src/
│   ├── config/
│   │   └── db.js                       <-- Mongoose DB connection
│   ├── domain/
│   │   ├── Roles.js                    <-- User roles (ADMIN, BUYER, SELLER)
│   │   └── accountStatus.js            <-- Status constants (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
│   ├── model/
│   │   └── user.js                     <-- User Mongoose schema
│   ├── middleware/                      <-- NEW: Middleware Directory
│   │   ├── authMiddleware.js           <-- Auth, Role Authorization & Account checks
│   │   ├── errorMiddleware.js          <-- Centralized Express Error Handler
│   │   ├── rateLimiter.js              <-- Rate limiting for Auth & General endpoints
│   │   └── asyncHandler.js             <-- Wrapper to catch async errors automatically
│   ├── util/
│   │   ├── AppError.js                 <-- NEW: Custom Operational Error Class
│   │   ├── jwtProvider.js              <-- JWT Verification helper
│   │   └── emailService.js             <-- Email sender helper
│   ├── controller/
│   │   ├── userController.js           <-- Uses req.user safely
│   │   └── authController.js
│   └── routes/
│       ├── userRoutes.js               <-- Protected routes with authMiddleware
│       └── authRoutes.js
```

---

## ⚙️ 3. Step-by-Step Code Implementation

### Step 1: Create Custom Error Class (`src/util/AppError.js`)

Create `src/util/AppError.js` for throwing operational errors with HTTP status codes:

```javascript
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode || 500;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
```

---

### Step 2: Create Async Handler Wrapper (`src/middleware/asyncHandler.js`)

Create `src/middleware/asyncHandler.js` to eliminate repetitive `try-catch` blocks inside controllers:

```javascript
/**
 * Wraps async route handlers to automatically pass unhandled errors to the global error middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

---

### Step 3: Implement Auth & Authorization Middleware (`src/middleware/authMiddleware.js`)

Create `src/middleware/authMiddleware.js` containing authentication, role authorization, and status checks:

```javascript
const User = require('../model/user');
const jwtProvider = require('../util/jwtProvider');
const AppError = require('../util/AppError');
const accountStatus = require('../domain/accountStatus');

/**
 * 1. Authentication Middleware
 * Extracts JWT from 'Authorization: Bearer <token>', verifies it, loads user, and sets req.user
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401));
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Authentication token missing.', 401));
        }

        // Verify JWT token signature and expiration
        const decoded = jwtProvider.verifyjwt(token);

        // Fetch user from DB (excluding password hash)
        const user = await User.findById(decoded.userId || decoded.id).select('-password -passwordResetToken -passwordResetExpires');

        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // Attach user object to Express request
        req.user = user;
        next();
    } catch (error) {
        return next(new AppError('Invalid or expired authentication token. Please log in again.', 401));
    }
};

/**
 * 2. Role-Based Authorization Middleware (RBAC)
 * Restricts access to specified user roles (e.g., authorize('ADMIN', 'SELLER'))
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('User not authenticated.', 401));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError(`Access denied. Role '${req.user.role}' is not authorized to perform this action.`, 403));
        }

        next();
    };
};

/**
 * 3. Require Verified Email Middleware
 * Ensures user has completed OTP email verification
 */
const requireVerifiedEmail = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('User not authenticated.', 401));
    }

    if (!req.user.isEmailVerified) {
        return next(new AppError('Email verification required. Please verify your email before proceeding.', 403));
    }

    next();
};

/**
 * 4. Require Completed Profile Middleware
 * Ensures user has completed profile onboarding
 */
const requireCompletedProfile = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('User not authenticated.', 401));
    }

    if (!req.user.profileCompleted) {
        return next(new AppError('Profile completion required. Please complete your profile onboarding.', 403));
    }

    next();
};

/**
 * 5. Check Account Status Middleware
 * Prevents suspended or banned accounts from taking actions
 */
const checkAccountStatus = (req, res, next) => {
    if (!req.user) {
        return next(new AppError('User not authenticated.', 401));
    }

    if (req.user.accountStatus === accountStatus.BANNED) {
        return next(new AppError('Account banned due to terms violation. Please contact support.', 403));
    }

    if (req.user.accountStatus === accountStatus.SUSPENDED) {
        return next(new AppError('Account temporarily suspended. Please contact support.', 403));
    }

    if (req.user.accountStatus === accountStatus.CLOSED) {
        return next(new AppError('Account has been closed.', 403));
    }

    next();
};

module.exports = {
    authenticate,
    authorize,
    requireVerifiedEmail,
    requireCompletedProfile,
    checkAccountStatus
};
```

---

### Step 4: Implement Rate Limiter Middleware (`src/middleware/rateLimiter.js`)

Create `src/middleware/rateLimiter.js` to protect against DDoS, brute force login attempts, and spam:

```javascript
const rateLimit = require('express-rate-limit');

/**
 * Strict Rate Limiter for Authentication endpoints (Login, Password Reset)
 * Max 10 attempts per 15 minutes per IP
 */
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
    }
});

/**
 * General API Rate Limiter
 * Max 100 requests per 15 minutes per IP
 */
const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP address. Please try again later.'
    }
});

module.exports = {
    authRateLimiter,
    apiRateLimiter
};
```

---

### Step 5: Centralized Error Handler Middleware (`src/middleware/errorMiddleware.js`)

Create `src/middleware/errorMiddleware.js` to standardize error formatting across the application:

```javascript
const AppError = require('../util/AppError');

/**
 * Centralized Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
        console.error('💥 ERROR DETAILS:', err);
    }

    // 1. Mongoose Invalid ObjectId (CastError)
    if (err.name === 'CastError') {
        const message = `Resource not found. Invalid ${err.path}: ${err.value}`;
        error = new AppError(message, 400);
    }

    // 2. Mongoose Duplicate Key Error (Code 11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `Duplicate value entered for '${field}'. Please use another value.`;
        error = new AppError(message, 400);
    }

    // 3. Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = `Invalid input data: ${messages.join('. ')}`;
        error = new AppError(message, 400);
    }

    // 4. JWT Verification Errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token signature. Please log in again.', 401);
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Token has expired. Please log in again.', 401);
    }

    // Send JSON Error Response
    res.status(error.statusCode).json({
        success: false,
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
```

---

### Step 6: Protecting Express Routes (`src/routes/userRoutes.js`)

Apply middleware to secure routes in `src/routes/userRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const UserController = require('../controller/userController');
const {
    authenticate,
    authorize,
    requireVerifiedEmail,
    checkAccountStatus
} = require('../middleware/authMiddleware');
const UserRoles = require('../domain/Roles');

// Public Route (No auth needed)
router.post('/signup', UserController.initiateSignup);
router.post('/signup/verify-otp', UserController.verifyEmailOtp);

// Protected Routes (Authentication Required)
router.use(authenticate);            // All routes below require valid JWT
router.use(checkAccountStatus);      // All routes below require ACTIVE account

// User Profile Routes
router.get('/profile', UserController.getUserProfile);
router.patch('/profile', requireVerifiedEmail, UserController.updateUser);
router.post('/signup/complete-profile', UserController.completeProfile);

// Admin-Only Routes (Authorization Required)
router.get('/', authorize(UserRoles.ADMIN), UserController.getAllUsers);
router.patch('/:id/status/:status', authorize(UserRoles.ADMIN), UserController.updateAccountStatus);
router.delete('/:id', authorize(UserRoles.ADMIN), UserController.deleteUser);

module.exports = router;
```

---

### Step 7: Mount Global Middleware in Server (`backend/index.js`)

Update `backend/index.js` to mount rate limiters and error handlers:

```javascript
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const errorHandler = require('./src/middleware/errorMiddleware');
const { apiRateLimiter } = require('./src/middleware/rateLimiter');

require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Global Core Middleware
app.use(cors());
app.use(express.json());

// Global Rate Limiting
app.use('/api', apiRateLimiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// 404 Route Not Found Handler
app.use('*', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Can't find ${req.originalUrl} on this server.`
    });
});

// Global Centralized Error Handler (MUST be last app.use)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

---

## 🧪 4. Middleware Testing & Verification Guide

### cURL Verification Commands

#### 1. Test Unauthenticated Request (Missing Token -> Expect 401)
```bash
curl -X GET http://localhost:5000/api/user/profile
```
**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Authentication required. Please provide a valid Bearer token."
}
```

#### 2. Test Invalid Token (Malformed JWT -> Expect 401)
```bash
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer invalid_fake_token_123"
```
**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired authentication token. Please log in again."
}
```

#### 3. Test Role Authorization Violation (Non-Admin calling Admin Endpoint -> Expect 403)
```bash
curl -X GET http://localhost:5000/api/user/ \
  -H "Authorization: Bearer VALID_BUYER_OR_SELLER_JWT"
```
**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. Role 'BUYER' is not authorized to perform this action."
}
```

#### 4. Test Auth Rate Limiter (Exceeding 10 attempts -> Expect 429)
```bash
# Execute 11 consecutive POST calls to /api/auth/login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"wrongpassword"}'
```
**Expected Response (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Too many authentication attempts from this IP address. Please try again after 15 minutes."
}
```

---

## 🛡️ 5. Key Middleware Takeaways

1. **Populates `req.user`**: Eliminates `TypeError: Cannot read properties of undefined` in controllers by populating `req.user` upstream.
2. **Centralized Error Formatting**: All exceptions (Mongoose, JWT, Validation, custom `AppError`) return clean JSON responses instead of crashing Express or returning HTML error pages.
3. **Multi-layer Security**: Combines JWT authentication (`authenticate`), Role Authorization (`authorize`), Account Status checking (`checkAccountStatus`), and IP Rate Limiting (`rateLimiter`).
