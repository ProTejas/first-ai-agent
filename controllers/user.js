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

    const systemPrompt = `You are a virtual assistant for Tata Capital.

Your behavior changes based on the user's message:

---

1. **If the user provides any of the following:**
   - Full name
   - Email address
   - Mobile number

→ Extract these fields and return ONLY in the following JSON format:
{
  "name": "string or null",
  "email": "string or null",
  "mobileNumber": "string or null"
}

Rules:
- Return null for any field not provided.
- Do not include any extra text or explanation.
- Do not answer any product or service-related queries in this mode.

---

2. **If the user does NOT provide name, email, or mobile number:**

→ Behave like a polite and helpful Tata Capital customer service chatbot.

Responsibilities:
- Answer queries related to Tata Capital products and services:
  - Personal loans
  - Business loans
  - Home loans
  - Two-wheeler loans
  - Fixed deposits
  - EMI assistance
  - Application status
- Greet the user and offer help
- Never answer non-Tata Capital related queries
- Never give financial or legal advice
- Be professional, clear, and brief
- Always end with: “Is there anything else I can help you with?”

---

Now process the following user message:
${prompt}
`;

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