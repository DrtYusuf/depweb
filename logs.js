require("dotenv").config({ path: ".env.local" });
const { Box } = require("@upstash/box");
const fs = require("fs");

async function main() {
  const id = fs.readFileSync(".box-id", "utf8").trim();
  const box = await Box.connect(id);
  const r = await box.exec.command("pm2 logs bme-istanbul-bot --lines 60 --nostream 2>&1");
  console.log(r.stdout || r.output || "(log bulunamadı)");
}

main().catch(console.error);
