const axios = require("axios");

const QUERIES = [
  "biyomedikal mühendislik etkinlik seminer İstanbul 2026",
  "biomedical engineering event seminar Istanbul 2026",
  "IEEE EMBS İstanbul etkinlik 2026",
  "YTÜ BME Boğaziçi BME etkinlik seminer 2026",
  "sağlık teknoloji medikal etkinlik konferans İstanbul 2026",
];

async function scrape() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const allResults = [];
  const seenUrls = new Set();

  for (const query of QUERIES) {
    try {
      const res = await axios.post(
        "https://api.tavily.com/search",
        {
          query,
          search_depth: "basic",
          max_results: 5,
          include_answer: false,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 15000,
        }
      );

      for (const item of res.data.results || []) {
        if (seenUrls.has(item.url)) continue;
        seenUrls.add(item.url);

        // Başlık ve içerikten tarih çıkar
        const text = `${item.title} ${item.content || ""}`;
        const dateMatch = text.match(
          /\d{1,2}\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}/i
        ) || text.match(/20\d{2}-\d{2}-\d{2}/) || text.match(/\d{1,2}\.\d{1,2}\.20\d{2}/);

        allResults.push({
          id: `tavily_${Buffer.from(item.url).toString("base64").slice(0, 20)}`,
          title: item.title,
          date: dateMatch ? dateMatch[0] : "",
          location: "",
          description: (item.content || "").slice(0, 200),
          url: item.url,
          source: "tavily",
        });
      }
    } catch (err) {
      console.error(`[Tavily] "${query}" hatası: ${err.message}`);
    }
  }

  return allResults;
}

module.exports = { scrape };
