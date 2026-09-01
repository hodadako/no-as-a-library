import test from "node:test";
import assert from "node:assert/strict";
import { serve } from "../src/server.js";
import { reasons, reasonsByTone, tones } from "../src/index.js";

/** 포트 0 으로 띄우고 실제 주소를 돌려준다. */
async function withServer(options, fn) {
  const server = await serve({ port: 0, host: "127.0.0.1", ...options });
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("GET /no 는 reason 하나를 준다", async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/no`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(reasons.includes(body.reason));
  });
});

test("GET /no?tone= 은 말투를 좁힌다", async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/no?tone=corporate`);
    const body = await res.json();
    assert.ok(reasonsByTone.corporate.includes(body.reason));
  });
});

test("GET /no?count= 는 배열을 준다", async () => {
  await withServer({}, async (base) => {
    const body = await (await fetch(`${base}/no?count=5`)).json();
    assert.equal(body.reasons.length, 5);
  });
});

test("count 범위를 벗어나면 400", async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/no?count=0`)).status, 400);
    assert.equal((await fetch(`${base}/no?count=101`)).status, 400);
    assert.equal((await fetch(`${base}/no?count=abc`)).status, 400);
  });
});

test("모르는 tone 은 400", async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/no?tone=nope`)).status, 400);
  });
});

test("같은 seed 는 같은 응답", async () => {
  await withServer({}, async (base) => {
    const a = await (await fetch(`${base}/no?seed=abc`)).json();
    const b = await (await fetch(`${base}/no?seed=abc`)).json();
    assert.equal(a.reason, b.reason);
  });
});

test("GET /tones 는 말투와 개수를 준다", async () => {
  await withServer({}, async (base) => {
    const body = await (await fetch(`${base}/tones`)).json();
    assert.deepEqual(body.tones, [...tones]);
    assert.equal(body.total, reasons.length);
  });
});

test("레이트 리밋을 넘기면 429", async () => {
  await withServer({ max: 3 }, async (base) => {
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await fetch(`${base}/no`)).status, 200);
    }
    const res = await fetch(`${base}/no`);
    assert.equal(res.status, 429);
    assert.ok(res.headers.get("retry-after"));
  });
});

test("없는 경로는 404, GET 아닌 메서드는 405", async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/yes`)).status, 404);
    assert.equal((await fetch(`${base}/no`, { method: "POST" })).status, 405);
  });
});

test("GET /health", async () => {
  await withServer({}, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
  });
});
