const axios = require("axios");
const FormData = require("form-data");

const BASE = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID;

function esc(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendMessage(text) {
  try {
    await axios.post(`${BASE()}/sendMessage`, {
      chat_id: CHAT_ID(),
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("Telegram hata:", err.response?.data);
    console.error("Mesaj:", text.slice(0, 200));
    throw err;
  }
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

  const text =
    `${icon} <b>${esc(event.title)}</b>\n` +
    date +
    location +
    `🔗 <a href="${event.url}">Detay</a>`;

  await sendMessage(text);
}

async function sendSummary(newEvents) {
  if (newEvents.length === 0) {
    await sendMessage(
      "🔍 <b>İstanbul BME Günlük Tarama</b>\n\nBugün yeni etkinlik bulunamadı."
    );
    return;
  }

  const header = `🔔 <b>İstanbul BME Etkinlikleri</b> — ${newEvents.length} yeni\n\n`;
  const lines = newEvents.map((e) => {
    const icon = SOURCE_ICONS[e.source] || "📌";
    const date = e.date ? ` · ${esc(e.date)}` : "";
    return `${icon} <a href="${e.url}">${esc(e.title)}</a>${date}`;
  });

  // Telegram mesaj limiti 4096 karakter, parçalara böl
  const chunks = [];
  let current = header;
  for (const line of lines) {
    if ((current + line + "\n").length > 4000) {
      chunks.push(current);
      current = "";
    }
    current += line + "\n";
  }
  if (current) chunks.push(current);

  for (const chunk of chunks) {
    await sendMessage(chunk);
  }
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
