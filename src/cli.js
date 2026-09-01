#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { no, tones, count } from "./index.js";

const USAGE = `
한국어 거절 사유 생성기

  사용법
    $ no [옵션]

  옵션
    -t, --tone <말투>    formal | polite | casual | corporate | sassy (쉼표로 여러 개)
    -n, --count <숫자>   여러 개 뽑기
    -s, --seed <값>      같은 시드는 같은 결과
        --repeat         중복 허용 (기본은 중복 없이)
        --json           JSON 으로 출력
        --list           말투별 사유 개수 보기
        --serve [포트]   HTTP 서버 실행 (기본 3000)
    -h, --help           도움말
    -v, --version        버전

  예시
    $ no
    $ no -t sassy
    $ no -t formal,polite -n 5
    $ no -n 3 --json
    $ no --serve 8080
`.trim();

function parse(argv) {
  const opts = { tone: undefined, count: undefined, seed: undefined, unique: true };
  const flags = new Set();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];

    switch (arg) {
      case "-t":
      case "--tone":
        opts.tone = String(next() ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "-n":
      case "--count":
        opts.count = Number(next());
        break;
      case "-s":
      case "--seed":
        opts.seed = next();
        break;
      case "--repeat":
        opts.unique = false;
        break;
      case "--json":
      case "--list":
      case "-h":
      case "--help":
      case "-v":
      case "--version":
        flags.add(arg.replace(/^-+/, ""));
        break;
      case "--serve": {
        flags.add("serve");
        // --serve 뒤 숫자는 포트, 아니면 다음 옵션이므로 되돌린다.
        const maybePort = argv[i + 1];
        if (maybePort && /^\d+$/.test(maybePort)) opts.port = Number(next());
        break;
      }
      default:
        if (arg.startsWith("-")) {
          process.stderr.write(`알 수 없는 옵션: ${arg}\n\n${USAGE}\n`);
          process.exit(1);
        }
    }
  }

  return { opts, flags };
}

async function main() {
  const { opts, flags } = parse(process.argv.slice(2));

  if (flags.has("h") || flags.has("help")) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  if (flags.has("v") || flags.has("version")) {
    // 번들 결과물(dist/cli.js) 기준으로도 패키지 루트를 가리킨다.
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  if (flags.has("list")) {
    for (const tone of tones) {
      process.stdout.write(`${tone.padEnd(10)} ${String(count(tone)).padStart(4)}개\n`);
    }
    process.stdout.write(`${"전체".padEnd(9)} ${String(count()).padStart(4)}개\n`);
    return;
  }

  if (flags.has("serve")) {
    const { serve } = await import("./server.js");
    const port = opts.port ?? (Number(process.env.PORT) || 3000);
    await serve({ port });
    process.stdout.write(`http://localhost:${port}/no 에서 대기 중\n`);
    return;
  }

  const result = no({ tone: opts.tone, count: opts.count, seed: opts.seed, unique: opts.unique });

  if (flags.has("json")) {
    process.stdout.write(`${JSON.stringify(Array.isArray(result) ? { reasons: result } : { reason: result })}\n`);
    return;
  }

  for (const line of Array.isArray(result) ? result : [result]) {
    process.stdout.write(`${line}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
