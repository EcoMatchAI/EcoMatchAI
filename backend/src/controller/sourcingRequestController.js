const sourcingService = require('../services/sourcingRequestServices');

class SourcingController {

    async createRequest(req, res) {
        try {
            const request = await sourcingService.createRequest(req.user._id, req.body);
            res.status(201).json({
                success: true,
                message: 'Sourcing request created successfully.',
                request
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getAllRequests(req, res) {
        try {
            const result = await sourcingService.getAllRequests(req.query);
            res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }


    async getMyRequests(req, res) {
        try {
            const requests = await sourcingService.getBuyerRequests(req.user._id);
            res.status(200).json({
                success: true,
                count: requests.length,
                requests
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /** GET /api/sourcing-requests/received — requests raised against my listings. */
    async getReceivedRequests(req, res) {
        try {
            const requests = await sourcingService.getSellerRequests(req.user._id);
            res.status(200).json({
                success: true,
                count: requests.length,
                requests
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    async getRequestById(req, res) {
        try {
            const request = await sourcingService.getRequestById(req.params.id);
            res.status(200).json({
                success: true,
                request
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateRequest(req, res) {
        try {
            const updatedRequest = await sourcingService.updateRequest(req.params.id, req.user._id, req.body);
            res.status(200).json({
                success: true,
                message: 'Sourcing request updated successfully.',
                request: updatedRequest
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async deleteRequest(req, res) {
        try {
            const result = await sourcingService.deleteRequest(req.params.id, req.user._id);
            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async updateStatus(req, res) {
        try {
            const updatedRequest = await sourcingService.updateRequestStatus(req.params.id, req.user._id, req.body.status);
            res.status(200).json({
                success: true,
                message: 'Sourcing request status updated successfully.',
                request: updatedRequest
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new SourcingController();