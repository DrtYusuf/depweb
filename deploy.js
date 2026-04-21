/**
 * Botu Upstash Box'a deploy eder.
 * Kullanım: node deploy.js
 */

require("dotenv").config({ path: ".env.local" });

const { Box } = require("@upstash/box");
const fs = require("fs");

const BOX_ID_FILE = ".box-id";

// Deploy edilecek dosyalar
const FILES = [
  "index.js",
  "package.json",
  "lib/filter.js",
  "lib/redis.js",
  "lib/telegram.js",
  "lib/sources/eventbrite.js",
  "lib/sources/meetup.js",
  "lib/sources/ieee.js",
  "lib/sources/universities.js",
];

async function main() {
  checkEnv();

  let box;
  const existingId = readBoxId();

  if (existingId) {
    console.log(`Mevcut box kullanılıyor: ${existingId}`);
    box = await Box.connect(existingId);
  } else {
    console.log("Yeni box oluşturuluyor...");
    box = await Box.create({ runtime: "node", keepAlive: true });
    saveBoxId(box.id);
    console.log(`Box oluşturuldu: ${box.id}`);
  }

  // .env dosyasını box'a yaz
  console.log("Ortam değişkenleri yazılıyor...");
  await box.files.write({ path: ".env", content: buildEnv() });

  // Dosyaları yükle
  console.log("Dosyalar yükleniyor...");
  const uploads = FILES.map((f) => ({ path: f, destination: f }));
  await box.files.upload(uploads);

  // Bağımlılık yükle
  console.log("npm install çalışıyor...");
  const install = await box.exec.command("npm install --production 2>&1");
  console.log(install.stdout || "OK");

  // PM2 kur
  console.log("PM2 kuruluyor...");
  await box.exec.command("npm install -g pm2 2>&1");

  // Önceki instance'ı durdur
  await box.exec.command("pm2 delete bme-istanbul-bot 2>/dev/null; true");

  // Botu başlat
  console.log("Bot başlatılıyor...");
  const start = await box.exec.command(
    "pm2 start index.js --name bme-istanbul-bot --time && pm2 save"
  );
  console.log(start.stdout || "OK");

  const status = await box.exec.command("pm2 list");
  console.log("\n" + (status.stdout || ""));
  console.log("✅ Deploy tamamlandı!");
  console.log(`Box ID: ${box.id}`);
  console.log("Bot her gün 20:00'de İstanbul BME etkinliklerini tarayacak.");
}

function checkEnv() {
  const required = [
    "UPSTASH_BOX_API_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Eksik değişkenler:", missing.join(", "));
    console.error(".env.local dosyasını doldurun.");
    process.exit(1);
  }
}

function buildEnv() {
  const keys = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "RUN_ON_START",
  ];
  return keys.filter((k) => process.env[k]).map((k) => `${k}=${process.env[k]}`).join("\n");
}

function readBoxId() {
  try { return fs.readFileSync(BOX_ID_FILE, "utf8").trim(); } catch { return null; }
}

function saveBoxId(id) {
  fs.writeFileSync(BOX_ID_FILE, id);
}

main().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
