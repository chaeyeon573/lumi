/** 쓸 모델 고르기 — 키로 쓸 수 있는 것 중 가장 최신 플래그십 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickModel } from './ai';

test('picks the newest flagship the key can use', () => {
  assert.equal(pickModel(['gpt-4o', 'gpt-5', 'gpt-5.1', 'gpt-5-mini', 'gpt-6', 'gpt-6-mini', 'gpt-6-pro', 'gpt-5.2']), 'gpt-6');
  assert.equal(pickModel(['gpt-5.1', 'gpt-5.1-2025-11-13', 'gpt-5', 'gpt-5.2-mini']), 'gpt-5.1');
  assert.equal(pickModel(['gpt-4o', 'gpt-4.1-mini']), 'gpt-4o');
  assert.equal(pickModel(['whisper-1']), undefined);
});
