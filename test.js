/**
 * Scraperları Redis/Telegram olmadan test eder.
 * Kullanım: node test.js
 */

const eventbrite = require("./lib/sources/eventbrite");
const meetup = require("./lib/sources/meetup");
const ieee = require("./lib/sources/ieee");
const universities = require("./lib/sources/universities");
const { isRelevant } = require("./lib/filter");

async function main() {
  console.log("=== Scraper Testi ===\n");

  const [eb, mu, ie, uni] = await Promise.allSettled([
    eventbrite.scrape(),
    meetup.scrape(),
    ieee.scrape(),
    universities.scrape(),
  ]);

  const print = (result, name) => {
    if (result.status === "rejected") {
      console.error(`[${name}] HATA: ${result.reason?.message}\n`);
      return [];
    }
    const items = result.value;
    console.log(`[${name}] ${items.length} etkinlik`);
    items.slice(0, 3).forEach((e) => {
      console.log(`  - ${e.title}`);
      if (e.date) console.log(`    Tarih: ${e.date}`);
      if (e.location) console.log(`    Yer: ${e.location}`);
      console.log(`    URL: ${e.url}`);
    });
    console.log();
    return items;
  };

  const all = [
    ...print(eb, "Eventbrite"),
    ...print(mu, "Meetup"),
    ...print(ie, "IEEE"),
    ...print(uni, "Üniversiteler"),
  ];

  const relevant = all.filter((e) =>
    ["ytu", "bogazici", "ieee"].includes(e.source) ? true : isRelevant(e)
  );

  console.log(`\nToplam: ${all.length} | Filtrelenmiş: ${relevant.length}`);
}

main().catch(console.error);
