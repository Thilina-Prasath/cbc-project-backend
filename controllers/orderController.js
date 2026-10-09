import Order from "../models/order.js"
import Product from "../models/product.js"
import { isAdmin } from "./userController.js"
import { sendEmail } from "../utils/emailService.js";
import { orderConfirmationTemplate, paymentReceiptTemplate } from "../utils/emailTemplates.js";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto'; 
import dotenv from "dotenv";


// Updated createOrder function to handle the frontend structure
export async function createOrder(req, res) {
    if (req.user == null) {
        res.status(403).json({
            message: "Please login and try again"
        })
        return
    }

    const orderInfo = req.body
    console.log("Received order info:", JSON.stringify(orderInfo, null, 2));

    // Handle both old and new frontend structures
    let customerName, customerEmail, customerPhone, customerAddress;

    if (orderInfo.customerInfo) {
        // New frontend structure
        customerName = orderInfo.customerInfo.fullName || orderInfo.name;
        customerEmail = orderInfo.customerInfo.email || orderInfo.email;
        customerPhone = orderInfo.customerInfo.phone || orderInfo.phone;
        customerAddress = `${orderInfo.customerInfo.address}, ${orderInfo.customerInfo.city}, ${orderInfo.customerInfo.postalCode}`;
    } else {
        // Direct structure (recommended fix)
        customerName = orderInfo.name;
        customerEmail = orderInfo.email;
        customerPhone = orderInfo.phone;
        customerAddress = orderInfo.address;
    }

    if (customerName == null) {
        customerName = req.user.firstName + " " + req.user.lastName
    }

    // Generate unique order ID
    let orderId = "SPX00001"

    const lastOrder = await Order.find().sort({ date: -1 }).limit(1)

    if (lastOrder.length > 0) {
        const lastOrderId = lastOrder[0].orderId
        const lastOrderNumberString = lastOrderId.replace("CBC", "")
        const lastOrderNumber = parseInt(lastOrderNumberString)
        const newOrderNumber = lastOrderNumber + 1
        const newOrderNumberString = String(newOrderNumber).padStart(5, '0');
        orderId = "CBC" + newOrderNumberString
    }

    try {
        let total = 0;
        let labelledTotal = 0;
        const products = []

        for (let i = 0; i < orderInfo.products.length; i++) {
            const item = await Product.findOne({ productId: orderInfo.products[i].productId })

            if (item == null) {
                res.status(404).json({
                    message: "Product with productId " + orderInfo.products[i].productId + " not found"
                })
                return
            }

            if (item.isAvailable == false || Number(item.stock) < Number(orderInfo.products[i].qty)) {
                res.status(400).json({
                    message: "Product " + item.name + " is out of stock or not available!"
                })
                return
            }

            const quantity = parseInt(orderInfo.products[i].qty) || 0;
            const price = parseFloat(item.price) || 0;
            const labelledPrice = parseFloat(item.labelledPrice) || 0;

            products[i] = {
                productInfo: {
                    productId: item.productId,
                    name: item.name,
                    altNames: item.altNames,
                    description: item.description,
                    images: item.images,
                    color: orderInfo.products[i].color || "",
                    size: orderInfo.products[i].size || "",
                    labelledPrice: labelledPrice,
                    price: price
                },
                quantity: quantity
            }

            total += (price * quantity);
            labelledTotal += (labelledPrice * quantity);

            const newStock = Number(item.stock) - quantity;
            const isNowAvailable = newStock > 0;

            await Product.updateOne(
                { productId: item.productId },
                {
                    $set: {
                        stock: newStock.toString(),
                        isAvailable: isNowAvailable
                    }
                }
            );
        }

        const order = new Order({
            orderId: orderId,
            email: customerEmail,
            name: customerName,
            address: customerAddress,
            phone: customerPhone,
            products: products,
            labelledTotal: labelledTotal,
            total: total
        })

        const createdOrder = await order.save()
        const merchantId = process.env.MERCHANT_ID;
        const merchantSecret = process.env.MERCHANT_SECRET;

        const amountFormatted = parseFloat(total).toLocaleString('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, '');
        const currency = "LKR";

        // Hash Formula
        const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
        const hash = crypto.createHash('md5').update(merchantId + orderId + amountFormatted + currency + hashedSecret).digest('hex').toUpperCase();

        // going order details and payhereconfig data to frontend
        res.json({
            message: "Order created successfully",
            order: createdOrder,
            payhereConfig: {
                hash: hash,
                merchantId: merchantId,
                amount: amountFormatted,
                currency: currency
            }
        });
    } catch (err) {
        console.error("Order creation error:", err);
        res.status(500).json({
            message: "Failed to create order",
            error: err.message
        })
    }
}

export async function getOrders(req, res) {
    if (req.user == null) {
        res.status(401).json({
            message: "You are not logged in"
        })
        return
    }
    
    try {
        if (req.user.role === "admin") {
            const orders = await Order.find()
            res.json(orders);
        } else {
            const orders = await Order.find({ email: req.user.email })
            res.json(orders);
        }
    } catch (err) {
        res.status(500).json({
            message: "Failed to get orders",
            error: err
        })
    }
}

export async function updateOrderStatus(req, res) {
    const orderId = req.params.orderId;
    const status = req.params.status;

    try {
        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: orderId },
            {
                $set: {
                    status: status,
                    orderStatus: status.charAt(0).toUpperCase() + status.slice(1)
                }
            },
            { new: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.json({
            message: "Order status updated successfully",
            order: updatedOrder
        });

    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({
            message: "Failed to update order status",
            error: err.message
        });
    }
}

// Missing function that was being imported in userRouter.js
export async function getCustomers(req, res) {
    if (!isAdmin(req)) {
        res.status(403).json({
            message: "You are not authorized to access customer data"
        })
        return
    }
    
    try {
        // Get unique customers from orders
        const customers = await Order.aggregate([
            {
                $group: {
                    _id: "$email",
                    name: { $first: "$name" },
                    email: { $first: "$email" },
                    phone: { $first: "$phone" },
                    address: { $first: "$address" },
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$total" },
                    lastOrderDate: { $max: "$date" }
                }
            },
            {
                $sort: { lastOrderDate: -1 }
            }
        ]);
        
        res.json(customers);
    } catch (err) {
        res.status(500).json({
            message: "Failed to get customers",
            error: err
        });
    }
}


export async function createPOSOrder(req, res) {
    try {
        const { products, labelledTotal, total } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: "No products in the cart" });
        }

        const newOrder = new Order({
            orderId: `POS-${uuidv4().substring(0, 8).toUpperCase()}`, 
            name: "Walk-in Customer",
            email: "walk-in@store.com",
            phone: "0000000000",
            address: "In-Store Purchase",
            status: "completed",       
            orderStatus: "Delivered", 
            orderType: "pos",
            labelledTotal: labelledTotal,
            total: total,
            products: products
        });

        const savedOrder = await newOrder.save();

        for (const item of products) {
            const productToUpdate = await Product.findOne({ productId: item.productInfo.productId });

            if (productToUpdate) {
                const currentStock = Number(productToUpdate.stock);
                const newStock = currentStock - item.quantity;

                productToUpdate.stock = newStock.toString(); 

                if (newStock <= 0) {
                    productToUpdate.isAvailable = false;
                }

                await productToUpdate.save();
            }
        }

        res.status(201).json({
            message: "POS Order created successfully",
            orderId: savedOrder.orderId
        });

    } catch (error) {
        console.error("POS Order Error:", error);
        res.status(500).json({ message: "Failed to create POS order", error: error.message });
    }
}

