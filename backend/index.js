import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import jwt from 'jsonwebtoken';
import orderRouter from './routes/orderRoute.js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();  //mekn wenne .env file eke thiyen ek mekt load weno

const app = express();

app.use(cors());  //postman ekk thiyen connection ek nethi krgnn
app.use(bodyParser.json());
                

app.use(
    (req,res,next) =>{  // next use krnne request ek gelpen kent ywnn kiyl
    const tokenString = req.header("Authorization")
     if(tokenString != null) {
         const token = tokenString.replace("Bearer",""). trim();
    //console.log (token);

    jwt.verify(token, process.env.JWT_KEY,
        (err, decoded) => {
            if (decoded != null){
                req.user = decoded
                next()
            }else{
                console.log("token invalid");
                res.status(403).json({message: "Invalid token"});
     } }) 
            } else {
                next (); 
    }
    
})


mongoose.connect(process.env.MONGODB_URL).then(()=>{
    console.log("Connected to MongoDB");
}).catch(()=>{
    console.log("connecting faile MongoDB");
})


app.use("/api/products",productRouter);
app.use("/api/users",userRouter);
app.use("/api/orders",orderRouter);

app.listen(3000,() => {
    console.log("Server is running on port 3000");
})