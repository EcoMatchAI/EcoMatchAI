const axios = require('axios');
const Product = require('../model/product');
const Shipment = require('../model/shipment');

class LogisticsService {
    /**
     * Free Indian Post Pincode Lookup (No API Key Required)
     */
    async lookupPincode(pincode) {
        try {
            const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
            if (response.data && response.data[0] && response.data[0].Status === 'Success') {
                const details = response.data[0].PostOffice[0];
                return {
                    success: true,
                    city: details.District || details.Block,
                    state: details.State,
                    district: details.District,
                    pincode
                };
            }
        } catch (error) {
            console.warn(`Pincode lookup fallback for ${pincode}`);
        }
        return {
            success: false,
            city: 'Metro Location',
            state: 'Maharashtra',
            pincode
        };
    }
async updateShipmentStatus(waybillNumber, { status, location, remarks }) {
        const shipment = await Shipment.findOne({ waybillNumber });
        if (!shipment) {
            throw new Error('Shipment waybill not found.');
        }

        const validStatuses = ['MANIFESTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
        if (status && !validStatuses.includes(status)) {
            throw new Error(`Invalid status. Allowed values: ${validStatuses.join(', ')}`);
        }

        if (status) {
            shipment.status = status;
        }

        // Push checkpoint into tracking history array
        shipment.trackingHistory.push({
            status: status || shipment.status,
            location: location || shipment.originCity,
            timestamp: new Date(),
            remarks: remarks || `Shipment status updated to ${status || shipment.status}`
        });

        await shipment.save();

        return await shipment.populate([
            { path: 'product', select: 'title category price' },
            { path: 'seller', select: 'businessName email phoneNumber' },
            { path: 'buyer', select: 'businessName email phoneNumber' }
        ]);
    }

    /**
     * Get Active & Past Shipments for a User (Buyer or Seller)
     */
    async getUserShipments(userId) {
        return await Shipment.find({
            $or: [{ buyer: userId }, { seller: userId }]
        })
        .populate('product', 'title category price photos')
        .populate('seller', 'businessName email phoneNumber')
        .populate('buyer', 'businessName email phoneNumber')
        .sort({ createdAt: -1 });
    }
    /**
     * Compute Estimated Delivery Date (EDD) based on Pincode zone
     */
    calculateEDD(destinationPincode) {
        const firstTwoDigits = parseInt(destinationPincode.substring(0, 2));

        // Transit days estimation based on region
        let transitDays = 3; // Default 3 days for interstate
        if ([40, 41, 42, 43, 44].includes(firstTwoDigits)) {
            transitDays = 2; // Maharashtra / West zone
        } else if ([11, 12, 20, 56, 60, 70].includes(firstTwoDigits)) {
            transitDays = 3; // Major metros (Delhi, Bangalore, Chennai, Kolkata)
        } else {
            transitDays = 4; // Other states
        }

        const eddDate = new Date();
        eddDate.setDate(eddDate.getDate() + transitDays);

        return {
            transitDays,
            eddDate,
            formattedEDD: eddDate.toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })
        };
    }

    /**
     * Calculate Freight Cost DIRECTLY FROM PRODUCT WEIGHT (quantity)
     */
    async estimateFreightAndDelivery({ productId, destinationPincode }) {
        if (!productId || !destinationPincode) {
            throw new Error('productId and destinationPincode are required.');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found.');
        }

        // Convert product quantity to Weight in KG
        let weightInKg = product.quantity || 100;
        if (product.unit && product.unit.toLowerCase().includes('ton')) {
            weightInKg = product.quantity * 1000; // Convert Tons to KG
        }

        // Tiered rate calculation based strictly on weight
        let ratePerKg = 10;
        if (weightInKg >= 500) ratePerKg = 7;   // Bulk rate for >= 500 kg
        if (weightInKg >= 2000) ratePerKg = 5;  // Heavy tonnage rate for >= 2 tons

        // Calculate freight charges
        const baseFreightCost = Math.round(weightInKg * ratePerKg);
        const fuelSurcharge = Math.round(baseFreightCost * 0.10); // 10% fuel surcharge
        const subtotal = baseFreightCost + fuelSurcharge;
        const gstAmount = Math.round(subtotal * 0.18); // 18% GST
        const totalTransportCost = subtotal + gstAmount;

        // Lookup destination city from Indian Post API
        const destinationInfo = await this.lookupPincode(destinationPincode);
        const eddInfo = this.calculateEDD(destinationPincode);

        return {
            success: true,
            product: {
                id: product._id,
                title: product.title,
                quantity: product.quantity,
                unit: product.unit,
                weightInKg,
                originCity: product.city
            },
            destination: {
                pincode: destinationPincode,
                city: destinationInfo.city,
                state: destinationInfo.state
            },
            pricing: {
                ratePerKg,
                baseFreightCost,
                fuelSurcharge,
                gstAmount,
                totalTransportCost
            },
            deliveryEstimate: {
                estimatedDeliveryDate: eddInfo.eddDate,
                formattedEDD: eddInfo.formattedEDD,
                transitDaysText: `${eddInfo.transitDays}-${eddInfo.transitDays + 1} Business Days`
            },
            carrier: 'EcoMatch Industrial Freight'
        };
    }

    /**
     * Book Shipment & Generate Waybill
     */
    async createShipment({ productId, buyerId, destinationPincode }) {
        const estimate = await this.estimateFreightAndDelivery({ productId, destinationPincode });
        const product = await Product.findById(productId);

        const waybillNumber = `ECO-FRT-${Date.now()}`;

        const shipment = await Shipment.create({
            product: productId,
            seller: product.seller,
            buyer: buyerId,
            waybillNumber,
            carrier: 'EcoMatch Freight',
            originCity: product.city,
            destinationPincode,
            destinationCity: estimate.destination.city,
            weightInKg: estimate.product.weightInKg,
            freightCharges: estimate.pricing.baseFreightCost + estimate.pricing.fuelSurcharge,
            gstAmount: estimate.pricing.gstAmount,
            totalCost: estimate.pricing.totalTransportCost,
            estimatedDeliveryDate: estimate.deliveryEstimate.estimatedDeliveryDate,
            status: 'MANIFESTED',
            trackingHistory: [
                {
                    status: 'MANIFESTED',
                    location: `${product.city}`,
                    timestamp: new Date(),
                    remarks: 'Shipment waybill generated. Vehicle assigned for bulk loading.'
                },
                {
                    status: 'PICKUP_SCHEDULED',
                    location: `${product.city}`,
                    timestamp: new Date(Date.now() + 2 * 3600 * 1000),
                    remarks: 'Freight vehicle dispatched to seller location.'
                }
            ]
        });

        return await shipment.populate([
            { path: 'product', select: 'title category price' },
            { path: 'seller', select: 'businessName email phoneNumber' },
            { path: 'buyer', select: 'businessName email phoneNumber' }
        ]);
    }

    /**
     * Live Waybill Tracking Endpoint
     */
    async trackShipment(waybillNumber) {
        const shipment = await Shipment.findOne({ waybillNumber })
            .populate('product seller buyer');

        if (!shipment) {
            throw new Error('Shipment waybill not found.');
        }

        return {
            success: true,
            waybillNumber: shipment.waybillNumber,
            carrier: shipment.carrier,
            status: shipment.status,
            estimatedDeliveryDate: shipment.estimatedDeliveryDate,
            origin: shipment.originCity,
            destination: `${shipment.destinationCity} (${shipment.destinationPincode})`,
            weightInKg: shipment.weightInKg,
            totalCost: shipment.totalCost,
            trackingMilestones: shipment.trackingHistory
        };
    }
}

module.exports = new LogisticsService();