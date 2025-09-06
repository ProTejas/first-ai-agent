// src/utils/productQuery.js
import {Product} from "../model/db.js";

export async function fetchProductInfo(productName) {
    try {
        const product = await Product.findOne({ name: productName }).lean();
        if (!product) return `No product found with name: ${productName}`;

        return `
Product Name: ${product.name}
Eligibility: ${product.eligibility.join(", ")}
Interest Rate: ${product.interest}
Documents Required: ${product.documents.join(", ")}
    `;
    } catch (error) {
        console.error(error);
        return "Error fetching product details";
    }
}
