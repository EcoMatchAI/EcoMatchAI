const SourcingRequest = require('../model/sourcingRequest');
const Address = require('../model/address');

class SourcingService {

    async createRequest(buyerId, requestData) {
        const { title, materialCategory, specificMaterial, quantityRequired, unit, maxBudgetPerUnit, urgencyLevel, description, location } = requestData;

        if (!title || !materialCategory || !specificMaterial || !quantityRequired || !maxBudgetPerUnit || !location) {
            throw new Error('Please fill in all required fields (title, materialCategory, specificMaterial, quantityRequired, maxBudgetPerUnit, location).');
        }

        const addressExists = await Address.findById(location);
        if (!addressExists) {
            throw new Error('Invalid location address ID. Provided Address does not exist.');
        }

        const newRequest = await SourcingRequest.create({
            buyer: buyerId,
            title,
            materialCategory,
            specificMaterial,
            quantityRequired,
            unit: unit || 'KG',
            maxBudgetPerUnit,
            urgencyLevel: urgencyLevel || 'MEDIUM',
            description: description || '',
            location
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

        if (updateData.location) {
            const addressExists = await Address.findById(updateData.location);
            if (!addressExists) {
                throw new Error('Invalid location address ID.');
            }
        }

        const updatedRequest = await SourcingRequest.findByIdAndUpdate(
            requestId,
            { $set: updateData },
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

    async updateRequestStatus(requestId, buyerId, status) {
        const request = await SourcingRequest.findById(requestId);
        if (!request) {
            throw new Error('Sourcing request not found.');
        }
        if (request.buyer.toString() !== buyerId.toString()) {
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