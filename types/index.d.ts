export type Tone = "formal" | "polite" | "casual" | "corporate" | "sassy";

export interface NoOptions {
  /** 말투. 배열로 주면 여러 말투를 합친 풀에서 뽑는다. 생략하면 전체. */
  tone?: Tone | Tone[];
  /** 뽑을 개수. 주면 배열, 안 주면 문자열 하나를 돌려준다. */
  count?: number;
  /** 시드. 같은 시드는 같은 결과를 준다. */
  seed?: number | string;
  /** count 사용 시 중복 허용 여부. 기본 true(중복 없음). */
  unique?: boolean;
  /** 0 이상 1 미만을 돌려주는 난수 함수. 주면 seed 보다 우선한다. */
  random?: () => number;
}

/** 지원하는 말투 목록. */
export declare const tones: readonly Tone[];

/** 말투별 거절 사유. */
export declare const reasonsByTone: Readonly<Record<Tone, readonly string[]>>;

/** 전체 거절 사유. */
export declare const reasons: readonly string[];

/** 거절 사유 하나를 뽑는다. */
export declare function no(options?: Omit<NoOptions, "count"> | Tone | Tone[]): string;
/** 거절 사유를 count 개 뽑는다. */
export declare function no(options: NoOptions & { count: number }): string[];

/** 기본 옵션을 미리 묶어둔 no() 를 만든다. */
export declare function createNo(
  defaults?: NoOptions | Tone | Tone[],
): {
  (options?: Omit<NoOptions, "count"> | Tone | Tone[]): string;
  (options: NoOptions & { count: number }): string[];
};

/** 해당 말투(또는 전체)의 사유 개수. */
export declare function count(tone?: Tone | Tone[]): number;

export default no;
