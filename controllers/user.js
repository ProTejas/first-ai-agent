import axios from 'axios';
import { User, LoanProduct } from '../models/user.js';
import 'dotenv/config';
import OpenAI from "openai";
let userDetails = { name: null, email: null, mobileNumber: null };
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

1. **If user wants to apply any thing from our products then ask the following details one by one**
   - Full name
   - Email address
   - Mobile number

2. Once you get the all details extract these fields and return ONLY in the following JSON format:
{
  "name": "string or null",
  "email": "string or null",
  "mobileNumber": "string or null"
}

---

3. **If the user does NOT provide name, email, or mobile number:**

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

// Express route handler for OpenAI prompt
async function openApiPrompt(req, res) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const conversation = [
            {
                role: "system",
                content: `You are a virtual assistant for Tata Capital.

                            Rules:
                            1. Your job is to help users register for Tata Capital products OR verify an existing user.
                            2. A registration requires:
                                - Full name
                                - Email address
                                - Mobile number
                            3. If the user gives all three details in one message, extract them immediately.
                            4. If details are missing, ask for only the missing ones politely.
                            5. Once all details are collected, return them via the "register_user" function call.
                            6. To check if a user exists, use the "verify_user" function call (only mobile number needed).
                            7. If user wants to check application status, verify first using the "verify_user" function call.
                            8. If user wants to know loan product details (interest rate, eligibility, documents, etc.), use the "read_products_details" function call (requires productType).
                            9. For non-registration queries, answer only about Tata Capital products:
                                - Personal loans
                                - Business loans
                                - Home loans
                                - Two-wheeler loans
                                - Fixed deposits
                                - EMI assistance
                                - Application status
                            Always end with: “Is there anything else I can help you with?”.`
            },
            {
                role: "user",
                content: req.body.message
            }

        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversation,
            tools: [
                {
                    type: "function",
                    function: {
                        name: "register_user",
                        description: "Register a new Tata Capital user",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                mobileNumber: { type: "string" }
                            },
                            required: ["name", "email", "mobileNumber"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "verify_user",
                        description: "Verify a Tata Capital user",
                        parameters: {
                            type: "object",
                            properties: {
                                mobileNumber: { type: "string" }
                            },
                            required: ["mobileNumber"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "read_products_details",
                        description: "Fetch details of a Tata Capital loan product",
                        parameters: {
                            type: "object",
                            properties: {
                                productType: {
                                    type: "string",
                                    enum: [
                                        "personal loan",
                                        "home loan",
                                        "car loan",
                                        "two wheeler loan",
                                        "business loan"
                                    ]
                                }
                            },
                            required: ["productType"]
                        }
                    }
                }


            ]
        });

        const message = completion.choices[0].message;

        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];

            // --- Registration handler ---
            if (toolCall.function.name === "register_user") {
                const userData = JSON.parse(toolCall.function.arguments);

                const existingUser = await User.findOne({
                    $or: [{ email: userData.email }, { mobileNumber: userData.mobileNumber }]
                });

                if (existingUser) {
                    return res.status(400).json({ reply: "User with this email or mobile already exists." });
                }

                const newUser = new User(userData);
                await newUser.save();

                return res.json({ reply: "User registered successfully." });
            }

            // --- Verification handler ---
            if (toolCall.function.name === "read_products_details") {
                let { productType } = JSON.parse(toolCall.function.arguments);
                console.log("Raw productType from model:", productType);

                // normalize: lowercase + replace spaces with hyphens
                productType = productType.toLowerCase().replace(/\s+/g, "-");
                console.log("Normalized productType:", productType);

                const productResponse = await LoanProduct.findOne({ productType });
                console.log("Product from DB:", productResponse);

                if (!productResponse) {
                    return res.json({
                        reply: `Sorry, I couldn’t find details for ${productType}.`
                    });
                }

                return res.json({
                    reply: `Here are the details for ${productResponse.name}:
                        - Interest Rate: ${productResponse.interestRate}
                        - Processing Fee: ${productResponse.processingFee}
                        - Eligibility: ${productResponse.eligibility}
                        - Documents Required: ${productResponse.documents.join(", ")}
                        - Description: ${productResponse.description}

                        Is there anything else I can help you with?`
                });
            }




            if (toolCall.function.name === "verify_user") {
                const { mobileNumber } = JSON.parse(toolCall.function.arguments);

                const user = await User.findOne({ mobileNumber });

                if (!user) {
                    return res.json({ reply: "No user found with this mobile number." });
                }

                return res.json({
                    reply: `User verified successfully. Name: ${user.name}, Email: ${user.email}, Mobile: ${user.mobileNumber}`
                });
            }
        }

        // Normal assistant reply
        return res.json({ reply: message.content });

    } catch (error) {
        console.error("Error in openApiPrompt:", error);
        res.status(500).json({ error: "Error processing your request" });
    }
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

export { getUserInfoFromPrompt, userData, openApiPrompt };