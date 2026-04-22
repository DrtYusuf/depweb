const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const SOURCES = [
  // YTÜ BME
  {
    source: "ytu",
    pages: [
      { url: "https://bme.yildiz.edu.tr/etkinlikler", type: "ytu-list" },
    ],
  },
  // Boğaziçi BME
  {
    source: "bogazici",
    pages: [
      { url: "https://bme.bogazici.edu.tr/?q=events", type: "drupal-events" },
      { url: "https://bme.bogazici.edu.tr/", type: "drupal-news" },
    ],
  },
];

// YTÜ BME liste formatı (iki <a> per item, aynı href: 1. tarih, 2. başlık)
function parseYTUList($, baseUrl) {
  const raw = [];

  $('a[href^="/etkinlik/"]').each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (!text || text === "TÜMÜ") return;
    raw.push({ href, text });
  });

  const result = [];
  const seen = new Set();

  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i];
    const next = raw[i + 1];

    if (seen.has(cur.href)) continue;

    if (next && next.href === cur.href) {
      // cur = tarih, next = başlık
      seen.add(cur.href);
      const slug = cur.href.replace("/etkinlik/", "");
      result.push({
        id: `ytu_${slug}`,
        title: next.text,
        date: cur.text,
        location: "İstanbul",
        description: "",
        url: "https://bme.yildiz.edu.tr" + cur.href,
        source: "ytu",
      });
      i++; // bir sonrakini atla
    } else {
      seen.add(cur.href);
      const slug = cur.href.replace("/etkinlik/", "");
      result.push({
        id: `ytu_${slug}`,
        title: cur.text,
        date: "",
        location: "İstanbul",
        description: "",
        url: "https://bme.yildiz.edu.tr" + cur.href,
        source: "ytu",
      });
    }
  }
  return result;
}

// Drupal node tabanlı sayfalar (Boğaziçi)
function parseDrupalPage($, baseUrl, sourceKey) {
  const events = [];
  const seen = new Set();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().trim();
    if (!title || title.length < 10) return;
    // Saat formatı: "09:00", "09:00 - 15:30"
    if (/^\d{2}:\d{2}/.test(title)) return;
    // Tarih formatı: "15 Nisan 2026"
    if (/^\d{1,2}\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/i.test(title)) return;
    // Sadece rakam ve noktalama içeren başlıklar
    if (/^[\d\s:.\-–—/]+$/.test(title)) return;
    if (!href.includes("/node/") && !href.includes("/event") && !href.includes("/news")) return;

    const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).href;
    if (!fullUrl.includes(new URL(baseUrl).hostname)) return;

    const id = `${sourceKey}_${href.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}`;
    if (seen.has(id)) return;
    seen.add(id);

    const $parent = $(el).closest("article, .views-row, li, div");
    const date = $parent.find("time, .date").first().text().trim();
    const desc = $parent.find("p, .field--name-body").first().text().trim().slice(0, 200);

    events.push({ id, title, date, location: "İstanbul", description: desc, url: fullUrl, source: sourceKey });
  });

  return events;
}

async function scrapeSource({ source, pages }) {
  const results = [];

  for (const { url, type } of pages) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data);

      let events = [];
      if (type === "ytu-list") {
        events = parseYTUList($, url);
      } else {
        events = parseDrupalPage($, url, source);
      }

      results.push(...events);
    } catch (err) {
      console.error(`[${source}] ${url} hatası: ${err.message}`);
    }
    await sleep(1000);
  }

  return results;
}

async function scrape() {
  const all = [];
  for (const src of SOURCES) {
    const events = await scrapeSource(src);
    all.push(...events);
  }
  return all;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scrape };
