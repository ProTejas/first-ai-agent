import { tool } from "@openai/agents";
import { User } from "../model/db.js";

// 3. Define Tool
export const registerUserTool = tool({
    name: 'register_user',
    description: 'Extract name, mobile number, and email and save them to DB.',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            mobileNumber: { type: 'string' },
            email: { type: 'string' }
        },
        required: ['name', 'mobileNumber', 'email'],
        additionalProperties: false
    },
    execute: async ({ name, mobileNumber, email }) => {
        const newUser = new User({ name, mobileNumber, email });
        await newUser.save();
        return { success: true, message: 'User saved successfully!', data: newUser };
    }
});