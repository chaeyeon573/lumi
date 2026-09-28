import { Linking } from 'react-native';
import { t } from '@core/i18n';
import { legalUrl, type LegalPageKey } from '@core/lib/legal';
import { useAppStore } from '@core/store/useAppStore';

/** 약관·개인정보처리방침·고객지원 공개 페이지를 기본 브라우저로 연다 (서버가 서빙) */
export async function openLegal(page: LegalPageKey) {
  const url = legalUrl(page);
  try {
    if (!/^https?:\/\//.test(url) && !url.startsWith('/')) throw new Error('bad url');
    await Linking.openURL(url);
  } catch {
    useAppStore.getState().showToast(t('페이지를 열 수 없어요. 잠시 후 다시 시도해주세요.'), 'error');
  }
}
