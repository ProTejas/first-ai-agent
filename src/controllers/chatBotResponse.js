import 'dotenv/config'
import { Agent, run } from '@openai/agents';
import { registerUserTool } from '../tools/registerUserTool.js';
import { getProductInfoTool } from '../tools/productQueryTool.js';
import { fetchProductInfo } from '../utils/productQuery.js';

// 4. Create Agent with Tool
const agent = new Agent({
    name: 'Tejas Financial Services Bot',
    instructions: `
You are a customer service representative of Tejas Financial Services.
- Always use the product info provided in the context.
- Do NOT generate or guess interest rates or eligibility.
- Do NOT paraphrase or change numbers.
- Only answer based on the product info included in the prompt.
- Keep context from previous chats.
`
    ,
    tools: [registerUserTool, getProductInfoTool],
});

// 5. Run agent
const chatHistories = {}; // { userId: [ { role, content } ] }

async function chatWithBot(req, res) {
    try {
        const { message, userId } = req.body;
        if (!message || !userId) {
            return res.status(400).json({ error: "Message and userId are required" });
        }

        if (!chatHistories[userId]) chatHistories[userId] = [];

        chatHistories[userId].push({ role: "user", content: message });
        // Inside chatWithBot
        let productInfo = "";
        if (message.toLowerCase().includes("home loan")) {
            productInfo = await fetchProductInfo("Home Loan");
        } else if (message.toLowerCase().includes("personal loan")) {
            productInfo = await fetchProductInfo("Personal Loan");
        } else if (message.toLowerCase().includes("two-wheeler loan")) {
            productInfo = await fetchProductInfo("Two-Wheeler Loan");
        }
        const prompt = chatHistories[userId].map(m => `${m.role}: ${m.content}`).join("\n") + "\n\nProduct Info:\n" + productInfo;

        const result = await run(agent, prompt);

        if (!result) return res.status(500).json({ error: "No response from agent" });

        chatHistories[userId].push({ role: "assistant", content: result.finalOutput });

        return res.status(200).json({
            success: true,
            response: result.finalOutput,
        });

    } catch (error) {
        console.error("chatbot error:", error);
        return res.status(500).json({ error: "Something went wrong" });
    }
}


export { chatWithBot }