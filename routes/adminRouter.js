import express from 'express';
import { getDashboardStats } from '../controllers/adminController.js';

const adminRouter = express.Router();

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

adminRouter.get("/dashboard", requireAuth, requireAdmin, getDashboardStats);


export default adminRouter;