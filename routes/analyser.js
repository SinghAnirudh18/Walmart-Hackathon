require('dotenv').config();
const axios = require('axios');
const Product= require('../mongodb/products')

async function sortproducts(prompt) {
  const products = await Product.find();
  const simplifiedProducts = products.map(p => ({
  _id: p._id,
  name: p.title || p.name,
  brand: p.brand || null,
  category: p.category || null,
  price: p.price,
  features: p.tags || [], // or p.features if you use a separate field
}));
 const evalPrompt = `
You are an AI shopping assistant. Based on the user's prompt and the list of available products, return a list of matching product \`_id\` values.

Only return products that fit the user's budget, preferences, brand, or feature request.

User Prompt:
"${prompt}"

Products:
\`\`\`json
${JSON.stringify(simplifiedProducts, null, 2)}
\`\`\`

Rules:
- Only return a JSON array of product._id values.
- Do NOT include explanations.
- Wrap your output in a code block like:
\`\`\`json
["_id1", "_id2"]
\`\`\`
`;



  try {
    const res = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: 'mistralai/Mistral-7B-Instruct-v0.2', // You can use other Together-supported chat models
        messages: [
          {
            role: 'user',
            content: evalPrompt,
          },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        },
      }
    );

   const raw = res.data.choices[0].message.content;

// Extract JSON from inside the code block
const jsonString = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];

if (!jsonString) {
  throw new Error("Could not extract JSON from LLM output");
}

const parsed = JSON.parse(jsonString);

// Now `parsed` is a usable object
return parsed;
  } catch (error) {
    console.error('Together API error:', error.message);
    return 0;
  }
}

module.exports = {sortproducts};
