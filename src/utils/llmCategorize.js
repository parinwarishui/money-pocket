// Calls the Netlify serverless function (netlify/functions/categorize.js)
// so the Anthropic API key never has to live in client code. Always
// resolves — on any failure every item falls back to the first category
// so the review screen still has something sane to show.
export async function categorizeTransactions(items, categoryNames) {
  try {
    const response = await fetch("/.netlify/functions/categorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        items: items.map((it) => ({
          id: it.rowId,
          description: it.description,
          amount: it.amount,
        })),
        categoryNames,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    const { results } = await response.json();
    const byId = new Map((results || []).map((r) => [r.id, r.category]));

    return {
      items: items.map((it) => {
        const guess = byId.get(it.rowId);
        return {
          ...it,
          categoryName: guess && categoryNames.includes(guess) ? guess : categoryNames[0],
        };
      }),
      error: null,
    };
  } catch (err) {
    return {
      items: items.map((it) => ({ ...it, categoryName: categoryNames[0] })),
      error: err.message,
    };
  }
}
