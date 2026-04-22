require("dotenv").config();

const { filterNew, markSeen } = require("./lib/redis");
const { sendSummary, sendEvent } = require("./lib/telegram");
const { isRelevant, isNotPast } = require("./lib/filter");

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

  const newEvents = (await filterNew(relevant)).filter((e) => e.title && e.title.length > 3);
  console.log(`Yeni: ${newEvents.length} etkinlik`);

  if (newEvents.length > 0) await sendSummary(newEvents);

  for (const event of newEvents) {
    await sendEvent(event);
    await new Promise((r) => setTimeout(r, 300));
  }

  await markSeen(relevant);
  console.log(`[${new Date().toISOString()}] Tamamlandı.`);
}

run().catch((err) => {
  console.error("Hata:", err.message);
  process.exit(1);
});
