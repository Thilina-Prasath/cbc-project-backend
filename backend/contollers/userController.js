import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";
import OTP from "../models/otp.js";

dotenv.config();

// Create user
export function createUser(req, res) {
    if (req.body.role === "admin") {
        if (req.user != null) {
            if (req.user.role !== "admin") {
                return res.status(403).json({
                    message: "You are not authorized to create an admin account."
                });
            }
        } else {
            return res.status(403).json({
                message: "You are not authorized to create an admin account. Please login first."
            });
        }
    }

    const hashedPassword = bcrypt.hashSync(req.body.password, 10);

    const user = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: hashedPassword,
        role: req.body.role,
    });

    user.save().then(() => {
        res.json({ message: "User created successfully" });
    }).catch((error) => {
        res.status(500).json({ 
            message: "Error creating user",
            error: error.message 
        });
    });
}

// Login user
export function loginUser(req, res) {
    const { email, password } = req.body;

    User.findOne({ email }).then((user) => {
        if (!user) {
            return res.status(400).json({ message: "User is not found" });
        }

        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        if (isPasswordCorrect) {
            const token = jwt.sign(
                {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    img: user.img
                },
                process.env.JWT_KEY
            );
            res.json({ 
                message: "User logged in successfully", 
                token: token,
                role: user.role
            });
        } else {
            res.status(400).json({ message: "Password is incorrect" });
        }
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
                process.env.JWT_KEY
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
                process.env.JWT_KEY
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

export async function sendOTP(req, res) {
    try {
        const randomOTP = Math.floor(100000 + Math.random() * 900000);
        const email = req.body.email;

        if (email == null) {
            res.status(400).json({
                message: "Email is required"
            });
            return;
        }

        // Check if user exists
        const user = await User.findOne({
            email: email
        });

        if (user == null) {
            res.status(404).json({
                message: "User not found"
            });
            return;
        }

        // Delete all existing OTPs for this email
        await OTP.deleteMany({
            email: email
        });

        const message = {
            from: process.env.GMAIL_USER, // Use environment variable
            to: email,
            subject: "Resetting password for Crystal Beauty Clear",
            text: "This is your password reset OTP: " + randomOTP
        };

        const otp = new OTP({
            email: email,
            otp: randomOTP
        });

        await otp.save();

        transport.sendMail(message, (error, info) => {
            if (error) {
                console.error("Email sending error:", error);
                res.status(500).json({
                    message: "Failed to send OTP",
                    error: error.message
                });
            } else {
                res.json({
                    message: "OTP sent successfully"
                    // Don't send OTP in response for security
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to send OTP",
            error: error.message
        });
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