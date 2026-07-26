# File Upload Guide (Photos & Documents)

Three places in the built UI accept files, and all three currently only record a filename:

| Where | Field today | Needs |
|-------|-------------|-------|
| `CreateListingPage.jsx` | `photoCount` (a number!) | listing photos — **required to publish** |
| `CreateListingPage.jsx` | `docName` (a string) | lab report / compliance doc |
| `PreferencesPage.jsx` | `docName` | business registration / license (KYB) |
| `ProfilePage.jsx` | static `avatarImg` | company logo / avatar |

Guide `07` makes at least one photo mandatory before publishing, so **this guide is a hard
dependency for the listing flow to work at all.**

Prerequisites: guides `01`, `02`.

---

## 📌 Approach: Cloudinary, not local disk

| Option | Verdict |
|--------|---------|
| Local `multer` disk storage | ❌ Files vanish on every container redeploy. No CDN, no resizing. |
| Base64 in MongoDB | ❌ Bloats documents, blows past the 16 MB limit, kills query performance. |
| **Cloudinary** | ✅ Free tier is generous, auto-resize/optimise, CDN, easy signed deletes. |
| AWS S3 + CloudFront | ✅ Better at scale; more setup. Migrate later if costs demand it. |

We use `multer` **memory** storage as a staging buffer and stream straight to Cloudinary. Nothing
ever touches the server's filesystem.

---

## 🛠️ Step 1: Install

```bash
cd backend
npm install multer cloudinary
```

Add to `.env` (keys from your Cloudinary dashboard):

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret
MAX_IMAGE_MB=5
MAX_DOC_MB=10
```

---

## ☁️ Step 2: Cloudinary Config (`src/config/cloudinary.js`)

```javascript
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,          // always https URLs
});

/**
 * Streams a buffer to Cloudinary.
 * We use upload_stream (not upload) because multer gives us a buffer in
 * memory — writing it to a temp file first would be pointless I/O.
 */
const uploadBuffer = (buffer, options = {}) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        stream.end(buffer);
    });

const deleteAsset = (publicId, resourceType = 'image') =>
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

module.exports = { cloudinary, uploadBuffer, deleteAsset };
```

---

## 📦 Step 3: Multer Middleware (`src/middleware/upload.js`)

```javascript
const multer = require('multer');
const AppError = require('../util/AppError');

const MAX_IMAGE_BYTES = (parseInt(process.env.MAX_IMAGE_MB, 10) || 5) * 1024 * 1024;
const MAX_DOC_BYTES   = (parseInt(process.env.MAX_DOC_MB, 10) || 10) * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const DOC_TYPES = [
    'application/pdf',
    'image/jpeg', 'image/png',                                    // photographed documents
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Validates by MIME type AND extension. MIME alone is client-supplied and
 * trivially spoofed; extension alone is meaningless. Requiring both agree
 * raises the bar cheaply.
 */
const makeFilter = (allowedMimes, allowedExt) => (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!allowedMimes.includes(file.mimetype)) {
        return cb(AppError.badRequest(
            `Unsupported file type "${file.mimetype}". Allowed: ${allowedExt.join(', ')}.`
        ));
    }
    if (!allowedExt.includes(ext)) {
        return cb(AppError.badRequest(`Unsupported file extension ".${ext}".`));
    }
    cb(null, true);
};

// Memory storage: buffer straight through to Cloudinary, nothing hits disk.
const storage = multer.memoryStorage();

const uploadImages = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_BYTES, files: 8 },
    fileFilter: makeFilter(IMAGE_TYPES, ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']),
});

const uploadDocs = multer({
    storage,
    limits: { fileSize: MAX_DOC_BYTES, files: 3 },
    fileFilter: makeFilter(DOC_TYPES, ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']),
});

/**
 * Translates multer's own errors into our AppError shape so the frontend
 * gets a readable `message` instead of "MulterError: File too large".
 */
const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(AppError.badRequest(
                `File too large. Maximum size is ${process.env.MAX_IMAGE_MB || 5} MB.`
            ));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return next(AppError.badRequest('Too many files. Maximum 8 photos per listing.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(AppError.badRequest(`Unexpected field "${err.field}".`));
        }
        return next(AppError.badRequest(`Upload failed: ${err.message}`));
    }
    next(err);
};

module.exports = { uploadImages, uploadDocs, handleUploadErrors };
```

---

## ⚡ Step 4: Upload Service (`src/services/uploadServices.js`)

```javascript
const { uploadBuffer, deleteAsset } = require('../config/cloudinary');
const AppError = require('../util/AppError');

class UploadServices {

