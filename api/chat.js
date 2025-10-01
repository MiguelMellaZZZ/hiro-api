// /hiro-api/api/chat.js

import { GoogleGenerativeAI } from "@google/generative-ai";

// Esta função de helper define os cabeçalhos CORS
// e lida com a requisição 'preflight' OPTIONS
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*') // Permite qualquer origem
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  // Se for uma requisição OPTIONS, apenas retorne 200 OK.
  // O navegador faz isso antes do POST real para verificar a permissão.
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return await fn(req, res)
}

// A sua lógica principal agora fica aqui dentro
const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed, please use POST" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ reply: text });

  } catch (err) {
    // Adiciona um log mais detalhado para vermos no painel da Vercel
    console.error("ERRO NA FUNÇÃO:", err); 
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

// Exportamos a nossa lógica "embrulhada" pela função de CORS
export default allowCors(handler)