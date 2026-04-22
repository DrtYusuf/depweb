const fs = require("fs");
const path = require("path");

const SEEN_FILE = path.join(__dirname, "..", "data", "seen.json");

function loadSeen() {
  try {
    const raw = fs.readFileSync(SEEN_FILE, "utf8");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveSeen(set) {
  const dir = path.dirname(SEEN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...set]));
}

async function filterNew(events) {
  const seen = loadSeen();
  return events.filter((e) => !seen.has(e.id));
}

async function markSeen(events) {
  if (!events.length) return;
  const seen = loadSeen();
  for (const e of events) seen.add(e.id);
  saveSeen(seen);
}

module.exports = { filterNew, markSeen };
