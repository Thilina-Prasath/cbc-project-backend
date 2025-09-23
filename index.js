import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import jwt from 'jsonwebtoken';
import orderRouter from './routes/orderRoute.js';
import reviewRouter from './routes/reviewRouter.js';
import cors from 'cors';
import dotenv from 'dotenv';
import User from './models/user.js'; 

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

/**
 * Middleware: Attach user if token exists
 */
app.use(async (req, res, next) => {
    const tokenString = req.header("Authorization");

    if (tokenString != null) {
        const token = tokenString.replace("Bearer", "").trim();
        console.log("Token received:", token);

        try {
            // Load JWT secret from env
            const jwtSecret = process.env.JWT_SECRET || process.env.JWT_KEY;
            if (!jwtSecret) {
                console.error("JWT secret is missing in .env");
                return res.status(500).json({ message: "Server config error" });
            }

            // Verify token
            const decoded = jwt.verify(token, jwtSecret);
            console.log("Decoded token:", decoded);

            let userDoc = null;

            // Try to find user in DB
            if (decoded.id || decoded.userId) {
                userDoc = await User.findById(decoded.id || decoded.userId);
            } else if (decoded.email) {
                userDoc = await User.findOne({ email: decoded.email });
            }

            if (userDoc) {
                // Merge token + DB data
                req.user = {
                    ...decoded,            // keep role/admin info from token
                    ...userDoc.toObject()  // merge DB fields (like email, _id, etc.)
                };
                console.log("User merged and set:", req.user.email, req.user.role);
            } else {
                // Fallback to token payload only
                req.user = decoded;
                console.log("User not found in DB, using token only");
            }

        } catch (err) {
            console.log("Token verification failed:", err.message);
        }
    }

    next();
});

/**
 * Auth middleware for protected routes
 */
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required. Please login first."
        });
    }
    next();
};

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("MongoDB connection failed:", err));

// Routes
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use("/api/orders", requireAuth, orderRouter);   // Protected
app.use("/api/reviews", requireAuth, reviewRouter); // Protected

// Server
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
