import express from "express";
import { chatWithBot } from "../controllers/chatBotResponse.js";
const router = express.Router();

router.post('/prompt', async (req, res) => {
    const promptRes = await chatWithBot(req, res);
    return promptRes;
});

export default router;