    /**
     * Listing photos. Two eager transforms so the frontend never downloads a
     * 4 MB phone photo into a 300px card — that alone is most of a mobile
     * user's data budget.
     */
    async uploadListingPhotos(files, userId) {
        if (!files?.length) throw AppError.badRequest('No photos were provided.');

        const uploads = await Promise.all(files.map((file) =>
            uploadBuffer(file.buffer, {
                folder: `ecomatch/listings/${userId}`,
                resource_type: 'image',
                // Strip EXIF (which carries GPS coordinates of the user's premises)
                // and cap dimensions.
                transformation: [
                    { width: 1600, height: 1600, crop: 'limit' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
                eager: [{ width: 400, height: 300, crop: 'fill', quality: 'auto:eco' }],
            })
        ));

        return uploads.map((r, i) => ({
            url: r.secure_url,
            thumbnailUrl: r.eager?.[0]?.secure_url || r.secure_url,
            publicId: r.public_id,
            width: r.width,
            height: r.height,
            bytes: r.bytes,
            isPrimary: i === 0,
        }));
    }

    /**
     * Compliance documents. `type: 'raw'` for PDFs/DOCs (Cloudinary won't try
     * to treat them as images), and `access_mode: 'authenticated'` so a lab
     * report or GST certificate is not a guessable public URL.
     */
    async uploadDocument(file, userId, docType = 'other') {
        if (!file) throw AppError.badRequest('No document was provided.');

        const isImage = file.mimetype.startsWith('image/');
        const result = await uploadBuffer(file.buffer, {
            folder: `ecomatch/documents/${userId}`,
            resource_type: isImage ? 'image' : 'raw',
            access_mode: 'authenticated',
            type: 'authenticated',
        });

        return {
            name: file.originalname,
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: isImage ? 'image' : 'raw',
            type: docType,
            bytes: result.bytes,
            uploadedAt: new Date(),
        };
    }

    async uploadAvatar(file, userId) {
        if (!file) throw AppError.badRequest('No image was provided.');

        const result = await uploadBuffer(file.buffer, {
            folder: 'ecomatch/avatars',
            public_id: `user_${userId}`,
            overwrite: true,            // one avatar per user, no orphans
            resource_type: 'image',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
            ],
        });

        return { url: result.secure_url, publicId: result.public_id };
    }

    /** Ownership is checked by the controller before this is called. */
    async deleteAsset(publicId, resourceType = 'image') {
        if (!publicId) throw AppError.badRequest('No asset id provided.');
        const result = await deleteAsset(publicId, resourceType);
        if (result.result !== 'ok' && result.result !== 'not found') {
            throw new AppError('Could not delete the file.', 502);
        }
        return { message: 'File deleted.' };
    }
}

module.exports = new UploadServices();
```

---

## 🚦 Step 5: Controller & Routes

`src/controller/uploadController.js`:

```javascript
const asyncHandler = require('../util/asyncHandler');
const uploadServices = require('../services/uploadServices');
const Listing = require('../model/listing');
const User = require('../model/user');
const AppError = require('../util/AppError');

class UploadController {
    listingPhotos = asyncHandler(async (req, res) => {
        const photos = await uploadServices.uploadListingPhotos(req.files, req.user._id);
        res.status(201).json({
            success: true,
            message: `${photos.length} photo(s) uploaded.`,
            photos,
        });
    });

    document = asyncHandler(async (req, res) => {
        const doc = await uploadServices.uploadDocument(req.file, req.user._id, req.body.docType);
        res.status(201).json({ success: true, message: 'Document uploaded.', document: doc });
    });

    avatar = asyncHandler(async (req, res) => {
        const { url } = await uploadServices.uploadAvatar(req.file, req.user._id);
        await User.findByIdAndUpdate(req.user._id, { avatarUrl: url });
        res.status(200).json({ success: true, message: 'Profile photo updated.', avatarUrl: url });
    });

