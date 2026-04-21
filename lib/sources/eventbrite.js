const axios = require("axios");
const { isBMERelevant, isIstanbulOrOnline } = require("../filter");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

// Eventbrite İstanbul'da aranacak sayfalar
// window.__SERVER_DATA__ içinde event listesi geliyor
const PAGES = [
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/health/",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/science-and-tech--events/",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/events/?q=biyomedikal",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/events/?q=biomedical",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/events/?q=medikal+muhendislik",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/events/?q=health+tech",
  "https://www.eventbrite.com/d/turkey--istanbul--85679237/events/?q=saglik+teknoloji",
];

function parseServerData(html) {
  try {
    const match = html.match(/window\.__SERVER_DATA__\s*=\s*(\{.+?\})\s*(?:;?\s*<\/script>|\n)/s);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    return data?.search_data?.events?.results || [];
  } catch {
    return [];
  }
}

function mapEvent(raw) {
  const start = raw.start_date || raw.start?.local || "";
  const venue = raw.primary_venue;
  const location = venue
    ? [venue.name, venue.address?.city].filter(Boolean).join(", ")
    : (raw.is_online_event ? "Online" : "");

  return {
    id: `eventbrite_${raw.id || raw.eid}`,
    title: raw.name || raw.title || "",
    date: start ? start.slice(0, 16).replace("T", " ") : "",
    location,
    description: raw.summary || raw.description?.text || "",
    url: raw.url || `https://www.eventbrite.com/e/${raw.id}`,
    source: "eventbrite",
  };
}

async function scrape() {
  const seen = new Set();
  const results = [];

  for (const url of PAGES) {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const rawEvents = parseServerData(res.data);

      for (const raw of rawEvents) {
        const event = mapEvent(raw);
        if (seen.has(event.id)) continue;

        const fullText = [event.title, event.description, event.location].join(" ");
        if (isBMERelevant(fullText) && isIstanbulOrOnline(fullText)) {
          seen.add(event.id);
          results.push(event);
        }
      }
    } catch (err) {
      console.error(`[Eventbrite] ${url} hatası: ${err.message}`);
    }

    await sleep(1000);
  }

  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scrape };
