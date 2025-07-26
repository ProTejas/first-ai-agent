import axios from 'axios';
import User from '../models/user.js';
import 'dotenv/config';

// Helper: Call Gemini LLM API
async function getUserInfoFromPrompt(prompt) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key is not set in environment variables');
    }
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

    const systemPrompt = `You are a tata capital helpful assistant. If the user provides their name, email, and mobile number, extract them and respond ONLY in this JSON format: {"name": "...", "email": "...", "mobileNumber": "..."}. If any field is missing, return null for that field. If the user does not provide this information, behave like a normal tata capital chatbot and assist the user. Prompt: ${prompt}`;

    let response;
    try {
        response = await axios.post(GEMINI_API_URL, {
            contents: [{ parts: [{ text: systemPrompt }] }]
        });
    } catch (err) {
        throw new Error('Failed to call Gemini API: ' + (err.response?.data?.error?.message || err.message));
    }

    if (!response.data || !response.data.candidates || !response.data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error('Unexpected Gemini API response structure');
    }
    let text = response.data.candidates[0].content.parts[0].text;
    // Remove Markdown code block if present
    text = text.replace(/```json|```/g, '').trim();
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        // Not JSON, treat as chat reply
    }
    return { raw: text, parsed };
}

// User registration logic
async function userData(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid input: user data is required');
    }
    const { name, email, mobileNumber } = data;
    if (!name || !email || !mobileNumber) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Missing required fields: name, email, mobileNumber' }) }]
        };
    }
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
        if (existingUser) {
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: 'User with this email or mobile number already exists' }) }]
            };
        }
        // Create new user
        const newUser = new User({ name, email, mobileNumber });
        const savedUser = await newUser.save();
        return {
            content: [{ type: 'text', text: JSON.stringify({ message: 'User registered successfully', user: savedUser }) }]
        };
    } catch (error) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Internal server error', details: error.message }) }]
        };
    }
}

export { getUserInfoFromPrompt, userData };