const express = require('express');
const router = express.Router();
const ProductController = require('../controller/productController');
const authenticate = require('../middlewear/authMiddlewear');
router.get('/', ProductController.getAllProducts);
router.post('/', authenticate, ProductController.addProduct);
router.get('/my-products', authenticate, ProductController.getMyProducts);
router.get('/:id', ProductController.getProductById);
router.patch('/:id', authenticate, ProductController.updateProduct);
router.delete('/:id', authenticate, ProductController.deleteProduct);
module.exports = router;




