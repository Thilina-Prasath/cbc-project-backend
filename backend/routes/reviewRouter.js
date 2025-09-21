import express from "express";
import Review from "../models/review.js";
import User from "../models/user.js"; // import User model

const router = express.Router();

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

// POST - Submit a review (authenticated users)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }

    const review = new Review({
      userId: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      rating: Number(rating),
      comment: comment.trim(),
    });

    const savedReview = await review.save();
    res.status(201).json({ message: "Review submitted successfully", review: savedReview });
  } catch (err) {
    console.error("Review submission error:", err);
    res.status(500).json({ message: "Failed to submit review", error: err.message });
  }
});

// GET - Fetch all reviews (admin only)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Populate user info but handle missing users gracefully
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "userId",
        model: User,
        select: "firstName lastName email",
        options: { lean: true }, // optional for plain JS objects
      });

    // Replace null users with placeholder info
    const safeReviews = reviews.map((r) => {
      if (!r.userId) {
        return {
          ...r.toObject(),
          userId: { firstName: "Deleted", lastName: "User", email: "" },
        };
      }
      return r;
    });

    res.json(safeReviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
});

// GET - Fetch reviews for the logged-in user
router.get("/my-reviews", requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    res.status(500).json({ message: "Failed to fetch reviews", error: err.message });
  }
});

export default router;
