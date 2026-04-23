import { config } from "dotenv";
config({ path: ".env.local" });

import { Box } from "@upstash/box";

const box = await Box.get(process.env.BOX_ID);

// .env'e Tavily key ekle
await box.files.write({
  path: ".env",
  content: `TELEGRAM_BOT_TOKEN=${process.env.TELEGRAM_BOT_TOKEN}\nTELEGRAM_CHAT_ID=${process.env.TELEGRAM_CHAT_ID}\nTAVILY_API_KEY=${process.env.TAVILY_API_KEY}`,
});

await box.exec.command("git pull");
const r = await box.exec.command("rm -f data/seen.json && node check.js 2>&1", { timeout: 120000 });
console.log(r.result);
