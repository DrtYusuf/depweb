const axios = require("axios");
const FormData = require("form-data");

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID;

function esc(text) {
  return String(text || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendMessage(text) {
  await axios.post(`${BASE()}/sendMessage`, {
    chat_id: CHAT_ID(),
    text,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  });
}

const SOURCE_ICONS = {
  eventbrite: "🎟",
  meetup: "👥",
  ieee: "⚡",
  bogazici: "🎓",
  ytu: "🏛",
};

async function sendEvent(event) {
  const icon = SOURCE_ICONS[event.source] || "📌";
  const sourceLabel = {
    eventbrite: "Eventbrite",
    meetup: "Meetup",
    ieee: "IEEE EMBS TR",
    bogazici: "Boğaziçi BME",
    ytu: "YTÜ BME",
  }[event.source] || event.source;

  const date = event.date ? `📅 ${esc(event.date)}\n` : "";
  const location = event.location ? `📍 ${esc(event.location)}\n` : "";
  const desc = event.description
    ? `\n${esc(event.description.slice(0, 300))}${event.description.length > 300 ? "\\.\\.\\." : ""}`
    : "";

  const text =
    `${icon} *${esc(event.title)}*\n` +
    date +
    location +
    `🏷 ${esc(sourceLabel)}` +
    desc +
    `\n\n🔗 [Detay](${event.url})`;

  await sendMessage(text);
}

async function sendSummary(newEvents) {
  if (newEvents.length === 0) {
    await sendMessage(
      "🔍 *İstanbul BME Günlük Tarama*\n\nBugün yeni etkinlik bulunamadı\\."
    );
    return;
  }

  const text =
    `🔔 *İstanbul BME Etkinlikleri* — ${newEvents.length} yeni\n\n` +
    newEvents.map((e) => `• ${esc(e.title)}`).join("\n");

  await sendMessage(text);
}

async function sendDocument(fileUrl, caption, fileName) {
  const response = await axios.get(fileUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const form = new FormData();
  form.append("chat_id", CHAT_ID());
  form.append("document", Buffer.from(response.data), {
    filename: fileName || "dosya",
    contentType: response.headers["content-type"] || "application/octet-stream",
  });
  form.append("caption", caption.slice(0, 1024));
  await axios.post(`${BASE()}/sendDocument`, form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });
}

module.exports = { sendEvent, sendSummary, sendDocument };
