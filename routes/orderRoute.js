import express from "express";
import { createOrder, createPOSOrder, getMyOrders, getOrders, payhereNotify, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router();

// Middleware to require authentication 
const requireAuth = (req, res, next) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required." });
    }
    next();
};

// Middleware to require admin role 
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
    }
    next();
};

// PUBLIC ROUTES 
orderRouter.post("/notify", payhereNotify);


// CUSTOMER ROUTES
orderRouter.post("/", requireAuth, createOrder);
orderRouter.get("/my-orders", requireAuth, getMyOrders);


// ADMIN / STAFF ROUTES 
orderRouter.get("/", requireAuth, requireAdmin, getOrders);
orderRouter.put("/:orderId/:status", requireAuth, requireAdmin, updateOrderStatus);
orderRouter.post("/post", requireAuth, requireAdmin, createPOSOrder); 

export default orderRouter;