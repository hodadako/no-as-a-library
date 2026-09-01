# no-as-a-library

한국어 거절 사유 **1000개 이상**. 말투 5종 중에 골라 뽑아 쓰는 라이브러리입니다.

[hotheadhacker/no-as-a-service](https://github.com/hotheadhacker/no-as-a-service)의 한국어판입니다.
원본은 HTTP API 하나였지만, 이쪽은 **라이브러리를 본체로** 두고 CLI와 HTTP 서버를 얹었습니다.
`npm install` 한 번이면 네트워크 없이 바로 씁니다.

```bash
npm install no-as-a-library
```

```js
import { no } from "no-as-a-library";

no();
// → "지금 벌여둔 것부터 수습해야 해요."

no("sassy");
// → "제 통장이 거절했습니다."

no({ tone: "corporate" });
// → "백로그에 올려두겠습니다."
```

## 말투

| tone | 설명 | 예시 |
| --- | --- | --- |
| `formal` | 회사 메일, 공문, 거래처 응대 | 내부적으로 논의했는데, 이번 건은 어렵다는 쪽으로 정리됐습니다. |
| `polite` | 해요체. 일상에서 제일 많이 쓰는 말투 | 아 그날 하필 약속이 있어서요. |
| `casual` | 반말. 친구, 동기, 편한 사이 | 손이 열 개라도 모자라. |
| `corporate` | 분명 거절인데 거절이라고 안 하는 그 말들 | 긍정적으로 검토하겠습니다. |
| `sassy` | 웃기고 싶을 때 | 제 의욕은 작년에 퇴사했어요. |

## API

### `no(options?)`

`options`에 문자열이나 배열을 바로 넘기면 `tone`으로 해석합니다.

```js
no();                                  // 전체에서 하나
no("casual");                          // 반말에서 하나
no(["formal", "polite"]);              // 두 말투를 합친 풀에서 하나
no({ tone: "sassy", count: 5 });       // 5개 (중복 없음)
no({ count: 3, unique: false });       // 3개 (중복 허용)
no({ seed: "회의" });                   // 같은 시드는 항상 같은 결과
no({ random: () => 0.5 });             // 난수 함수 직접 주입
```

| 옵션 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `tone` | `Tone \| Tone[]` | 전체 | 말투를 좁힙니다. |
| `count` | `number` | – | 주면 배열, 안 주면 문자열 하나를 돌려줍니다. |
| `seed` | `number \| string` | – | 재현 가능한 결과가 필요할 때. |
| `unique` | `boolean` | `true` | `count` 사용 시 중복 허용 여부. |
| `random` | `() => number` | `Math.random` | `seed`보다 우선합니다. |

모르는 `tone`은 `TypeError`, 잘못된 `count`는 `TypeError`,
`unique` 모드에서 풀보다 많이 요구하면 `RangeError`를 던집니다.

### `createNo(defaults?)`

기본 옵션을 미리 묶어둔 `no()`를 만듭니다. 시드를 주면 그 인스턴스는 호출할수록
난수 스트림이 이어지므로, 같은 시드로 만든 두 인스턴스는 같은 순서를 재생합니다.

```js
import { createNo } from "no-as-a-library";

const 반려 = createNo({ tone: "corporate" });
반려();          // "우선순위에서 좀 밀릴 것 같습니다."
반려({ count: 2 });

const 고정 = createNo({ seed: 42 });
[고정(), 고정(), 고정()];   // 몇 번을 다시 만들어도 같은 세 줄
```

### 그 외

```js
import { tones, reasons, reasonsByTone, count } from "no-as-a-library";

tones;                      // ["formal", "polite", "casual", "corporate", "sassy"]
reasons.length;             // 1008
reasonsByTone.sassy;        // sassy 사유 배열
count("formal");            // 200
count();                    // 1008
```

`reasons`와 `reasonsByTone`은 동결되어 있어 실수로 변형되지 않습니다.

## CLI

설치 없이 바로:

```bash
npx no-as-a-library
npx no-as-a-library -t sassy
npx no-as-a-library -t formal,polite -n 5
npx no-as-a-library -n 3 --json
```

```
-t, --tone <말투>    formal | polite | casual | corporate | sassy (쉼표로 여러 개)
-n, --count <숫자>   여러 개 뽑기
-s, --seed <값>      같은 시드는 같은 결과
    --repeat         중복 허용 (기본은 중복 없이)
    --json           JSON 으로 출력
    --list           말투별 사유 개수 보기
    --serve [포트]   HTTP 서버 실행 (기본 3000)
```

## HTTP 서버

원본 no-as-a-service와 같은 모양의 엔드포인트를 제공합니다. 의존성은 없고 `node:http`만 씁니다.

```bash
npx no-as-a-library --serve 3000
```

```js
import { serve, createServer } from "no-as-a-library/server";

await serve({ port: 3000 });              // 만들고 listen 까지
const server = createServer({ max: 60 }); // listen 은 직접
```

| 요청 | 응답 |
| --- | --- |
| `GET /no` | `{ "reason": "..." }` |
| `GET /no?tone=sassy` | 말투 지정 (쉼표로 여러 개) |
| `GET /no?count=5` | `{ "reasons": [...] }` (1–100) |
| `GET /no?seed=abc` | 같은 시드는 같은 응답 |
| `GET /tones` | `{ tones, counts, total }` |
| `GET /health` | `{ "ok": true }` |

기본 레이트 리밋은 IP당 분당 120회입니다. 초과 시 `429`와 `Retry-After`를 돌려주고,
`x-ratelimit-limit` / `-remaining` / `-reset` 헤더를 항상 붙입니다.
`createServer({ windowMs, max })`로 조절합니다.

## 타입

타입 정의(`.d.ts`)가 함께 들어 있습니다. `count` 유무에 따라 반환 타입이 `string`과
`string[]`으로 갈리도록 오버로드해 두었습니다.

## 개발

```bash
npm install
npm test      # node:test, 28개
npm run build # esbuild → dist/ (ESM + CJS)
```

런타임 의존성은 없습니다. `esbuild`만 devDependency입니다.

## 라이선스

MIT
