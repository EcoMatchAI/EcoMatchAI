const productServices = require('../services/productServices');

class ProductController {

    
    async addProduct(req, res) {
        try {
            const product = await productServices.addProduct(req.user._id, req.body);
            res.status(201).json({
                message: 'Product added successfully',
                product
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }


    async getAllProducts(req, res) {
        try {
            const result = await productServices.getAllProducts(req.query);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

 
    async getMyProducts(req, res) {
        try {
            const products = await productServices.getMyProducts(req.user._id);
            res.status(200).json({ products });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

   
    async getProductById(req, res) {
        try {
            const product = await productServices.getProductById(req.params.id);
            res.status(200).json({ product });
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }

    
    async updateProduct(req, res) {
        try {
            const product = await productServices.updateProduct(
                req.params.id,
                req.user._id,
                req.body
            );
            res.status(200).json({
                message: 'Product updated successfully',
                product
            });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

   
    async deleteProduct(req, res) {
        try {
            await productServices.deleteProduct(req.params.id, req.user._id);
            res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
}

module.exports = new ProductController();