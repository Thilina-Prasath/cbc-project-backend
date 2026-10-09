import { GoogleGenerativeAI } from "@google/generative-ai";
import Product from "../models/product.js"; // ඔයාගේ Product Model එකට අදාල නිවැරදි path එක දෙන්න

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── 1. Tools (Function Declarations) නිර්මාණය කිරීම ─────────────────────
const tools = [
    {
        functionDeclarations: [
            {
                name: "searchProducts",
                description: "Search for products in the Shopnix store. Use this when a user asks for products below a certain price, specific categories, or general item searches.",
                parameters: {
                    type: "object",
                    properties: {
                        maxPrice: {
                            type: "number",
                            description: "Maximum price of the product in Rs."
                        },
                        category: {
                            type: "string",
                            description: "Product category (e.g., 'Clothing', 'Footwear', 'Accessories', 'Sportswear')"
                        }
                    }
                }
            }
        ]
    }
];

// ── 2. Database එකෙන් දත්ත ගන්නා Function එක ─────────────────────────
async function searchProducts({ maxPrice, category }) {
    const query = {};

    // ඔයාගේ Database schema එකේ 'price' කියන නම තිබෙන පරිදි මෙය සකසා ඇත
    if (maxPrice) {
        query.price = { $lte: maxPrice };
    }
    if (category) {
        // අකුරු වල (case) වෙනස්කම් නොසලකා හැරීමට Regex භාවිතා කිරීම
        query.category = { $regex: new RegExp(category, "i") };
    }

    const products = await Product.find(query).limit(8);

    // AI එකට තේරුම් ගැනීමට පහසු වන පරිදි දත්ත සකස් කිරීම
    return products.map(p => ({
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description || "Premium product from Shopnix"
    }));
}

const availableFunctions = {
    searchProducts
};

// ── 3. ප්‍රධාන Chat Controller එක ───────────────────────────────────────
export async function handleChat(req, res) {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            systemInstruction: `You are the friendly and professional customer support assistant for 'Shopnix', a premium e-commerce platform. 
            Your guidelines:
            1. Keep your answers helpful and polite.
            2. Use the 'searchProducts' tool whenever the user asks for item recommendations, prices, or discounts.
            3. IMPORTANT: When the tool returns a list of products, SHOW ALL of them to the user using a clear bulleted list. Do not hide or summarize the products.
            4. Never invent or hallucinate product names or prices. Always rely on the tool results.
            5. Format responses clearly.`,
            tools: tools
        });

        const chat = model.startChat({ history: history || [] });

        // පරිශීලකයාගේ පණිවිඩය යැවීම
        let result = await chat.sendMessage(message);
        let response = result.response;

        // AI එක විසින් Function එකක් Call කළ යුතු දැයි පරීක්ෂා කිරීම
        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            const fn = availableFunctions[call.name];

            if (!fn) {
                throw new Error(`Unknown function requested: ${call.name}`);
            }

            // Database එක හරහා Function එක Run කිරීම
            const functionResult = await fn(call.args);

            // ලබාගත් දත්ත නැවත AI එක වෙත යැවීම
            result = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: { products: functionResult }
                }
            }]);

            response = result.response;
        }

        // අවසාන පිළිතුර ලබා ගැනීම
        const responseText = response.text();
        res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Failed to process chat request. Please try again later." });
    }
}