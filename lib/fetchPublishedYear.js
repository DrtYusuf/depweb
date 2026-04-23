const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

async function fetchPublishedYear(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
    const $ = cheerio.load(res.data);

    // Meta tag'lardan yayın tarihi
    const metas = [
      $('meta[property="article:published_time"]').attr("content"),
      $('meta[name="article:published_time"]').attr("content"),
      $('meta[property="og:published_time"]').attr("content"),
      $('meta[name="publish_date"]').attr("content"),
      $('meta[name="date"]').attr("content"),
      $("time[datetime]").first().attr("datetime"),
    ];

    for (const val of metas) {
      if (val) {
        const year = parseInt(val.slice(0, 4));
        if (year >= 2000) return year;
      }
    }

    // Meta yoksa sayfa içeriğinde yıl ara (copyright, footer vb.)
    const bodyText = $("body").text();
    const yearMatches = [...bodyText.matchAll(/\b(20\d{2})\b/g)].map((m) => parseInt(m[1]));
    if (yearMatches.length > 0) {
      // En çok geçen yılı bul
      const freq = {};
      yearMatches.forEach((y) => { freq[y] = (freq[y] || 0) + 1; });
      const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
      if (dominant) return parseInt(dominant[0]);
    }
  } catch {
    // Erişilemiyorsa göster
  }
  return null;
}

module.exports = { fetchPublishedYear };
