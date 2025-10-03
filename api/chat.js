import fs from "fs";
import csv from "csv-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Carregar CSV
let foodData = [];
fs.createReadStream("tbca.csv")
  .pipe(csv({ separator: "," }))
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

// Busca alimento no CSV
function searchFoodInCSV(query) {
  const words = query.toLowerCase().split(/\s+/);
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
Dados oficiais da base TBCA:
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
