import { tool } from "@openai/agents";
// import { Product } from "../model/db.js";
import { fetchProductInfo } from "../utils/productQuery.js";

export const getProductInfoTool = tool({
    name: "get_product_info",
    description: "If user searches or queries for any product, call this tool and give exact informatiom provide in this tool",
    parameters: {
        type: "object",
        properties: {
            productName: { type: "string" }
        },
        required: ["productName"],
        additionalProperties: false
    },
    func: async ({ productName }) => {
        return await fetchProductInfo(productName);
    }
});
