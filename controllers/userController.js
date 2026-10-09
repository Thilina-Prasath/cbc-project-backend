import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";
import OTP from "../models/otp.js";
import Product from "../models/product.js";
import { sendEmail } from "../utils/emailService.js";
import { passwordResetTemplate } from "../utils/emailTemplates.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_KEY;
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_KEY;

if (!JWT_SECRET) {
    console.error("JWT secret missing: set JWT_SECRET or JWT_KEY in .env");
}

if (!REFRESH_JWT_SECRET) {
    console.error("Refresh JWT secret missing: set REFRESH_JWT_KEY in .env");
}

// Create user

export async function createUser(req, res) {
    try {
        const { email, password, firstName, lastName, role, provider, providerId } = req.body;

        if (role === "admin") {
            if (!req.user || req.user.role !== "admin") {
                return res.status(403).json({
                    message: "You are not authorized to create an admin account. Please login first."
                });
            }
        }

        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists. Please login."
            });
        }

        let hashedPassword = null;
        const userProvider = provider || "email";

        if (userProvider === "email") {
            if (!password) {
                return res.status(400).json({ message: "Password is required for email registration." });
            }
            hashedPassword = bcrypt.hashSync(password, 10);
        }

        const user = new User({
            firstName: firstName || "",
            lastName: lastName || "",
            email: email,
            password: hashedPassword,
            role: role || "customer",
            provider: userProvider,
            providerId: providerId || null,
            // Google/Facebook login users are considered verified by default
            isEmailVerified: userProvider !== "email" ? true : false
        });

        await user.save();

        // Email provider nam witharak verification email ekak evanawa
        if (userProvider === "email") {
            const verificationToken = jwt.sign(
                { id: user._id },
                JWT_SECRET,
                { expiresIn: "1d" }
            );

            const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

            const message = {
                from: `"Shopnix Support" <${process.env.GMAIL_USER}>`,

                to: email,
                subject: "Verify your email - Shopnix",

                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; border: 1px solid #eaeaea; border-radius: 10px;">
            
            <h2 style="color: #2563eb; text-align: center;">Welcome to Shopnix!</h2>
            
            <p>Hi ${firstName || "there"},</p>
            
            <p>Thank you for registering with us. To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            
            <p style="font-size: 14px; color: #555;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; word-break: break-all;"><a href="${verificationLink}" style="color: #2563eb;">${verificationLink}</a></p>
            
            <p style="font-size: 14px; color: #d97706;"><b>Note:</b> This link expires in 24 hours.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
                If you did not create an account using this email address, please ignore this email.
            </p>
            </div>`
            };

            transport.sendMail(message, (error, info) => {
                if (error) console.error("Verification email error:", error);
            });
        }

        res.status(201).json({ message: "User created successfully. Please check your email to verify your account." });

    } catch (error) {
        console.error("User creation error:", error);
        res.status(500).json({
            message: "Error creating user",
            error: error.message
        });
    }
}

// Login user
export function loginUser(req, res) {
    const { email, password } = req.body;

    User.findOne({ email }).then(async (user) => {
        if (!user) {
            return res.status(400).json({ message: "User is not found" });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Password is incorrect" });
        }

        if (isPasswordCorrect) {
            if (!user.isEmailVerified) {
                return res.status(403).json({ message: "Please verify your email before logging in." });
            }
        }

        // Access Token (15 min)
        const accessToken = jwt.sign(
            {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                img: user.img
            },
            JWT_SECRET,
            { expiresIn: "15m" }
        );

        // Refresh Token (7 days)
        const refreshToken = jwt.sign(
            { id: user._id },
            REFRESH_JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Refresh token save in DB
        user.refreshToken = refreshToken;
        await user.save();

        // Refresh token sent as HttpOnly cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", 
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({
            message: "User logged in successfully",
            token: accessToken,
            role: user.role
        });

    }).catch((error) => {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    });
}

export async function loginWithGoogle(req, res) {
    try {
        const token = req.body.accessToken;
        if (token == null) {
            res.status(400).json({
                message: "Access token is required"
            });
            return;
        }

        const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log(response.data);
        
        const user = await User.findOne({ 
            email: response.data.email 
        });

        if (user == null) {
            const newUser = new User({
                email: response.data.email,
                firstName: response.data.given_name,
                lastName: response.data.family_name,
                password: "googleUser",
                img: response.data.picture
            });

            await newUser.save();

            const jwtToken = jwt.sign(
                {
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    role: newUser.role,
                    img: newUser.img
                },
                JWT_SECRET
            );

            res.json({
                message: "Login successful",
                token: jwtToken,
                role: newUser.role
            });
        } else {
            const jwtToken = jwt.sign(
                {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    img: user.img
                },
                JWT_SECRET
            );

            res.json({
                message: "Login successful",
                token: jwtToken,
                role: user.role
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "Google login failed",
            error: error.message
        });
    }
}

export async function loginWithFacebook(req, res) {
    try {
        const token = req.body.accessToken;
        if (token == null) {
            return res.status(400).json({
                message: "Access token is required"
            });
        }

        const response = await axios.get(`https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${token}`);

        console.log("Facebook User Data:", response.data);

        const userEmail = response.data.email;
        if (!userEmail) {
            return res.status(400).json({
                message: "Facebook account does not have an email address associated with it."
            });
        }

        // check if user with this email already exists
        const user = await User.findOne({ 
            email: userEmail 
        });

        if (user == null) {
            const newUser = new User({
                email: userEmail,
                firstName: response.data.first_name || "",
                lastName: response.data.last_name || "",
                password: "facebookUser", 
                img: response.data.picture?.data?.url,
                provider: "facebook", 
                providerId: response.data.id
            });

            await newUser.save();

            const jwtToken = jwt.sign(
                {
                    email: newUser.email,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    role: newUser.role || "customer",
                    img: newUser.img
                },
                JWT_SECRET
            );

            res.status(201).json({
                message: "Facebook Login successful",
                token: jwtToken,
                role: newUser.role || "customer"
            });
        } else {
            const jwtToken = jwt.sign(
                {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    img: user.img
                },
                JWT_SECRET
            );

            res.json({
                message: "Facebook Login successful",
                token: jwtToken,
                role: user.role
            });
        }
    } catch (error) {
        console.error("Facebook login error:", error.response?.data || error.message);
        res.status(500).json({
            message: "Facebook login failed",
            error: error.message
        });
    }
}

// Fixed: createTransport instead of createTransporter
const transport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

transport.verify((error, success) => {
    if (error) {
        console.error("Email transport configuration error:", error);
    } else {
        console.log("Email transport is ready");
    }
});

export async function sendOTP(req, res) {
    try {
        const randomOTP = Math.floor(100000 + Math.random() * 900000);
        const email = req.body.email;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        await OTP.deleteMany({ email });

        const otp = new OTP({ email, otp: randomOTP });
        await otp.save();

        const result = await sendEmail({
            to: email,
            subject: "Reset Your Password - Crystal Beauty Clear",
            html: passwordResetTemplate(randomOTP)
        });

        if (!result.success) {
            return res.status(500).json({ message: "Failed to send OTP" });
        }

        res.json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error("OTP sending error:", error);
        res.status(500).json({ message: "Failed to send OTP", error: error.message });
    }
}

export async function resetPassword(req, res) {
    try {
        const otp = req.body.otp;
        const email = req.body.email;
        const newPassword = req.body.newPassword;

        console.log("Received OTP:", otp);

        const otpRecord = await OTP.findOne({
            email: email
        });
        
        if (otpRecord == null) {
            res.status(404).json({
                message: "No OTP requests found. Please try again"
            });
            return;
        }

        if (otp == otpRecord.otp) {
            // Delete OTP after successful verification
            await OTP.deleteMany({
                email: email
            });

            console.log("New password:", newPassword);

            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            
            await User.updateOne(
                { email: email },
                { password: hashedPassword }
            );

            res.json({
                message: "Password has been reset successfully"
            });
        } else {
            res.status(403).json({
                message: "OTPs do not match!" // Fixed typo
            });
        }
    } catch (error) {
        res.status(500).json({
            message: "Failed to reset password",
            error: error.message
        });
    }
}

export async function refreshAccessToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not found. Please login again." });
        }

        // Refresh token verify
        jwt.verify(refreshToken, REFRESH_JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Invalid refresh token. Please login again." });
            }

            const user = await User.findById(decoded.id);

            // Check if the refresh token in the database matches the one provided
            if (!user || user.refreshToken !== refreshToken) {
                return res.status(403).json({ message: "Refresh token mismatch. Please login again." });
            }

            // generate new access token
            const newAccessToken = jwt.sign(
                {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    img: user.img
                },
                JWT_SECRET,
                { expiresIn: "15m" }
            );

            res.json({ token: newAccessToken });
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to refresh token",
            error: error.message
        });
    }
}

export async function logoutUser(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            await User.updateOne(
                { refreshToken: refreshToken },
                { $unset: { refreshToken: 1 } }
            );
        }

        res.clearCookie("refreshToken");
        res.json({ message: "Logged out successfully" });

    } catch (error) {
        res.status(500).json({ message: "Logout failed", error: error.message });
    }
}

export async function verifyEmail(req, res) {
    try {
        const { token } = req.query; // Get token from query parameters

        jwt.verify(token, JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(400).json({ message: "Invalid or expired verification link." });
            }

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            if (user.isEmailVerified) {
                return res.json({ message: "Email already verified." });
            }

            user.isEmailVerified = true;
            await user.save();

            res.json({ message: "Email verified successfully. You can now login." });
        });

    } catch (error) {
        res.status(500).json({ message: "Verification failed", error: error.message });
    }
}

// Get logged-in user details
export function getUser(req, res) {
    if (req.user == null) {
        res.status(403).json({
            message: "You are not authorized to view user details"
        });
        return;
    } else {
        res.json({
            ...req.user
        });
    }
}

// Get all customers
export async function getCustomers(req, res) {
    try {
        // Check if user is admin
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                message: "You are not authorized to view customers"
            });
        }

        // Find all users who are customers (not admins)
        const customers = await User.find({ 
            role: { $ne: "admin" } // Not equal to admin
        }).select('-password'); // Exclude password field

        console.log(`Found ${customers.length} customers`);
        res.json(customers);
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

// Admin check helper function
export function isAdmin(req) {
    if (req.user == null) {
        return false;
    }
    if (req.user.role != "admin") {
        return false;
    }
    return true;
}

export async function getuserdetails(req, res) {
    try {
        if (req.user == null) {
            return res.status(403).json({
                message: "You are not authorized to view user details"
            });
        }

        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,       
            img: user.img || ""    
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching user details", error: error.message });
    }
}


export async function updateuserdetails(req, res) {
    try {
        if (req.user == null) {
            return res.status(403).json({
                message: "You are not authorized to update user details"
            });
        }

        const user = await User.findOne({ email: req.user.email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const { firstName, lastName, password } = req.body;

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;

        if (password) {
            user.password = bcrypt.hashSync(password, 10);
        }


        // save the updated user details to the database
        await user.save();

        res.json({
            message: "User details updated successfully",
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Error updating user details", error: error.message });
    }
}

export async function toggleWishlist(req, res) {
    try {
        const userEmail = req.user.email; 
        const { productId } = req.body;

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isProductInWishlist = user.wishlist.includes(productId);

        if (isProductInWishlist) {
            user.wishlist = user.wishlist.filter(id => id !== productId);
            await user.save();
            return res.json({ message: "Product removed from wishlist", isAdded: false });
        } else {
            user.wishlist.push(productId);
            await user.save();
            return res.json({ message: "Product added to wishlist", isAdded: true });
        }
    } catch (err) {
        res.status(500).json({ message: "Error updating wishlist", error: err.message });
    }
}

export async function getWishlist(req, res) {
    try {
        const userEmail = req.user.email;
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const wishlistProducts = await Product.find({
            productId: { $in: user.wishlist }
        });

        res.json(wishlistProducts);
    } catch (err) {
        res.status(500).json({ message: "Error fetching wishlist", error: err.message });
    }
}