import express from 'express';
import { getUserInfoFromPrompt, openApiPrompt, userData } from '../controllers/user.js';
import { User } from '../models/user.js';
const router = express.Router();

// POST API to register a user
router.post('/api/register', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required and must be a descriptive string.' });
    }
    try {
        const { raw, parsed } = await getUserInfoFromPrompt(prompt);
        // Check if parsed is an object with all user fields
        if (parsed && parsed.name && parsed.email && parsed.mobileNumber) {
            // Try to register user
            const result = await userData(parsed);
            const content = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
            if (content.error) {
                return res.status(400).json(content);
            }
            if (content.message === 'User registered successfully') {
                return res.status(201).json({ reply: 'Your register successful' });
            }
            return res.status(201).json(content);
        } else {
            // Not a registration, treat as chatbot reply
            return res.status(200).json({ reply: raw });
        }
    } catch (error) {
        if (error.message && error.message.includes('Gemini API key')) {
            return res.status(500).json({ error: error.message });
        }
        res.status(500).json({ error: 'LLM processing failed', details: error.message });
    }
});

router.post('/api/openai', async (req, res) => {
    const apiResponse = await openApiPrompt(req, res);
    console.log(apiResponse);
});
// GET API to fetch all users
router.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-__v');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users', details: error.message });
    }
});

export default router;

