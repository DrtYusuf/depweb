import { config } from "dotenv";
config({ path: ".env.local" });

import { Box } from "@upstash/box";

const boxId = process.env.BOX_ID;
if (!boxId) {
  console.error("BOX_ID eksik. .env.local dosyasına ekle.");
  process.exit(1);
}

const box = await Box.get(boxId);

// Mevcut schedule'ları sil
const existing = await box.schedule.list();
for (const s of existing) {
  await box.schedule.delete(s.id);
  console.log(`Silindi: ${s.id}`);
}

// Her gün 21:00 Türkiye saati (UTC+3 = 18:00 UTC)
const schedule = await box.schedule.exec({
  cron: "0 18 * * *",
  command: ["node", "check.js"],
});

console.log(`Schedule kuruldu: ${schedule.id}`);
console.log("Bot her gün 21:00'de çalışacak.");
