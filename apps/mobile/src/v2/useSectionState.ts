import { useCallback, useEffect, useState } from 'react';

/** 데모: 설정 › 데모 도구 "부분 오류 미리보기"가 켜 두는 값 — 켜져 있으면 섹션 하나가 한 번 실패한다 (웹은 sessionStorage, 모바일은 메모리) */
let partialFail: string | null = null;
export const setPartialFail = (key: string | null) => { partialFail = key; };

/**
 * 섹션 단위 로딩·오류 상태 (웹 src/hooks/useSectionState) — mock 데이터는 즉시 있지만 실제 API 처럼 섹션마다 스켈레톤을 잠깐 보여주고,
 * 데모 도구로 한 섹션만 실패시켜 "부분 오류 + 재시도"를 확인할 수 있게 한다.
 */
export function useSectionState(key: string, ms = 350) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setLoading(true); setError(null);
    const id = setTimeout(() => {
      let fail = false;
      if (partialFail && (partialFail === '1' || partialFail === key)) { fail = true; partialFail = null; }
      setLoading(false);
      if (fail) setError(key);
    }, ms);
    return () => clearTimeout(id);
  }, [key, ms, tick]);
  const retry = useCallback(() => setTick((x) => x + 1), []);
  return { loading, error, retry };
}