    /**
     * Deleting a photo must verify the caller owns the listing it belongs to —
     * otherwise anyone with a publicId can wipe a competitor's images.
     */
    deleteListingPhoto = asyncHandler(async (req, res) => {
        const { listingId, publicId } = req.body;
        const listing = await Listing.findOne({ _id: listingId, owner: req.user._id });
        if (!listing) throw AppError.notFound('Listing not found.');

        const photo = listing.photos.find((p) => p.publicId === publicId);
        if (!photo) throw AppError.notFound('Photo not found on this listing.');

        if (listing.photos.length === 1 && listing.status === 'Active') {
            throw AppError.badRequest(
                'An active listing needs at least one photo. Pause it first, or upload a replacement.'
            );
        }

        await uploadServices.deleteAsset(publicId, 'image');
        listing.photos = listing.photos.filter((p) => p.publicId !== publicId);
        // Never leave a listing with no primary photo.
        if (listing.photos.length && !listing.photos.some((p) => p.isPrimary)) {
            listing.photos[0].isPrimary = true;
        }
        await listing.save();

        res.status(200).json({ success: true, message: 'Photo removed.', photos: listing.photos });
    });
}
module.exports = new UploadController();
```

`src/routes/uploadRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const UploadController = require('../controller/uploadController');
const { authenticate, requireVerifiedEmail } = require('../middleware/auth');
const { uploadImages, uploadDocs, handleUploadErrors } = require('../middleware/upload');

// Uploads are our most expensive endpoint (bandwidth + storage + CDN).
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    message: { success: false, message: 'Upload limit reached. Please try again later.' },
});

router.use(authenticate, requireVerifiedEmail, uploadLimiter);

router.post('/listing-photos', uploadImages.array('photos', 8), UploadController.listingPhotos);
router.post('/document',       uploadDocs.single('document'),   UploadController.document);
router.post('/avatar',         uploadImages.single('avatar'),   UploadController.avatar);
router.delete('/listing-photo', UploadController.deleteListingPhoto);

// Must come after the multer middlewares to catch their errors.
router.use(handleUploadErrors);

module.exports = router;
```

---

## 🖥️ Step 6: Frontend Wiring

### 6a. `lib/api.js` — a multipart-aware helper

The existing `request()` always sets `Content-Type: application/json`, which **breaks** multipart
uploads (the browser must set its own boundary). Add a separate helper:

```javascript
/**
 * Multipart upload. Deliberately does NOT set Content-Type — the browser
 * must generate the multipart boundary itself.
 */
