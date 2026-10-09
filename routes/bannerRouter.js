import express from 'express';
import { addBanner, deleteBanner, getBanner } from '../controllers/bannerController.js';

const bannerRouter = express.Router();

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

bannerRouter.get("/", getBanner);

bannerRouter.post("/", requireAuth, requireAdmin, addBanner);
bannerRouter.delete("/:id", requireAuth, requireAdmin, deleteBanner);

export default bannerRouter;