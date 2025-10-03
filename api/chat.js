import fs from "fs";
import csv from "csv-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Carregar CSV apenas uma vez
let foodData = [];

if (foodData.length === 0) {
  const loadCSV = () =>
    new Promise((resolve, reject) => {
      const data = [];
      fs.createReadStream("tbca.csv")
        .pipe(csv({ separator: "," }))
        .on("data", (row) => data.push(row))
        .on("end", () => {
          foodData = data;
          console.log("Base TBCA carregada:", foodData.length, "itens");
          resolve();
        })
        .on("error", reject);
    });

  await loadCSV();
}

function isNutritionQuery(prompt) {
  const keywords = ["caloria", "proteína", "carbo", "gordura", "nutri", "valor energético", "kcal"];
  return keywords.some((kw) => prompt.toLowerCase().includes(kw));
}

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
Alimento: ${found.Food}
Calorias: ${found.Calories} kcal
Proteínas: ${found.Protein} g
Carboidratos: ${found.Carbohydrate} g
Gorduras: ${found.Fat} g
`;
      } else {
        extraContext = `(Não encontrei esse alimento na base TBCA. Use valores médios de referência TACO/USDA.)`;
      }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(`${prompt}\n${extraContext}`);
    const text = result.response.text();

    return res.status(200).json({ reply: text });

  } catch (err) {
    console.error("ERRO:", err);
    return res.status(500).json({ error: err.message });
  }
};

export default handler;
