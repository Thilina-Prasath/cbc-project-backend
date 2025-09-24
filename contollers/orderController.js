import Order from "../models/order.js"
import Product from "../models/product.js"
import { isAdmin } from "./userController.js"

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
    let orderId = "CBC00001"
    
    const lastOrder = await Order.find().sort({date : -1}).limit(1)

    if(lastOrder.length > 0){
        const lastOrderId = lastOrder[0].orderId
        const lastOrderNumberString = lastOrderId.replace("CBC","")
        const lastOrderNumber = parseInt(lastOrderNumberString)
        const newOrderNumber = lastOrderNumber + 1
        const newOrderNumberString = String(newOrderNumber).padStart(5, '0');
        orderId = "CBC"+newOrderNumberString
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
            
            if (item.isAvailable == false) {
                res.status(404).json({
                    message: "Product with productId " + orderInfo.products[i].productId + " is not available right now!"
                })
                return
            }
            
            // Validate quantities and prices
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
                    labelledPrice: labelledPrice,
                    price: price
                },
                quantity: quantity
            }
            
            // Calculate totals
            total += (price * quantity);
            labelledTotal += (labelledPrice * quantity);
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
        res.json({
            message: "Order created successfully",
            order: createdOrder
        })
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
    if (!isAdmin(req)) {
        res.status(403).json({
            message: "You are not authorized to update order status" 
        })
        return
    }
    
    try {
        const orderId = req.params.orderId;
        const status = req.params.status;

        await Order.updateOne(
            {
                orderId: orderId
            },
            {
                status: status
            }
        );
        
        res.json({
            message: "Order status updated successfully"
        });

    } catch (e) {
        res.status(500).json({
            message: "Failed to update order status",
            error: e
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
   