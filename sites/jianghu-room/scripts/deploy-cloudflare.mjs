import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const database = config.d1_databases?.find((binding) => binding.binding === "DB");
if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(database?.database_id ?? "") ||
    database.database_id === "00000000-0000-4000-8000-000000000000") {
  throw new Error("先在 Cloudflare 创建 D1 数据库，并将真实 database_id 填入 wrangler.jsonc。 ");
}

let output;
try {
  output = JSON.parse(readFileSync(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"));
} catch {
  throw new Error("先运行 npm run build。 ");
}
if (output.name !== config.name ||
    output.d1_databases?.find((binding) => binding.binding === "DB")?.database_id !== database.database_id) {
  throw new Error("构建产物与当前 Cloudflare 配置不一致；请重新运行 npm run build。 ");
}

const cli = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const result = spawnSync(process.execPath, [cli, "deploy", "--config", "dist/server/wrangler.json"], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
