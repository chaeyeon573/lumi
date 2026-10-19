/** English demo: a US campus (UC Berkeley) with Greek life, .edu verification and US-style opportunities */
import type {
  Activity, ActivityProposal, ChatRoom, Notification, Organization, Participation, Post, Relationships, School, User, Visibility, ProfileField, Opportunity, OpportunityIntentRecord, TimePoll,
} from '@core/types';
import { addDaysISO, isoHoursAgo, isoMinutesAgo, todayISO } from '@core/lib/format';
import { photo } from '@core/lib/assets';
import { catalogOrganizations } from './catalog/orgs';

const T = todayISO();
const T1 = addDaysISO(1);
const T2 = addDaysISO(2);
const T4 = addDaysISO(4);
const T9 = addDaysISO(9);
const nowPlus = (n: number) => { const d = new Date(Date.now() + n * 60000); const h = Math.min(23, d.getHours()); return `${String(h).padStart(2, '0')}:${String(h === 23 ? 0 : Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0')}`; };

export const DEMO_USER_ID = 'u_me';

const defaultVisibility = (v: Visibility = 'school'): Record<ProfileField, Visibility> => ({
  bio: v, likes: v, freeTime: v, height: 'private', availability: v, preferredPartner: 'private', purposes: v, interests: 'public', posts: v, prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends',
});

export const schools: School[] = [
  { id: 's_berkeley', name: 'UC Berkeley', emailDomain: 'berkeley.edu', region: 'Berkeley', center: { lat: 37.8719, lng: -122.2585 } },
  { id: 's_stanford', name: 'Stanford University', emailDomain: 'stanford.edu', region: 'Palo Alto', center: { lat: 37.4275, lng: -122.1697 } },
  { id: 's_ucla', name: 'UCLA', emailDomain: 'ucla.edu', region: 'Los Angeles', center: { lat: 34.0689, lng: -118.4452 } },
  { id: 's_sfsu', name: 'San Francisco State', emailDomain: 'sfsu.edu', region: 'San Francisco', center: { lat: 37.7219, lng: -122.4782 } },
  { id: 's_mit', name: 'MIT', emailDomain: 'mit.edu', region: 'Cambridge', center: { lat: 42.3601, lng: -71.0942 } },
];

const mk = (u: Partial<User> & Pick<User, 'id' | 'nickname'>): User => ({
  birthYear: 2003, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, identityVerified: false,
  affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Economics', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
  bio: '', likes: '', freeTime: '', availability: 'after18', interests: [], purposes: ['friend'], region: 'Berkeley',
  prompts: [], timetable: [], goals: [], lookingFor: [], canOffer: [], interestedOrgIds: [], meetPreference: ['same_hobby', 'same_goal'],
  fieldVisibility: defaultVisibility(), settings: { messagePolicy: 'connected', notifications: true, locationPermission: 'granted' }, createdAt: isoHoursAgo(24 * 30), ...u,
});

