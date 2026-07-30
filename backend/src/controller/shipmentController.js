const logisticsService = require('../services/shipmentServices');

class LogisticsController {
    /**
     * POST /api/logistics/estimate
     */
    async estimateCostAndEDD(req, res) {
        try {
            const { productId, destinationPincode } = req.body;
            const result = await logisticsService.estimateFreightAndDelivery({ productId, destinationPincode });
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/logistics/book
     */
    async bookShipment(req, res) {
        try {
            const { productId, destinationPincode } = req.body;
            const shipment = await logisticsService.createShipment({
                productId,
                buyerId: req.user._id,
                destinationPincode
            });
            res.status(201).json({
                success: true,
                message: 'Shipment booked successfully.',
                shipment
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * PATCH /api/logistics/shipments/:waybillNumber/status
     * Update status & add tracking checkpoint
     */
    async updateShipmentStatus(req, res) {
        try {
            const { status, location, remarks } = req.body;
            const updatedShipment = await logisticsService.updateShipmentStatus(req.params.waybillNumber, {
                status,
                location,
                remarks
            });
            res.status(200).json({
                success: true,
                message: 'Shipment status updated successfully.',
                shipment: updatedShipment
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/logistics/my-shipments
     * Fetch user's active and past shipments
     */
    async getMyShipments(req, res) {
        try {
            const shipments = await logisticsService.getUserShipments(req.user._id);
            res.status(200).json({
                success: true,
                count: shipments.length,
                shipments
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/logistics/track/:waybillNumber
     */
    async track(req, res) {
        try {
            const waybillNumber = req.params.waybillNumber;
            const trackingData = await logisticsService.trackShipment(waybillNumber);
            res.status(200).json(trackingData);
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LogisticsController();