import http from "node:http";
import { no, tones, count } from "./index.js";

/** 창(window) 안의 요청 수만 세는 최소한의 레이트 리미터. */
function createRateLimiter({ windowMs, max }) {
  const hits = new Map();

  // 오래된 버킷이 계속 쌓이지 않도록 창 하나마다 한 번씩 비운다.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits) {
      if (now >= bucket.resetAt) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  return {
    check(key) {
      const now = Date.now();
      const bucket = hits.get(key);
      if (!bucket || now >= bucket.resetAt) {
        hits.set(key, { n: 1, resetAt: now + windowMs });
        return { ok: true, remaining: max - 1, resetAt: now + windowMs };
      }
      bucket.n += 1;
      return { ok: bucket.n <= max, remaining: Math.max(0, max - bucket.n), resetAt: bucket.resetAt };
    },
    stop() {
      clearInterval(sweep);
      hits.clear();
    },
  };
}

function clientKey(req) {
  return (
    req.headers["cf-connecting-ip"] ||
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  res.end(payload);
}

/**
 * 원본 no-as-a-service 와 호환되는 HTTP 서버를 만든다.
 *
 *   GET /no            → { reason }
 *   GET /no?tone=sassy → 말투 지정
 *   GET /no?count=5    → { reasons: [...] }
 *   GET /tones         → { tones, counts }
 *   GET /health        → { ok: true }
 */
export function createServer({ windowMs = 60_000, max = 120 } = {}) {
  const limiter = createRateLimiter({ windowMs, max });

  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
      });
      res.end();
      return;
    }
    if (req.method !== "GET") return send(res, 405, { error: "GET 만 지원합니다." });

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") return send(res, 200, { ok: true });

    if (url.pathname === "/tones") {
      return send(res, 200, {
        tones,
        counts: Object.fromEntries(tones.map((t) => [t, count(t)])),
        total: count(),
      });
    }

    if (url.pathname !== "/no") return send(res, 404, { error: "없는 경로입니다." });

    const gate = limiter.check(clientKey(req));
    res.setHeader("x-ratelimit-limit", String(max));
    res.setHeader("x-ratelimit-remaining", String(gate.remaining));
    res.setHeader("x-ratelimit-reset", String(Math.ceil(gate.resetAt / 1000)));
    if (!gate.ok) {
      res.setHeader("retry-after", String(Math.ceil((gate.resetAt - Date.now()) / 1000)));
      return send(res, 429, { error: `요청이 너무 많습니다. (${max}회/분)` });
    }

    const tone = url.searchParams.getAll("tone").flatMap((v) => v.split(","));
    const rawCount = url.searchParams.get("count");
    const seed = url.searchParams.get("seed") ?? undefined;

    try {
      if (rawCount == null) {
        return send(res, 200, { reason: no({ tone: tone.length ? tone : undefined, seed }) });
      }
      const n = Number(rawCount);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        return send(res, 400, { error: "count 는 1 이상 100 이하의 정수여야 합니다." });
      }
      return send(res, 200, {
        reasons: no({ tone: tone.length ? tone : undefined, count: n, seed }),
      });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  });

  server.on("close", () => limiter.stop());
  return server;
}

const DEFAULT_PORT = Number(process.env.PORT) || 3000;

/** createServer() 를 만들고 바로 listen 까지 한다. */
export function serve({ port = DEFAULT_PORT, host, ...options } = {}) {
  const server = createServer(options);
  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

export default createServer;
