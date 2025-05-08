import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import jwt from 'jsonwebtoken';
import orderRouter from './routes/orderRoute.js';

const app = express();

app.use(bodyParser.json());

app.use(
    (req,res,next) =>{  // next use krnne request ek gelpen kent ywnn kiyl
    const tokenString = req.header("Authorization")
     if(tokenString != null) {
         const token = tokenString.replace("Bearer",""). trim();
    //console.log (token);

    jwt.verify(token, "cbc-batch-five#@2025",
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


mongoose.connect("mongodb+srv://admin:123@cluster0.01ctqht.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0").then(()=>{
    console.log("Connected to MongoDB");
}).catch(()=>{
    console.log("connecting faile MongoDB");
})


app.use("/products",productRouter);
app.use("/users",userRouter);
app.use("/orders",orderRouter);

app.listen(3000,() => {
    console.log("Server is running on port 3000");
})