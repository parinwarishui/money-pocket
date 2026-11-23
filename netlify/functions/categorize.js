// Serverless proxy: keeps the Anthropic API key on the server side.
// The browser never sees it — only this function does, via the
// ANTHROPIC_API_KEY environment variable set in Netlify's dashboard
// (Site settings -> Environment variables).

const MODEL = "claude-haiku-5-5";

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "ANTHROPIC_API_KEY is not set on this Netlify site.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { items, categoryNames } = payload;
  if (!Array.isArray(items) || items.length === 0 || !Array.isArray(categoryNames)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Expected { items: [...], categoryNames: [...] }" }),
    };
  }

  const listForPrompt = items
    .map((it) => `${it.id} | ${it.description || "(no description)"} | ${it.amount}`)
    .join("\n");

  const prompt = `You are categorizing personal bank transactions into a fixed set of spending categories.

Categories (choose exactly one per transaction, spelled exactly as given):
${categoryNames.map((c) => `- ${c}`).join("\n")}

Transactions (format: id | description | amount):
${listForPrompt}

Reply with ONLY a JSON array, no other text, no markdown fences. Each element: {"id": "<the transaction's id>", "category": "<one of the category names above, exact spelling>"}.`;

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Could not reach the Claude API: " + err.message }),
    };
  }

  if (!response.ok) {
    const text = await response.text();
    return { statusCode: 502, body: JSON.stringify({ error: "Claude API error: " + text }) };
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text || "";

  let results;
  try {
    const cleaned = text
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();
    results = JSON.parse(cleaned);
  } catch {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Could not parse the model's response as JSON", raw: text }),
    };
  }

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ results }),
  };
};
