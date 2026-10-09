import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import User from './models/user.js';
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import orderRouter from './routes/orderRoute.js';
import reviewRouter from './routes/reviewRouter.js';
import uploadRouter from './routes/uploadRouter.js';
import bannerRouter from './routes/bannerRouter.js';
import chatRouter from './routes/chatRouter.js';
import adminRouter from './routes/adminRouter.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

// 1. Helmet - Security Headers
app.use(helmet());

// 2. Data Parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser())


// 3. CORS - Frontend Access
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// 4. Rate Limiting - DDoS Protection
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: "Too many requests from this IP, please try again after 15 minutes"
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// 5. JWT Token Authentication Middleware
app.use(async (req, res, next) => {
    const tokenString = req.header("Authorization");

    if (tokenString != null) {
        const token = tokenString.replace(/^Bearer\s+/i, "").trim();

        try {
            const jwtSecret = process.env.JWT_SECRET || process.env.JWT_KEY;
            if (!jwtSecret) {
                console.error("JWT secret is missing in .env");
                return res.status(500).json({ message: "Server config error" });
            }

            const decoded = jwt.verify(token, jwtSecret);
            let userDoc = null;

            if (decoded.id || decoded.userId) {
                userDoc = await User.findById(decoded.id || decoded.userId);
            } else if (decoded.email) {
                userDoc = await User.findOne({ email: decoded.email });
            }

            if (userDoc) {
                req.user = {
                    ...decoded,
                    ...userDoc.toObject()
                };
            } else {
                req.user = decoded;
            }

        } catch (err) {
            console.log("Token verification failed:", err.name, err.message);
        }
    }
    next();
});

// 6. Require Auth Middleware 
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Authentication required. Please login first."
        });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required." });
    }
    next();
};

// 7. MongoDB Connection
mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log("MongoDB connection failed:", err));

// 8. API Routes
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use("/api/banner", bannerRouter);
app.use("/api/chat", chatRouter);
app.use("/api/admin", requireAuth, requireAdmin, adminRouter); // Admin routes (Protected)

// Protected Routes
app.use("/api/orders", requireAuth, orderRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/upload", requireAuth, uploadRouter);

// 9. Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running securely on port ${PORT}`);
});