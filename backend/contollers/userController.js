import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

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
    }).catch(() => {
        res.json({ message: "Error creating user" });
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
            res.json({ message: "User logged in successfully", 
                       token : token,
                        role : user.role});  //api gnn on dewl role ek,message saha token ek
        } else {
            res.status(400).json({ message: "Password is incorrect" });
        }
    });
}

// Admin check (updated to allow roles starting with "admin")
export function isAdmin(req) {
    if (!req.user) return false;
    return req.user.role?.startsWith("admin");
}
