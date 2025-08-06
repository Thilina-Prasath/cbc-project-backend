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

export async function loginWithGoogle(req,res) {    //access token ek awm ek validate krl kiywgnn thmi mek use krnne
    const token = req.body.accessToken;           //axios cl ghnn on nis thmi async dnne
    if(token == null){
        res.status(400).json({
            message:"Access token is required"
        });
        return;
    }
    const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    console.log(response.data);
    
    const user = await User.findOne({ 
        email: response.data.email 
    });
    if(user == null){
        const newUser = new User({
            email: response.data.email,
            firstName: response.data.given_name,
            lastName: response.data.family_name,
            password:"googleUser",
            img: response.data.picture
            }
        )
        await newUser.save();
        const token = jwt.sign(
            {
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                role: newUser.role,
                img: newUser.img
            },
            process.env.JWT_KEY
        ) 
        res.json({
            message: "Login successful",
            token: token,
            role: newUser.role
        })    
    }else{

        const token = jwt.sign(
            {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                img: user.img
            },
            process.env.JWT_KEY
        )
        res.json({
            message: "Login successful",
            token: token,
            role: user.role
        })

    }
}

// send otp 

const transport = nodemailer.createTransport({
    service: 'gmail',
    host : 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
})

export async function sendOTP(req,res){
    //javy zfzy dwsd rmbg
    const randomOTP = Math.floor(100000 + Math.random() * 900000);         //randamotp ekk generete krno
    const email = req.body.email;
    if(email == null){
        res.status(400).json({
            message: "Email is required"
        });
        return;
    
    }
    // check if user exists
    const user = await User.findOne({
        email : email
    })
    if(user == null){
        res.status(404).json({
            message:"User not found"
        })
    }

    //delete all otps
    await OTP.deleteMany({
        email: email
    })

    const message = {
        from : "thilinaprasath32@gmail.com",
        to: email,
        subject : "Resetting password for crystal beauty clear.",
        text : "This your password reset OTP : " + randomOTP
    }

    const otp = new OTP({
        email : email,
        otp : randomOTP
    })
    await otp.save()

    transport.sendMail(message,(error,info)=>{
            if(error){
                res.status(500).json({
                    message: "Failed to send OTP",
                    error: error
                });
            }else{
                res.json({
                    message: "OTP sent successfully",
                    otp: randomOTP
                });
            }

            
        }
    )
}

export async function resetPassword(req,res){
    const otp  = req.body.otp
    const email = req.body.email
    const newPassword = req.body.newPassword
    console.log(otp)
    const response = await OTP.findOne({
        email : email
    })
    
    if(response==null){
        res.status(500).json({
            message : "No otp requests found please try again"
        })
        return
    }
    if(otp == response.otp){
        await OTP.deleteMany(
            {
                email: email
            }
        )
        console.log(newPassword)

        const hashedPassword = bcrypt.hashSync(newPassword, 10)      //create new password
        const response2 = await User.updateOne(
            {email : email},       //email eke inn user update wenn on
            {
                password : hashedPassword
            }
        )
        res.json({
            message : "password has been reset successfully"
        })
    }else{
        res.status(403).json({
            meassage : "OTPs are not matching!"
        })
    }

}


// Admin check (updated to allow roles starting with "admin")
export function isAdmin(req) {
    if (!req.user) return false;
    return req.user.role?.startsWith("admin");
}
