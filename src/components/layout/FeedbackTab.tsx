import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet, Button, Textarea } from '@/components/ui';

const L = lang === 'en'
  ? { title: 'Tell us what you think', hint: 'What did you look for and not find? What would make you open this again next week? Anything confusing?', placeholder: 'Write anything — short is fine', send: 'Send', thanks: 'Thanks! We read every message.', fail: "Couldn't send. Please try again." }
  : { title: '써 보니 어때요?', hint: '찾다가 없었던 것, 다음 주에 다시 열고 싶게 만들 것, 헷갈렸던 것 — 뭐든 좋아요.', placeholder: '짧아도 괜찮아요', send: '보내기', thanks: '고마워요! 하나도 빠짐없이 읽을게요.', fail: '보내지 못했어요. 다시 시도해주세요.' };

/** 의견 보내기 시트 — 설정 → '의견 보내기' 줄에서 연다 (예전의 떠 있는 '의견' 알약은 버튼을 가려서 뺐다) */
export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loc = useLocation();
  const showToast = useAppStore((s) => s.showToast);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api.system.feedback(text.trim(), loc.pathname + loc.search); setText(''); onClose(); showToast(L.thanks, 'success'); }
    catch { showToast(L.fail, 'error'); }
    finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={L.title}>
      <div className="space-y-3">
        <p className="text-[13px] text-ink-2">{L.hint}</p>
        <Textarea autoFocus rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={L.placeholder} />
        <Button full onClick={send} loading={busy} disabled={!text.trim()}>{L.send}</Button>
      </div>
    </BottomSheet>
  );
}
