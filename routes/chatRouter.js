import express from 'express';
import { handleChat } from '../controllers/chatController.js';

const chatRouter = express.Router();

// POST request එකක් හරහා පණිවිඩය යැවීමට
chatRouter.post("/", handleChat);

export default chatRouter;