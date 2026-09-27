import { useCallback, useEffect, useState } from 'react';

/** 데모: 설정 › 데모 도구 "부분 오류 미리보기"가 켜 두는 키 — 켜져 있으면 섹션 하나가 한 번 실패한다 */
export const PARTIAL_FAIL_KEY = 'aroundu.demo.partialFail';

/**
 * 섹션 단위 로딩·오류 상태 — mock 데이터는 즉시 있지만 실제 API 처럼 섹션마다 스켈레톤을 잠깐 보여주고,
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
      try { const v = sessionStorage.getItem(PARTIAL_FAIL_KEY); if (v && (v === '1' || v === key)) { fail = true; sessionStorage.setItem(PARTIAL_FAIL_KEY, 'done'); } } catch { /* */ }
      setLoading(false);
      if (fail) setError(key);
    }, ms);
    return () => clearTimeout(id);
  }, [key, ms, tick]);
  const retry = useCallback(() => setTick((x) => x + 1), []);
  return { loading, error, retry };
}