export const users: User[] = [
  mk({
    id: DEMO_USER_ID, nickname: 'Alex', birthYear: 2003, avatar: { emoji: '🧑‍💻', hue: 230, photoType: 'face' , url: photo('p_me') }, photos: [photo('p_me'), photo('c_cafe_laptop'), photo('c_espresso')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Computer Science', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Junior in CS. Building side projects and always down for coffee with new people.', likes: 'Specialty coffee, indie music, museum days', freeTime: 'Coding at a café or walking through Memorial Glade',
    interests: ['coffee', 'study', 'startup', 'exhibition', 'exercise'], purposes: ['friend', 'study', 'networking'], nowWant: 'Coffee on Southside tonight?',
    prompts: [{ questionId: 'q_now', answer: 'Coffee at Southside and talk side projects' }, { questionId: 'q_spot', answer: 'Doe Library 4th floor by the windows' }, { questionId: 'q_ask_me', answer: 'React, best cafés on Telegraph, museum picks' }],
    voicePrompt: { questionId: 'v_now', durationSec: 18, recordedAt: isoHoursAgo(40) },
    poll: { questionId: 'p_gap', options: ['Café', 'Library', 'Walk'], ownChoice: 0, votes: { u_sua: 0, u_jimin: 2 } },
    timetable: [{ id: 'c1', name: 'CS 186 Databases', day: 0, start: '10:00', end: '11:00', room: 'Soda 306', hue: 220 }, { id: 'c2', name: 'CS 162 Operating Systems', day: 0, start: '13:00', end: '14:00', room: 'Wheeler 150', hue: 160 }, { id: 'c3', name: 'CS 186 Databases', day: 2, start: '10:00', end: '11:00', room: 'Soda 306', hue: 220 }, { id: 'c4', name: 'CS 162 Operating Systems', day: 2, start: '13:00', end: '14:00', room: 'Wheeler 150', hue: 160 }, { id: 'c5', name: 'UGBA 105 Entrepreneurship', day: 1, start: '15:00', end: '17:30', room: 'Haas C220', hue: 15 }, { id: 'c6', name: 'CS 169 Capstone', day: 3, start: '14:00', end: '16:30', room: 'Soda 310', hue: 280 }, { id: 'c7', name: 'Public Speaking', day: 4, start: '11:00', end: '12:00', room: 'Dwinelle 88', hue: 45 }],
    goals: ['startup', 'hackathon', 'friends'], lookingFor: ['designer', 'teammate', 'cofounder'], canOffer: ['developer', 'planning'], living: { residence: 'offcampus', zone: 'Northside' }, interestedOrgIds: ['o_ailab', 'o_startup'], meetPreference: ['same_goal', 'same_class', 'same_hobby'], openToNew: true,
  }),
  mk({
    id: 'u_jimin', nickname: 'Maya', birthYear: 2003, gender: 'female', avatar: { emoji: '👩‍🎨', hue: 20, photoType: 'face' , url: photo('p_jimin') }, photos: [photo('p_jimin'), photo('p_x2'), photo('c_road_sunset'), photo('c_stage')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Business (Haas)', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Cafés, galleries and morning runs. Marketing lead at the startup club.', likes: 'Pour-over, museum dates, running by the Marina', freeTime: 'Gallery hopping or finding new cafés', availability: 'after18',
    interests: ['coffee', 'exhibition', 'exercise', 'startup', 'networking'], purposes: ['friend', 'networking', 'dating'], nowWant: 'Coffee on Southside today?',
    prompts: [{ questionId: 'q_now', answer: 'Coffee at 6 on Telegraph, startup talk welcome' }, { questionId: 'q_cafe', answer: 'Flat white at Caffe Strada' }, { questionId: 'q_always', answer: 'Exhibits. Especially photography' }, { questionId: 'q_role', answer: 'Hype person who also books the calendar' }],
    voicePrompt: { questionId: 'v_campus', durationSec: 24, recordedAt: isoHoursAgo(70) },
    poll: { questionId: 'p_first', options: ['Coffee', 'Food', 'Work out'], ownChoice: 0, votes: { u_sua: 0, u_taeho: 1, u_hana: 0 } },
    timetable: [{ id: 'c1', name: 'UGBA 106 Marketing', day: 0, start: '10:30', end: '11:30', hue: 20 }, { id: 'c2', name: 'UGBA 106 Marketing', day: 2, start: '10:30', end: '11:30', hue: 20 }, { id: 'c3', name: 'UGBA 105 Entrepreneurship', day: 1, start: '15:00', end: '17:30', hue: 15 }, { id: 'c4', name: 'UGBA 102A Accounting', day: 3, start: '13:00', end: '14:00', hue: 200 }],
    goals: ['startup', 'friends', 'dating'], lookingFor: ['developer', 'cofounder', 'friend'], canOffer: ['marketing', 'presentation', 'planning'], living: { residence: 'dorm', zone: 'Northside' }, interestedOrgIds: ['o_startup', 'o_sorority'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'coffee', date: T },
  }),
  mk({
    id: 'u_dohyun', nickname: 'Daniel', birthYear: 2001, gender: 'male', avatar: { emoji: '🧑‍🔬', hue: 160, photoType: 'face' , url: photo('p_dohyun') }, photos: [photo('p_dohyun'), photo('c_desktop'), photo('c_abstract1')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'graduate', department: 'EECS (MS)', year: 2025, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'First-year MS in the AI lab. Happy to run a paper reading group.', likes: 'Reading papers, board games, bouldering', freeTime: 'Bouldering near campus', availability: 'afternoon',
    interests: ['research', 'study', 'exercise', 'coffee'], purposes: ['study', 'networking'], nowWant: 'Anyone want to read LLM papers together?',
    prompts: [{ questionId: 'q_project', answer: 'Multimodal LLM paper reviews, undergrad seminar prep' }, { questionId: 'q_study_type', answer: 'Read quietly, then 30 minutes of discussion' }, { questionId: 'q_hobby', answer: 'Bouldering. Beginners welcome' }],
    poll: { questionId: 'p_study', options: ['Glued to the library', 'Café nomad', 'Cramming at home'], ownChoice: 0, votes: { u_yuna: 0 } },
    timetable: [{ id: 'c1', name: 'CS 282 Deep Learning', day: 1, start: '10:00', end: '12:30', hue: 170 }, { id: 'c2', name: 'Lab seminar', day: 2, start: '16:00', end: '17:30', hue: 190 }],
    goals: ['lab', 'hackathon'], lookingFor: ['teammate', 'study_partner'], canOffer: ['research', 'data', 'developer'], living: { residence: 'offcampus', zone: 'Near Soda Hall' }, interestedOrgIds: ['o_ailab'],
  }),
  mk({
    id: 'u_seoyeon', nickname: 'Sofia', birthYear: 2004, gender: 'female', avatar: { emoji: '🎸', hue: 290, photoType: 'masked' , url: photo('p_seoyeon') }, photos: [photo('p_seoyeon'), photo('p_x4'), photo('c_tabby'), photo('c_eguitar')],
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Psychology', year: 2023, emailVerified: true, showSchool: true, showDepartment: false },
    bio: 'Guitar in the campus band. Weekends are for shows in the city.', likes: 'Rock, tacos, cats', freeTime: 'Rehearsal room', availability: 'weekend',
    interests: ['club', 'exhibition', 'meal', 'walk'], purposes: ['friend', 'hobby', 'club'], nowWant: 'Anyone for a show this weekend?',
    prompts: [{ questionId: 'q_into', answer: 'Deep into 90s Britpop again' }, { questionId: 'q_free_day', answer: 'Saturday afternoons. Shows in SF' }, { questionId: 'q_emoji', answer: '🎸🐈🌮' }],
    voicePrompt: { questionId: 'v_song', durationSec: 29, recordedAt: isoHoursAgo(100) },
    timetable: [{ id: 'c1', name: 'PSYCH 101 Stats', day: 0, start: '09:00', end: '10:00', hue: 200 }, { id: 'c2', name: 'PSYCH 120 Cognition', day: 0, start: '15:00', end: '16:00', hue: 300 }, { id: 'c3', name: 'PSYCH 101 Stats', day: 2, start: '09:00', end: '10:00', hue: 200 }, { id: 'c4', name: 'PSYCH 140 Development', day: 1, start: '13:00', end: '14:00', hue: 120 }, { id: 'c5', name: 'MUSIC 27', day: 3, start: '10:00', end: '11:00', hue: 280 }],
    goals: ['friends', 'hobby', 'join_club'], lookingFor: ['friend'], canOffer: ['video', 'club_ops'], living: { residence: 'dorm', zone: 'Northside' }, interestedOrgIds: ['o_band'],
  }),
  mk({
    id: 'u_minjun', nickname: 'Marcus', birthYear: 2002, gender: 'male', avatar: { emoji: '🏃', hue: 120, photoType: 'back' , url: photo('p_minjun') }, photos: [photo('p_minjun'), photo('c_road_sunset'), photo('c_basketball')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_sfsu', schoolName: 'San Francisco State', role: 'undergraduate', department: 'Economics', year: 2021, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Runs every morning. Organizes the Bay Area run crew.', likes: 'Running, protein shakes, cycling', freeTime: 'Bike rides along the Bay Trail', availability: 'now',
    interests: ['exercise', 'cycling', 'walk', 'meal'], purposes: ['friend', 'hobby'], nowWant: '7pm run, join us',
    prompts: [{ questionId: 'q_morning', answer: 'Morning person. 6am runs' }, { questionId: 'q_always', answer: 'A run. I’ll match your pace' }, { questionId: 'q_first_meet', answer: 'Easy 5k then burritos' }],
    poll: { questionId: 'p_weekend', options: ['Out the door', 'Home is better', 'Only for a show'], ownChoice: 0, votes: {} },
    goals: ['hobby', 'friends', 'internship'], lookingFor: ['friend', 'senior'], canOffer: ['club_ops', 'presentation'], living: { residence: 'commute', zone: 'Oakland' },
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'exercise', date: T },
  }),
  mk({
    id: 'u_yuna', nickname: 'Emma', birthYear: 2003, gender: 'female', avatar: { emoji: '📚', hue: 45, photoType: 'face' , url: photo('p_yuna') }, photos: [photo('p_yuna'), photo('p_x3'), photo('c_library')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Statistics', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Starting a stats study group. Quiet cafés are my happy place.', likes: 'R, croissants, long walks', freeTime: 'Cafés near the library', availability: 'afternoon',
    interests: ['study', 'coffee', 'walk', 'research'], purposes: ['study', 'friend'], nowWant: 'Study session at Doe?',
    prompts: [{ questionId: 'q_spot', answer: 'Doe 4th floor by the windows (after 2pm)' }, { questionId: 'q_study_type', answer: 'Quiet café, questions by note' }, { questionId: 'q_ask_me', answer: 'R, stats homework, best croissants' }],
    goals: ['scholarship', 'lab', 'friends'], lookingFor: ['study_partner', 'application_partner'], canOffer: ['data', 'research'], living: { residence: 'commute', zone: 'Downtown Berkeley' }, interestedOrgIds: ['o_stat'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'lunch', date: T },
  }),
  mk({
    id: 'u_taeho', nickname: 'Ethan', birthYear: 2000, gender: 'male', avatar: { emoji: '🚀', hue: 10, photoType: 'face' , url: photo('p_taeho') }, photos: [photo('p_taeho'), photo('p_x5'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'alumni', department: 'EECS', year: 2024, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Founded a startup after graduating. Always up for coffee chats with students.', likes: 'Product, hiking, whiskey', freeTime: 'Coffee chats on Southside', availability: 'after18',
    interests: ['startup', 'networking', 'coffee'], purposes: ['networking'], nowWant: 'Coffee chat if you’re into startups',
    prompts: [{ questionId: 'q_ask_me', answer: 'Shipping an MVP, team building, investor meetings' }, { questionId: 'q_want_person', answer: 'Anyone building something' }, { questionId: 'q_3hours', answer: 'Coffee chats with students at Strada' }],
    voicePrompt: { questionId: 'v_hello', durationSec: 12, recordedAt: isoHoursAgo(200) },
    goals: ['startup', 'cofounder'], lookingFor: ['developer', 'designer', 'cofounder'], canOffer: ['planning', 'marketing'], living: { residence: 'offcampus', zone: 'Southside' }, interestedOrgIds: ['o_startup'],
  }),
  mk({
    id: 'u_hana', nickname: 'Hannah', birthYear: 2004, gender: 'female', avatar: { emoji: '🎨', hue: 340, photoType: 'face' , url: photo('p_hana') }, photos: [photo('p_hana'), photo('p_x1'), photo('c_art'), photo('c_daisy')],
    affiliation: { type: 'university', schoolId: 's_stanford', schoolName: 'Stanford University', role: 'undergraduate', department: 'Art Practice', year: 2023, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Exhibits and flea markets. Looking for people to wander with!', likes: 'Drawing, vintage shops, iced lattes', freeTime: 'Wandering around the Mission', availability: 'weekend',
    interests: ['exhibition', 'shopping', 'walk', 'coffee'], purposes: ['friend', 'hobby'], nowWant: 'Exhibit this weekend?',
    prompts: [{ questionId: 'q_always', answer: 'Exhibits and flea markets' }, { questionId: 'q_new', answer: 'Started shooting film' }, { questionId: 'q_emoji', answer: '🎨📷🧋' }],
    poll: { questionId: 'p_weekend', options: ['Out the door', 'Home is better', 'Only for a show'], ownChoice: 2, votes: { u_seoyeon: 2 } },
    goals: ['hackathon', 'friends', 'hobby'], lookingFor: ['developer', 'teammate', 'friend'], canOffer: ['designer', 'video'], living: { residence: 'commute', zone: 'Palo Alto' },
  }),
  mk({
    id: 'u_junho', nickname: 'Jordan', birthYear: 2002, gender: 'male', avatar: { emoji: '🎤', hue: 265, photoType: 'face' , url: photo('p_junho') }, photos: [photo('p_junho'), photo('p_x6'), photo('c_drum')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Computer Science', year: 2021, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'President of the campus band. Prepping our fall show at the student union.', likes: 'Guitar, ramen, movies', freeTime: 'Rehearsal or a movie', availability: 'in_class',
    interests: ['club', 'exhibition', 'meal', 'coffee'], purposes: ['club', 'friend'],
    prompts: [{ questionId: 'q_project', answer: 'Fall show prep' }, { questionId: 'q_role', answer: 'Treasurer and guitar' }, { questionId: 'q_cafe', answer: 'The ramen place on Durant' }],
    timetable: [{ id: 'c1', name: 'CS 164 Compilers', day: 0, start: '11:00', end: '12:00', hue: 240 }, { id: 'c2', name: 'CS 169 Capstone', day: 3, start: '14:00', end: '16:30', hue: 280 }, { id: 'c3', name: 'CS 164 Compilers', day: 2, start: '11:00', end: '12:00', hue: 240 }, { id: 'c4', name: 'CS 168 Networking', day: 1, start: '09:00', end: '10:00', hue: 180 }, { id: 'c5', name: 'CS 168 Networking', day: 3, start: '09:00', end: '10:00', hue: 180 }],
    goals: ['join_club', 'friends', 'internship'], lookingFor: ['teammate'], canOffer: ['developer', 'club_ops'], living: { residence: 'offcampus', zone: 'Southside' }, interestedOrgIds: ['o_band', 'o_frat'],
  }),
  mk({
    id: 'u_sua', nickname: 'Lily', birthYear: 2005, gender: 'female', avatar: { emoji: '🌱', hue: 95, photoType: 'face' , url: photo('p_sua') }, photos: [photo('p_sua'), photo('c_meadow'), photo('c_bookshop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Computer Science', year: 2024, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Sophomore. Looking for a coding study group and walking buddies.', likes: 'Algorithms, sushi burritos, walks', freeTime: 'Walking through Memorial Glade', availability: 'now',
    interests: ['study', 'walk', 'coffee', 'startup'], purposes: ['study', 'friend'], nowWant: 'Walk through the Glade right now?',
    prompts: [{ questionId: 'q_now', answer: '30-minute walk across campus' }, { questionId: 'q_gap', answer: 'One LeetCode problem, then a walk' }, { questionId: 'q_want_person', answer: 'Someone learning to code with me' }],
    poll: { questionId: 'p_gap', options: ['Café', 'Library', 'Walk'], ownChoice: 2, votes: { u_me: 2 } },
    timetable: [{ id: 'c1', name: 'CS 61B Data Structures', day: 0, start: '09:00', end: '10:00', hue: 220 }, { id: 'c2', name: 'CS 61B Data Structures', day: 2, start: '09:00', end: '10:00', hue: 220 }, { id: 'c3', name: 'CS 70 Discrete Math', day: 1, start: '10:30', end: '11:30', hue: 60 }, { id: 'c4', name: 'CS 70 Discrete Math', day: 3, start: '10:30', end: '11:30', hue: 60 }, { id: 'c5', name: 'R1B Writing', day: 4, start: '13:00', end: '14:00', hue: 330 }],
    goals: ['friends', 'hackathon', 'lunch'], lookingFor: ['study_partner', 'teammate', 'senior'], canOffer: ['developer'], living: { residence: 'dorm', zone: 'Northside' }, interestedOrgIds: ['o_ailab', 'o_startup'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'new_people', date: T },
  }),
  mk({
    id: 'u_woojin', nickname: 'Will', birthYear: 2002, gender: 'male', avatar: { emoji: '🧗', hue: 200, photoType: 'face' , url: photo('p_woojin') }, photos: [photo('p_woojin'), photo('c_cliffroad'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Statistics', year: 2021, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Stats student association. Runs the study groups.', likes: 'Math, climbing, pho', freeTime: 'The climbing gym', availability: 'after18',
    interests: ['study', 'exercise', 'research'], purposes: ['study', 'club'],
    prompts: [{ questionId: 'q_study_type', answer: 'Discussion type. Will argue about one problem for 30 minutes' }, { questionId: 'q_hobby', answer: 'Climbing' }, { questionId: 'q_cafe', answer: 'A pho place on Shattuck (secret)' }],
    timetable: [{ id: 'c1', name: 'CS 186 Databases', day: 0, start: '10:00', end: '11:00', hue: 220 }, { id: 'c2', name: 'CS 186 Databases', day: 2, start: '10:00', end: '11:00', hue: 220 }, { id: 'c3', name: 'STAT 134', day: 1, start: '13:00', end: '14:00', hue: 200 }],
    fieldVisibility: { ...defaultVisibility('school'), timetable: 'school' },
    goals: ['scholarship', 'lab', 'internship'], lookingFor: ['application_partner', 'study_partner'], canOffer: ['data', 'research', 'club_ops'], living: { residence: 'commute', zone: 'Southside' }, interestedOrgIds: ['o_stat'],
  }),
];

/** 아이스브레이커 게임용 프로필 항목 — 데모에서 바로 해 볼 수 있게 몇 명에게만 */
const GAME_PROFILES: Record<string, Partial<User>> = {
  u_jimin: {
    hotTake: { text: 'Moffitt 4th floor is better than any café.', updatedAt: isoHoursAgo(30) },
    twoTruths: { statements: ['🧗 Climbed Indian Rock at sunrise', '🍕 Never paid for lunch this week', '🎨 Has a painting in a café on Telegraph'], lieIndex: 1, updatedAt: isoHoursAgo(30) },
    emojiWeek: { emojis: ['☕', '📉', '🎸'], meaning: 'Way too much coffee, a midterm that did not go great, and a gig on Friday to make up for it', chips: ['Midterm survived 😮‍💨', 'Caffeine + a gig'], updatedAt: isoHoursAgo(20) },
    pickAnswers: [{ questionId: 'gp_2am_friday', answer: 'taco_truck' }, { questionId: 'gp_order', answer: 'latte' }, { questionId: 'gp_weekend', answer: 'city' }],
  },
  u_seoyeon: {
    hotTake: { text: 'Tacos are a weekday food. Ramen is an event.', updatedAt: isoHoursAgo(50) },
    emojiWeek: { emojis: ['🎸', '🐈', '🌮'], meaning: 'Band practice, cat-sitting for my roommate, and taco Tuesday twice', updatedAt: isoHoursAgo(40) },
    pickAnswers: [{ questionId: 'gp_2am_friday', answer: 'show' }, { questionId: 'gp_free_afternoon', answer: 'cafe' }],
  },
  u_dohyun: {
    hotTake: { text: '8AMs should be illegal.', updatedAt: isoHoursAgo(60) },
    twoTruths: { statements: ['📄 Read 40 papers this semester', '🌙 Has never pulled an all-nighter', '🧩 Solves a Rubik’s cube in under a minute'], lieIndex: 1, updatedAt: isoHoursAgo(60) },
    pickAnswers: [{ questionId: 'gp_finals_fuel', answer: 'coffee' }, { questionId: 'gp_group_role', answer: 'leader' }],
  },
  u_yuna: {
    hotTake: { text: 'Group study is just hanging out with extra steps.', updatedAt: isoHoursAgo(80) },
    pickAnswers: [{ questionId: 'gp_2am_friday', answer: 'studying' }, { questionId: 'gp_finals_fuel', answer: 'playlist' }],
  },
};
for (const u of users) Object.assign(u, GAME_PROFILES[u.id] ?? {});

const demoOrganizations: Organization[] = [
  {
    id: 'o_band', name: 'Cal Indie Collective (band club)', logo: { emoji: '🎸', hue: 280 , url: photo('c_eguitar') }, type: 'club', schoolId: 's_berkeley', verified: true,
    description: 'Student bands since 1987. Fall and spring shows at the student union, weekly jams.',
    gallery: [{ emoji: '🎤', hue: 280, caption: 'Spring show' , url: photo('c_stage') }, { emoji: '🥁', hue: 300, caption: 'Rehearsal room' , url: photo('c_drum') }, { emoji: '🎹', hue: 260, caption: 'Welcome night' , url: photo('c_piano') }],
    regularActivities: ['Tue/Thu jams (MLK Student Union basement)', 'Show every semester', 'Winter retreat'],
    recruitment: { title: 'Fall recruiting', period: `${T} – ${T9}`, open: true },
    notices: [{ id: 'n1', title: 'Fall show rehearsal', body: 'Thursday 7pm, student union basement', createdAt: isoHoursAgo(5) }],
    links: [{ label: 'Instagram', url: 'https://instagram.com/example' }, { label: 'Website', url: 'https://example.com/band' }],
    dues: '$20 / semester', joinProcess: 'Come to a jam, no audition',
    followerIds: ['u_seoyeon', 'u_hana', DEMO_USER_ID], memberIds: ['u_junho', 'u_seoyeon'], adminIds: ['u_junho'], applicantIds: [],
  },
  {
    id: 'o_stat', name: 'Statistics Undergraduate Association', logo: { emoji: '📊', hue: 210 , url: photo('c_abacus') }, type: 'council', schoolId: 's_berkeley', parent: 'Statistics', verified: true,
    description: 'Study groups, mentoring and socials for stats majors and friends.',
    gallery: [{ emoji: '📈', hue: 210, caption: 'Mentoring day' , url: photo('c_cafe_laptop') }, { emoji: '🍕', hue: 30, caption: 'Kickoff' , url: photo('c_pizza') }],
    regularActivities: ['Monthly study matching', 'Semester kickoff'],
    notices: [{ id: 'n2', title: 'Midterm study groups', body: 'Group study rooms at Doe Library.', createdAt: isoHoursAgo(30) }],
    links: [{ label: 'Discord', url: 'https://discord.gg/example' }],
    followerIds: ['u_yuna', 'u_woojin'], memberIds: ['u_woojin'], adminIds: ['u_woojin'], applicantIds: [],
  },
  {
    id: 'o_ailab', name: 'Vision & Language Lab', logo: { emoji: '🧠', hue: 170 , url: photo('c_abstract5') }, type: 'lab', schoolId: 's_berkeley', parent: 'EECS', verified: true,
    description: 'Multimodal AI research. Weekly open seminar and undergraduate research apprentices.',
    gallery: [{ emoji: '🖥️', hue: 170, caption: 'Lab' , url: photo('c_desktop') }, { emoji: '📝', hue: 190, caption: 'Seminar' , url: photo('c_two_laptops') }],
    regularActivities: ['Wednesday open seminar (Soda Hall)', 'URAP apprenticeships'],
    recruitment: { title: 'Undergraduate research apprentices', period: `${T} – ${addDaysISO(20)}`, open: true },
    notices: [], links: [{ label: 'Lab website', url: 'https://example.com/lab' }],
    followerIds: ['u_dohyun', DEMO_USER_ID], memberIds: ['u_dohyun'], adminIds: ['u_dohyun'], applicantIds: [],
  },
  {
    id: 'o_startup', name: 'Berkeley Founders Club', logo: { emoji: '🚀', hue: 15 , url: photo('c_abstract3') }, type: 'club', schoolId: 's_berkeley', verified: false,
    description: 'From idea to product. Weekly coffee chats and a demo day each semester.',
    gallery: [{ emoji: '💡', hue: 15, caption: 'Demo day' , url: photo('c_lounge') }],
    regularActivities: ['Friday coffee chats', 'Demo day at semester end'],
    recruitment: { title: 'Fall cohort', period: `${T} – ${addDaysISO(14)}`, open: true },
    notices: [], links: [{ label: 'Notion', url: 'https://notion.so/example' }, { label: 'Instagram', url: 'https://instagram.com/example' }],
    followerIds: ['u_jimin', 'u_taeho'], memberIds: ['u_jimin', 'u_taeho'], adminIds: ['u_taeho'], applicantIds: [],
  },
  {
    id: 'o_sorority', name: 'Kappa Delta Chi (sorority)', logo: { emoji: '🌸', hue: 335 , url: photo('c_daisy') }, type: 'greek', schoolId: 's_berkeley', verified: true,
    description: 'A values-based sorority focused on service, sisterhood and academics. Formal recruitment each fall; informal recruitment in spring.',
    gallery: [{ emoji: '🌸', hue: 335, caption: 'Bid day' , url: photo('c_balloon') }, { emoji: '🤝', hue: 320, caption: 'Service weekend' , url: photo('c_meadow') }],
    regularActivities: ['Weekly chapter meeting (Mon 7pm)', 'Monthly service event', 'Study hours at the house'],
    recruitment: { title: 'Fall formal recruitment', period: `${T2} – ${addDaysISO(8)}`, open: true },
    notices: [{ id: 'n3', title: 'Recruitment info session', body: 'Open to anyone curious about Greek life. Sproul Plaza, Wednesday 5pm.', createdAt: isoHoursAgo(10) }],
    links: [{ label: 'Instagram', url: 'https://instagram.com/example' }, { label: 'Panhellenic', url: 'https://example.com/panhellenic' }],
    dues: '$450 / semester (payment plans available)', joinProcess: 'Register with Panhellenic → 4 rounds of recruitment → bid day',
    policyNote: 'UC Berkeley requires all Greek organizations to follow the campus anti-hazing policy. Report concerns anonymously via the Office of Student Conduct.',
    followerIds: ['u_jimin', 'u_hana'], memberIds: [], adminIds: [], applicantIds: [],
  },
  {
    id: 'o_frat', name: 'Theta Tau (professional engineering fraternity)', logo: { emoji: '⚙️', hue: 200 , url: photo('c_dome') }, type: 'greek', schoolId: 's_berkeley', verified: true,
    description: 'Co-ed professional fraternity for engineers. Career workshops, alumni network, and brotherhood events.',
    gallery: [{ emoji: '⚙️', hue: 200, caption: 'Rush week' , url: photo('c_dome') }, { emoji: '🏗️', hue: 220, caption: 'Alumni panel' , url: photo('c_two_laptops') }],
    regularActivities: ['Rush week each semester', 'Bi-weekly professional workshops'],
    recruitment: { title: 'Fall rush', period: `${T1} – ${addDaysISO(7)}`, open: true },
    notices: [],
    links: [{ label: 'Website', url: 'https://example.com/thetatau' }, { label: 'Instagram', url: 'https://instagram.com/example' }],
    dues: '$180 / semester', joinProcess: 'Attend 2+ rush events → interview → pledge semester',
    policyNote: 'Follows campus anti-hazing policy. Dry rush.',
    followerIds: ['u_junho', 'u_dohyun'], memberIds: [], adminIds: [], applicantIds: [],
  },
  {
    id: 'o_run', name: 'Bay Area Run Crew', logo: { emoji: '🏃', hue: 130 , url: photo('c_road_sunset') }, type: 'club', schoolId: 's_sfsu', verified: false,
    description: 'Cross-campus running crew. Beginners welcome.',
    gallery: [{ emoji: '🌅', hue: 130, caption: 'Morning run' , url: photo('c_road_sunset') }],
    regularActivities: ['Mon/Wed/Fri 7pm runs'], notices: [], links: [{ label: 'Strava', url: 'https://strava.com/example' }],
    followerIds: ['u_minjun', 'u_jimin'], memberIds: ['u_minjun'], adminIds: ['u_minjun'], applicantIds: [],
  },
];

/** 데모 조직 + 캠퍼스 동아리·그리스 조직 목록 (이름이 겹치는 항목은 데모 쪽을 우선) */
export const organizations: Organization[] = [
  ...demoOrganizations,
  ...catalogOrganizations.filter((o) => !demoOrganizations.some((d) => d.schoolId === o.schoolId && d.name.toLowerCase().startsWith(o.name.toLowerCase().split(' (')[0]))),
];

export const activities: Activity[] = [
  {
    id: 'a_coffee_sinchon', kind: 'personal', category: 'coffee', title: 'Coffee on Southside', description: 'Anyone into startups or AI. Casual chat. Up to 4, Berkeley students only.',
    cover: { emoji: '☕', hue: 30 , url: photo('c_espresso') }, hostId: 'u_jimin', hostType: 'user', date: T, startTime: '18:00', endTime: '19:30',
    place: { name: 'Caffe Strada', address: 'College Ave & Bancroft', lat: 37.8690, lng: -122.2547 },
    capacity: 4, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [{ id: 'c1', authorId: 'u_sua', text: 'Is it okay if I’m just getting into startups?', createdAt: isoMinutesAgo(40) }, { id: 'c2', authorId: 'u_jimin', text: 'Totally! Come by :)', createdAt: isoMinutesAgo(35) }], createdAt: isoHoursAgo(2),
  },
  {
    id: 'a_stat_study', kind: 'group', category: 'study', title: 'Stats midterm study group', description: 'Regression and probability. Non-majors welcome.',
    cover: { emoji: '📖', hue: 220 , url: photo('c_cafe_laptop') }, hostId: 'u_woojin', hostType: 'user', orgId: 'o_stat', date: T, startTime: '14:00', endTime: '17:00',
    place: { name: 'Doe Library, group study room 3', lat: 37.8722, lng: -122.2592 }, capacity: 6, visibility: 'public', joinPolicy: 'approval', fee: 0, conditions: 'Took intro stats', comments: [], createdAt: isoHoursAgo(20),
  },
  {
    id: 'a_band_show', kind: 'org_event', category: 'performance', title: 'Cal Indie Collective fall show', description: 'Student bands live. New member sets too. Bring friends.',
    cover: { emoji: '🎤', hue: 285 , url: photo('c_stage') }, hostId: 'u_junho', hostType: 'org', orgId: 'o_band', date: T2, startTime: '19:00', endTime: '21:00',
    place: { name: 'MLK Student Union, Pauley Ballroom', lat: 37.8692, lng: -122.2598 }, capacity: 200, visibility: 'public', joinPolicy: 'open', fee: 0,
    comments: [{ id: 'c3', authorId: 'u_hana', text: 'Can students from other schools come?', createdAt: isoHoursAgo(3) }, { id: 'c4', authorId: 'u_junho', text: 'Yes! Everyone welcome.', createdAt: isoHoursAgo(2) }], createdAt: isoHoursAgo(48),
  },
  {
    id: 'a_running', kind: 'group', category: 'exercise', title: 'Easy 5k run', description: 'Start at Edwards Track, loop around campus. 10-min miles, beginners welcome. Burritos after.',
    cover: { emoji: '🏃', hue: 135 , url: photo('c_road_sunset') }, hostId: 'u_minjun', hostType: 'user', orgId: 'o_run', date: T, startTime: '19:00', endTime: '20:00',
    place: { name: 'Edwards Track', lat: 37.8697, lng: -122.2645 }, capacity: 10, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(6),
  },
  {
    id: 'a_startup_chat', kind: 'personal', category: 'networking', title: 'Founder coffee chat — product talk', description: 'Recent grad who started a company. Ask anything: MVPs, team building.',
    cover: { emoji: '🚀', hue: 15 , url: photo('c_two_laptops') }, hostId: 'u_taeho', hostType: 'user', orgId: 'o_startup', date: T1, startTime: '18:30', endTime: '20:00',
    place: { name: 'Blue Bottle (Berkeley)', lat: 37.8712, lng: -122.2670 }, capacity: 5, visibility: 'school', joinPolicy: 'approval', fee: 0, conditions: 'Berkeley students into startups', comments: [], createdAt: isoHoursAgo(10),
  },
  {
    id: 'a_ai_seminar', kind: 'org_event', category: 'seminar', title: 'Open seminar: multimodal LLMs', description: 'Review of recent multimodal models. Undergrads welcome, no prior knowledge needed. Apprentice Q&A after.',
    cover: { emoji: '🧠', hue: 175 , url: photo('c_abstract1') }, hostId: 'u_dohyun', hostType: 'org', orgId: 'o_ailab', date: T1, startTime: '16:00', endTime: '17:30',
    place: { name: 'Soda Hall 306', lat: 37.8756, lng: -122.2588 }, capacity: 40, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(72),
  },
  {
    id: 'a_band_recruit', kind: 'org_event', category: 'club', title: 'Club recruiting tables', description: 'Tabling on Sproul. Try a guitar!',
    cover: { emoji: '🎸', hue: 270 , url: photo('c_eguitar') }, hostId: 'u_junho', hostType: 'org', orgId: 'o_band', date: T, startTime: '11:00', endTime: '17:00',
    place: { name: 'Sproul Plaza', lat: 37.8697, lng: -122.2594 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(30),
  },
  {
    id: 'a_festival', kind: 'org_event', category: 'school_event', title: 'Homecoming kickoff', description: 'Official campus event at the Greek Theatre. Bring your student ID.',
    cover: { emoji: '🎓', hue: 355 , url: photo('c_tents') }, hostId: 'u_junho', hostType: 'org', official: true, date: T4, startTime: '17:00', endTime: '22:00',
    place: { name: 'Greek Theatre', lat: 37.8735, lng: -122.2541 }, capacity: 3000, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(100),
  },
  {
    id: 'a_exhibit', kind: 'personal', category: 'etc', title: 'Weekend exhibit (SFMOMA)', description: 'Saturday afternoon in the city. Photography lovers!',
    cover: { emoji: '🎨', hue: 335 , url: photo('c_hall') }, hostId: 'u_hana', hostType: 'user', date: addDaysISO(3), startTime: '14:00', endTime: '18:00',
    place: { name: 'Downtown Berkeley BART', lat: 37.8701, lng: -122.2681 }, capacity: 3, visibility: 'public', joinPolicy: 'approval', fee: 25, conditions: 'Museum ticket on you', comments: [], createdAt: isoHoursAgo(9),
  },
  {
    id: 'a_walk', openSlot: true, kind: 'personal', category: 'etc', title: 'Walk across the Glade', description: 'Clear my head after class. Easy conversation.',
    cover: { emoji: '🚶', hue: 100 , url: photo('c_bench') }, hostId: 'u_sua', hostType: 'user', date: T, startTime: '15:30', endTime: '16:00',
    place: { name: 'Memorial Glade', lat: 37.8730, lng: -122.2596 }, capacity: 2, visibility: 'department', visibilityTargets: ['Computer Science'], joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(25),
  },
  {
    id: 'a_deal', kind: 'org_event', category: 'store_deal', title: 'Buy-one-get-one lattes with student ID', description: 'Today only at the café on Telegraph. Show this screen.',
    cover: { emoji: '🏷️', hue: 50 , url: photo('c_mug') }, hostId: 'u_taeho', hostType: 'user', date: T, startTime: '10:00', endTime: '21:00',
    place: { name: 'Café Milano', lat: 37.8681, lng: -122.2590 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(12),
  },
  {
    id: 'a_friends_dinner', kind: 'group', category: 'meal', title: 'Friends dinner (tacos)', description: 'Friends only. Post-midterm tacos!',
    cover: { emoji: '🌮', hue: 10 , url: photo('c_burrito') }, hostId: 'u_seoyeon', hostType: 'user', date: T1, startTime: '19:00', endTime: '20:30',
    place: { name: 'Taqueria on Durant', lat: 37.8676, lng: -122.2580 }, capacity: 5, visibility: 'friends', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(4),
  },
  {
    id: 'a_invite_only', kind: 'group', category: 'study', title: 'Capstone team meeting', description: 'Invited team members only.',
    cover: { emoji: '🗂️', hue: 200 , url: photo('c_lounge') }, hostId: 'u_junho', hostType: 'user', date: T2, startTime: '13:00', endTime: '15:00',
    place: { name: 'Soda Hall 405', lat: 37.8756, lng: -122.2588 }, capacity: 4, visibility: 'public', joinPolicy: 'invite', invitedIds: ['u_sua'], fee: 0, comments: [], createdAt: isoHoursAgo(50),
  },
  {
    id: 'a_mine', kind: 'personal', category: 'study', title: 'React side project — looking for teammates', description: 'Weekly meetups. Portfolio project. A designer would be amazing.',
    cover: { emoji: '💻', hue: 235 , url: photo('c_laptop') }, hostId: DEMO_USER_ID, hostType: 'user', date: T2, startTime: '18:00', endTime: '20:00',
    place: { name: 'Doe Library café', lat: 37.8722, lng: -122.2592 }, capacity: 4, visibility: 'school', joinPolicy: 'approval', fee: 0, rolesNeeded: ['designer', 'developer'],
    comments: [{ id: 'c5', authorId: 'u_hana', text: 'I do design and I’m interested!', createdAt: isoHoursAgo(1) }], createdAt: isoHoursAgo(26),
  },
  {
    id: 'a_now_lunch', openSlot: true, kind: 'personal', category: 'meal', title: 'Hate eating alone — grab a bite at Crossroads?', description: 'Free period, heading to Crossroads. Anyone welcome, up to 4.',
    cover: { emoji: '🍱', hue: 30 , url: photo('c_burrito') }, hostId: 'u_sua', hostType: 'user', date: T, startTime: nowPlus(25), endTime: nowPlus(85),
    place: { name: 'Crossroads dining', area: 'Near Unit 2', lat: 37.8672, lng: -122.2560 }, capacity: 4, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(8),
  },
  {
    id: 'a_now_coffee', openSlot: true, kind: 'personal', category: 'coffee', title: 'Coffee at Strada, 30 min', description: 'Taking a break from a stats report. One coffee, easy chat.',
    cover: { emoji: '☕', hue: 25 , url: photo('c_mug') }, hostId: 'u_yuna', hostType: 'user', date: T, startTime: nowPlus(50), endTime: nowPlus(80),
    place: { name: 'Caffe Strada', area: 'Near College Ave', lat: 37.8690, lng: -122.2547 }, capacity: 3, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(12),
  },
  {
    id: 'a_now_badminton', kind: 'personal', category: 'exercise', title: 'Badminton, 2 hours, spare rackets', description: 'Booked a court at the RSF. Beginners welcome. Court number after approval.',
    cover: { emoji: '🏸', hue: 140 , url: photo('c_volleyball') }, hostId: 'u_minjun', hostType: 'user', date: T, startTime: nowPlus(150), endTime: nowPlus(270),
    place: { name: 'RSF court 3', area: 'Near the RSF', lat: 37.8686, lng: -122.2628 }, capacity: 4, visibility: 'public', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoMinutesAgo(40),
  },
  {
    id: 'a_crew_db', kind: 'group', category: 'study', title: 'CS 186 midterm Study Crew', courseName: 'CS 186 Databases', crewType: 'exam', mode: 'offline', description: 'Normalization and SQL. Split past exams and explain to each other.',
    cover: { emoji: '📝', hue: 220 , url: photo('c_library') }, hostId: 'u_woojin', hostType: 'user', date: T1, startTime: '11:30', endTime: '13:00',
    place: { name: 'Doe Library group room 2', lat: 37.8722, lng: -122.2592 }, capacity: 5, visibility: 'department', visibilityTargets: ['course:CS 186 Databases'], joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(7),
  },
  {
    id: 'a_crew_startup', kind: 'group', category: 'study', title: 'UGBA 105 project crew (idea narrowing)', courseName: 'UGBA 105 Entrepreneurship', crewType: 'project', mode: 'online', description: '30 minutes on Zoom after class. Narrow to two ideas.',
    cover: { emoji: '🧩', hue: 15 , url: photo('c_two_laptops') }, hostId: 'u_jimin', hostType: 'user', date: T1, startTime: '18:00', endTime: '18:30',
    place: { name: 'Online (Zoom)', lat: 37.8716, lng: -122.2530 }, capacity: 4, visibility: 'department', visibilityTargets: ['course:UGBA 105 Entrepreneurship'], joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(3),
  },
  {
    id: 'a_hack_team', kind: 'group', category: 'networking', title: 'Hackathon team needs a designer + PM', opportunityId: 'op_hackathon', rolesNeeded: ['designer', 'planning'], mode: 'offline', description: 'Two devs on board. Looking for one designer and one PM. Topic: dining hall crowd levels.',
    cover: { emoji: '💡', hue: 230 , url: photo('c_abstract2') }, hostId: 'u_dohyun', hostType: 'user', date: T4, startTime: '19:00', endTime: '21:00',
    place: { name: 'Soda Hall lounge', lat: 37.8756, lng: -122.2588 }, capacity: 4, visibility: 'school', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(5),
  },
];

export const participations: Participation[] = [
  { id: 'p1', activityId: 'a_coffee_sinchon', userId: 'u_sua', status: 'approved', createdAt: isoMinutesAgo(30) },
  { id: 'p2', activityId: 'a_coffee_sinchon', userId: 'u_taeho', status: 'approved', createdAt: isoMinutesAgo(50) },
  { id: 'p3', activityId: 'a_stat_study', userId: 'u_yuna', status: 'approved', createdAt: isoHoursAgo(10) },
  { id: 'p4', activityId: 'a_stat_study', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(8) },
  { id: 'p5', activityId: 'a_running', userId: 'u_jimin', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p6', activityId: 'a_running', userId: DEMO_USER_ID, status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p7', activityId: 'a_band_show', userId: 'u_hana', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p8', activityId: 'a_band_show', userId: 'u_seoyeon', status: 'approved', createdAt: isoHoursAgo(40) },
  { id: 'p9', activityId: 'a_mine', userId: 'u_hana', status: 'pending', message: 'Designer here. Fluent in Figma!', createdAt: isoMinutesAgo(55) },
  { id: 'p10', activityId: 'a_mine', userId: 'u_sua', status: 'pending', message: 'Learning React and would love to join.', createdAt: isoMinutesAgo(20) },
  { id: 'p11', activityId: 'a_mine', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(5) },
  { id: 'p12', activityId: 'a_ai_seminar', userId: 'u_sua', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p13', activityId: 'a_ai_seminar', userId: 'u_woojin', status: 'approved', createdAt: isoHoursAgo(7) },
  { id: 'p14', activityId: 'a_startup_chat', userId: 'u_jimin', status: 'approved', createdAt: isoHoursAgo(9) },
  { id: 'p15', activityId: 'a_friends_dinner', userId: 'u_junho', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p16', activityId: 'a_now_lunch', userId: 'u_jimin', status: 'approved', createdAt: isoMinutesAgo(5) },
  { id: 'p17', activityId: 'a_crew_db', userId: 'u_junho', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p18', activityId: 'a_crew_startup', userId: 'u_taeho', status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p19', activityId: 'a_hack_team', userId: 'u_sua', status: 'approved', createdAt: isoHoursAgo(4) },
  { id: 'p20', activityId: 'a_now_badminton', userId: 'u_woojin', status: 'approved', createdAt: isoMinutesAgo(30) },
];

export const posts: Post[] = [
  { id: 'po13', authorId: 'u_jimin', authorType: 'user', postType: 'review', media: [{ emoji: '🌅', hue: 130 , url: photo('c_road_sunset') }, { emoji: '🌯', hue: 20 , url: photo('c_burrito') }], text: 'Burritos after the run. First full 5k! Who’s in next week?', topics: ['exercise', 'friends'], tags: ['running', 'berkeley'], visibility: 'school', likeIds: ['u_minjun', DEMO_USER_ID, 'u_sua'], savedIds: [], comments: [], relatedActivityId: 'a_running', taggedUserIds: ['u_minjun', DEMO_USER_ID], tagApprovedIds: ['u_minjun'], recruitNext: true, showOnProfile: true, showOnFeed: true, createdAt: isoMinutesAgo(50) },
  { id: 'po14', authorId: DEMO_USER_ID, authorType: 'user', postType: 'story', media: [{ emoji: '🐈', hue: 290 , url: photo('c_tabby') }], text: 'Rehearsal room cat update. Showed up for work again.', topics: ['daily'], tags: ['cat'], visibility: 'friends', likeIds: ['u_seoyeon'], savedIds: [], comments: [], taggedUserIds: ['u_seoyeon'], tagApprovedIds: ['u_seoyeon'], showOnProfile: true, showOnFeed: false, createdAt: isoHoursAgo(8) },
  { id: 'po15', authorId: 'u_taeho', authorType: 'user', postType: 'together', media: [], text: 'Still without a hackathon team? We have one PM spot left. Check the team and reach out.', topics: ['startup', 'career'], tags: ['hackathon', 'team'], visibility: 'school', likeIds: ['u_hana'], savedIds: [], comments: [], relatedActivityId: 'a_hack_team', relatedOpportunityId: 'op_hackathon', showOnProfile: true, showOnFeed: true, createdAt: isoHoursAgo(2) },
  { id: 'po10', authorId: 'u_woojin', authorType: 'user', postType: 'question', media: [], anonymous: true, text: 'Is the AC on Doe 3rd floor way too cold for anyone else? Blanket required… where do you all study?', tags: ['doelibrary', 'anon'], visibility: 'school', likeIds: ['u_sua', 'u_yuna', 'u_jimin'], savedIds: [], comments: [{ id: 'pc10', authorId: 'u_yuna', text: '4th floor by the windows. It’s fine there', createdAt: isoMinutesAgo(30) }, { id: 'pc11', authorId: 'u_woojin', text: 'Oh thank you!', createdAt: isoMinutesAgo(20) }], createdAt: isoMinutesAgo(45) },
  { id: 'po11', authorId: 'u_seoyeon', authorType: 'user', postType: 'story', media: [], anonymous: true, text: 'Anyone else eat alone a lot? I feel weirdly self-conscious at Crossroads… is it just me', tags: ['anon', 'dining'], visibility: 'school', likeIds: ['u_sua', 'u_minjun', 'u_hana', 'u_dohyun', 'u_taeho'], savedIds: [], comments: [{ id: 'pc12', authorId: 'u_sua', text: 'Me too!! Let’s get lunch. I’ll open a lunch slot in Plans', createdAt: isoHoursAgo(1) }], createdAt: isoHoursAgo(3) },
  { id: 'po12', authorId: 'u_hana', authorType: 'user', postType: 'question', media: [], anonymous: true, text: 'First club interview ever — what do they ask? Applied to the band club 🎸', tags: ['clubs', 'interview', 'anon'], visibility: 'public', likeIds: ['u_junho'], savedIds: [], comments: [{ id: 'pc13', authorId: 'u_junho', text: 'No interview for us! Just come jam :)', createdAt: isoHoursAgo(5) }], createdAt: isoHoursAgo(6) },
  { id: 'po1', authorId: 'u_jimin', authorType: 'user', postType: 'together', media: [{ emoji: '☕', hue: 30 , url: photo('c_espresso') }, { emoji: '🍰', hue: 20 , url: photo('c_mug') }], text: 'New café on Telegraph. The flat white is legit. Hosting a coffee meetup here tonight ☕', tags: ['berkeleycafes', 'coffee'], visibility: 'public', likeIds: ['u_sua', 'u_taeho', 'u_hana'], savedIds: [], comments: [{ id: 'pc1', authorId: 'u_sua', text: 'I’m coming!!', createdAt: isoMinutesAgo(50) }], relatedActivityId: 'a_coffee_sinchon', createdAt: isoHoursAgo(2) },
  { id: 'po2', authorId: 'u_junho', authorType: 'org', postType: 'news', orgId: 'o_band', media: [{ emoji: '🎤', hue: 285 , url: photo('c_stage') }], text: 'Fall show in 2 days! See you at Pauley Ballroom. New member sets 🎸', tags: ['band', 'fallshow', 'club'], visibility: 'public', likeIds: ['u_seoyeon', 'u_hana', 'u_jimin', DEMO_USER_ID], savedIds: [DEMO_USER_ID], comments: [], relatedActivityId: 'a_band_show', createdAt: isoHoursAgo(5) },
  { id: 'po3', authorId: 'u_minjun', authorType: 'user', postType: 'together', media: [{ emoji: '🌅', hue: 130 , url: photo('c_road_sunset') }], text: '10k along the Bay this morning. 5k at Edwards Track tonight — beginners welcome!', tags: ['running', 'runcrew'], visibility: 'public', likeIds: ['u_jimin', 'u_woojin'], savedIds: [], comments: [{ id: 'pc2', authorId: 'u_jimin', text: 'See you tonight!', createdAt: isoHoursAgo(1) }], relatedActivityId: 'a_running', createdAt: isoHoursAgo(7) },
  { id: 'po4', authorId: 'u_seoyeon', authorType: 'user', postType: 'story', media: [{ emoji: '🐈', hue: 290 , url: photo('c_tabby') }, { emoji: '🎸', hue: 280 , url: photo('c_eguitar') }], text: 'A cat wandered into rehearsal. Practice ruined, day made 😻 (friends only)', tags: ['cat', 'rehearsal'], visibility: 'friends', likeIds: [DEMO_USER_ID], savedIds: [], comments: [], createdAt: isoHoursAgo(9) },
  { id: 'po5', authorId: 'u_dohyun', authorType: 'org', postType: 'news', orgId: 'o_ailab', media: [{ emoji: '🧠', hue: 175 , url: photo('c_abstract1') }], text: 'Open seminar tomorrow 4pm at Soda Hall. Multimodal LLM review + apprentice Q&A. No background needed.', tags: ['AI', 'seminar', 'lab'], visibility: 'public', likeIds: ['u_sua', DEMO_USER_ID], savedIds: ['u_sua'], comments: [], relatedActivityId: 'a_ai_seminar', createdAt: isoHoursAgo(12) },
  { id: 'po6', authorId: 'u_yuna', authorType: 'user', postType: 'info', media: [{ emoji: '📚', hue: 45 , url: photo('c_library') }], text: 'Doe 4th floor window seats: no glare after 2pm, perfect for laptops. (Berkeley only)', tags: ['doelibrary', 'study'], visibility: 'school', likeIds: ['u_woojin'], savedIds: [], comments: [], createdAt: isoHoursAgo(15) },
  { id: 'po7', authorId: 'u_hana', authorType: 'user', postType: 'review', media: [{ emoji: '🎨', hue: 335 , url: photo('c_art') }, { emoji: '📷', hue: 320 , url: photo('c_chair') }], text: 'Last week at SFMOMA. Going again this weekend — I opened an activity if you want to come!', tags: ['exhibit', 'sf', 'review'], visibility: 'public', likeIds: ['u_jimin', 'u_seoyeon'], savedIds: [], comments: [{ id: 'pc3', authorId: 'u_seoyeon', text: 'Gorgeous photos', createdAt: isoHoursAgo(20) }], relatedActivityId: 'a_exhibit', createdAt: isoHoursAgo(22) },
  { id: 'po8', authorId: 'u_taeho', authorType: 'user', postType: 'info', media: [{ emoji: '🏷️', hue: 50 , url: photo('c_mug') }], text: 'Café Milano: BOGO lattes with a student ID today. Sharing the local intel!', tags: ['nearcampus', 'deal'], visibility: 'public', likeIds: ['u_sua', 'u_jimin', 'u_minjun', 'u_yuna'], savedIds: [], comments: [], relatedActivityId: 'a_deal', createdAt: isoHoursAgo(11) },
  { id: 'po9', authorId: DEMO_USER_ID, authorType: 'user', media: [{ emoji: '💻', hue: 235 , url: photo('c_laptop') }], text: 'Recruiting for a side project! Building a campus app in React.', tags: ['sideproject', 'react'], visibility: 'school', likeIds: ['u_sua', 'u_hana'], savedIds: [], comments: [], relatedActivityId: 'a_mine', createdAt: isoHoursAgo(26) },
];

export const relationships: Relationships = {
  likes: [{ fromId: 'u_jimin', toId: DEMO_USER_ID, createdAt: isoHoursAgo(3) }, { fromId: 'u_hana', toId: DEMO_USER_ID, createdAt: isoHoursAgo(8) }, { fromId: DEMO_USER_ID, toId: 'u_yuna', createdAt: isoHoursAgo(30) }],
  follows: [{ fromId: DEMO_USER_ID, toId: 'u_taeho', targetType: 'user' }, { fromId: DEMO_USER_ID, toId: 'o_band', targetType: 'org' }, { fromId: DEMO_USER_ID, toId: 'o_ailab', targetType: 'org' }, { fromId: 'u_sua', toId: DEMO_USER_ID, targetType: 'user' }, { fromId: 'u_jimin', toId: DEMO_USER_ID, targetType: 'user' }],
  friendRequests: [{ id: 'fr1', fromId: 'u_minjun', toId: DEMO_USER_ID, status: 'pending', createdAt: isoHoursAgo(2) }, { id: 'fr2', fromId: DEMO_USER_ID, toId: 'u_dohyun', status: 'pending', createdAt: isoHoursAgo(20) }],
  friends: [{ a: DEMO_USER_ID, b: 'u_seoyeon', since: isoHoursAgo(24 * 20) }, { a: DEMO_USER_ID, b: 'u_junho', since: isoHoursAgo(24 * 60) }, { a: DEMO_USER_ID, b: 'u_sua', since: isoHoursAgo(24 * 5) }, { a: 'u_seoyeon', b: 'u_junho', since: isoHoursAgo(24 * 90) }, { a: 'u_jimin', b: 'u_seoyeon', since: isoHoursAgo(24 * 30) }],
  blocks: [],
};

export const proposals: ActivityProposal[] = [
  { id: 'pr1', fromId: 'u_sua', toId: DEMO_USER_ID, category: 'study', message: 'Algorithms session Thursday evening?', when: `${T2} 19:00`, status: 'pending', createdAt: isoHoursAgo(1), expiresAt: new Date(Date.now() + 47 * 3600000).toISOString() },
];

export const chatRooms: ChatRoom[] = [
  { id: 'cr_seoyeon', type: 'direct', memberIds: [DEMO_USER_ID, 'u_seoyeon'], createdAt: isoHoursAgo(24 * 20), messages: [{ id: 'm1', senderId: 'u_seoyeon', text: 'Tacos tomorrow, right?', createdAt: isoHoursAgo(3) }, { id: 'm2', senderId: DEMO_USER_ID, text: 'Obviously lol, 7?', createdAt: isoHoursAgo(2.5) }, { id: 'm3', senderId: 'u_seoyeon', text: 'Yep, Jordan’s coming too', createdAt: isoHoursAgo(2) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(2.4), u_seoyeon: isoHoursAgo(2) } },
  { id: 'cr_junho', type: 'direct', memberIds: [DEMO_USER_ID, 'u_junho'], createdAt: isoHoursAgo(24 * 60), messages: [{ id: 'm4', senderId: 'u_junho', text: 'Saved you two tickets for the show', createdAt: isoHoursAgo(26) }, { id: 'm5', senderId: DEMO_USER_ID, text: 'Thank you!! Bringing a friend', createdAt: isoHoursAgo(25) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(25), u_junho: isoHoursAgo(25) } },
  { id: 'cr_running', type: 'activity', activityId: 'a_running', memberIds: ['u_minjun', 'u_jimin', DEMO_USER_ID], title: '7pm run (5k)', createdAt: isoHoursAgo(6), messages: [{ id: 'm6', senderId: 'u_minjun', text: 'Meet at the track entrance at 6:50!', createdAt: isoHoursAgo(1.5) }, { id: 'm7', senderId: 'u_jimin', text: 'Bringing water', createdAt: isoHoursAgo(1) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(3) } },
  { id: 'cr_mine', type: 'activity', activityId: 'a_mine', memberIds: [DEMO_USER_ID, 'u_dohyun'], title: 'React side project — looking for teammates', createdAt: isoHoursAgo(5), messages: [{ id: 'm8', senderId: 'u_dohyun', text: 'I can take the backend. Python ok?', createdAt: isoHoursAgo(4) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(4) } },
  { id: 'cr_band', type: 'org', orgId: 'o_band', memberIds: ['u_junho', 'u_seoyeon', 'u_hana', DEMO_USER_ID], title: 'Cal Indie Collective followers', createdAt: isoHoursAgo(24 * 10), messages: [{ id: 'm9', senderId: 'u_junho', text: '[Notice] Fall show rehearsal Thursday 7pm. Followers welcome to watch!', createdAt: isoHoursAgo(5) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(6) } },
];

export const notifications: Notification[] = [
  { id: 'nt1', userId: DEMO_USER_ID, type: 'participation_request', title: '2 join requests', body: 'Hannah and Lily asked to join "React side project".', link: '/activities/a_mine/manage', read: false, createdAt: isoMinutesAgo(20) },
  { id: 'nt9', userId: DEMO_USER_ID, type: 'deadline', title: 'Deadline in 4 days', body: 'Your saved "Cal Alumni Leadership Scholarship" closes soon.', link: '/opportunities/op_scholarship', read: false, createdAt: isoMinutesAgo(10) },
  { id: 'nt10', userId: DEMO_USER_ID, type: 'opportunity_match', title: 'People to team up with', body: '2 students applying to the AI Campus Hackathon are looking for a developer.', link: '/opportunities/op_hackathon', read: false, createdAt: isoHoursAgo(2) },
  { id: 'nt2', userId: DEMO_USER_ID, type: 'proposal', title: 'New proposal', body: 'Lily proposed an algorithms study session.', link: '/chats?tab=requests', read: false, createdAt: isoHoursAgo(1) },
  { id: 'nt3', userId: DEMO_USER_ID, type: 'activity_reminder', title: 'Starts in 1 hour', body: '"7pm run (5k)" starts soon. Head to Edwards Track.', link: '/activities/a_running', read: false, createdAt: isoHoursAgo(1.2) },
  { id: 'nt4', userId: DEMO_USER_ID, type: 'comment', title: 'New comment', body: 'Hannah commented on "React side project".', link: '/activities/a_mine', read: true, createdAt: isoHoursAgo(1) },
  { id: 'nt5', userId: DEMO_USER_ID, type: 'follow', title: 'New follower', body: 'Maya started following you.', link: '/users/u_jimin', read: true, createdAt: isoHoursAgo(3) },
  { id: 'nt6', userId: DEMO_USER_ID, type: 'org_event', title: 'New event from Cal Indie Collective', body: 'Fall show is up.', link: '/activities/a_band_show', read: true, createdAt: isoHoursAgo(48) },
  { id: 'nt7', userId: DEMO_USER_ID, type: 'nearby_activity', title: 'Something you’d like nearby', body: 'Founder coffee chat at Blue Bottle.', link: '/activities/a_startup_chat', read: true, createdAt: isoHoursAgo(10) },
  { id: 'nt8', userId: DEMO_USER_ID, type: 'like', title: 'Likes', body: 'Lily and Hannah liked your post.', link: '/community', read: true, createdAt: isoHoursAgo(24) },
];

export const opportunities: Opportunity[] = [
  {
    id: 'op_exchange', type: 'exchange', title: 'Spring 2027 study abroad (40+ partner schools)', host: 'Berkeley Study Abroad', description: 'One semester or a year. 3.0 GPA, language scores where required. Info session next week.',
    cover: { emoji: '✈️', hue: 210 }, deadline: addDaysISO(18), eligibility: 'Enrolled students, 3.0 GPA', benefit: 'Pay home tuition, exchange scholarships available',
    sourceUrl: 'https://example.com/exchange', sourceLabel: 'Study Abroad office', tags: ['exchange', 'abroad'], interests: ['networking'], goals: ['friends'], schoolId: 's_berkeley', official: true, lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(36),
  },
  { id: 'op_hackathon', type: 'hackathon', title: 'AI Campus Hackathon 2026', host: 'SkyDeck × Google', description: '48 hours to solve a campus problem with AI. Teams of 2–4, any major. $5,000 grand prize and intern interviews.', cover: { emoji: '💡', hue: 230 , url: photo('c_abstract2') }, deadline: addDaysISO(7), date: addDaysISO(14), startTime: '09:00', place: { name: 'Soda Hall', lat: 37.8756, lng: -122.2588 }, eligibility: 'Berkeley students and grad students, any major', benefit: '$5,000 prize, intern interviews', rolesNeeded: ['developer', 'designer', 'planning'], teamSize: '2–4', sourceUrl: 'https://example.com/hackathon', sourceLabel: 'SkyDeck announcement', tags: ['AI', 'hackathon', 'teams'], interests: ['startup', 'study', 'research'], goals: ['hackathon', 'startup'], schoolId: 's_berkeley', official: true, lastVerified: T, qna: [{ id: 'oq1', authorId: 'u_sua', text: 'Can freshmen join?', createdAt: isoHoursAgo(5) }, { id: 'oq2', authorId: 'u_taeho', text: 'A freshman team made finals last year. Go for it!', createdAt: isoHoursAgo(4) }], reviews: [{ id: 'or1', authorId: 'u_taeho', text: 'Did it last year. Judges care most about a working demo. Practice the pitch.', result: 'attended', createdAt: isoHoursAgo(24 * 200) }], createdAt: isoHoursAgo(72) },
  { id: 'op_scholarship', type: 'scholarship', title: 'Cal Alumni Leadership Scholarship', host: 'Cal Alumni Association', description: 'GPA 3.0+, need-blind. $2,000 per semester. Apply on the campus scholarship portal with a short essay.', cover: { emoji: '🎓', hue: 45 , url: photo('c_grads') }, deadline: addDaysISO(4), eligibility: 'Current students, GPA 3.0+', benefit: '$2,000 / semester, stackable', sourceUrl: 'https://example.com/scholarship', sourceLabel: 'Scholarship portal', tags: ['scholarship', 'closing soon'], interests: [], goals: ['scholarship'], schoolId: 's_berkeley', official: true, lastVerified: T, qna: [], reviews: [{ id: 'or2', authorId: 'u_woojin', text: 'Be concrete about what you’ll do with it. Got it last semester.', result: 'accepted', createdAt: isoHoursAgo(24 * 120) }], createdAt: isoHoursAgo(48) },
  { id: 'op_lab', type: 'lab', title: 'Vision & Language Lab — undergrad research apprentices', host: 'Vision & Language Lab', orgId: 'o_ailab', description: 'Help with multimodal model research. ~10 hrs/week for units or a stipend. Python basics; curiosity matters more.', cover: { emoji: '🔬', hue: 175 , url: photo('c_beaker') }, deadline: addDaysISO(20), eligibility: 'Juniors+ or anyone with Python experience', benefit: '$500/month stipend or research units', rolesNeeded: ['research', 'developer'], sourceUrl: 'https://example.com/lab', sourceLabel: 'Lab website', tags: ['lab', 'AI', 'URAP'], interests: ['research', 'study'], goals: ['lab'], schoolId: 's_berkeley', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(100) },
  { id: 'op_intern', type: 'internship', title: 'Stripe summer internship (product design & engineering)', host: 'Stripe', description: '12-week paid internship. Resume → take-home → interviews. Campus info session next week at the student union.', cover: { emoji: '💼', hue: 250 , url: photo('c_city') }, deadline: addDaysISO(12), date: addDaysISO(5), startTime: '17:00', place: { name: 'MLK Student Union', lat: 37.8692, lng: -122.2598 }, eligibility: 'Graduating within 18 months', benefit: '$9,000/month, return offers', sourceUrl: 'https://example.com/stripe', sourceLabel: 'Stripe careers', tags: ['internship', 'info session', 'engineering', 'design'], interests: ['startup', 'networking'], goals: ['internship'], lastVerified: addDaysISO(-1), qna: [], reviews: [], createdAt: isoHoursAgo(60) },
  { id: 'op_band', type: 'club', title: 'Cal Indie Collective fall recruiting', host: 'Cal Indie Collective', orgId: 'o_band', description: 'No experience needed. No audition — come jam, then join. Sign up at the Sproul table.', cover: { emoji: '🎸', hue: 285 , url: photo('c_aguitar') }, deadline: T9, eligibility: 'Berkeley students', benefit: 'Rehearsal room access, a slot at the fall show', sourceUrl: 'https://instagram.com/example', sourceLabel: 'Instagram', tags: ['club', 'band', 'recruiting'], interests: ['club', 'exhibition'], goals: ['join_club', 'hobby'], schoolId: 's_berkeley', lastVerified: T, qna: [], reviews: [{ id: 'or3', authorId: 'u_seoyeon', text: 'Joined last year as a total beginner. Upperclassmen teach you.', result: 'accepted', createdAt: isoHoursAgo(24 * 300) }], createdAt: isoHoursAgo(30) },
  { id: 'op_sorority', type: 'club', title: 'Kappa Delta Chi fall formal recruitment', host: 'Kappa Delta Chi', orgId: 'o_sorority', description: 'Four rounds over one week: open house, philanthropy, sisterhood, preference. Register through Panhellenic first. Info session for anyone curious about Greek life.', cover: { emoji: '🌸', hue: 335 , url: photo('c_balloon') }, deadline: addDaysISO(8), date: T2, startTime: '17:00', place: { name: 'Sproul Plaza', lat: 37.8697, lng: -122.2594 }, eligibility: 'Full-time undergrads, GPA 2.5+', benefit: 'Housing option, alumni network, service community · dues $450/semester', sourceUrl: 'https://example.com/panhellenic', sourceLabel: 'Panhellenic Council', tags: ['greek life', 'sorority', 'recruitment'], interests: ['networking', 'club'], goals: ['join_club', 'friends'], schoolId: 's_berkeley', official: true, lastVerified: T, qna: [{ id: 'oq3', authorId: 'u_sua', text: 'Is there a time commitment during finals?', createdAt: isoHoursAgo(6) }], reviews: [], createdAt: isoHoursAgo(20) },
  { id: 'op_frat', type: 'club', title: 'Theta Tau fall rush (co-ed engineering fraternity)', host: 'Theta Tau', orgId: 'o_frat', description: 'Professional fraternity for engineers. Attend two rush events, then interviews. Dry rush, anti-hazing policy.', cover: { emoji: '⚙️', hue: 200 , url: photo('c_dome') }, deadline: addDaysISO(7), date: T1, startTime: '18:00', place: { name: 'Etcheverry Hall', lat: 37.8757, lng: -122.2594 }, eligibility: 'Engineering & CS majors', benefit: 'Career workshops, alumni referrals · dues $180/semester', sourceUrl: 'https://example.com/thetatau', sourceLabel: 'Chapter website', tags: ['greek life', 'fraternity', 'engineering'], interests: ['networking', 'startup'], goals: ['join_club', 'internship'], schoolId: 's_berkeley', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(22) },
  { id: 'op_festival', type: 'event', title: 'Homecoming kickoff', host: 'ASUC', description: 'Official kickoff at the Greek Theatre. Club tables and food trucks.', cover: { emoji: '🎪', hue: 355 , url: photo('c_tents') }, date: T4, startTime: '17:00', place: { name: 'Greek Theatre', lat: 37.8735, lng: -122.2541 }, eligibility: 'Berkeley community', sourceUrl: 'https://example.com/homecoming', sourceLabel: 'ASUC', tags: ['homecoming', 'campus'], interests: ['exhibition', 'club', 'meal'], goals: ['friends', 'hobby'], schoolId: 's_berkeley', official: true, lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(100) },
  { id: 'op_startup', type: 'startup', title: 'Founders Club fall cohort · co-founder matching night', host: 'Berkeley Founders Club', orgId: 'o_startup', description: '3-minute idea pitches + team formation. Looking for engineers, designers and PMs alike.', cover: { emoji: '🚀', hue: 15 , url: photo('c_abstract3') }, deadline: addDaysISO(10), date: addDaysISO(11), startTime: '19:00', place: { name: 'Haas School of Business', lat: 37.8716, lng: -122.2533 }, eligibility: 'Anyone into startups', rolesNeeded: ['developer', 'designer', 'planning', 'marketing'], teamSize: '2–5', sourceUrl: 'https://example.com/founders', sourceLabel: 'Founders Club Notion', tags: ['startup', 'team formation', 'co-founder'], interests: ['startup', 'networking'], goals: ['startup', 'cofounder'], schoolId: 's_berkeley', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(40) },
  { id: 'op_contest', type: 'hackathon', title: 'California Civic Data Challenge', host: 'State of California', description: 'Build something useful with open data. Solo or teams. Round 1 written, round 2 demo.', cover: { emoji: '📊', hue: 200 , url: photo('c_abstract4') }, deadline: addDaysISO(25), eligibility: 'Students at California universities', benefit: '$3,000 grand prize', rolesNeeded: ['data', 'developer', 'planning'], teamSize: '1–4', sourceUrl: 'https://example.com/civicdata', sourceLabel: 'State announcement', tags: ['contest', 'data', 'external'], interests: ['research', 'study', 'startup'], goals: ['hackathon'], lastVerified: addDaysISO(-2), qna: [], reviews: [], createdAt: isoHoursAgo(80) },
  { id: 'op_lunch', type: 'activity', title: 'Lunch together — Crossroads at noon', host: 'Lily', description: 'Free 12–1 today? Lunch at Crossroads dining hall!', cover: { emoji: '🍱', hue: 30 , url: photo('c_paella') }, date: T, startTime: '12:00', place: { name: 'Crossroads Dining', lat: 37.8677, lng: -122.2542 }, eligibility: 'Anyone', sourceUrl: '', sourceLabel: '', tags: ['lunch', 'free period'], interests: ['meal', 'coffee'], goals: ['lunch', 'friends'], schoolId: 's_berkeley', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(1) },
];

export const opportunityIntents: OpportunityIntentRecord[] = [
  { id: 'oi1', opportunityId: 'op_hackathon', userId: 'u_sua', intent: 'going', saved: true, createdAt: isoHoursAgo(5) },
  { id: 'oi2', opportunityId: 'op_hackathon', userId: 'u_hana', intent: 'going', saved: true, createdAt: isoHoursAgo(9) },
  { id: 'oi3', opportunityId: 'op_hackathon', userId: 'u_dohyun', intent: 'team', saved: false, createdAt: isoHoursAgo(20) },
  { id: 'oi4', opportunityId: 'op_hackathon', userId: 'u_jimin', intent: 'company', saved: true, createdAt: isoHoursAgo(30) },
  { id: 'oi5', opportunityId: 'op_scholarship', userId: 'u_yuna', intent: 'going', saved: true, createdAt: isoHoursAgo(10) },
  { id: 'oi6', opportunityId: 'op_scholarship', userId: 'u_woojin', intent: 'done', saved: false, createdAt: isoHoursAgo(24 * 120) },
  { id: 'oi7', opportunityId: 'op_lab', userId: 'u_sua', intent: 'interested', saved: true, createdAt: isoHoursAgo(12) },
  { id: 'oi8', opportunityId: 'op_lab', userId: DEMO_USER_ID, intent: 'interested', saved: true, createdAt: isoHoursAgo(40) },
  { id: 'oi9', opportunityId: 'op_startup', userId: 'u_jimin', intent: 'solo', saved: true, createdAt: isoHoursAgo(15) },
  { id: 'oi10', opportunityId: 'op_startup', userId: 'u_taeho', intent: 'going', saved: false, createdAt: isoHoursAgo(35) },
  { id: 'oi11', opportunityId: 'op_band', userId: 'u_hana', intent: 'company', saved: true, createdAt: isoHoursAgo(8) },
  { id: 'oi20', opportunityId: 'op_festival', userId: 'u_seoyeon', intent: 'company', saved: false, createdAt: isoHoursAgo(4) },
  { id: 'oi21', opportunityId: 'op_festival', userId: 'u_sua', intent: 'solo', saved: false, createdAt: isoHoursAgo(6) },
  { id: 'oi22', opportunityId: 'op_festival', userId: 'u_junho', intent: 'going', saved: false, createdAt: isoHoursAgo(9) },
  { id: 'oi23', opportunityId: 'op_band', userId: 'u_taeho', intent: 'done', saved: false, createdAt: isoHoursAgo(24 * 300) },
  { id: 'oi12', opportunityId: 'op_intern', userId: 'u_junho', intent: 'going', saved: true, createdAt: isoHoursAgo(50) },
  { id: 'oi13', opportunityId: 'op_intern', userId: 'u_minjun', intent: 'interested', saved: false, createdAt: isoHoursAgo(45) },
  { id: 'oi14', opportunityId: 'op_scholarship', userId: DEMO_USER_ID, intent: 'interested', saved: true, createdAt: isoHoursAgo(20) },
  { id: 'oi15', opportunityId: 'op_lunch', userId: 'u_jimin', intent: 'interested', saved: false, createdAt: isoMinutesAgo(30) },
  { id: 'oi16', opportunityId: 'op_sorority', userId: 'u_jimin', intent: 'going', saved: true, createdAt: isoHoursAgo(6) },
  { id: 'oi17', opportunityId: 'op_sorority', userId: 'u_sua', intent: 'interested', saved: false, createdAt: isoHoursAgo(3) },
  { id: 'oi18', opportunityId: 'op_frat', userId: 'u_junho', intent: 'going', saved: true, createdAt: isoHoursAgo(7) },
  { id: 'oi19', opportunityId: 'op_frat', userId: 'u_dohyun', intent: 'interested', saved: false, createdAt: isoHoursAgo(9) },
];

export const timePolls: TimePoll[] = [
  {
    id: 'tp_dinner', hostId: 'u_seoyeon', title: 'Post-midterm tacos', category: 'meal', place: { name: 'Taqueria on Durant', lat: 37.8677, lng: -122.2585 },
    inviteeIds: [DEMO_USER_ID, 'u_junho', 'u_jimin'],
    options: [
      { id: 'to1', date: T1, startTime: '18:30', endTime: '20:00', suggested: true },
      { id: 'to2', date: T2, startTime: '19:00', endTime: '20:30', suggested: true },
      { id: 'to3', date: addDaysISO(3), startTime: '12:00', endTime: '13:30' },
    ],
    votes: { u_seoyeon: ['to1', 'to2', 'to3'], u_junho: ['to2', 'to3'], u_jimin: ['to1', 'to2'] },
    status: 'open', closesAt: new Date(Date.now() + 36 * 3600000).toISOString(), createdAt: isoHoursAgo(2),
  },
];
