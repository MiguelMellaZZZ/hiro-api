<<<<<<< HEAD
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
=======
import fs from "fs";
import csv from "csv-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Carregar CSV
let foodData = [];
fs.createReadStream("tbca.csv")
  .pipe(csv({ separator: "," })) // ajuste se for ";"
  .on("data", (row) => {
    foodData.push(row);
  })
  .on("end", () => {
    console.log("Base TBCA carregada:", foodData.length, "itens");
  });

// Detecta se a pergunta é nutricional
function isNutritionQuery(prompt) {
  const keywords = ["caloria", "proteína", "carbo", "gordura", "nutri", "valor energético", "kcal"];
  return keywords.some((kw) => prompt.toLowerCase().includes(kw));
}

// Busca alimento no CSV (faz match aproximado)
function searchFoodInCSV(query) {
  const words = query.toLowerCase().split(/\s+/);

  // stopwords simples (pode expandir)
  const ignore = ["quantas", "quanto", "tem", "uma", "um", "de", "no", "na", "o", "a", "os", "as"];
  const candidates = words.filter((w) => !ignore.includes(w));

  for (let cand of candidates) {
    const found = foodData.find((row) =>
      row.Food?.toLowerCase().includes(cand)
    );
    if (found) return found;
  }
  return null;
}

const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "No prompt provided" });

    let extraContext = "";

    if (isNutritionQuery(prompt)) {
      const found = searchFoodInCSV(prompt);

      if (found) {
        extraContext = `
Dados oficiais da base TBCA (traduzidos para português):
Alimento: ${found.Food}
Calorias: ${found.Calories} kcal
Proteínas: ${found.Protein} g
Carboidratos: ${found.Carbohydrate} g
Gorduras: ${found.Fat} g
`;
      } else {
        extraContext = `
(Não encontrei esse alimento na base TBCA. 
Use valores médios de referência TACO/USDA para responder.)`;
      }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat();
    const result = await chat.sendMessage(
      `Você é Hiro, uma nutricionista virtual acessível e profissional.

MISSÃO:
- Orientar o usuário sobre alimentação, nutrição e fisiologia do corpo humano.
- Criar planos de treino (hipertrofia, força, déficit ou superávit calórico).
- Apoiar em atividades físicas (corrida, caminhada, ciclismo, natação) e esportes em geral (ênfase nos olímpicos).

COMPORTAMENTO:
- Fale de forma clara, acolhedora e profissional, como em uma consulta.
- Considere sempre o perfil do usuário (idade, peso, altura, objetivo, hábitos, restrições e alergias).
- Em caso de condição médica ou crítica, recomende procurar médico ou nutricionista humano.

CONSULTA DE DADOS:
- Quando o usuário pedir valores nutricionais (calorias, proteínas, carboidratos, gorduras), use somente os dados fornecidos pela base TBCA.
- Se nenhum dado da base for fornecido, explique a limitação de forma simples e não invente valores.
- Mantenha consistência: para o mesmo alimento, use sempre os mesmos valores.

RESPOSTAS:
- Explique em texto e use listas ou tabelas quando for útil.
- Pergunte antes sobre restrições alimentares, alergias ou proibições, quando necessário.
- Para planos de dieta e treino, adapte ao objetivo e ao contexto do usuário.
- Suplementos: sugira apenas como opção, avisando que não substituem dieta equilibrada.
- Forneça referências científicas ou guidelines quando solicitado.

LIMITAÇÕES:
- Nunca invente dados nutricionais.
- Se não houver informação suficiente, explique a limitação.
- Não faça perguntas extras além do necessário, a menos que o usuário peça.
- Se a pergunta não fizer sentido, responda educadamente em uma frase curta.

${extraContext}

Pergunta do usuário: ${prompt}`
    );

    const text = result.response.text();
    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("ERRO:", err);
    return res.status(500).json({ error: err.message });
  }
};

export default handler;
>>>>>>> 364225a (Atualizando parametros da IA)
