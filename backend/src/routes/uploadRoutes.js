const express = require('express');
const router = express.Router();
const uploadController = require('../controller/uploadController');
const { uploadSingleImage, uploadMultipleImages, uploadDocument } = require('../middleware/uploadMiddleware');
const authenticate = require('../middlewear/authMiddlewear');

router.use(authenticate);

router.post('/image', uploadSingleImage, uploadController.uploadImage);
router.post('/images', uploadMultipleImages, uploadController.uploadImages);
router.delete('/:public_id', uploadController.deleteImage);

module.exports = router;