/** 데모 › 단계 미리보기 — 단계를 바꾸면 데모 계정의 질문 답변도 그 단계 질문으로 바꾼다 (학부생 답변은 시드와 같음) */
import type { StageKind } from '@core/lib/stage';

type Answers = { questionId: string; answer: string }[];
export const DEMO_STAGE_PROMPTS: Record<'ko' | 'en', Record<StageKind, Answers>> = {
  ko: {
    undergrad: [{ questionId: 'q_now', answer: '정문 카페에서 커피 마시면서 사이드 프로젝트 얘기' }, { questionId: 'q_spot', answer: '중도 4층 창가, 오후엔 햇빛이 딱 좋아요' }, { questionId: 'q_emoji', answer: '☕💻🖼️' }, { questionId: 'q_ask_me', answer: '리액트, 신촌 카페 지도, 전시 추천' }],
    grad: [{ questionId: 'qg_now', answer: '리딩 그룹 끝나고 신촌에서 저녁 한 끼' }, { questionId: 'qg_lab', answer: '조용한데 슬랙은 제일 시끄러운 연구실' }, { questionId: 'q_emoji', answer: '📄☕🏃' }, { questionId: 'qg_explain', answer: '컴퓨터가 사람 말을 더 잘 알아듣게 가르쳐요' }],
    alumni: [{ questionId: 'qa_now', answer: '퇴근하고 성수에서 커피 한잔, 요즘 만드는 것 얘기' }, { questionId: 'qa_hood', answer: '성수. 공장 사이 작은 카페들이 좋아요' }, { questionId: 'qa_style', answer: '점심 한 끼나 30분 커피가 편해요' }, { questionId: 'qa_ask_me', answer: '첫 이직, AI 스타트업, 개발자 커리어' }],
  },
  en: {
    undergrad: [{ questionId: 'q_now', answer: 'Coffee at Southside and talk side projects' }, { questionId: 'q_spot', answer: 'Doe Library 4th floor by the windows' }, { questionId: 'q_ask_me', answer: 'React, best cafés on Telegraph, museum picks' }],
    grad: [{ questionId: 'qg_now', answer: 'Dinner on Telegraph after reading group' }, { questionId: 'qg_lab', answer: 'Quiet room, very loud Slack' }, { questionId: 'q_emoji', answer: '📄☕🏃' }, { questionId: 'qg_explain', answer: 'I teach computers to understand people better' }],
    alumni: [{ questionId: 'qa_now', answer: 'Coffee in SoMa after work, show each other what we’re building' }, { questionId: 'qa_hood', answer: 'The Mission. Tacos and sunny Dolores Park' }, { questionId: 'qa_style', answer: 'Lunch or a 30-minute coffee' }, { questionId: 'qa_ask_me', answer: 'First job switch, AI startups, engineering careers' }],
  },
};
