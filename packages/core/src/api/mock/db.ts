import type { Snapshot } from '../types';
import * as seedKo from '@core/data/seed';
import * as seedEn from '@core/data/seed.en';
import { lang } from '@core/i18n';
import { getPlatform } from '@core/platform';

const seed = lang === 'en' ? seedEn : seedKo;

const DB_VERSION = 13;
const STORAGE_KEY = `aroundu.mockdb.v${DB_VERSION}.${lang}`;
const SESSION_KEY = `aroundu.session.v1.${lang}`;

export interface MockDB extends Snapshot {
  version: number;
  seededOn: string;
}

function freshDB(): MockDB {
  return {
    version: DB_VERSION,
    seededOn: new Date().toISOString().slice(0, 10),
    users: structuredClone(seed.users),
    schools: structuredClone(seed.schools),
    organizations: structuredClone(seed.organizations),
    activities: structuredClone(seed.activities),
    participations: structuredClone(seed.participations),
    posts: structuredClone(seed.posts),
    relationships: structuredClone(seed.relationships),
    proposals: structuredClone(seed.proposals),
    chatRooms: structuredClone(seed.chatRooms),
    notifications: structuredClone(seed.notifications),
    reports: [],
    opportunities: structuredClone(seed.opportunities),
    opportunityIntents: structuredClone(seed.opportunityIntents),
    timePolls: structuredClone(seed.timePolls),
    savedSearches: structuredClone(seed.savedSearches ?? []),
    networkRequests: structuredClone(seed.networkRequests ?? []),
    introRequests: structuredClone(seed.introRequests ?? []),
  };
}

export function loadDB(): MockDB {
  try {
    const raw = getPlatform().getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDB;
      // 날짜가 바뀌면 '오늘' 기준 예시 데이터를 다시 만든다
      if (parsed.version === DB_VERSION && parsed.seededOn === new Date().toISOString().slice(0, 10)) return parsed;
    }
  } catch { /* ignore */ }
  const db = freshDB();
  saveDB(db);
  return db;
}

export function saveDB(db: MockDB) {
  try { getPlatform().setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* ignore quota */ }
}

export function resetDB(): MockDB {
  const db = freshDB();
  saveDB(db);
  return db;
}

export function getSession(): string | null {
  try { return getPlatform().getItem(SESSION_KEY); } catch { return null; }
}
export function setSession(id: string | null) {
  try { id ? getPlatform().setItem(SESSION_KEY, id) : getPlatform().removeItem(SESSION_KEY); } catch { /* ignore */ }
}
