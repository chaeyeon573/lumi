import { useEffect, useState } from 'react';
import { api } from '@core/api';
import { hasPlus, offlineStatus, type PlusStatus } from '@core/lib/plus';
import { useAppStore } from '@core/store/useAppStore';

let cached: PlusStatus | null = null;
let pending: Promise<PlusStatus> | null = null;

/**
 * Lumi+ for this screen (S087). `enabled` = the server's LUMI_PLUS flag (asked once per app start);
 * `active` follows my own profile (an admin grant arrives as a user patch), `locked` = show the lock + "Lumi+".
 * While the flag is off nothing is locked. The server enforces the same rules — this only decides what to draw.
 */
export function usePlus() {
  const [status, setStatus] = useState<PlusStatus | null>(cached);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  useEffect(() => {
    if (cached) return;
    pending ??= api.plus.status().then((r) => (cached = r)).catch(() => (cached = offlineStatus()));
    let alive = true;
    void pending.then((v) => { if (alive) setStatus(v); });
    return () => { alive = false; };
  }, []);
  const s = status ?? offlineStatus();
  const active = hasPlus(me);
  return { ready: !!status, enabled: s.enabled, active, locked: s.enabled && !active, payments: s.payments };
}
