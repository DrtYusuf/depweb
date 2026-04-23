const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9",
};

const QUERIES = [
  "biyomedikal",
  "biomedical",
  "medikal mühendislik",
  "sağlık teknoloji",
  "bme",
];

async function scrape() {
  const allResults = [];
  const seenIds = new Set();

  for (const query of QUERIES) {
    try {
      const url = `https://www.kongreuzmani.com/2026/?arama=${encodeURIComponent(query)}`;
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data);

      $("a.kongre").each((_, el) => {
        const $el = $(el);
        const href = $el.attr("href") || "";
        const title = $el.find("h2.baslik").text().trim();
        const tarihText = $el.find("p.tarih").text().trim();

        if (!title || !href) return;

        // "05 Kasım - 08 Kasım 2026, Antalya" → tarih + şehir
        const commaIdx = tarihText.lastIndexOf(",");
        const dateRaw = commaIdx > -1 ? tarihText.slice(0, commaIdx).trim() : tarihText;
        const location = commaIdx > -1 ? tarihText.slice(commaIdx + 1).trim() : "";

        // Aralık formatından bitiş tarihi al: "05 Kasım - 08 Kasım 2026"
        const dateParts = dateRaw.split("-").map((s) => s.trim());
        const date = dateParts[dateParts.length - 1]; // son parça yılı içeriyor

        const fullUrl = href.startsWith("http")
          ? href
          : `https://www.kongreuzmani.com/${href}`;

        const id = `kongreuzmani_${href.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        allResults.push({
          id,
          title,
          date,
          location,
          description: "",
          url: fullUrl,
          source: "kongreuzmani",
        });
      });
    } catch (err) {
      console.error(`[KongreUzmani] "${query}" hatası: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return allResults;
}

module.exports = { scrape };
