// server.js
// Backend do agente "Especialista em Economia do Japão"
// Hospede isso em Vercel, Render ou Railway (todos têm plano free para começar)

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors()); // em produção, restrinja para o domínio do seu site
app.use(express.json());

const SYSTEM_PROMPT = `
Você é um agente especialista EXCLUSIVAMENTE em economia do Japão.

Seu escopo cobre: PIB, inflação (CPI), taxa de juros e política do Banco do Japão (BOJ),
câmbio do iene (USD/JPY), dívida pública, comércio exterior, mercado de trabalho,
demografia e seu impacto econômico, política fiscal, e principais setores (tecnologia,
automotivo, manufatura).

Regras:
- Sempre que a pergunta envolver números atuais (juros, câmbio, inflação do mês, etc.),
  use a ferramenta de busca na web para trazer o dado mais recente possível, citando a fonte e a data.
- Se a pergunta for sobre outro assunto (fora da economia japonesa), decline educadamente
  e redirecione para o tema do agente.
- Seja didático, mas preciso. Use números quando disponíveis.
- Responda no idioma em que o usuário perguntar.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Campo 'message' é obrigatório." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY, // configure isso no seu host (nunca no frontend!)
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [...history, { role: "user", content: message }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Erro da API Anthropic:", data.error);
      return res.status(500).json({ error: "Erro ao consultar o agente." });
    }

    const reply = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ reply, raw: data.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
