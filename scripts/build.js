import { rm, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
await rm(dist, { recursive: true, force: true });

const shared = {
  bundle: true,
  platform: "node",
  target: "node18",
  outdir: "dist",
  logLevel: "warning",
};

// 라이브러리 진입점 — ESM 과 CJS 양쪽으로 낸다.
await build({ ...shared, entryPoints: ["src/index.js", "src/server.js"], format: "esm" });
await build({
  ...shared,
  entryPoints: ["src/index.js", "src/server.js"],
  format: "cjs",
  outExtension: { ".js": ".cjs" },
});

// CLI 는 bin 으로만 쓰이므로 ESM 하나면 충분하다. shebang 은 esbuild 가 그대로 옮겨준다.
await build({ ...shared, entryPoints: ["src/cli.js"], format: "esm" });
await chmod(fileURLToPath(new URL("../dist/cli.js", import.meta.url)), 0o755);

console.log("빌드 완료 → dist/");