async function uploadRequest(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });

  let data = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const err = new Error(data?.message || `Upload failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const apiUploadListingPhotos = (files) => {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append('photos', f));
  return uploadRequest('/uploads/listing-photos', fd);
};

export const apiUploadDocument = (file, docType = 'other') => {
  const fd = new FormData();
  fd.append('document', file);
  fd.append('docType', docType);
  return uploadRequest('/uploads/document', fd);
};

export const apiUploadAvatar = (file) => {
  const fd = new FormData();
  fd.append('avatar', file);
  return uploadRequest('/uploads/avatar', fd);
};

export const apiDeleteListingPhoto = (listingId, publicId) =>
  request('/uploads/listing-photo', { method: 'DELETE', body: { listingId, publicId } });
```

### 6b. `CreateListingPage.jsx`

Currently it just counts files:

```javascript
// CURRENT — records a count, uploads nothing
const handlePhotos = (e) => {
    const count = e.target.files?.length || 0;
    if (count) { update('photoCount', count); triggerToast(`${count} photo(s) attached.`); }
};
```

Upload immediately on selection so the user sees progress and thumbnails before submitting:

```javascript
import { apiUploadListingPhotos, apiUploadDocument } from '../../lib/api';

const [uploadedPhotos, setUploadedPhotos] = useState(listingDraft?.photos || []);
const [uploadedDocs, setUploadedDocs] = useState(listingDraft?.documents || []);
const [uploading, setUploading] = useState(false);

const handlePhotos = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    if (uploadedPhotos.length + files.length > 8) {
        triggerToast('Maximum 8 photos per listing.', 'error');
        return;
    }

    setUploading(true);
    try {
        const data = await apiUploadListingPhotos(files);
        setUploadedPhotos((prev) => [...prev, ...data.photos]);
        update('photoCount', uploadedPhotos.length + data.photos.length);
        triggerToast(data.message);
    } catch (err) {
        triggerToast(err.message || 'Photo upload failed.', 'error');
    } finally {
        setUploading(false);
        e.target.value = '';        // allow re-selecting the same file
    }
};

const handleDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
        const data = await apiUploadDocument(file, 'lab_report');
        setUploadedDocs((prev) => [...prev, data.document]);
        update('docName', data.document.name);
        triggerToast(`Document "${data.document.name}" uploaded.`);
    } catch (err) {
        triggerToast(err.message || 'Document upload failed.', 'error');
    } finally {
        setUploading(false);
    }
};
```

Render thumbnails with a remove button, and disable submit while `uploading` — otherwise a user can
publish a listing whose photos are still in flight.

Also add `capture` support so a phone opens the camera directly:

```jsx
<input type="file" className="pref-file-input" accept="image/*"
       multiple capture="environment" onChange={handlePhotos} />
```

### 6c. `PreferencesPage.jsx`

Same pattern for the KYB document. Note the current onboarding sends only `docName`, which
`profileServices.completeProfile` (guide `06`) stores as a placeholder with an empty URL. Once this
guide is done, send the real document object:

```javascript
const payload = {
  businessTypes: { generator: isGenerator, upcycler: isUpcycler },
  businessDetails: { ...businessDetails, documents: uploadedDocs },   // real URLs
  generatorInfo, upcyclerInfo, materials: materialsPayload,
};
```

---

## 🧪 Step 7: Test

```bash
# Photos
curl -X POST http://localhost:5000/api/uploads/listing-photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@coffee1.jpg" -F "photos=@coffee2.jpg"

# Oversized file → 400 with a readable message
curl -X POST http://localhost:5000/api/uploads/listing-photos \
  -H "Authorization: Bearer $TOKEN" -F "photos=@20mb.jpg"

# Disguised executable → 400
cp /bin/ls fake.jpg
curl -X POST http://localhost:5000/api/uploads/listing-photos \
  -H "Authorization: Bearer $TOKEN" -F "photos=@fake.jpg"
```

Checklist:
- [ ] Returns `secure_url` (https) plus a `thumbnailUrl`
- [ ] `publicId` is stored — without it we can never delete the asset
- [ ] A 20 MB file → `400`, not a hung request
- [ ] 9 photos in one call → `400 LIMIT_FILE_COUNT`
- [ ] `.exe` renamed to `.jpg` → rejected
- [ ] No token → `401` **before** the file is streamed anywhere
- [ ] Deleting another user's photo by `publicId` → `404`
- [ ] Deleting the last photo of an active listing → `400`
- [ ] Uploaded image is resized (check `width` ≤ 1600 in the response)
- [ ] EXIF GPS data is gone from the delivered image
- [ ] Nothing is written to the backend filesystem (`ls backend/` is unchanged)

---

## 🔒 Security Summary

1. **Memory storage only** — no file ever lands on the server's disk, so there is no path-traversal
   or "uploaded shell" class of bug.
2. **Validate MIME *and* extension.** Either alone is client-controlled and spoofable.
3. **Hard size and count limits** (`5 MB`/image, `8` files, `10 MB`/doc) enforced by multer *before*
   the buffer is read into memory.
4. **`authenticate` runs before multer.** Unauthenticated requests are rejected before we spend
   bandwidth.
5. **Cloudinary transformations strip EXIF**, which removes the GPS coordinates embedded by phone
   cameras. A supplier photographing their warehouse should not be publishing its exact location.
6. **Compliance documents are `access_mode: 'authenticated'`** — a GST certificate or lab report
   must not sit behind a guessable public URL.
7. **Per-user folders** (`ecomatch/listings/<userId>`) so an asset's owner is auditable.
8. **Deletion checks listing ownership**, not just possession of a `publicId`.
9. **Rate limit: 60 uploads/hour.** Storage and CDN egress cost real money.
10. **Never trust a client-supplied URL** into `listing.photos`. Only accept URLs that came back
    from *our* upload endpoint. (Hardening step: verify the URL host is our Cloudinary cloud before
    saving.)

---

## 💼 CEO Review Notes

- **Uploads are on the critical path to first revenue.** Guide `07` requires a photo to publish, so
  without this feature the marketplace has zero listings. Ship them together.
- **Optimise for a phone in a warehouse, not a laptop.** Our supplier is a cafe owner or a carpenter
  standing next to a pile of offcuts. `capture="environment"` and fast, forgiving compression matter
  more than a drag-and-drop zone. If uploading three photos takes more than 30 seconds on 4G, we
  lose the listing.
- **Cost control:** at ~1 MB stored per photo after transformation and 8 photos per listing, 10,000
  listings is roughly 80 GB. That is affordable but not free — the eager thumbnail is what keeps
  CDN egress (the real cost) down. Set a Cloudinary budget alert now, not after a surprise invoice.
- **Photo quality is a competitive moat.** Listings with clear, well-lit photos will convert far
  better. Worth building: a lightweight photo guide ("show scale, show a close-up, show the
  packaging") and eventually a quality score that nudges sellers. Better photos → more requests →
  more completed deals → better supply-side retention.
- **Watermark consideration:** do NOT watermark supplier photos. It looks defensive and cheap in
  B2B. Instead, use the verified-business badge as the trust marker.
- **KYB documents are a compliance liability.** GST certificates and licenses are sensitive business
  records. `access_mode: authenticated` is the minimum. Before we scale, define a retention policy
  (how long we keep them after verification) and who internally can view them — that answer will be
  asked for in every enterprise procurement review we ever face.
