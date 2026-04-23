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

    // Meta yoksa spesifik yayın tarih elementlerine bak
    const dateEl = $(".post-date, .entry-date, .published, .date-published, [itemprop='datePublished']").first().text().trim();
    if (dateEl) {
      const y = dateEl.match(/\b(20\d{2})\b/);
      if (y) return parseInt(y[1]);
    }
  } catch {
    // Erişilemiyorsa göster
  }
  return null;
}

module.exports = { fetchPublishedYear };
