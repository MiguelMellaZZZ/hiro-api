import { GoogleGenerativeAI } from "@google/generative-ai";

const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  return await fn(req, res)
}

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
    
    // --- MUDANÇA NA LÓGICA A PARTIR DAQUI ---

    // Usaremos o modelo mais recente e recomendado
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Inicia uma sessão de chat (não mantém o histórico neste caso, mas usa o método correto)
    const chat = model.startChat();

    // Envia a mensagem do usuário para a sessão de chat
    const result = await chat.sendMessage(prompt);
    
    const response = result.response;
    const text = response.text();
    
    // --- FIM DA MUDANÇA NA LÓGICA ---

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("ERRO NA FUNÇÃO:", err); 
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

export default allowCors(handler)