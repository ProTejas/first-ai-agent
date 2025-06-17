import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 2000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/mcp_users')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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
  const { name, email, mobileNumber } = req.body;
  if (!name || !email || !mobileNumber) {
    return res.status(400).json({ error: 'Missing required fields: name, email, mobileNumber' });
  }
  const result = await userData({ name, email, mobileNumber });
  const content = result.content && result.content[0] && result.content[0].text ? JSON.parse(result.content[0].text) : result;
  if (content.error) {
    return res.status(400).json(content);
  }
  res.status(201).json(content);
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
