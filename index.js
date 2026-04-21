/**
 * İstanbul Biyomedikal Mühendisliği Etkinlik Botu
 * Her gün 20:00 (Türkiye) yeni etkinlik varsa Telegram'a gönderir.
 */

require("dotenv").config();

const cron = require("node-cron");
const { filterNew, markSeen } = require("./lib/redis");
const { sendEvent, sendSummary } = require("./lib/telegram");
const { isRelevant } = require("./lib/filter");

const eventbrite = require("./lib/sources/eventbrite");
const meetup = require("./lib/sources/meetup");
const ieee = require("./lib/sources/ieee");
const universities = require("./lib/sources/universities");

async function check() {
  console.log(`\n[${new Date().toISOString()}] Tarama başladı...`);

  try {
    // Tüm kaynakları paralel tara
    const [eb, mu, ie, uni] = await Promise.allSettled([
      eventbrite.scrape(),
      meetup.scrape(),
      ieee.scrape(),
      universities.scrape(),
    ]);

    const extract = (r, name) => {
      if (r.status === "fulfilled") {
        console.log(`  ${name}: ${r.value.length} etkinlik`);
        return r.value;
      } else {
        console.error(`  ${name} HATA: ${r.reason?.message}`);
        return [];
      }
    };

    const all = [
      ...extract(eb, "Eventbrite"),
      ...extract(mu, "Meetup"),
      ...extract(ie, "IEEE"),
      ...extract(uni, "Üniversiteler"),
    ];

    console.log(`Toplam: ${all.length} etkinlik bulundu`);

    // Üniversite dışındaki kaynaklar için BME filtresi uygula
    // (üniversite sayfaları zaten BME bölümlerine ait)
    const relevant = all.filter((e) =>
      ["ytu", "bogazici", "ieee"].includes(e.source) ? true : isRelevant(e)
    );

    console.log(`Filtrelenmiş: ${relevant.length} ilgili etkinlik`);

    // Daha önce gönderilmemişleri bul
    const newEvents = await filterNew(relevant);
    console.log(`Yeni: ${newEvents.length} etkinlik`);

    // Özet gönder
    await sendSummary(newEvents);

    // Her yeni etkinliği ayrı mesaj olarak gönder
    for (const event of newEvents) {
      await sendEvent(event);
      await sleep(600);
    }

    // Gördüklerimizi işaretle
    await markSeen(relevant);

    console.log(`[${new Date().toISOString()}] Tarama tamamlandı.`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Kritik hata:`, err.message);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Her gün 20:00 Türkiye saati
cron.schedule("0 20 * * *", check, {
  timezone: "Europe/Istanbul",
  scheduled: true,
});

console.log("İstanbul BME Bot başlatıldı.");
console.log("Her gün 20:00 (Türkiye) etkinlik taraması yapılacak.");

if (process.env.RUN_ON_START === "true") {
  console.log("Başlangıç taraması başlatılıyor...");
  check();
}
