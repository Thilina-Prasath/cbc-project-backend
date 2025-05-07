import express from 'express';
import { createUser, loginUser } from '../contollers/userController.js';

const userRouter = express.Router();

userRouter.post("/",createUser);  //localhost:3000/user kiyl request ekk awoth mek run weno
userRouter.post("/login", loginUser)  //localhost:3000/user/login kiyl request ekk awoth mek run weno  and norml login sdh use krnne post ek

export default userRouter;