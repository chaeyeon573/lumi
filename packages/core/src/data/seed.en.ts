/** English demo: a US campus (UC Berkeley) with Greek life, .edu verification and US-style opportunities */
import type {
  Activity, ActivityProposal, ChatRoom, Notification, Organization, Participation, Post, Relationships, School, User, Visibility, ProfileField, Opportunity, OpportunityIntentRecord, TimePoll, Course, SavedSearch, NetworkRequest, IntroRequest } from '@core/types';
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
  { id: 's_nyu', name: 'NYU', emailDomain: 'nyu.edu', region: 'New York', center: { lat: 40.7295, lng: -73.9965 } },
];

const mk = (u: Partial<User> & Pick<User, 'id' | 'nickname'>): User => ({
  birthYear: 2003, gender: 'private', avatar: { emoji: '🙂', hue: 210, photoType: 'face' }, identityVerified: false,
  affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Economics', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
  bio: '', likes: '', freeTime: '', availability: 'after18', interests: [], purposes: ['friend'], region: 'Berkeley',
  prompts: [], timetable: [], goals: [], lookingFor: [], canOffer: [], interestedOrgIds: [], meetPreference: ['same_hobby', 'same_goal'],
  fieldVisibility: defaultVisibility(), settings: { messagePolicy: 'connected', notifications: true, locationPermission: 'granted' }, createdAt: isoHoursAgo(24 * 30), ...u,
});

/** 데모 계정의 예시 시간표 — 처음엔 비어 있고, 시간표 화면에서 한 번에 불러올 수 있다 */
export const DEMO_TIMETABLE: Course[] = [{ id: 'c1', name: 'CS 186 Databases', day: 0, start: '10:00', end: '11:00', room: 'Soda 306', hue: 220 }, { id: 'c2', name: 'CS 162 Operating Systems', day: 0, start: '13:00', end: '14:00', room: 'Wheeler 150', hue: 160 }, { id: 'c3', name: 'CS 186 Databases', day: 2, start: '10:00', end: '11:00', room: 'Soda 306', hue: 220 }, { id: 'c4', name: 'CS 162 Operating Systems', day: 2, start: '13:00', end: '14:00', room: 'Wheeler 150', hue: 160 }, { id: 'c5', name: 'UGBA 105 Entrepreneurship', day: 1, start: '15:00', end: '17:30', room: 'Haas C220', hue: 15 }, { id: 'c6', name: 'CS 169 Capstone', day: 3, start: '14:00', end: '16:30', room: 'Soda 310', hue: 280 }, { id: 'c7', name: 'Public Speaking', day: 4, start: '11:00', end: '12:00', room: 'Dwinelle 88', hue: 45 }];

