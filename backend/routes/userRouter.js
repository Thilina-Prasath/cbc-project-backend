import express from 'express';
import { createUser, loginUser, loginWithGoogle, resetPassword, sendOTP } from '../contollers/userController.js';

const userRouter = express.Router();

userRouter.post("/",createUser);  //localhost:3000/user kiyl request ekk awoth mek run weno
userRouter.post("/login", loginUser)  //localhost:3000/user/login kiyl request ekk awoth mek run weno  and norml login sdh use krnne post ek
userRouter.post("/login/google",loginWithGoogle)
userRouter.post("/send-otp",sendOTP) //localhost:3000/user/send-otp kiyl request ekk
userRouter.post("/reset-password",resetPassword)

export default userRouter;