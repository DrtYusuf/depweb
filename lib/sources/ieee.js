const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

// IEEE EMBS Turkey + IEEE Turkey genel etkinlikler
const PAGES = [
  { url: "https://embs.ieee.org.tr/events/", prefix: "ieee_embs" },
  { url: "https://embs.ieee.org.tr/embcon/", prefix: "ieee_embcon" },
  { url: "https://embs.ieee.org.tr/webed/", prefix: "ieee_webed" },
  { url: "https://www.ieee.org.tr/", prefix: "ieee_tr" },
];

function parseEvents($, baseUrl, prefix) {
  const events = [];

  // Genel event/article/post link pattern'leri dene
  const selectors = [
    "article", ".event", ".post", ".tribe-event",
    ".entry", ".wp-block-post", ".elementor-post",
    "h2 a", "h3 a", ".entry-title a",
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      let title = "", href = "";

      if (sel.endsWith(" a")) {
        title = $el.text().trim();
        href = $el.attr("href") || "";
      } else {
        title = $el.find("h2, h3, h4, .entry-title, .tribe-events-list-event-title").first().text().trim();
        href = $el.find("a").first().attr("href") || "";
      }

      if (!title || title.length < 5) return;

      const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
      const date = $el.find(".date, time, .tribe-event-schedule-details, .entry-date").first().text().trim();
      const desc = $el.find("p, .excerpt, .entry-summary").first().text().trim().slice(0, 200);

      const id = `${prefix}_${Buffer.from(fullUrl).toString("base64").slice(0, 20)}`;
      events.push({ id, title, date, location: "Online/Türkiye", description: desc, url: fullUrl, source: "ieee" });
    });

    if (events.length > 0) break;
  }

  // Fallback: tüm linkleri tara, etkinlik gibi görünenleri al
  if (events.length === 0) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().trim();
      if (
        title.length < 5 ||
        href.includes("mailto") ||
        href.includes("tel:") ||
        href === "/" ||
        href === "#"
      ) return;

      const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
      // Sadece bu domain'deki linkleri al
      if (!fullUrl.includes(new URL(baseUrl).hostname)) return;

      const id = `${prefix}_${Buffer.from(fullUrl).toString("base64").slice(0, 20)}`;
      events.push({ id, title, date: "", location: "Online/Türkiye", description: "", url: fullUrl, source: "ieee" });
    });
  }

  // Deduplicate by id
  const seen = new Set();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

async function scrape() {
  const all = [];

  for (const { url, prefix } of PAGES) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data);
      const events = parseEvents($, url, prefix);
      all.push(...events);
    } catch (err) {
      console.error(`[IEEE] ${url} hatası: ${err.message}`);
    }
    await sleep(1000);
  }

  return all;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scrape };
