require("dotenv").config();

const { filterNew, markSeen } = require("./lib/redis");
const { sendEvent } = require("./lib/telegram");
const { isRelevant, isNotPast } = require("./lib/filter");
const { fetchPublishedYear } = require("./lib/fetchPublishedYear");

const eventbrite = require("./lib/sources/eventbrite");
const meetup = require("./lib/sources/meetup");
const ieee = require("./lib/sources/ieee");
const universities = require("./lib/sources/universities");

async function run() {
  console.log(`[${new Date().toISOString()}] Tarama başladı...`);

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

  console.log(`Toplam: ${all.length} etkinlik`);

  const relevant = all.filter((e) =>
    (["ytu", "bogazici", "ieee"].includes(e.source) ? true : isRelevant(e)) && isNotPast(e)
  );

  console.log(`Filtrelenmiş: ${relevant.length} ilgili etkinlik`);

  // Yayın tarihi kontrolü — paralel çek
  const thisYear = new Date().getFullYear();
  const publishChecks = await Promise.allSettled(relevant.map((e) => fetchPublishedYear(e.url)));
  const freshEvents = relevant.filter((_, i) => {
    const year = publishChecks[i].status === "fulfilled" ? publishChecks[i].value : null;
    return year === null || year >= thisYear; // sadece bu yıl yayınlananlar
  });
  console.log(`Yayın tarihi geçenler çıkarıldı: ${freshEvents.length} etkinlik`);

  const newEvents = (await filterNew(freshEvents)).filter((e) => e.title && e.title.length > 3);
  console.log(`Yeni: ${newEvents.length} etkinlik`);

  for (const event of newEvents) {
    await sendEvent(event);
    await new Promise((r) => setTimeout(r, 300));
  }

  await markSeen(freshEvents);
  console.log(`[${new Date().toISOString()}] Tamamlandı.`);
}

run().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
