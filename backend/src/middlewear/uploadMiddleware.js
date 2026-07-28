const multer = require('multer');
const storage = multer.memoryStorage();


const imageFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'), false);
    }
};

const documentFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, and PNG documents are allowed.'), false);
    }
};

const uploadSingleImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: imageFileFilter
}).single('image');

const uploadMultipleImages = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter
}).array('images', 5); 

const uploadDocument = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, 
    fileFilter: documentFileFilter
}).single('document');

module.exports = {
    uploadSingleImage,
    uploadMultipleImages,
    uploadDocument
};