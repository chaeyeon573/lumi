/**
 * FilterBar / FilterSheet 의 순수 모델 — 화면 없이 테스트할 수 있게 .ts 로 따로 둔다 (server/*.test.ts 가 읽는다).
 * 값은 전부 문자열: 그룹 key → 고른 값 ('' = 고르지 않음). 정렬처럼 늘 하나가 켜져 있는 그룹은 required.
 */

export interface FilterOption {
  value: string;
  label: string;
  /** 시트 밖, 적용된 칩 줄에 쓸 짧은 이름 (없으면 label) — "Only saved" → "Saved" */
  chip?: string;
}

export interface FilterGroup {
  key: string;
  title: string;
  options: FilterOption[];
  /** 늘 하나가 켜져 있다 (정렬) — 다시 눌러도 꺼지지 않고, 적용된 칩으로 세지 않는다. 기본값 = options[0] */
  required?: boolean;
}

export type FilterValues = Record<string, string>;

/** Reset — required 그룹은 첫 값, 나머지는 '' */
export function resetValues(groups: FilterGroup[]): FilterValues {
  return Object.fromEntries(groups.map((g) => [g.key, g.required ? g.options[0]?.value ?? '' : '']));
}

/** 칩 하나를 눌렀을 때 — 한 그룹에 하나. 켜진 칩을 다시 누르면 끈다 (required 는 그대로) */
export function toggleValue(groups: FilterGroup[], values: FilterValues, key: string, value: string): FilterValues {
  const g = groups.find((x) => x.key === key);
  if (!g) return values;
  const on = (values[key] ?? '') === value;
  return { ...values, [key]: on && !g.required ? '' : value };
}

export interface AppliedChip { key: string; value: string; label: string }

/** 검색칸 아래 줄에 × 칩으로 보일 것 — required(정렬) 제외, 값이 있는 그룹만, 시트의 순서대로 */
export function appliedChips(groups: FilterGroup[], values: FilterValues): AppliedChip[] {
  const out: AppliedChip[] = [];
  for (const g of groups) {
    const v = values[g.key] ?? '';
    if (g.required || !v) continue;
    const o = g.options.find((x) => x.value === v);
    out.push({ key: g.key, value: v, label: o ? o.chip ?? o.label : v });
  }
  return out;
}

/** 정렬이 기본값이 아닌가 (기본이 아니면 칩 줄 오른쪽에 조용히 남긴다) */
export function sortGroup(groups: FilterGroup[]) {
  return groups.find((g) => g.required);
}
export function sortLabel(groups: FilterGroup[], values: FilterValues): { label: string; isDefault: boolean } | null {
  const g = sortGroup(groups);
  if (!g) return null;
  const v = values[g.key] || g.options[0]?.value;
  const o = g.options.find((x) => x.value === v) ?? g.options[0];
  return o ? { label: o.label, isDefault: o.value === g.options[0]?.value } : null;
}

/** 시트가 다루는 값만 골라낸다 (URL 의 q·school 같은 것은 건드리지 않는다) */
export function pickValues(groups: FilterGroup[], values: FilterValues): FilterValues {
  const base = resetValues(groups);
  for (const g of groups) if (values[g.key]) base[g.key] = values[g.key];
  return base;
}
