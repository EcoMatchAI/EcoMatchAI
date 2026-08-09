const Product = require('../model/product');

// Everything a seller is allowed to set or change on their own listing.
// `seller` is deliberately absent so ownership can never be reassigned.
const EDITABLE_FIELDS = [
    'title', 'category', 'description', 'purity', 'photos', 'docName',
    'quantity', 'unit', 'frequency', 'price', 'priceUnit', 'pricingModel',
    'moisture', 'availableFrom', 'logistics', 'packaging', 'city', 'status'
];

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

            price: Math.max(data.price || 0, 0),
            priceUnit: data.priceUnit,
            pricingModel: data.pricingModel,
            moisture: data.moisture,
            availableFrom: data.availableFrom || null,
            logistics: data.logistics,
            packaging: data.packaging,

            city: data.city,

            status: data.status || 'Active'
        });

        return product;
    }

    // 2. Get all products for the marketplace (with optional filters)
    async getAllProducts(query) {
        const filter = { status: 'Active' };

        // `category` may arrive as a single value or a comma-separated list, so the
        // marketplace can tick several category boxes at once.
        if (query.category) {
            const categories = String(query.category).split(',').map((c) => c.trim()).filter(Boolean);
            filter.category = categories.length > 1 ? { $in: categories } : categories[0];
        }
        if (query.city) filter.city = new RegExp(query.city, 'i');   // "pune" also matches "Pune"
        if (query.search) {
            // Search the title AND the description — searching only the title made
            // the marketplace search box feel broken.
            const term = new RegExp(query.search, 'i');
            filter.$or = [{ title: term }, { description: term }];
        }
        if (query.minQuantity) filter.quantity = { $gte: Number(query.minQuantity) };
        if (query.excludeSeller) filter.seller = { $ne: query.excludeSeller };

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

        // Allow-list rather than `delete newData.seller` — anything not listed
        // (seller, _id, timestamps) simply cannot be written through this route.
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
            if (newData[field] !== undefined) updates[field] = newData[field];
        }

        const updated = await Product.findByIdAndUpdate(productId, updates, {
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