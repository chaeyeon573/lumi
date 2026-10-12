import { useEffect, useState } from 'react';
import { api } from '@core/api';

let cached: boolean | null = null;
let pending: Promise<boolean> | null = null;

/** 서버에 AI(ANTHROPIC_API_KEY)가 켜져 있는지 — 한 번만 묻고 기억한다 */
export function useAiEnabled() {
  const [on, setOn] = useState<boolean>(cached ?? false);
  useEffect(() => {
    if (cached !== null) return;
    pending ??= api.ai.status().then((r) => (cached = r.enabled)).catch(() => (cached = false));
    let alive = true;
    void pending.then((v) => { if (alive) setOn(v); });
    return () => { alive = false; };
  }, []);
  return on;
}
