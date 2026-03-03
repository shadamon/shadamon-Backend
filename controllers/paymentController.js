const SSLCommerzPayment = require('sslcommerz-lts');
const Payment = require('../models/Payment');
const Ad = require('../models/Ad');
const User = require('../models/User'); // Add User model import at top
const mongoose = require('mongoose');

// SSL Commerz Configuration
const getSslConfig = () => ({
    store_id: process.env.SSL_STORE_ID,
    store_passwd: process.env.SSL_STORE_PASS,
    is_live: process.env.SSL_IS_LIVE === 'true'
});

const initPayment = async (req, res) => {
    try {
        const { adId, totalAmount, userName, userMobile, description, promotionDetails, paymentType } = req.body;
        const userId = req.user.id;

        if (!totalAmount) {
            return res.status(400).json({ success: false, message: "Amount is required" });
        }

        if (paymentType !== 'verification' && !adId) {
            return res.status(400).json({ success: false, message: "Ad ID and amount are required" });
        }

        const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const data = {
            total_amount: totalAmount,
            currency: 'BDT',
            tran_id: transactionId,
            success_url: `${process.env.BACKEND_URL}/api/payment/success/${transactionId}`,
            fail_url: `${process.env.BACKEND_URL}/api/payment/fail/${transactionId}`,
            cancel_url: `${process.env.BACKEND_URL}/api/payment/cancel/${transactionId}`,
            ipn_url: `${process.env.BACKEND_URL}/api/payment/ipn`,
            shipping_method: 'Courier',
            product_name: 'Ad Promotion',
            product_category: 'Service',
            product_profile: 'general',
            cus_name: userName || 'Customer',
            cus_email: req.user.email || 'customer@example.com',
            cus_add1: 'Dhaka',
            cus_add2: 'Dhaka',
            cus_city: 'Dhaka',
            cus_state: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: userMobile || '01700000000',
            cus_fax: '01700000000',
            ship_name: userName || 'Customer',
            ship_add1: 'Dhaka',
            ship_add2: 'Dhaka',
            ship_city: 'Dhaka',
            ship_state: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };

        const { store_id, store_passwd, is_live } = getSslConfig();
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);

        const apiResponse = await sslcz.init(data);
        let GatewayPageURL = apiResponse.GatewayPageURL;

        if (GatewayPageURL) {
            // Save Pending Payment to DB
            const newPayment = new Payment({
                user: userId,
                ...(adId && { ad: adId }),
                userName,
                userMobile,
                amount: totalAmount,
                transactionId,
                description,
                promotionDetails: { ...promotionDetails, paymentType },
                status: 'PENDING'
            });
            await newPayment.save();

            res.status(200).json({ success: true, url: GatewayPageURL });
        } else {
            console.error("SSL Commerz Init Failed. Response:", apiResponse);
            res.status(400).json({
                success: false,
                message: apiResponse?.failedreason || "Failed to initialize payment gateway",
                error: apiResponse
            });
        }

    } catch (error) {
        console.error("Payment Init Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const successPayment = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const paymentData = req.body;

        // Verify Payment with SSL Commerz
        const { store_id, store_passwd, is_live } = getSslConfig();
        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        const validation = await sslcz.validate(paymentData);

        if (validation.status === 'VALID' || validation.status === 'AUTHENTICATED') {
            const payment = await Payment.findOneAndUpdate(
                { transactionId },
                {
                    status: 'VALID',
                    method: paymentData.card_type || paymentData.method,
                    paymentDetails: paymentData
                },
                { new: true }
            );

            // Update Ad Promotion Status (if ad exists)
            if (payment && payment.ad && payment.promotionDetails) {
                const {
                    promoteType,
                    trafficLink,
                    trafficButtonType,
                    targetLocations,
                    promoteDuration,
                    promoteEndDate,
                    promoteBudget,
                    estimatedReach,
                    isHighlight,
                    highlightType,
                    isPostLevel,
                    selectedLabel
                } = payment.promotionDetails;

                // Map highlightType to promoteTag if highlighted
                let promoteTag = 'All';
                if (isHighlight) {
                    if (highlightType === 'Hot Sale') promoteTag = 'Highlights';
                    else if (highlightType === 'Discount') promoteTag = 'Discount';
                    else if (highlightType === 'Urgent') promoteTag = 'Urgent';
                    else promoteTag = 'Highlights';
                }

                await Ad.findByIdAndUpdate(payment.ad, {
                    adType: 'Promoted',
                    promoteType,
                    trafficLink,
                    trafficButtonType,
                    targetLocations,
                    promoteDuration,
                    promoteEndDate: new Date(promoteEndDate),
                    promoteBudget,
                    estimatedReach,
                    promoteTag,
                    // If post level / label was selected
                    label: isPostLevel ? selectedLabel : undefined,
                    // Reset counts for new promotion
                    promotedViews: 0,
                    promotedDeliveryCount: 0
                });

                // Automatically upgrade user to Premium when an ad is promoted
                if (payment.user) {
                    await User.findByIdAndUpdate(payment.user, {
                        merchantType: 'Premium'
                    });
                    console.log(`✅ User ${payment.user} upgraded to Premium after promoting ad ${payment.ad}`);
                }

                console.log(`✅ Ad ${payment.ad} promoted and items updated after payment ${transactionId}`);
            }

            // Handle User Verification Badge (whether connected to an Ad or standalone)
            if (payment && payment.promotionDetails && payment.promotionDetails.isVerifyBadge && payment.user) {
                await User.findByIdAndUpdate(payment.user, {
                    verifiedAt: new Date(),
                    merchantType: 'Premium',
                    merchantTrustStatus: 'Trusted',
                    mVerified: true
                });
                console.log(`✅ User ${payment.user} verified via payment ${transactionId}`);
            }

            // Redirect back to frontend success page
            res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=success&txnId=${transactionId}`);
        } else {
            res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=failed&txnId=${transactionId}`);
        }
    } catch (error) {
        console.error("Payment Success Callback Error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=error`);
    }
};

const failPayment = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const paymentData = req.body;

        await Payment.findOneAndUpdate(
            { transactionId },
            {
                status: 'FAILED',
                paymentDetails: paymentData
            }
        );

        res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=failed&txnId=${transactionId}`);
    } catch (error) {
        console.error("Payment Fail Callback Error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=error`);
    }
};

const cancelPayment = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const paymentData = req.body;

        await Payment.findOneAndUpdate(
            { transactionId },
            {
                status: 'CANCELLED',
                paymentDetails: paymentData
            }
        );

        res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=cancelled&txnId=${transactionId}`);
    } catch (error) {
        console.error("Payment Cancel Callback Error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/payment/status?status=error`);
    }
};

const ipnPayment = async (req, res) => {
    // SSL Commerz will call this in the background
    console.log("IPN received:", req.body);
    res.status(200).send("OK");
};

module.exports = {
    initPayment,
    successPayment,
    failPayment,
    cancelPayment,
    ipnPayment
};
