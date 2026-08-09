const mongoose = require('mongoose');
const SourcingRequest = require('../model/sourcingRequest');
const Address = require('../model/address');
const Product = require('../model/product');

class SourcingService {

    /**
     * `location` may be an existing Address id OR an inline address object.
     * There is no endpoint that creates an Address on its own, so requiring an id
     * made it impossible for the app to ever create a sourcing request.
     */
    async resolveLocation(location) {
        if (!location) {
            throw new Error('A pickup / delivery location is required.');
        }

        if (typeof location === 'string' || location instanceof mongoose.Types.ObjectId) {
            if (!mongoose.Types.ObjectId.isValid(location)) {
                throw new Error('Invalid location address ID.');
            }
            const existing = await Address.findById(location);
            if (!existing) {
                throw new Error('Invalid location address ID. Provided Address does not exist.');
            }
            return existing._id;
        }

        if (!location.pincode) {
            throw new Error('Location pincode is required.');
        }
        const created = await Address.create({
            name: location.name,
            locality: location.locality,
            pincode: location.pincode,
            state: location.state,
            address: location.address,
            phoneNumber: location.phoneNumber
        });
        return created._id;
    }

    async createRequest(buyerId, requestData) {
        const { title, materialCategory, specificMaterial, quantityRequired, unit, maxBudgetPerUnit, urgencyLevel, description, location, product } = requestData;

        if (!title || !materialCategory || !specificMaterial || !quantityRequired || !maxBudgetPerUnit || !location) {
            throw new Error('Please fill in all required fields (title, materialCategory, specificMaterial, quantityRequired, maxBudgetPerUnit, location).');
        }

        const locationId = await this.resolveLocation(location);

        // When the request targets a listing, remember which one and who owns it.
        let productId = null;
        let sellerId = null;
        if (product) {
            const listing = await Product.findById(product).select('seller');
            if (!listing) {
                throw new Error('The listing this request refers to no longer exists.');
            }
            if (listing.seller.toString() === buyerId.toString()) {
                throw new Error('You cannot raise a sourcing request against your own listing.');
            }
            productId = listing._id;
            sellerId = listing.seller;
        }

        const newRequest = await SourcingRequest.create({
            buyer: buyerId,
            product: productId,
            seller: sellerId,
            title,
            materialCategory,
            specificMaterial,
            quantityRequired,
            unit: unit || 'KG',
            maxBudgetPerUnit,
            urgencyLevel: urgencyLevel || 'MEDIUM',
            description: description || '',
            location: locationId
        });

        return await newRequest.populate([
            { path: 'buyer', select: 'businessName email phoneNumber' },
            { path: 'location' }
        ]);
    }


    async getAllRequests(filters = {}) {
        const { category, search, status = 'OPEN', page = 1, limit = 10 } = filters;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (category) {
            query.materialCategory = category.toUpperCase();
        }

        if (search) {
            query.$or = [
                { title: new RegExp(search, 'i') },
                { specificMaterial: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const requests = await SourcingRequest.find(query)
            .populate('buyer', 'businessName email phoneNumber')
            .populate('location')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await SourcingRequest.countDocuments(query);

        return {
            requests,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }


    async getRequestById(requestId) {
        const request = await SourcingRequest.findById(requestId)
            .populate('buyer', 'businessName email phoneNumber GSTIN')
            .populate('location');

        if (!request) {
            throw new Error('Sourcing request not found.');
        }
        return request;
    }


    async getBuyerRequests(buyerId) {
        return await SourcingRequest.find({ buyer: buyerId })
            .populate('location')
            .populate('product', 'title photos city price priceUnit')
            .populate('seller', 'businessName email phoneNumber')
            .sort({ createdAt: -1 });
    }

    /** Requests other buyers have raised against MY listings. */
    async getSellerRequests(sellerId) {
        return await SourcingRequest.find({ seller: sellerId })
            .populate('location')
            .populate('product', 'title photos city price priceUnit')
            .populate('buyer', 'businessName email phoneNumber')
            .sort({ createdAt: -1 });
    }


    async updateRequest(requestId, buyerId, updateData) {
        const request = await SourcingRequest.findById(requestId);

        if (!request) {
            throw new Error('Sourcing request not found.');
        }

        if (request.buyer.toString() !== buyerId.toString()) {
            throw new Error('Unauthorized. You can only update your own sourcing requests.');
        }

        // Allow-list: `buyer` and `status` must not be writable here. Status has its
        // own endpoint with its own validation.
        const EDITABLE = [
            'title', 'materialCategory', 'specificMaterial', 'description',
            'quantityRequired', 'unit', 'maxBudgetPerUnit', 'urgencyLevel'
        ];
        const updates = {};
        for (const field of EDITABLE) {
            if (updateData[field] !== undefined) updates[field] = updateData[field];
        }
        if (updateData.location) {
            updates.location = await this.resolveLocation(updateData.location);
        }

        const updatedRequest = await SourcingRequest.findByIdAndUpdate(
            requestId,
            { $set: updates },
            { new: true, runValidators: true }
        )
        .populate('buyer', 'businessName email phoneNumber')
        .populate('location');

        return updatedRequest;
    }


    async deleteRequest(requestId, buyerId) {
        const request = await SourcingRequest.findById(requestId);

        if (!request) {
            throw new Error('Sourcing request not found.');
        }

        if (request.buyer.toString() !== buyerId.toString()) {
            throw new Error('Unauthorized. You can only delete your own sourcing requests.');
        }

        await SourcingRequest.findByIdAndDelete(requestId);
        return { message: 'Sourcing request deleted successfully.' };
    }

    async updateRequestStatus(requestId, userId, status) {
        const request = await SourcingRequest.findById(requestId);
        if (!request) {
            throw new Error('Sourcing request not found.');
        }
        // The buyer who raised it and the seller it was sent to may both move it
        // along — otherwise a seller could never accept or decline a request.
        const isBuyer = request.buyer.toString() === userId.toString();
        const isSeller = request.seller && request.seller.toString() === userId.toString();
        if (!isBuyer && !isSeller) {
            throw new Error('Unauthorized. You can only update status of your own sourcing requests.');
        }
        const allowed = ['OPEN', 'FULFILLED', 'CLOSED', 'CANCELLED'];
        if (!allowed.includes(status)) {
            throw new Error(`Invalid status. Allowed values: ${allowed.join(', ')}`);
        }
        request.status = status;
        await request.save();
        return request;
    }
}

module.exports = new SourcingService();