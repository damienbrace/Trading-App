import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "outputs", "trading-journal-app");
const target = resolve(root, "dist");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

const publicConfig = {
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.PUBLIC_SUPABASE_ANON_KEY || ""
};

await writeFile(
  resolve(target, "env.js"),
  `window.TRADING_APP_CONFIG = ${JSON.stringify(publicConfig)};\n`,
  "utf8"
);
