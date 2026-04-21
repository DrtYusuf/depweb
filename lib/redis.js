const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = "istanbul:bme:seen";

async function getSeenIds() {
  const members = await redis.smembers(KEY);
  return new Set(members || []);
}

async function filterNew(events) {
  const seen = await getSeenIds();
  return events.filter((e) => !seen.has(e.id));
}

async function markSeen(events) {
  if (!events.length) return;
  await redis.sadd(KEY, ...events.map((e) => e.id));
}

module.exports = { filterNew, markSeen };
