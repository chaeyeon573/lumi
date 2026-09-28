import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { BottomSheet, Button, Input, C } from '@/ui';
import { openLegal } from '@/legal';

/** 데모 계정 — 실제 서버에서도 지울 수 없다 */
const DEMO_ID = 'u_me';

/**
 * 계정 삭제 확인 (App Store 5.1.1(v), 웹 settings_DeleteAccountSheet 와 같음).
 * 성공하면 로그아웃 → 루트 레이아웃이 시작 화면(Welcome)을 보여준다.
 */
export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useAppStore((s) => s.currentUserId);
  const logout = useAppStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTyped(''); setBusy(false); } }, [open]);
  if (!me) return null;
  const demo = me === DEMO_ID;
  const word = t('삭제');
  const ok = typed.trim().toLowerCase() === word.toLowerCase();

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      // 패치를 스토어에 반영하지 않는다 — 곧바로 로그아웃하면서 스토어를 비우고, 익명화된 "나"로 화면을 다시 그리면 설정 화면이 깨진다
      await api.users.deleteAccount(me);
    } catch (e) {
      showToast((e as Error).message || t('계정을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.'), 'error');
      setBusy(false);
      return;
    }
    onClose();
    await logout(); // 루트 레이아웃이 시작 화면(Welcome)을 보여준다
    showToast(t('계정을 삭제했어요. 그동안 함께해줘서 고마워요.'), 'success');
  };

  const bullet = (s: string) => <View key={s} style={tw`flex-row mt-1`}><Text style={tw`text-[13px] text-ink-2 w-4`}>•</Text><Text style={tw`flex-1 text-[13px] text-ink-2`}>{s}</Text></View>;

  return (
    <BottomSheet open={open} onClose={() => { if (!busy) onClose(); }} title={t('계정 삭제')} tall={!demo}>
      {demo ? (
        <View>
          <Text style={tw`text-[14px] text-ink-2 leading-5`}>{t('지금은 데모 계정으로 둘러보는 중이라 삭제할 수 없어요. 직접 가입한 계정은 여기서 바로 삭제할 수 있어요.')}</Text>
          <View style={tw`flex-row mt-4`}><Button full size="lg" variant="outline" onPress={onClose}>{t('닫기')}</Button></View>
        </View>
      ) : (
        <View>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{t('삭제하면 아래 정보가 모두 지워져요')}</Text>
          <View style={tw`mt-1`}>{[t('프로필 · 사진 · 질문 답변'), t('내가 쓴 글 · 댓글 · 만든 모임'), t('연결 · 팔로우'), t('로그인 이메일')].map(bullet)}</View>
          <View style={tw`mt-3 rounded-2xl bg-surface-2 px-3.5 py-3`}>
            <Text style={tw`text-[12px] text-ink-2 leading-5`}>{t('이미 주고받은 메시지는 상대방 대화방에 "탈퇴한 사용자"로 남을 수 있어요.')}</Text>
            <Text style={tw`mt-1 text-[12px] font-semibold text-danger`}>{t('삭제한 계정은 되돌릴 수 없어요.')}</Text>
          </View>
          <Text style={tw`mt-4 mb-1.5 text-[13px] font-semibold text-ink-2`}>{lang === 'en' ? `Type "${word}" to confirm` : `확인을 위해 "${word}"를 입력해주세요`}</Text>
          <Input autoCapitalize="none" autoCorrect={false} placeholder={word} value={typed} onChangeText={setTyped} editable={!busy} />
          <Pressable onPress={submit} disabled={!ok || busy} accessibilityRole="button" accessibilityState={{ disabled: !ok || busy }}
            style={[tw`mt-4 h-[52px] rounded-full items-center justify-center`, { backgroundColor: ok ? C.danger : C.dangerSoft, opacity: ok ? 1 : 0.7 }]}>
            {busy ? <ActivityIndicator color={C.onPrimary} /> : <Text style={{ color: ok ? C.onPrimary : C.danger, fontWeight: '600', fontSize: 15 }}>{t('계정 영구 삭제')}</Text>}
          </Pressable>
          <Pressable onPress={() => openLegal('delete-account')} style={tw`mt-3 items-center`}><Text style={tw`text-[11px] text-ink-3 underline`}>{t('계정 삭제 안내')}</Text></Pressable>
        </View>
      )}
    </BottomSheet>
  );
}
