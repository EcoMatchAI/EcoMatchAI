const uploadService = require('../services/uploadService');

class UploadController {

    async uploadImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No image file provided.' });
            }

            const result = await uploadService.uploadBuffer(req.file.buffer, 'ecomatch_products');
            res.status(200).json({
                success: true,
                message: 'Image uploaded successfully.',
                data: result
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async uploadImages(req, res) {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No image files provided.' });
            }

            const uploadPromises = req.files.map(file =>
                uploadService.uploadBuffer(file.buffer, 'ecomatch_products')
            );
            const results = await Promise.all(uploadPromises);

            res.status(200).json({
                success: true,
                message: `${results.length} images uploaded successfully.`,
                data: results
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteImage(req, res) {
        try {
            const publicId = req.params.public_id;
            await uploadService.deleteFile(publicId);
            res.status(200).json({
                success: true,
                message: 'Image deleted successfully.'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new UploadController();