export const users: User[] = [
  mk({
    id: DEMO_USER_ID, nickname: 'Alex', birthYear: 2003, avatar: { emoji: '🧑‍💻', hue: 230, photoType: 'face' , url: photo('p_me') }, photos: [photo('p_me'), photo('c_cafe_laptop'), photo('c_espresso')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'Computer Science', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'Junior in CS. Building side projects and always down for coffee with new people.', likes: 'Specialty coffee, indie music, museum days', freeTime: 'Coding at a café or walking through Memorial Glade',
    interests: ['coffee', 'study', 'startup', 'exhibition', 'exercise'], purposes: ['friend', 'study', 'networking'], nowWant: 'Coffee on Southside tonight?',
    prompts: [{ questionId: 'q_now', answer: 'Coffee at Southside and talk side projects' }, { questionId: 'q_spot', answer: 'Doe Library 4th floor by the windows' }, { questionId: 'q_ask_me', answer: 'React, best cafés on Telegraph, museum picks' }],
    voicePrompt: { questionId: 'v_now', durationSec: 18, recordedAt: isoHoursAgo(40) },
    poll: { questionId: 'p_gap', options: ['Café', 'Library', 'Walk'], ownChoice: 0, votes: { u_sua: 0, u_jimin: 2 } },
    timetable: [],
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
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'alumni', department: 'EECS', year: 2024, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni', career: { city: 'San Francisco', company: 'Own startup', industry: 'AI', role: 'Co-founder' },
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
  // ─── Beyond: people outside your network (free preview 3, full with AroundU+) ───
  mk({ id: 'u_b_stan1', nickname: 'Priya', birthYear: 2001, gender: 'female', avatar: { emoji: '🤖', hue: 250, photoType: 'face', url: photo('p_x3') }, photos: [photo('p_x3'), photo('c_desktop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_stanford', schoolName: 'Stanford University', role: 'graduate', department: 'Computer Science', year: 2024, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: 'Palo Alto',
    bio: 'LLM agents research. Quietly building a startup on the side.', interests: ['research', 'startup', 'coffee'], purposes: ['networking', 'study'], goals: ['startup', 'lab'], lookingFor: ['cofounder', 'developer'], canOffer: ['developer', 'research'], openTo: ['coffee', 'research', 'cofounding'], fieldVisibility: defaultVisibility('public'), availability: 'afternoon', nowWant: 'Talk AI over coffee in Palo Alto' }),
  mk({ id: 'u_b_mit1', nickname: 'Noah', birthYear: 2000, gender: 'male', avatar: { emoji: '🔬', hue: 190, photoType: 'face', url: photo('p_x5') }, photos: [photo('p_x5'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_mit', schoolName: 'MIT', role: 'graduate', department: 'Robotics', year: 2022, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'phd', region: 'Cambridge',
    bio: 'Robot manipulation PhD. In the Bay Area every other month.', interests: ['research', 'exercise', 'exhibition'], purposes: ['networking'], goals: ['lab', 'hackathon'], lookingFor: ['teammate'], canOffer: ['research', 'data'], openTo: ['research', 'networking', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'weekend' }),
  mk({ id: 'u_b_ucla1', nickname: 'Diego', birthYear: 2002, gender: 'male', avatar: { emoji: '🚀', hue: 20, photoType: 'face', url: photo('p_x6') }, photos: [photo('p_x6'), photo('c_two_laptops')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_ucla', schoolName: 'UCLA', role: 'undergraduate', department: 'Business Economics', year: 2021, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'undergrad', region: 'Los Angeles',
    bio: 'Runs a student founders club. Looking for a designer.', interests: ['startup', 'networking', 'coffee'], purposes: ['networking', 'friend'], goals: ['startup'], lookingFor: ['designer', 'cofounder'], canOffer: ['planning', 'marketing'], openTo: ['coffee', 'cofounding', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'after18', nowWant: 'Startup talk over coffee' }),
  mk({ id: 'u_b_stan2', nickname: 'Grace', birthYear: 1998, gender: 'female', avatar: { emoji: '💼', hue: 330, photoType: 'face', url: photo('p_x2') }, photos: [photo('p_x2'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_stanford', schoolName: 'Stanford University', role: 'alumni', department: 'Management Science', year: 2021, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni', career: { city: 'New York', company: 'Stripe', industry: 'Fintech', role: 'Product Manager' }, region: 'New York',
    bio: 'PM at a fintech, 3 years in. Love mentoring student founders.', interests: ['startup', 'networking', 'exercise'], purposes: ['networking'], goals: [], lookingFor: ['mentor'], canOffer: ['planning', 'presentation'], openTo: ['mentoring', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'after18' }),
  mk({ id: 'u_b_nyu1', nickname: 'Aiden', birthYear: 2003, gender: 'male', avatar: { emoji: '🎸', hue: 280, photoType: 'face', url: photo('p_x4') }, photos: [photo('p_x4'), photo('c_stage')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_nyu', schoolName: 'NYU', role: 'undergraduate', department: 'Computer Science', year: 2022, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'undergrad', region: 'New York',
    bio: 'Five hackathon wins. Also in a band.', interests: ['startup', 'club', 'coffee'], purposes: ['friend', 'networking'], goals: ['hackathon'], lookingFor: ['teammate', 'designer'], canOffer: ['developer'], openTo: ['activities', 'cofounding'], fieldVisibility: defaultVisibility('public'), availability: 'weekend' }),
];

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
    id: 'a_coffee_sinchon', kind: 'personal', category: 'coffee', title: 'Coffee on Southside at 6 today?', description: 'Anyone into startups or AI. Casual chat. Up to 4, Berkeley students only.',
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
    id: 'a_running', kind: 'group', category: 'exercise', title: '7pm run (5k)', description: 'Start at Edwards Track, loop around campus. 10-min miles, beginners welcome. Burritos after.',
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
    id: 'a_walk', openSlot: true, kind: 'personal', category: 'etc', title: 'Walk across the Glade right now', description: 'Clear my head after class. Easy conversation.',
    cover: { emoji: '🚶', hue: 100 , url: photo('c_bench') }, hostId: 'u_sua', hostType: 'user', date: T, startTime: '15:30', endTime: '16:00',
    place: { name: 'Memorial Glade', lat: 37.8730, lng: -122.2596 }, capacity: 2, visibility: 'department', visibilityTargets: ['Computer Science'], joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(25),
  },
  {
    id: 'a_deal', kind: 'org_event', category: 'store_deal', title: 'Buy-one-get-one lattes with student ID', description: 'Today only at the café on Telegraph. Show this screen.',
    cover: { emoji: '🏷️', hue: 50 , url: photo('c_mug') }, hostId: 'u_taeho', hostType: 'user', date: T, startTime: '10:00', endTime: '21:00',
    place: { name: 'Café Milano', lat: 37.8681, lng: -122.2590 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(12),
    partner: { name: 'Café Milano', deal: 'BOGO lattes · until 9pm today' },
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
    id: 'a_now_lunch', openSlot: true, kind: 'personal', category: 'meal', title: 'Hate eating alone — lunch at Crossroads?', description: 'Free period, heading to Crossroads. Anyone welcome, up to 4.',
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
  {
    id: 'a_clubfair', kind: 'org_event', category: 'school_event', title: 'Fall Club Fair', description: '200+ clubs tabling on Sproul. Free boba at the AroundU table.',
    cover: { emoji: '🎪', hue: 200, url: photo('c_tents') }, hostId: 'u_woojin', hostType: 'org', orgId: 'o_stat', date: T, startTime: '11:00', endTime: '15:00',
    place: { name: 'Sproul Plaza', lat: 37.8697, lng: -122.2590 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(30),
  },
  {
    id: 'a_rush', kind: 'org_event', category: 'school_event', title: 'Sorority Recruitment Info Night', description: 'Meet the chapters, ask anything. Open to all.',
    cover: { emoji: '🏛️', hue: 330, url: photo('c_hall') }, hostId: 'u_hana', hostType: 'org', orgId: 'o_sorority', date: T, startTime: '18:00', endTime: '20:00',
    place: { name: 'Pauley Ballroom', lat: 37.8692, lng: -122.2596 }, capacity: 200, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(40),
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
  // ─── Sponsored posts (ads) — injected into the feed every 4 rows ───
  {
    id: 'ad_boba', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '🧋', hue: 30, url: photo('c_espresso') }],
    text: 'Buy-one-get-one boba on Southside — just show your student ID. Weekdays 2–5pm this week.', tags: ['Southside', 'boba'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: 'Boba Guys Berkeley', cta: 'Get coupon', deal: 'BOGO boba · weekdays 2–5pm · student ID' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(3),
  },
  {
    id: 'ad_quizlet', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '📚', hue: 220, url: photo('c_library') }],
    text: 'Quizlet Plus free for finals week — Berkeley students get 3 months with code CAL3.', tags: ['finals', 'study'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: 'Quizlet', cta: 'Claim 3 months', deal: '3 months free · code CAL3' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(9),
  },
  {
    id: 'ad_textbooks', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '📖', hue: 10, url: photo('c_bookshop') }],
    text: 'Rent textbooks for 60% less than the campus store. Free pickup at Moffitt.', tags: ['textbooks'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: 'Chegg Rentals', cta: 'See prices', deal: 'Up to 60% off · free Moffitt pickup' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(20),
  },
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
  { id: 'cr_junho', type: 'direct', memberIds: [DEMO_USER_ID, 'u_junho'], createdAt: isoHoursAgo(24 * 60), messages: [{ id: 'm4', senderId: 'u_junho', text: 'Saved you two tickets for the show', createdAt: isoHoursAgo(26) }, { id: 'm5', senderId: DEMO_USER_ID, text: 'Thank you!! Bringing Hannah', createdAt: isoHoursAgo(25) }], lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(25), u_junho: isoHoursAgo(25) } },
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

// ─── v2 (2026-09 UX redesign): home/activity city · grad year · verification method · wants · career ─────
const Y = new Date().getFullYear();
const V2: Record<string, Partial<User>> = {
  u_me: { homeCity: 'Berkeley', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, wants: { people: ['same_interest', 'other_school', 'senior_mentor'], activities: ['coffee', 'project', 'study'] } },
  u_jimin: { homeCity: 'Berkeley', gradYear: Y + 1, verification: { method: 'sso', at: isoHoursAgo(24 * 40) }, interests: ['coffee', 'exhibition', 'running', 'startup', 'networking'], wants: { people: ['same_interest', 'new_people'], activities: ['coffee', 'exercise', 'networking'] } },
  u_dohyun: { stage: 'masters', research: { field: 'AI', lab: 'AI Lab', year: 1, keywords: ['LLM', 'Recommender systems'], showAdvisor: false }, homeCity: 'Berkeley', gradYear: Y + 2, verification: { method: 'school_email', at: isoHoursAgo(24 * 100) }, interests: ['research', 'ai', 'exercise', 'coffee'], wants: { people: ['same_research', 'same_major', 'same_interest'], activities: ['study', 'research', 'exercise'] } },
  u_seoyeon: { homeCity: 'Berkeley', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 12) }, interests: ['club', 'music', 'meal', 'walk'], wants: { people: ['same_interest', 'new_people'], activities: ['hobby', 'meal'] } },
  u_minjun: { homeCity: 'San Francisco', activityCity: 'Berkeley', gradYear: Y, verification: { method: 'school_email', at: isoHoursAgo(24 * 60) }, interests: ['running', 'exercise', 'cycling', 'meal'], wants: { people: ['same_city', 'same_interest'], activities: ['exercise', 'meal'] } },
  u_yuna: { homeCity: 'Oakland', activityCity: 'Berkeley', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 50) }, interests: ['study', 'coffee', 'reading', 'research'], wants: { people: ['same_major', 'senior_mentor'], activities: ['study', 'coffee'] } },
  u_taeho: { homeCity: 'San Francisco', gradYear: 2023, verification: { method: 'alumni_email', at: isoHoursAgo(24 * 200) }, career: { city: 'San Francisco', company: 'Own startup', industry: 'Startup', role: 'Founder' }, interests: ['startup', 'networking', 'coffee', 'ai'], wants: { people: ['alumni', 'same_field', 'same_city'], activities: ['coffee', 'networking', 'project'] } },
  u_hana: { homeCity: 'San Francisco', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 20) }, interests: ['exhibition', 'design', 'photo', 'coffee'], wants: { people: ['other_school', 'same_interest'], activities: ['hobby', 'coffee'] } },
  u_junho: { homeCity: 'Berkeley', gradYear: Y, verification: { method: 'sso', at: isoHoursAgo(24 * 90) }, interests: ['club', 'music', 'film', 'coffee'], wants: { people: ['same_interest'], activities: ['hobby', 'meal'] } },
  u_sua: { homeCity: 'Berkeley', gradYear: Y + 3, verification: { method: 'school_email', at: isoHoursAgo(24 * 10) }, interests: ['study', 'walk', 'coffee', 'startup'], wants: { people: ['same_major', 'senior_mentor'], activities: ['study', 'coffee'] } },
  u_woojin: { homeCity: 'Oakland', activityCity: 'Berkeley', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 70) }, interests: ['study', 'exercise', 'research', 'finance'], wants: { people: ['same_major', 'same_field'], activities: ['study', 'exercise'] } },
  u_b_stan1: { homeCity: 'Palo Alto', activityCity: 'San Francisco', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, interests: ['research', 'ai', 'startup', 'coffee'], wants: { people: ['other_school', 'same_interest'], activities: ['coffee', 'project', 'research'] } },
  u_b_mit1: { homeCity: 'Boston', activityCity: 'San Francisco', gradYear: Y + 2, verification: { method: 'sso', at: isoHoursAgo(24 * 30) }, interests: ['research', 'ai', 'exercise', 'exhibition'], wants: { people: ['same_field', 'other_school'], activities: ['research', 'networking'] } },
  u_b_ucla1: { homeCity: 'Los Angeles', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, interests: ['startup', 'networking', 'coffee', 'design'], wants: { people: ['other_school', 'same_interest'], activities: ['coffee', 'project'] } },
  u_b_stan2: { homeCity: 'New York', gradYear: 2021, verification: { method: 'diploma', at: isoHoursAgo(24 * 30) }, career: { city: 'New York', company: 'Stripe', industry: 'Finance', role: 'Product' }, interests: ['startup', 'networking', 'exercise', 'finance'], wants: { people: ['same_field', 'same_city', 'alumni'], activities: ['coffee', 'networking'] } },
  u_b_nyu1: { homeCity: 'New York', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 30) }, interests: ['startup', 'club', 'coffee', 'game'], wants: { people: ['other_school', 'new_people'], activities: ['project', 'hobby'] } },
};
users.forEach((u) => Object.assign(u, V2[u.id]));

/** v2 extra users — alumni in other cities / other schools (so "NYC + Finance", "Product + Tokyo", "SF + AI" searches return people). Seeing other schools is free */
users.push(
  mk({ id: 'u_a_ny_fin', nickname: 'Emma', birthYear: 1995, gender: 'female', avatar: { emoji: '🗽', hue: 205, photoType: 'face', url: photo('p_x1') }, photos: [photo('p_x1'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'alumni', department: 'Economics', year: 2017, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: 'New York', gradYear: 2017, verification: { method: 'alumni_association', at: isoHoursAgo(24 * 15) }, career: { city: 'New York', company: 'Goldman Sachs', industry: 'Finance', role: 'IB Associate' }, region: 'New York',
    bio: 'Five years in IB in New York. Happy to do coffee chats with Cal students heading into finance.', interests: ['finance', 'invest', 'running', 'travel'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor'], openTo: ['mentoring', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['alumni', 'same_city', 'same_field'], activities: ['coffee', 'networking'] }, createdAt: isoHoursAgo(24 * 3) }),
  mk({ id: 'u_a_tokyo_pm', nickname: 'Ken', birthYear: 1994, gender: 'male', avatar: { emoji: '🗼', hue: 350, photoType: 'face', url: photo('p_x5') }, photos: [photo('p_x5'), photo('c_desktop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_ucla', schoolName: 'UCLA', role: 'alumni', department: 'Industrial Engineering', year: 2016, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: 'Tokyo', gradYear: 2016, verification: { method: 'alumni_email', at: isoHoursAgo(24 * 25) }, career: { city: 'Tokyo', company: 'Mercari', industry: 'Tech', role: 'Product' }, region: 'Tokyo',
    bio: 'Product manager in Tokyo. Ask me about working in Japan.', interests: ['design', 'travel', 'coffee', 'startup'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor', 'planning'], openTo: ['mentoring', 'coffee'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['same_field', 'same_city', 'new_people'], activities: ['coffee', 'networking'] }, createdAt: isoHoursAgo(24 * 5) }),
  mk({ id: 'u_a_sf_ai', nickname: 'Sofia', birthYear: 1997, gender: 'female', avatar: { emoji: '🤖', hue: 160, photoType: 'face', url: photo('p_x3') }, photos: [photo('p_x3'), photo('c_road_sunset')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_mit', schoolName: 'MIT', role: 'alumni', department: 'EECS', year: 2019, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: 'San Francisco', gradYear: 2019, verification: { method: 'diploma', at: isoHoursAgo(24 * 8) }, career: { city: 'San Francisco', company: 'An AI lab', industry: 'AI', role: 'ML Engineer' }, region: 'San Francisco',
    bio: 'ML engineer. Runs the Bay Area AI running crew on weekends.', interests: ['ai', 'running', 'research', 'coffee'], purposes: ['networking', 'hobby'], goals: [], lookingFor: [], canOffer: ['mentor', 'developer'], openTo: ['activities', 'networking', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['same_field', 'same_city', 'same_interest'], activities: ['exercise', 'networking', 'research'] }, createdAt: isoHoursAgo(24 * 2) }),
  mk({ id: 'u_a_berkeley_sf', nickname: 'Jordan', birthYear: 1996, gender: 'male', avatar: { emoji: '💼', hue: 30, photoType: 'face', url: photo('p_x6') }, photos: [photo('p_x6'), photo('c_lounge')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'alumni', department: 'Computer Science', year: 2018, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: 'Oakland', activityCity: 'San Francisco', gradYear: 2018, verification: { method: 'prior_student', at: isoHoursAgo(24 * 400) }, career: { city: 'San Francisco', company: 'Own startup', industry: 'Startup', role: 'Founder' }, region: 'Oakland',
    bio: 'Lives in Oakland, works out of SF. Second year on a B2B SaaS. Cal CS folks welcome.', interests: ['startup', 'ai', 'coffee', 'invest'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor', 'planning'], openTo: ['coffee', 'cofounding', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['alumni', 'same_major', 'same_field'], activities: ['coffee', 'project', 'networking'] }, createdAt: isoHoursAgo(24 * 6) }),
);

/** v2 community groups — school, city, interest or career based; users decide. Free to create and join */
organizations.push(
  { id: 'o_new_to_nyc', name: 'New to NYC', logo: { emoji: '🗽', hue: 205, url: photo('c_city') }, type: 'community', scope: 'city', city: 'New York', joinPolicy: 'open', interests: ['travel', 'networking'], verified: false,
    description: 'People moving to New York. Any school. Weekly dinners and apartment tips.', gallery: [{ emoji: '🌆', hue: 205, caption: 'Rooftop night', url: photo('c_city') }], regularActivities: ['Thursday dinners'], notices: [],
    followerIds: ['u_jimin'], memberIds: ['u_a_ny_fin', 'u_b_stan2', 'u_b_nyu1'], adminIds: ['u_a_ny_fin'], applicantIds: [] },
  { id: 'o_ai_builders_bay', name: 'AI Builders Bay Area', logo: { emoji: '🤖', hue: 160, url: photo('c_two_laptops') }, type: 'community', scope: 'interest', joinPolicy: 'approval', interests: ['ai', 'startup'], verified: false,
    description: 'People building with AI, students and professionals. Demo nights every other week.', gallery: [], regularActivities: ['Demo night every other Thursday'], notices: [],
    followerIds: ['u_b_ucla1'], memberIds: ['u_a_sf_ai', 'u_a_berkeley_sf', 'u_dohyun', 'u_taeho'], adminIds: ['u_a_sf_ai'], applicantIds: [] },
  { id: 'o_cal_alumni_sf', name: 'Cal Alumni SF Coffee', logo: { emoji: '🎓', hue: 215, url: photo('c_cafe_laptop') }, type: 'community', scope: 'school', schoolId: 's_berkeley', joinPolicy: 'open', interests: ['coffee', 'networking'], verified: false,
    description: 'Berkeley alumni and students in the city. Any year, any major.', gallery: [], regularActivities: ['Monthly coffee in SoMa'], notices: [],
    followerIds: ['u_jimin'], memberIds: ['u_taeho', 'u_a_berkeley_sf', 'u_a_ny_fin'], adminIds: ['u_taeho'], applicantIds: [] },
);

/** v2 meets inside groups — a meet only manages time, place, people, capacity and visibility */
activities.push(
  { id: 'a_g_run', kind: 'group', category: 'exercise', title: 'Saturday Embarcadero run, 8k', description: 'Ferry Building to Crissy Field and back. ~6 min/km. Coffee after.', cover: { emoji: '🏃', hue: 160, url: photo('c_road_sunset') },
    hostId: 'u_a_sf_ai', hostType: 'user', orgId: 'o_ai_builders_bay', date: addDaysISO(2), startTime: '08:00', endTime: '09:30', place: { name: 'Ferry Building', address: 'San Francisco', area: 'San Francisco', lat: 37.7955, lng: -122.3937 },
    capacity: 12, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(20) },
  { id: 'a_g_product', kind: 'group', category: 'study', title: 'Demo night — onboarding flows', description: 'Members only. Bring one thing you built.', cover: { emoji: '🧩', hue: 260, url: photo('c_two_laptops') },
    hostId: 'u_a_sf_ai', hostType: 'user', orgId: 'o_ai_builders_bay', date: T4, startTime: '19:00', endTime: '21:00', place: { name: 'SoMa coworking lounge', address: 'San Francisco', area: 'San Francisco', lat: 37.7785, lng: -122.3950 },
    capacity: 8, visibility: 'group', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(26) },
  { id: 'a_g_alumni_coffee', kind: 'group', category: 'networking', title: 'Cal alumni coffee (SoMa)', description: 'Students and alumni. Career talk, no pressure.', cover: { emoji: '☕', hue: 215, url: photo('c_cafe_laptop') },
    hostId: 'u_taeho', hostType: 'user', orgId: 'o_cal_alumni_sf', date: T1, startTime: '18:30', endTime: '20:00', place: { name: 'Blue Bottle SoMa', address: 'San Francisco', area: 'San Francisco', lat: 37.7825, lng: -122.3934 },
    capacity: 6, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(9) },
);

/** v2.1 가벼운 상태 — 기간이 지나면 꺼진다 */
const soon = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
const STATUS: Record<string, User['status']> = {
  u_jimin: { kind: 'coffee', when: 'week', until: soon(24 * 4), setAt: isoHoursAgo(3) },
  u_minjun: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(20) },
  u_a_seoul_ai: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(8) },
  u_a_sf_ai: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(8) },
  u_b_snu1: { kind: 'coffee', when: 'today', until: soon(8), setAt: isoHoursAgo(1) },
  u_b_stan1: { kind: 'coffee', when: 'today', until: soon(8), setAt: isoHoursAgo(1) },
  u_taeho: { kind: 'coffee', when: 'week', until: soon(24 * 4), setAt: isoHoursAgo(30) },
  u_sua: { kind: 'walk', when: 'now', until: soon(2), setAt: isoMinutesAgo(20) },
};
users.forEach((u) => { if (STATUS[u.id]) u.status = STATUS[u.id]; });

export const savedSearches: SavedSearch[] = [];

/** v2 network requests — "Looking for someone like this" (other people's requests reach the demo user via 2nd-degree / related network) */
export const networkRequests: NetworkRequest[] = [
  { id: 'nr_taeho_japan', authorId: 'u_taeho', text: 'Someone with experience in Japanese food distribution who can chat once in San Francisco', city: 'San Francisco', field: 'Distribution', interests: ['startup', 'travel'], reach: 3, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(5), expiresAt: addDaysISO(13) },
  { id: 'nr_grace_pm', authorId: 'u_b_stan2', text: 'Anyone who has actually shipped a B2C app (any role). Would love 30 minutes on onboarding lessons', city: 'New York', field: 'Product', interests: ['startup', 'design'], reach: 2, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(26), expiresAt: addDaysISO(12) },
  { id: 'nr_emma_ny', authorId: 'u_a_ny_fin', text: 'Cal students prepping for grad school in New York. Happy to talk essays and recommendation letters', city: 'New York', field: 'Finance', interests: ['finance', 'study'], reach: 3, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(50), expiresAt: addDaysISO(10) },
];

/** v2.2 trips · saved lists · intro asks (Who's around · Saved lists · 2nd degree) */
const wk = (d: number) => addDaysISO(d);
const TRIPS: Record<string, User['trips']> = {
  u_a_ny_fin: [{ id: 'tr1', city: 'San Francisco', from: wk(1), to: wk(6) }],
  u_a_tokyo_pm: [{ id: 'tr2', city: 'San Francisco', from: wk(8), to: wk(11) }],
  u_b_mit1: [{ id: 'tr3', city: 'Berkeley', from: wk(0), to: wk(3) }],
  u_me: [{ id: 'tr4', city: 'New York', from: wk(9), to: wk(11) }],
};
users.forEach((u) => { if (TRIPS[u.id]) u.trips = TRIPS[u.id]; });
const me0 = users.find((u) => u.id === DEMO_USER_ID)!;
me0.savedPeople = ['u_a_sf_ai', 'u_b_ucla1'];
me0.savedLists = [{ id: 'sl_startup', name: 'Startup chats', memberIds: ['u_b_ucla1'], notify: true }];
me0.privacy = { scope: 'school_2nd', showCompany: true, showCity: true, showGradYear: true, showGroups: true, showInPaths: true, showTrips: true };
export const introRequests: IntroRequest[] = [
  { id: 'ir_seed1', fromId: 'u_hana', viaId: DEMO_USER_ID, toId: 'u_junho', note: 'I would love to help design the band show poster', status: 'pending', createdAt: isoHoursAgo(6) },
];

// ─── v2.3 stage content — grad students (research · reading groups · conferences · career paths) · alumni (updates · city meets · AMAs · visits · hiring) ─────
/** Research info for the existing grad users. The field feeds recommendations (same research field · works in my field); advisor is private by default */
const RESEARCH: Record<string, User['research']> = {
  u_b_stan1: { field: 'NLP', lab: 'Language & Agents Lab', advisor: 'Prof. Chen', showAdvisor: false, year: 2, keywords: ['LLM', 'agents', 'tool use'] },
  u_b_mit1: { field: 'Robotics', lab: 'Robot Learning Lab', advisor: 'Prof. Okafor', showAdvisor: false, year: 5, keywords: ['manipulation', 'reinforcement learning', 'sim2real'] },
};
users.forEach((u) => { if (RESEARCH[u.id]) u.research = RESEARCH[u.id]; });

/** Three grad students — same school (Berkeley) NLP master's · Stanford bioinformatics PhD · NYU economics master's */
users.push(
  mk({ id: 'u_g_cal_nlp', nickname: 'Chloe', birthYear: 2001, gender: 'female', avatar: { emoji: '📝', hue: 200, photoType: 'face', url: photo('p_x2') }, photos: [photo('p_x2'), photo('c_library')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'graduate', department: 'EECS (MS)', year: 2025, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: 'Berkeley',
    homeCity: 'Berkeley', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 20) },
    bio: 'Second-year MS working on LLM evaluation. I run a weekly paper reading group.', likes: 'Reading papers, long walks, good notebooks', freeTime: 'Writing up paper notes at a café near Soda',
    interests: ['research', 'ai', 'reading', 'coffee'], purposes: ['study', 'networking'], goals: ['lab'], lookingFor: ['study_partner', 'teammate'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'activities'], fieldVisibility: defaultVisibility('public'), availability: 'afternoon',
    nowWant: 'Anyone want to talk LLM evals?',
    wants: { people: ['same_field', 'other_school', 'senior_mentor'], activities: ['research', 'study', 'coffee'] },
    research: { field: 'NLP', lab: 'Language & Agents Lab', advisor: 'Prof. Ramirez', showAdvisor: false, year: 2, keywords: ['LLM', 'evaluation', 'multilingual'] }, createdAt: isoHoursAgo(24 * 10) }),
  mk({ id: 'u_g_stan_bio', nickname: 'Ravi', birthYear: 1997, gender: 'male', avatar: { emoji: '🧬', hue: 140, photoType: 'face', url: photo('p_x4') }, photos: [photo('p_x4'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_stanford', schoolName: 'Stanford University', role: 'graduate', department: 'Biomedical Data Science', year: 2023, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'phd', region: 'Palo Alto',
    homeCity: 'Palo Alto', gradYear: Y + 2, verification: { method: 'sso', at: isoHoursAgo(24 * 45) },
    bio: 'Fourth-year PhD using single-cell data to trace disease pathways. Keen to work with labs at other schools.', likes: 'Trail runs, sci-fi, pour-over', freeTime: 'Running the Dish',
    interests: ['research', 'ai', 'reading', 'running'], purposes: ['networking', 'study'], goals: ['lab'], lookingFor: ['teammate'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['same_field', 'other_school', 'senior_mentor'], activities: ['research', 'study', 'coffee'] },
    research: { field: 'Bioinformatics', lab: 'Computational Biology Lab', advisor: 'Prof. Lindqvist', showAdvisor: false, year: 4, keywords: ['single-cell', 'genomics', 'ML'] }, createdAt: isoHoursAgo(24 * 12) }),
  mk({ id: 'u_g_nyu_econ', nickname: 'Nora', birthYear: 2000, gender: 'female', avatar: { emoji: '📊', hue: 40, photoType: 'face', url: photo('p_x1') }, photos: [photo('p_x1'), photo('c_bookshop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_nyu', schoolName: 'NYU', role: 'graduate', department: 'Economics (MA)', year: 2025, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: 'New York',
    homeCity: 'New York', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 25) },
    bio: 'Labor economics MA. Finishing up and trying to decide between a PhD and a job.', likes: 'Used bookstores, Stata, dumplings', freeTime: 'Browsing bookstores in the Village',
    interests: ['research', 'finance', 'reading', 'coffee'], purposes: ['study', 'networking'], goals: ['lab', 'internship'], lookingFor: ['senior', 'study_partner'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['same_field', 'senior_mentor', 'other_school'], activities: ['research', 'study', 'coffee'] },
    research: { field: 'Economics', lab: 'Labor Economics Workshop', advisor: 'Prof. Weiss', showAdvisor: false, year: 2, keywords: ['labor', 'causal inference', 'policy evaluation'] }, createdAt: isoHoursAgo(24 * 8) }),
);

/** Three grad meets + two alumni meets */
activities.push(
  { id: 'a_gr_reading', kind: 'group', category: 'study', title: 'NLP paper reading group — LLM evals', description: 'Two papers on LLM evaluation and agents this week. Read ahead, 30 minutes of discussion each. Any school; grad students and curious undergrads welcome.', cover: { emoji: '📚', hue: 200, url: photo('c_library') },
    hostId: 'u_g_cal_nlp', hostType: 'user', date: T2, startTime: '19:00', endTime: '21:00', place: { name: 'Soda Hall 510', area: 'Berkeley campus', lat: 37.8756, lng: -122.2588 },
    capacity: 8, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [{ id: 'c20', authorId: 'u_dohyun', text: 'I can present the second paper', createdAt: isoHoursAgo(6) }], createdAt: isoHoursAgo(10) },
  { id: 'a_gr_conf', kind: 'group', category: 'networking', title: 'Heading to EMNLP — poster run-through & travel plans', description: 'Grad students going to EMNLP this year: everyone presents their poster once, then we sort out hotels and travel. Attending without a paper? Come too.', cover: { emoji: '🎤', hue: 250, url: photo('c_hall') },
    hostId: 'u_b_stan1', hostType: 'user', date: addDaysISO(6), startTime: '18:30', endTime: '20:30', place: { name: 'Gates Computer Science, Stanford', area: 'Palo Alto', lat: 37.4300, lng: -122.1730 },
    capacity: 10, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(15) },
  { id: 'a_gr_career', kind: 'personal', category: 'coffee', title: 'PhD vs industry — grad student coffee', description: 'For people finishing a master’s, or mid-PhD and wondering about industry. One alum who went to industry is joining. Not about reaching a verdict, just sharing what we’ve seen.', cover: { emoji: '🧭', hue: 25, url: photo('c_cafe_laptop') },
    hostId: 'u_b_mit1', hostType: 'user', date: addDaysISO(3), startTime: '14:00', endTime: '15:30', place: { name: 'Caffe Strada', address: 'Berkeley', area: 'Southside Berkeley', lat: 37.8690, lng: -122.2548 },
    capacity: 6, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(27) },
  { id: 'a_al_soma', kind: 'personal', category: 'networking', title: 'After-work coffee in SoMa (4 people)', description: 'A quick coffee after work. Any alum, any school, any field. One hour, that’s it.', cover: { emoji: '☕', hue: 30, url: photo('c_espresso') },
    hostId: 'u_a_berkeley_sf', hostType: 'user', date: T2, startTime: '18:30', endTime: '19:30', place: { name: 'SoMa café', address: 'San Francisco', area: 'San Francisco', lat: 37.7785, lng: -122.3990 },
    capacity: 4, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(4) },
  { id: 'a_al_visit', kind: 'personal', category: 'networking', title: 'In SF this week — NYC finance & grad school coffee', description: 'I’m in town for a week. Cal students and alumni looking at finance in New York or grad school back east, come say hi.', cover: { emoji: '✈️', hue: 205, url: photo('c_city') },
    hostId: 'u_a_ny_fin', hostType: 'user', date: T4, startTime: '11:00', endTime: '12:30', place: { name: 'Ferry Building', address: 'San Francisco', area: 'San Francisco', lat: 37.7955, lng: -122.3937 },
    capacity: 5, visibility: 'school', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(8) },
);

participations.push(
  { id: 'p30', activityId: 'a_gr_reading', userId: 'u_b_stan1', status: 'approved', createdAt: isoHoursAgo(8) },
  { id: 'p31', activityId: 'a_gr_reading', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(7) },
  { id: 'p32', activityId: 'a_gr_reading', userId: 'u_g_stan_bio', status: 'approved', createdAt: isoHoursAgo(5) },
  { id: 'p33', activityId: 'a_gr_conf', userId: 'u_g_cal_nlp', status: 'approved', createdAt: isoHoursAgo(12) },
  { id: 'p34', activityId: 'a_gr_conf', userId: 'u_b_mit1', status: 'approved', createdAt: isoHoursAgo(11) },
  { id: 'p35', activityId: 'a_gr_career', userId: 'u_g_nyu_econ', status: 'approved', createdAt: isoHoursAgo(20) },
  { id: 'p36', activityId: 'a_gr_career', userId: 'u_g_cal_nlp', status: 'approved', createdAt: isoHoursAgo(18) },
  { id: 'p37', activityId: 'a_gr_career', userId: 'u_a_sf_ai', status: 'approved', createdAt: isoHoursAgo(16) },
  { id: 'p38', activityId: 'a_al_soma', userId: 'u_a_sf_ai', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p39', activityId: 'a_al_soma', userId: 'u_taeho', status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p40', activityId: 'a_al_visit', userId: 'u_woojin', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p41', activityId: 'a_al_visit', userId: 'u_jimin', status: 'approved', createdAt: isoHoursAgo(5) },
);

/** Grad posts (research_q · reading · conference · collab · path) + alumni posts (update · city_meet · ama · visit · hiring) */
posts.push(
  { id: 'pg1', authorId: 'u_g_cal_nlp', authorType: 'user', postType: 'question', media: [],
    text: 'What are people using for LLM evals these days? The multiple-choice benchmarks all land within a point of each other, so I’m thinking about building a task-based eval set. Would love to hear from anyone who has made one.', topics: ['research_q', 'ai'],
    tags: ['LLM', 'evals', 'NLP'], visibility: 'public', likeIds: ['u_b_stan1', 'u_dohyun'], savedIds: [],
    comments: [{ id: 'pc20', authorId: 'u_b_stan1', text: 'We built ours from failure cases in agent logs. Happy to share our labeling guide', createdAt: isoHoursAgo(3) }], createdAt: isoHoursAgo(5) },
  { id: 'pg2', authorId: 'u_g_cal_nlp', authorType: 'user', postType: 'together', media: [{ emoji: '📚', hue: 200, url: photo('c_library') }],
    text: 'Reading group this week: two LLM eval papers, Soda 510. You don’t need to be a grad student, just read one of them before you come.', topics: ['reading', 'ai'],
    tags: ['readinggroup', 'papers'], visibility: 'school', likeIds: ['u_dohyun', 'u_sua'], savedIds: [], comments: [], relatedActivityId: 'a_gr_reading', createdAt: isoHoursAgo(9) },
  { id: 'pg3', authorId: 'u_b_stan1', authorType: 'user', postType: 'together', media: [],
    text: 'Anyone going to EMNLP? Let’s do one poster run-through and figure out hotels and travel together. First conference? Especially welcome.', topics: ['conference', 'ai'],
    tags: ['EMNLP', 'conference'], visibility: 'public', likeIds: ['u_g_cal_nlp', 'u_b_mit1'], savedIds: [],
    comments: [{ id: 'pc21', authorId: 'u_g_cal_nlp', text: 'I’m going! Bringing a rough poster draft', createdAt: isoHoursAgo(12) }], relatedActivityId: 'a_gr_conf', createdAt: isoHoursAgo(14) },
  { id: 'pg4', authorId: 'u_g_stan_bio', authorType: 'user', postType: 'together', media: [],
    text: 'Looking for a lab to co-build a single-cell preprocessing pipeline with us. Plenty of data on our side, not enough modeling hands. Other schools welcome — one online sync a month.', topics: ['collab', 'research'],
    tags: ['collaboration', 'bioinformatics'], visibility: 'public', likeIds: ['u_b_mit1'], savedIds: [], comments: [], createdAt: isoHoursAgo(20) },
  { id: 'pg5', authorId: 'u_g_nyu_econ', authorType: 'user', postType: 'question', media: [],
    text: 'Finishing my MA and stuck on PhD vs industry. In econ a PhD is five or six years plus a job market that’s its own thing. Would love to hear from people who have made this call.', topics: ['path', 'finance'],
    tags: ['career', 'phd'], visibility: 'public', likeIds: ['u_g_cal_nlp', 'u_b_stan1', 'u_woojin'], savedIds: [],
    comments: [
      { id: 'pc22', authorId: 'u_b_stan2', text: 'I went straight to work after my master’s. The one question that decided it: what do I want an ordinary Tuesday to look like? Happy to chat', createdAt: isoHoursAgo(22) },
      { id: 'pc23', authorId: 'u_b_mit1', text: 'Come to the coffee in Berkeley, let’s talk it through!', createdAt: isoHoursAgo(21) },
    ], relatedActivityId: 'a_gr_career', createdAt: isoHoursAgo(28) },
  { id: 'pa1', authorId: 'u_b_stan2', authorType: 'user', postType: 'story', media: [{ emoji: '🗽', hue: 205, url: photo('c_city') }],
    text: 'Six months in New York. Still missing subway transfers, but I found a Saturday running group and a bagel place I will defend in any argument. Stanford folks in the city, say hi.', topics: ['update', 'running'],
    tags: ['nyc', 'update'], visibility: 'public', likeIds: ['u_a_ny_fin', 'u_b_nyu1'], savedIds: [], comments: [], createdAt: isoHoursAgo(6) },
  { id: 'pa2', authorId: 'u_a_berkeley_sf', authorType: 'user', postType: 'together', media: [{ emoji: '☕', hue: 30, url: photo('c_espresso') }],
    text: 'Coffee after work in SoMa, day after tomorrow? Any school, any field. Four people max, one hour. I opened a meet.', topics: ['city_meet', 'coffee'],
    tags: ['soma', 'afterwork'], visibility: 'public', likeIds: ['u_a_sf_ai'], savedIds: [], comments: [], relatedActivityId: 'a_al_soma', createdAt: isoHoursAgo(4) },
  { id: 'pa3', authorId: 'u_a_sf_ai', authorType: 'user', postType: 'question', media: [],
    text: 'Lots of students asking me whether to do a PhD or go straight into industry for ML, so I’m taking questions this week. ML interviews, how research works inside a company, model serving — drop them below.', topics: ['ama', 'ai'],
    tags: ['ama', 'ML'], visibility: 'public', likeIds: ['u_dohyun', 'u_g_cal_nlp', 'u_b_stan1'], savedIds: [],
    comments: [
      { id: 'pc24', authorId: 'u_g_cal_nlp', text: 'Can you land a research role without a first-author paper from your master’s?', createdAt: isoHoursAgo(9) },
      { id: 'pc25', authorId: 'u_a_sf_ai', text: 'Yes. What mattered more was one project you can go really deep on, that someone else can reproduce', createdAt: isoHoursAgo(8) },
    ], createdAt: isoHoursAgo(11) },
  { id: 'pa4', authorId: 'u_a_ny_fin', authorType: 'user', postType: 'together', media: [],
    text: 'In SF from tomorrow for a week. Cal students thinking about finance in New York or grad school out east — grab a coffee with me at the Ferry Building. Opened a meet.', topics: ['visit', 'finance'],
    tags: ['sfvisit', 'coffeechat'], visibility: 'school', likeIds: ['u_woojin', 'u_taeho'], savedIds: [], comments: [], relatedActivityId: 'a_al_visit', createdAt: isoHoursAgo(8) },
  { id: 'pa5', authorId: 'u_a_berkeley_sf', authorType: 'user', postType: 'info', media: [],
    text: 'Our team is looking for a backend engineer. Cal alumni referrals welcome — message me if you’re curious.', topics: ['hiring', 'startup'],
    tags: ['hiring', 'referrals'], visibility: 'school', likeIds: ['u_taeho'], savedIds: [], comments: [], createdAt: isoHoursAgo(30) },
  { id: 'pa6', authorId: 'u_taeho', authorType: 'user', postType: 'story', media: [],
    text: 'Took my first real week off since starting the company. Stepping away made it obvious what I actually want to build next. Coffee chats on Southside start again next week.', topics: ['update', 'startup'],
    tags: ['update'], visibility: 'school', likeIds: ['u_jimin', DEMO_USER_ID], savedIds: [], comments: [], createdAt: isoHoursAgo(36) },
);
