const Product = require('../model/product');

class ProductServices {

    // 1. Add a new product
    async addProduct(userId, data) {
        if (!data.title || !data.category || !data.description) {
            throw new Error('Title, category and description are required');
        }
       
        if (!data.quantity || Number(data.quantity) <= 0) {
            throw new Error('Please enter a valid quantity');
        }
        
        if (!data.city) {
            throw new Error('Location / city is required');
        }

        const product = await Product.create({
            seller: userId,
            title: data.title,
            category: data.category,
            description: data.description,
            purity: data.purity,
            photos: data.photos || [],
            docName: data.docName || [],

            quantity: Number(data.quantity),
            unit: data.unit,
            frequency: data.frequency,
            
            

            
            price: max(data.price,0),
            priceUnit: data.priceUnit,

            city: data.city,
           
            status: data.status || 'Active'
        });

        return product;
    }

    // 2. Get all products for the marketplace (with optional filters)
    async getAllProducts(query) {
        const filter = { status: 'Active' };

        if (query.category) filter.category = query.category;
        if (query.city) filter.city = new RegExp(query.city, 'i');   // "pune" also matches "Pune"
        if (query.search) filter.title = new RegExp(query.search, 'i');

        // Simple pagination: page 1 = first 12 products
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 12;
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .populate('seller', 'businessName email')
            .sort({ createdAt: -1 })       // newest first
            .skip(skip)
            .limit(limit);

        const total = await Product.countDocuments(filter);

        return { products, total, page, totalPages: Math.ceil(total / limit) };
    }

    // 3. Get the products added by the logged-in user
    async getMyProducts(userId) {
        return await Product.find({ seller: userId }).sort({ createdAt: -1 });
    }

    // 4. Get one product by its id
    async getProductById(productId) {
        const product = await Product.findById(productId)
            .populate('seller', 'businessName email phoneNumber');

        if (!product) {
            throw new Error('Product not found');
        }
        return product;
    }

    // 5. Update my own product
    async updateProduct(productId, userId, newData) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }
        // Only the owner can edit it
        if (product.seller.toString() !== userId.toString()) {
            throw new Error('You are not allowed to edit this product');
        }

        // Never let the request change the owner
        delete newData.seller;

        const updated = await Product.findByIdAndUpdate(productId, newData, {
            new: true,
            runValidators: true
        });
        return updated;
    }

    // 6. Delete my own product
    async deleteProduct(productId, userId) {
        const product = await Product.findById(productId);

        if (!product) {
            throw new Error('Product not found');
        }
        if (product.seller.toString() !== userId.toString()) {
            throw new Error('You are not allowed to delete this product');
        }

        await Product.findByIdAndDelete(productId);
        return { message: 'Product deleted' };
    }
}

module.exports = new ProductServices();