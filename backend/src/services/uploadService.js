const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

class UploadService {

    async uploadBuffer(fileBuffer, folderName = 'ecomatch_products') {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folderName,
                    resource_type: 'auto'
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                        format: result.format,
                        bytes: result.bytes
                    });
                }
            );

            streamifier.createReadStream(fileBuffer).pipe(uploadStream);
        });
    }

    async deleteFile(publicId) {
        if (!publicId) throw new Error('Public ID is required to delete a file.');
        return await cloudinary.uploader.destroy(publicId);
    }
}

module.exports = new UploadService();