const axios = require("axios");
const { isBMERelevant, isIstanbulOrOnline } = require("../filter");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
};

const KEYWORDS = [
  "biyomedikal",
  "biomedical",
  "biomedical engineering",
  "medical device",
  "health tech",
  "medikal muhendislik",
  "biyoteknoloji",
];

// Meetup search sayfasından Apollo state'ini parse et
function parseApolloState(html) {
  try {
    // __APOLLO_STATE__ veya window.__data__ içinde event listesi
    const match =
      html.match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\})\s*;?\s*<\/script>/s) ||
      html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>(\{.+?\})<\/script>/s);

    if (!match) return [];

    const data = JSON.parse(match[1]);

    // Meetup'ın GraphQL state yapısı
    const events = [];
    for (const [key, val] of Object.entries(data)) {
      if (
        key.startsWith("Event:") &&
        val.title &&
        val.eventUrl
      ) {
        events.push(val);
      }
    }
    return events;
  } catch {
    return [];
  }
}

function mapEvent(raw) {
  const venue = raw.venue;
  const location = venue
    ? [venue.name, venue.city].filter(Boolean).join(", ")
    : raw.isOnline ? "Online" : "";

  const dateTime = raw.dateTime || raw.startTime || "";
  const date = dateTime ? new Date(dateTime).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }) : "";

  return {
    id: `meetup_${raw.id}`,
    title: raw.title || raw.name || "",
    date,
    location,
    description: raw.description || "",
    url: raw.eventUrl || "",
    source: "meetup",
  };
}

async function scrape() {
  const seen = new Set();
  const results = [];

  for (const kw of KEYWORDS) {
    try {
      const url = `https://www.meetup.com/find/?keywords=${encodeURIComponent(kw)}&location=Istanbul%2C+Turkey&source=EVENTS`;
      const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const rawEvents = parseApolloState(res.data);

      for (const raw of rawEvents) {
        const event = mapEvent(raw);
        if (!event.id || seen.has(event.id)) continue;

        const fullText = [event.title, event.description, event.location].join(" ");
        if (isIstanbulOrOnline(fullText)) {
          seen.add(event.id);
          results.push(event);
        }
      }
    } catch (err) {
      console.error(`[Meetup] "${kw}" hatası: ${err.message}`);
    }

    await sleep(1500);
  }

  return results;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { scrape };
