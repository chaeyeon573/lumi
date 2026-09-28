import { t } from '@core/i18n';
import { Soon } from '@/ui';

/** 자리 표시 (phase 2 에서 웹 RequestDetailPage 를 옮겨 교체) — 링크가 끊기지 않도록 뒤로가기만 있는 화면 */
export default function Placeholder() {
  return <Soon title={t('혹시 여기에 해당되나요?')} />;
}
