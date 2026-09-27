/** v2 UX 재설계 — meet 화면 문구 (한국어 원문 → 영어) */
export const en_meet: Record<string, string> = {
  // ─── lib/meet.ts (추천 이유 · 그룹 성격 · 일정 버킷) ───
  '관심사가 비슷한 주최자': 'Host with similar interests', '공개 모임': 'Open meetup', '직업': 'Career', '같은 관심사': 'Shared interests', '같은 분야': 'Same field', '팔로우 중': 'Following', '이후': 'Later',

  // ─── 모임 탭 ───
  '일정': 'Schedule', '그룹에 가입했어요.': 'You joined the group.', '가입 신청을 보냈어요.': 'Request sent.',
  '찾는 활동을 설정하면 더 잘 맞아요': 'Set what you want to do for better picks', '이 조건에 맞는 모임이 아직 없어요.': 'No meetups match this filter yet.',
  '아직 가입한 그룹이 없어요': "You haven't joined a group yet", '그룹 만들기': 'Create group', '원하는 그룹이 없다면 직접 만들어보세요.': "Can't find one? Start your own.",
  '아직 일정이 없어요': 'Nothing scheduled yet', '추천 모임 보기': 'See recommended', '더 할 수 있는 것': 'More ways to meet', '그룹 멤버': 'Group members',

  // ─── 모임 만들기 ───
  '모임을 만들었어요.': 'Meetup created.', '예: 목요일 저녁 러닝 같이 해요': 'e.g. Thursday evening run', '그룹 없이도 모임을 만들 수 있어요.': 'You can create a meetup without a group.',
  '없음': 'None', '장소 이름 (예: 학생회관 카페)': 'Place name (e.g. Student Union café)', '최대 인원': 'Max people', '참가 승인': 'Approve joins',
  '켜면 신청을 확인한 뒤 참가가 확정돼요.': 'When on, you confirm each request before they join.', '종류 (선택)': 'Type (optional)', '설명 (선택)': 'Description (optional)',
  '어떤 사람과 무엇을 하고 싶은지 한두 줄이면 충분해요.': 'A line or two about who and what is enough.', '다른 방법으로 모으기': 'Other ways to gather',

  // ─── 그룹 만들기 ───
  '그룹을 만들었어요.': 'Group created.', '이름': 'Name', '예: 아침 러닝 크루': 'e.g. Morning run crew', '어떤 사람들이 모이는 그룹인지 한두 줄로 적어주세요.': 'A line or two about who gathers here.',
  '성격': 'Based on', '그룹의 성격은 만든 사람이 정해요. 나중에 바꿀 수 있어요.': 'You decide what the group is about. You can change it later.',
  '학교 인증 후 학교 기반 그룹을 만들 수 있어요.': 'Verify your school to create a school-based group.', '관심사 (선택)': 'Interests (optional)', '가입 방식': 'How to join',
  '공개 (바로 가입)': 'Open (join instantly)', '로고': 'Logo',

  // ─── 그룹 페이지 ───
  '그룹을 찾을 수 없어요': 'Group not found', '가입 신청을 취소했어요.': 'Request cancelled.', '그룹에서 나왔어요.': 'You left the group.', '더 보기': 'More',
  '바로 가입': 'Open join', '승인 가입': 'Approval', '가입하기': 'Join', '팔로우했어요. 새 소식 알림을 받아요.': "Following. You'll get updates.",
  '이 그룹에서 모임 만들기': 'Create a meetup in this group', '예정된 모임이 없어요': 'No upcoming meetups', '첫 모임을 열어보세요. 그룹 멤버에게 바로 보여요.': 'Open the first one. Members see it right away.',
  '가입하면 이 그룹의 모임에 참여할 수 있어요.': 'Join the group to take part in its meetups.', '지난 모임': 'Past meetups', '아직 멤버가 없어요': 'No members yet',
  '이 그룹에 글쓰기': 'Post to this group', '그룹 멤버에게만 보이는 글을 올릴 수 있어요.': 'Posts here are visible to members only.', '나가기': 'Leave', '신청 취소': 'Cancel request',
  '운영진은 그룹을 넘긴 뒤 나갈 수 있어요.': 'Admins can leave after handing over the group.',

  // ─── Feed · 글쓰기 ───
  '팔로우한 사람·그룹의 글이 아직 없어요': 'Nothing from people or groups you follow yet', '우리 학교 글이 아직 없어요': 'Nothing from your school yet',
  '재학생만': 'Students', '학교 전체': 'Whole school', '익명 글은 내 학교에만 보여요.': 'Anonymous posts stay within your school.',
  '인터넷 전체 공개는 없어요. 인증된 사용자 안에서만 보여요.': 'Never public on the web. Only verified members can see it.',
  '가입한 그룹이 없어요. 모임 › 그룹에서 찾아보세요.': "You haven't joined a group. Find one under Meet › Groups.", '그룹 선택': 'Choose a group', 'Feed에도 공개': 'Also show on Feed',
};
