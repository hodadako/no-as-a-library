import test from "node:test";
import assert from "node:assert/strict";
import { no, createNo, count, reasons, reasonsByTone, tones } from "../src/index.js";

test("사유가 1000개 이상이고 말투별로 200개 이상이다", () => {
  assert.ok(reasons.length >= 1000, `전체 ${reasons.length}개`);
  for (const tone of tones) {
    assert.ok(reasonsByTone[tone].length >= 200, `${tone} ${reasonsByTone[tone].length}개`);
  }
  assert.equal(count(), reasons.length);
});

test("중복된 사유가 없다", () => {
  assert.equal(new Set(reasons).size, reasons.length);
});

test("모든 사유가 공백 없는 한국어 문자열이다", () => {
  for (const reason of reasons) {
    assert.equal(typeof reason, "string");
    assert.equal(reason, reason.trim(), `앞뒤 공백: ${reason}`);
    assert.ok(reason.length > 0);
    assert.match(reason, /[가-힣]/, `한글 없음: ${reason}`);
  }
});

test("no() 는 문자열 하나를 준다", () => {
  const reason = no();
  assert.equal(typeof reason, "string");
  assert.ok(reasons.includes(reason));
});

test("tone 을 주면 그 말투에서만 뽑는다", () => {
  for (const tone of tones) {
    for (let i = 0; i < 50; i += 1) {
      assert.ok(reasonsByTone[tone].includes(no({ tone })));
    }
  }
});

test("tone 을 문자열/배열로 바로 넘길 수 있다", () => {
  assert.ok(reasonsByTone.sassy.includes(no("sassy")));
  const pool = [...reasonsByTone.formal, ...reasonsByTone.casual];
  assert.ok(pool.includes(no(["formal", "casual"])));
});

test("모르는 tone 은 TypeError", () => {
  assert.throws(() => no({ tone: "banmal" }), TypeError);
  assert.throws(() => no(["formal", "nope"]), TypeError);
});

test("count 를 주면 그만큼의 배열을 준다", () => {
  const result = no({ count: 7 });
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 7);
  assert.equal(new Set(result).size, 7, "unique 기본값이면 중복이 없어야 한다");
});

test("count 0 은 빈 배열", () => {
  assert.deepEqual(no({ count: 0 }), []);
});

test("unique: false 면 중복을 허용하고 풀 크기를 넘겨도 된다", () => {
  const result = no({ tone: "formal", count: 500, unique: false });
  assert.equal(result.length, 500);
});

test("unique 모드에서 풀보다 많이 요구하면 RangeError", () => {
  assert.throws(() => no({ tone: "formal", count: 100000 }), RangeError);
});

test("잘못된 count 는 TypeError", () => {
  assert.throws(() => no({ count: -1 }), TypeError);
  assert.throws(() => no({ count: 1.5 }), TypeError);
});

test("같은 시드는 같은 결과를 준다", () => {
  assert.equal(no({ seed: 42 }), no({ seed: 42 }));
  assert.equal(no({ seed: "fanding" }), no({ seed: "fanding" }));
  assert.deepEqual(no({ seed: 7, count: 5 }), no({ seed: 7, count: 5 }));
});

test("다른 시드는 (대체로) 다른 결과를 준다", () => {
  const picked = new Set(Array.from({ length: 50 }, (_, i) => no({ seed: i })));
  assert.ok(picked.size > 25, `서로 다른 값 ${picked.size}개`);
});

test("random 을 직접 넘기면 그 함수를 쓴다", () => {
  assert.equal(no({ random: () => 0 }), reasons[0]);
  assert.equal(no({ tone: "sassy", random: () => 0 }), reasonsByTone.sassy[0]);
});

test("createNo 는 기본 옵션을 기억한다", () => {
  const noSassy = createNo("sassy");
  for (let i = 0; i < 30; i += 1) {
    assert.ok(reasonsByTone.sassy.includes(noSassy()));
  }
  assert.equal(noSassy({ count: 3 }).length, 3);
});

test("createNo 에 시드를 주면 인스턴스마다 같은 순서를 재생한다", () => {
  const a = createNo({ seed: "seed" });
  const b = createNo({ seed: "seed" });
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("반환된 배열을 바꿔도 원본은 그대로다", () => {
  assert.throws(() => reasons.push("x"), TypeError);
  assert.throws(() => reasonsByTone.formal.push("x"), TypeError);
});
