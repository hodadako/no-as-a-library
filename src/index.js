import formal from "./data/formal.js";
import polite from "./data/polite.js";
import casual from "./data/casual.js";
import corporate from "./data/corporate.js";
import sassy from "./data/sassy.js";

/** 지원하는 말투 목록. 순서는 격식이 높은 쪽부터. */
export const tones = ["formal", "polite", "casual", "corporate", "sassy"];

/** 말투별 거절 사유. 배열은 그대로 노출하되 소비자가 변형하지 못하도록 동결한다. */
export const reasonsByTone = Object.freeze({
  formal: Object.freeze(formal),
  polite: Object.freeze(polite),
  casual: Object.freeze(casual),
  corporate: Object.freeze(corporate),
  sassy: Object.freeze(sassy),
});

/** 전체 거절 사유를 말투 순서대로 이어붙인 배열. */
export const reasons = Object.freeze(tones.flatMap((tone) => reasonsByTone[tone]));

/** mulberry32 — 시드가 주어졌을 때 재현 가능한 난수를 만든다. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열 시드도 받을 수 있도록 32비트 정수로 접는다. */
function hashSeed(seed) {
  if (typeof seed === "number") return Math.trunc(seed);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolvePool(tone) {
  if (tone == null) return reasons;

  const list = Array.isArray(tone) ? tone : [tone];
  const unknown = list.find((t) => !tones.includes(t));
  if (unknown) {
    throw new TypeError(`알 수 없는 tone: ${unknown} (가능한 값: ${tones.join(", ")})`);
  }
  if (list.length === 1) return reasonsByTone[list[0]];

  // 중복 tone 을 넘겨도 사유가 두 번 뽑히지 않게 정리한다.
  return [...new Set(list)].flatMap((t) => reasonsByTone[t]);
}

/**
 * 거절 사유를 뽑는다.
 * count 를 주지 않으면 문자열 하나, 주면 문자열 배열을 돌려준다.
 */
export function no(options = {}) {
  if (typeof options === "string" || Array.isArray(options)) {
    options = { tone: options };
  }

  const { tone, count, seed, unique = true, random } = options;

  const pool = resolvePool(tone);
  const rand = random ?? (seed == null ? Math.random : mulberry32(hashSeed(seed)));

  if (count == null) return pool[Math.floor(rand() * pool.length)];

  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError(`count 는 0 이상의 정수여야 합니다: ${count}`);
  }
  if (count === 0) return [];

  if (!unique) {
    return Array.from({ length: count }, () => pool[Math.floor(rand() * pool.length)]);
  }

  if (count > pool.length) {
    throw new RangeError(`unique 모드에서는 count 가 사유 개수(${pool.length})를 넘을 수 없습니다: ${count}`);
  }

  // 부분 Fisher-Yates — 필요한 개수만 섞어 O(count) 로 뽑는다.
  const bag = [...pool];
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rand() * (bag.length - i));
    [bag[i], bag[j]] = [bag[j], bag[i]];
    picked.push(bag[i]);
  }
  return picked;
}

/** 자주 쓰는 옵션을 미리 묶어둔 no() 를 만든다. */
export function createNo(defaults = {}) {
  const base = typeof defaults === "string" || Array.isArray(defaults) ? { tone: defaults } : defaults;
  const seeded = base.seed == null ? null : mulberry32(hashSeed(base.seed));
  return (options = {}) => {
    const extra = typeof options === "string" || Array.isArray(options) ? { tone: options } : options;
    // 시드를 준 인스턴스는 호출을 거듭할수록 다른 값이 나오도록 난수 스트림을 이어 쓴다.
    const random = extra.random ?? (extra.seed == null ? (seeded ?? undefined) : undefined);
    return no({ ...base, ...extra, ...(random ? { random } : {}) });
  };
}

/** 해당 말투(또는 전체)의 사유 개수. */
export function count(tone) {
  return resolvePool(tone).length;
}

export default no;
