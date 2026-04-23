import { config } from "dotenv";
config({ path: ".env.local" });

import { Box } from "@upstash/box";
import fs from "fs";

const BOX_ID_FILE = ".box-id";

const FILES = [
  "check.js",
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

  // Mevcut box varsa sil, yenisini oluştur
  const existingId = readBoxId();
  if (existingId) {
    console.log(`Eski box temizleniyor: ${existingId}`);
    try {
      const old = await Box.get(existingId);
      await old.delete();
    } catch {}
    fs.unlinkSync(BOX_ID_FILE);
  }

  console.log("Yeni box oluşturuluyor...");
  const box = await Box.create({ runtime: "node", keepAlive: true });
  saveBoxId(box.id);
  console.log(`Box oluşturuldu: ${box.id}`);

  // .env dosyasını box'a yaz
  console.log("Ortam değişkenleri yazılıyor...");
  await box.files.write({ path: ".env", content: buildEnv() });

  // Dosyaları yükle
  console.log("Dosyalar yükleniyor...");
  await box.files.upload(FILES.map((f) => ({ path: f, destination: f })));

  // Bağımlılık yükle
  console.log("npm install çalışıyor...");
  const install = await box.exec.command("npm install --production 2>&1");
  console.log(install.result || "OK");

  // Schedule kur (her 8 saatte bir)
  console.log("Schedule kuruluyor...");
  const schedule = await box.schedule.exec({
    cron: "0 */8 * * *",
    command: ["node", "check.js"],
  });
  console.log(`Schedule: ${schedule.id}`);

  console.log("\nDeploy tamamlandı!");
  console.log(`Box ID: ${box.id}`);
  console.log("Bot her 8 saatte bir etkinlikleri tarayacak.");
}

function checkEnv() {
  const required = ["UPSTASH_BOX_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Eksik değişkenler:", missing.join(", "));
    process.exit(1);
  }
}

function buildEnv() {
  const keys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"];
  return keys.map((k) => `${k}=${process.env[k]}`).join("\n");
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
