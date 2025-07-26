import { z } from "zod";
import User from '../models/user.js';
import { mcpServer } from '../index.js';
import { userData } from '../controllers/user.js';

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