export async function getMyOrders(req, res) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized access" });
        }

        const orders = await Order.find({ email: req.user.email }).sort({ date: -1 });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user orders", error: error.message });
    }
}

export async function payhereNotify(req, res) {
    const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig,
        method // get PayHere card payment method 
    } = req.body;

    const merchantSecret = process.env.MERCHANT_SECRET;

    const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const localSig = crypto.createHash('md5').update(merchant_id + order_id + payhere_amount + payhere_currency + status_code + hashedSecret).digest('hex').toUpperCase();

    if (localSig === md5sig) {

        if (status_code === "2") {
            try {
                const updatedOrder = await Order.findOneAndUpdate(
                    { orderId: order_id },
                    {
                        $set: {
                            status: "Processing",
                            orderStatus: "Processing"
                        }
                    },
                    { new: true }
                );

                console.log(`✅ Order ${order_id} payment successful and updated!`);

                // POS orders walata email evanna epa - online orders walata witharak
                if (updatedOrder && updatedOrder.orderType === "online" && updatedOrder.email !== "walk-in@store.com") 
                    {

                    const backendUrl = process.env.BACKEND_URL;

                    // ---- Order Confirmation Email ----
                    const orderEmailData = {
                        customerName: updatedOrder.name,
                        orderId: updatedOrder.orderId,
                        items: updatedOrder.products.map(p => ({
                            name: p.productInfo.name,
                            image: p.productInfo.images?.[0]
                                ? `${backendUrl}/${p.productInfo.images[0]}`
                                : "",
                            quantity: p.quantity,
                            price: p.productInfo.price
                        })),
                        total: updatedOrder.total,
                        shippingAddress: updatedOrder.address
                    };

                    sendEmail({
                        to: updatedOrder.email,
                        subject: `Order Confirmed - #${updatedOrder.orderId}`,
                        html: orderConfirmationTemplate(orderEmailData)
                    }).catch(err => console.error("Order confirmation email failed:", err));

                    // ---- Payment Receipt Email ----
                    const paymentEmailData = {
                        customerName: updatedOrder.name,
                        receiptId: "RCPT-" + updatedOrder.orderId,
                        orderId: updatedOrder.orderId,
                        method: req.body.method || "PayHere",
                        date: new Date(),
                        amount: parseFloat(payhere_amount)
                    };

                    sendEmail({
                        to: updatedOrder.email,
                        subject: `Payment Receipt - #${updatedOrder.orderId}`,
                        html: paymentReceiptTemplate(paymentEmailData)
                    }).catch(err => console.error("Payment receipt email failed:", err));
                }

            } catch (err) {
                console.error("Error updating order after payment:", err);
            }
        
        } else if (status_code === "0" || status_code === "-1" || status_code === "-2") {
            try {
                await Order.findOneAndUpdate(
                    { orderId: order_id },
                    { $set: { status: "Cancelled", orderStatus: "Cancelled" } }
                );
                console.log(`❌ Order ${order_id} payment failed/canceled.`);
            } catch (err) {
                console.error("Error updating order after failed payment:", err);
            }
        }
    } else {
        console.warn("⚠️ PayHere signature mismatch! Possible fraud attempt.");
    }

    res.status(200).send();
}