import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const nav = useNavigate();
  if (!toast) return null;
  const { action } = toast;
  // -translate-x-1/2: 등장 애니메이션이 끝나면 transform 이 풀려 토스트가 오른쪽으로 밀려나 있었다. w-max: 왼쪽 50% 자리 폭에 갇혀 글자가 세로로 쌓이던 것
  return (
    <div key={toast.id} role="status" className={cn(
      'absolute left-1/2 -translate-x-1/2 bottom-24 z-[1200] w-max max-w-[calc(100%-32px)] px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-lg animate-toast-in text-center',
      action && 'flex items-center gap-3 text-left pr-2 py-2',
      toast.tone === 'error' ? 'bg-danger' : toast.tone === 'success' ? 'bg-mint' : 'bg-ink')}>
      <span className={cn(action && 'flex-1 min-w-0')}>{toast.text}</span>
      {/* 토스트가 말한 곳으로 바로 — "그룹 채팅방이 열렸어요" 라고 하고 아무것도 안 열리던 것 (ux-sim 2026-11-02) */}
      {action && <button onClick={() => { useAppStore.setState({ toast: null }); nav(action.to); }} className="h-9 px-3.5 rounded-lg bg-white/20 text-[13px] font-bold whitespace-nowrap shrink-0 press">{action.label}</button>}
    </div>
  );
}
