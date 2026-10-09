import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: false,
        default: "walk-in@store.com"
    },
    name: {
        type: String,
        required: false,
        default: "Walk-in Customer"
    },
    phone: {
        type: String,
        required: false,
        default: "0000000000"
    },
    address: {
        type: String,
        required: false,
        default: "Store Purchase"
    },
    status: {
        type: String,
        required: true,
        default: "pending"
    },
    labelledTotal: {
        type: Number,
        required: true,
    },
    total: {
        type: Number,
        required: true
    },
    products: [
        {
            productInfo: {
                productId: { type: String, required: true },
                name: { type: String, required: true },
                altNames: [{ type: String }],
                description: { type: String, required: true },
                images: [{ type: String }],
                labelledPrice: { type: Number, required: true },
                price: { type: Number, required: true },
                color: { type: String, default: "" },
                size: { type: String, default: "" }
            },
            quantity: {
                type: Number,
                required: true
            }
        }
    ],
    date: {
        type: Date,
        default: Date.now
    },
    orderType: {
        type: String,
        enum: ["online", "pos"],
        default: "online"
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    trackingNumber: {
        type: String,
        default: ""
    }
});

const Order = mongoose.model("orders", orderSchema);
export default Order;