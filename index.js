import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/mcp_users')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('Users', userSchema);

// Create MCP Server
const mcpServer = new McpServer({
  name: "User Registration Server",
  version: "1.0.0"
});
// Helper: Call Gemini LLM API
async function getUserInfoFromPrompt(prompt) {
  const GEMINI_API_KEY = "AIzaSyCIV6sntXWa8lWTRp-02wkbYgurSX2JwI4";
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not set in environment variables');
  }
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY;

  const systemPrompt = `You are a helpful assistant. If the user provides their name, email, and mobile number, extract them and respond ONLY in this JSON format: {"name": "...", "email": "...", "mobileNumber": "..."}. If any field is missing, return null for that field. If the user does not provide this information, behave like a normal chatbot and assist the user. Prompt: ${prompt}`;

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

// POST API to register a user
app.post('/api/register', async (req, res) => {
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

// 📌 Register User
mcpServer.tool('registerUser', {
  name: z.string(),
  email: z.string().email(),
  mobileNumber: z.string()
}, userData
);

// 📖 Get All Users
mcpServer.tool('getAllUsers', {}, async () => {
  try {
    const users = await User.find({}, '-__v');
    return {
      content: [{ type: 'text', text: JSON.stringify(users) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'Error fetching users', details: error.message }) }]
    };
  }
});

// GET API to fetch all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-__v');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Express server is running on port ${PORT}`);
});

// Initialize MCP server
async function initMcpServer() {
  console.log('Initializing MCP server...');
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('MCP Server is running');
}

initMcpServer();
