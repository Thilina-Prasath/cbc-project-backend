import express from "express";
import { createOrder, getOrders, updateOrderStatus } from "../contollers/orderController.js";
const orderRouter = express.Router();

orderRouter.post("/",createOrder)
orderRouter.get("/",getOrders)
orderRouter.put("/:orderId/:status",updateOrderStatus)

export default orderRouter;