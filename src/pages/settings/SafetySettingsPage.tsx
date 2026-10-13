import { useNavigate } from 'react-router-dom';
import { t } from '@core/i18n';
import { ShieldCheck, Ban, Flag } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Segmented, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';

export function SafetySettingsPage() {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const reports = useAppStore((s) => s.reports);
  const me = v.me;
  const blocked = v.snap.relationships.blocks.filter((b) => b.fromId === me.id).map((b) => v.userById(b.toId)).filter(Boolean);
  const myReports = reports.filter((r) => r.reporterId === me.id);
  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('계정 및 안전 설정')} />
      <div className="px-4 py-3 space-y-4">
        <div className="card p-4">
          <b className="text-[14px] flex items-center gap-1.5"><ShieldCheck size={16} className="text-mint" />{t('인증 상태')}</b>
          <div className="flex gap-2 mt-2">{me.affiliation.type === 'university' && (me.affiliation.emailVerified ? <Tag tone="primary">{t('학교 인증 완료')}</Tag> : <Tag tone="gold">{t('학교 미인증')}</Tag>)}{me.identityVerified ? <Tag tone="mint">{t('본인 인증 완료')}</Tag> : <Tag>{t('본인 미인증')}</Tag>}</div>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => nav('/profile/edit')}>{t('인증 관리')}</Button>
        </div>
        <div className="card p-4">
          <b className="text-[14px]">{t('메시지 수신 제한')}</b>
          <p className="text-[12px] text-ink-3 mt-0.5 mb-3">{t('연결되지 않은 사람은 어떤 설정에서도 메시지를 보낼 수 없어요.')}</p>
          <Segmented value={me.settings.messagePolicy} onChange={(val) => run(() => api.users.update(me.id, { settings: { ...me.settings, messagePolicy: val } }), t('메시지 수신 설정을 바꿨어요.'))} options={[{ value: 'connected', label: t('연결된 사람') }, { value: 'friends_only', label: t('친구만') }, { value: 'none', label: t('받지 않음') }]} />
        </div>
        <div className="card p-4">
          <b className="text-[14px] flex items-center gap-1.5"><Ban size={16} className="text-danger" />{t('차단한 사용자')} {blocked.length}</b>
          {blocked.length === 0 ? <p className="text-[12px] text-ink-3 mt-2">{t('차단한 사용자가 없어요.')}</p> : (
            <div className="mt-2 divide-y divide-line">{blocked.map((u) => u && <div key={u.id} className="flex items-center gap-3 py-2.5"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} /><b className="flex-1 text-[14px]">{u.nickname}</b><Button size="sm" variant="outline" onClick={() => run(() => api.relationships.unblock(me.id, u.id), t('차단을 해제했어요.'))}>{t('차단 해제')}</Button></div>)}</div>
          )}
        </div>
        <div className="card p-4">
          <b className="text-[14px] flex items-center gap-1.5"><Flag size={16} className="text-accent" />{t('신고 내역')} {myReports.length}</b>
          {myReports.length === 0 ? <p className="text-[12px] text-ink-3 mt-2">{t('신고 내역이 없어요.')}</p> : (
            <div className="mt-2 space-y-2">{myReports.map((r) => <div key={r.id} className="text-[12px]"><Tag>{{ user: t('사용자'), activity: t('활동'), post: t('게시물'), message: t('메시지'), ride: 'Ride' }[r.targetType]}</Tag> <span className="text-ink-2">{r.reason}</span> <span className="text-ink-3">· {relativeTime(r.createdAt)} {t('· 검토 중')}</span></div>)}</div>
          )}
        </div>
        <p className="text-[11px] text-ink-3 text-center">{t('활동 주최자·참가자 평가와 후기는 다음 버전에서 추가될 예정이에요.')}</p>
      </div>
    </div>
  );
}
