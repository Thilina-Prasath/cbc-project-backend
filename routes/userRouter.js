import express from 'express';
import { 
    createUser, 
    getUser, 
    loginUser, 
    loginWithGoogle, 
    resetPassword, 
    sendOTP,
    getCustomers,  // Import from userController instead of orderController
    loginWithFacebook,
    getuserdetails,
    updateuserdetails,
    toggleWishlist,
    getWishlist,
    logoutUser,
    verifyEmail,
    refreshAccessToken
} from '../controllers/userController.js';

const userRouter = express.Router();

// Middleware to require authentication
const requireAuth = (req, res, next) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ message: "Authentication required." });
    }
    next();
};

userRouter.post("/register",createUser);  //localhost:3000/user kiyl request ekk awoth mek run weno
userRouter.post("/login", loginUser)  //localhost:3000/user/login kiyl request ekk awoth mek run weno  and norml login sdh use krnne post ek
userRouter.post("/login/google",loginWithGoogle)
userRouter.post("/login/facebook", loginWithFacebook) // Facebook login route
userRouter.post("/send-otp",sendOTP) //localhost:3000/user/send-otp kiyl request ekk
userRouter.post("/reset-password", resetPassword);
userRouter.get("/", getUser);
userRouter.get("/customers", getCustomers);  // Now uses the function from userController
userRouter.get("/profile", getuserdetails);
userRouter.put("/profile", updateuserdetails); 
userRouter.post("/wishlist", requireAuth, toggleWishlist);
userRouter.get("/wishlist", requireAuth, getWishlist);
userRouter.post("/refresh-token", refreshAccessToken);
userRouter.post("/logout", logoutUser);
userRouter.get("/verify-email", verifyEmail);

export default userRouter;