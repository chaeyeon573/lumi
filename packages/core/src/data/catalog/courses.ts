/**
 * 미국 대학 수업 목록 (course catalog).
 *
 * 과목 코드·이름·학과는 각 학교의 공개 카탈로그 기준이고, 요일·시간·강의실은 해당 과목의 *전형적인* 개설 패턴을
 * 따른 예시 값이다. 학기별 실제 시간표는 registrar 데이터(예: Berkeley Class API, Stanford ExploreCourses,
 * UCLA Registrar, MIT Subject Listing)를 `server/scripts/import-courses.ts` 로 가져와 덮어쓴다.
 */
import type { CatalogCourse } from '@core/api/types';
import type { ID } from '@core/types';
import { currentTerm, normalizeTermLabel, termLabel, termOrder } from '@core/lib/terms';

/** 요일 패턴 → 요일 인덱스(0=월) */
const PATTERNS: Record<string, number[]> = {
  M: [0], Tu: [1], W: [2], Th: [3], F: [4],
  MW: [0, 2], MWF: [0, 2, 4], TuTh: [1, 3], MTuWTh: [0, 1, 2, 3], WF: [2, 4], MF: [0, 4],
};
/** 패턴별 기본 수업 길이(분) — 주 3회 50분, 주 2회 80분, 주 1회 170분 */
const LENGTH: Record<string, number> = { M: 170, Tu: 170, W: 170, Th: 170, F: 170, MW: 80, MWF: 50, TuTh: 80, MTuWTh: 50, WF: 80, MF: 80 };

const addMin = (hhmm: string, min: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + min;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** [code, title, department, pattern, start, instructor?, location?, units?] */
type Row = [string, string, string, string, string, string?, string?, number?];

function expand(schoolId: ID, term: string, rows: Row[]): CatalogCourse[] {
  return rows.map(([code, title, department, pattern, start, instructor, location, units]) => ({
    id: `cc_${schoolId.replace('s_', '')}_${code.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
    schoolId, code, title, department, instructor, location, term, units: units ?? (LENGTH[pattern] >= 170 ? 3 : 4),
    meetings: PATTERNS[pattern].map((day) => ({ day, start, end: addMin(start, LENGTH[pattern]) })),
  }));
}

const TERM = 'Fall 2026';

const berkeley: Row[] = [
  ['CS 61A', 'The Structure and Interpretation of Computer Programs', 'Computer Science', 'MWF', '13:00', 'John DeNero', 'Wheeler 150'],
  ['CS 61B', 'Data Structures', 'Computer Science', 'MWF', '14:00', 'Josh Hug', 'Pauley Ballroom'],
  ['CS 61C', 'Great Ideas in Computer Architecture (Machine Structures)', 'Computer Science', 'TuTh', '12:30', undefined, 'Wheeler 150'],
  ['CS 70', 'Discrete Mathematics and Probability Theory', 'Computer Science', 'TuTh', '09:30', undefined, 'Dwinelle 155'],
  ['CS 161', 'Computer Security', 'Computer Science', 'TuTh', '14:00', undefined, 'Wheeler 150'],
  ['CS 162', 'Operating Systems and System Programming', 'Computer Science', 'MW', '10:00', undefined, 'Li Ka Shing 245'],
  ['CS 164', 'Programming Languages and Compilers', 'Computer Science', 'TuTh', '11:00', undefined, 'Soda 306'],
  ['CS 168', 'Introduction to the Internet: Architecture and Protocols', 'Computer Science', 'TuTh', '15:30', undefined, 'Valley LSB 2050'],
  ['CS 169A', 'Software Engineering', 'Computer Science', 'MW', '15:30', undefined, 'Soda 310'],
  ['CS 170', 'Efficient Algorithms and Intractable Problems', 'Computer Science', 'TuTh', '15:30', undefined, 'Wheeler 150'],
  ['CS 186', 'Introduction to Database Systems', 'Computer Science', 'MW', '10:00', undefined, 'Soda 306'],
  ['CS 188', 'Introduction to Artificial Intelligence', 'Computer Science', 'TuTh', '17:00', undefined, 'Pimentel 1'],
  ['CS 189', 'Introduction to Machine Learning', 'Computer Science', 'MW', '14:00', undefined, 'Wheeler 150'],
  ['CS 194-26', 'Intro to Computer Vision and Computational Photography', 'Computer Science', 'TuTh', '11:00', undefined, 'Soda 405'],
  ['CS 282A', 'Designing, Visualizing and Understanding Deep Neural Networks', 'Computer Science', 'Tu', '10:00', undefined, 'Soda 306'],
  ['EECS 16A', 'Designing Information Devices and Systems I', 'EECS', 'TuTh', '14:00', undefined, 'Dwinelle 155'],
  ['EECS 16B', 'Designing Information Devices and Systems II', 'EECS', 'MW', '13:00', undefined, 'Valley LSB 2050'],
  ['DATA C8', 'Foundations of Data Science', 'Data Science', 'MWF', '10:00', undefined, 'Zellerbach Hall'],
  ['DATA C100', 'Principles and Techniques of Data Science', 'Data Science', 'TuTh', '11:00', undefined, 'Pauley Ballroom'],
  ['DATA C140', 'Probability for Data Science', 'Data Science', 'MWF', '15:00', undefined, 'Evans 10'],
  ['MATH 1A', 'Calculus', 'Mathematics', 'MWF', '09:00', undefined, 'Pimentel 1'],
  ['MATH 1B', 'Calculus', 'Mathematics', 'MWF', '11:00', undefined, 'Dwinelle 155'],
  ['MATH 53', 'Multivariable Calculus', 'Mathematics', 'MWF', '12:00', undefined, 'Pimentel 1'],
  ['MATH 54', 'Linear Algebra and Differential Equations', 'Mathematics', 'TuTh', '08:00', undefined, 'Wheeler 150'],
  ['MATH 110', 'Abstract Linear Algebra', 'Mathematics', 'MWF', '14:00', undefined, 'Evans 60'],
  ['STAT 20', 'Introduction to Probability and Statistics', 'Statistics', 'TuTh', '12:30', undefined, 'Li Ka Shing 245'],
  ['STAT 134', 'Concepts of Probability', 'Statistics', 'MWF', '13:00', undefined, 'Evans 10'],
  ['STAT 135', 'Concepts of Statistics', 'Statistics', 'TuTh', '11:00', undefined, 'Stanley 105'],
  ['ECON 1', 'Introduction to Economics', 'Economics', 'MW', '15:30', undefined, 'Wheeler 150'],
  ['ECON 100A', 'Economic Analysis — Micro', 'Economics', 'TuTh', '09:30', undefined, 'Dwinelle 155'],
  ['ECON 100B', 'Economic Analysis — Macro', 'Economics', 'MWF', '11:00', undefined, 'Valley LSB 2050'],
  ['ECON 140', 'Economic Statistics and Econometrics', 'Economics', 'TuTh', '14:00', undefined, 'Evans 60'],
  ['UGBA 10', 'Principles of Business', 'Haas Business', 'MW', '11:00', undefined, 'Chou Hall N100'],
  ['UGBA 102A', 'Introduction to Financial Accounting', 'Haas Business', 'TuTh', '11:00', undefined, 'Haas C220'],
  ['UGBA 103', 'Introduction to Finance', 'Haas Business', 'MW', '14:00', undefined, 'Chou Hall N100'],
  ['UGBA 105', 'Leading People', 'Haas Business', 'Tu', '15:00', undefined, 'Haas C220'],
  ['UGBA 106', 'Marketing', 'Haas Business', 'MW', '10:30', undefined, 'Haas C325'],
  ['UGBA 190T', 'Entrepreneurship: Lean Startup', 'Haas Business', 'Th', '14:00', undefined, 'Haas C210'],
  ['PSYCH 1', 'General Psychology', 'Psychology', 'TuTh', '14:00', undefined, 'Wheeler 150'],
  ['PSYCH C61', 'Brain, Mind, and Behavior', 'Psychology', 'MWF', '10:00', undefined, 'Li Ka Shing 245'],
  ['COGSCI C100', 'Basic Issues in Cognition', 'Cognitive Science', 'TuTh', '11:00', undefined, 'Dwinelle 145'],
  ['BIO 1A', 'General Biology Lecture', 'Integrative Biology', 'MWF', '08:00', undefined, 'Pimentel 1'],
  ['BIO 1B', 'General Biology Lecture', 'Integrative Biology', 'MWF', '09:00', undefined, 'Valley LSB 2050'],
  ['MCB 32', 'Introduction to Human Physiology', 'Molecular & Cell Biology', 'TuTh', '11:00', undefined, 'Li Ka Shing 245'],
  ['CHEM 1A', 'General Chemistry', 'Chemistry', 'MWF', '11:00', undefined, 'Pimentel 1'],
  ['CHEM 3A', 'Chemical Structure and Reactivity', 'Chemistry', 'MWF', '10:00', undefined, 'Pimentel 1'],
  ['PHYSICS 7A', 'Physics for Scientists and Engineers', 'Physics', 'MWF', '12:00', undefined, 'Pimentel 1'],
  ['PHYSICS 7B', 'Physics for Scientists and Engineers', 'Physics', 'TuTh', '09:30', undefined, 'Pimentel 1'],
  ['POL SCI 1', 'Introduction to American Politics', 'Political Science', 'MWF', '09:00', undefined, 'Wheeler 150'],
  ['POL SCI 2', 'Introduction to Comparative Politics', 'Political Science', 'TuTh', '14:00', undefined, 'Dwinelle 155'],
  ['HISTORY 7B', 'The United States from Civil War to Present', 'History', 'MWF', '13:00', undefined, 'Wheeler 150'],
  ['ENGLISH R1A', 'Reading and Composition', 'English', 'MWF', '09:00', undefined, 'Dwinelle 233'],
  ['PHILOS 2', 'Individual Morality and Social Justice', 'Philosophy', 'TuTh', '12:30', undefined, 'Dwinelle 145'],
  ['SOCIOL 1', 'Introduction to Sociology', 'Sociology', 'MW', '14:00', undefined, 'Wheeler 150'],
  ['ART 8', 'Introduction to Visual Thinking', 'Art Practice', 'TuTh', '13:00', undefined, 'Kroeber 160'],
  ['MUSIC 27', 'Introduction to Western Music', 'Music', 'MWF', '10:00', undefined, 'Morrison 125'],
  ['KOREAN 1A', 'Elementary Korean', 'East Asian Languages', 'MTuWTh', '09:00', undefined, 'Dwinelle 243'],
  ['SPANISH 1', 'Elementary Spanish', 'Spanish & Portuguese', 'MTuWTh', '10:00', undefined, 'Dwinelle 279'],
  ['PUBHLTH 142', 'Introduction to Probability and Statistics in Biology and Public Health', 'Public Health', 'TuTh', '12:30', undefined, 'Evans 10'],
  ['ENVECON 1', 'Introduction to Environmental Economics and Policy', 'Environmental Economics', 'MW', '10:00', undefined, 'Mulford 159'],
  ['ME C85', 'Introduction to Solid Mechanics', 'Mechanical Engineering', 'MWF', '14:00', undefined, 'Etcheverry 3106'],
  ['CIVENG 11', 'Engineered Systems and Sustainability', 'Civil Engineering', 'TuTh', '09:30', undefined, 'Davis 502'],
  ['BIOENG 10', 'Introduction to Biomedicine for Engineers', 'Bioengineering', 'MW', '11:00', undefined, 'Stanley 105'],
  ['INDENG 172', 'Probability and Risk Analysis for Engineers', 'Industrial Engineering', 'MWF', '15:00', undefined, 'Etcheverry 3108'],
  ['ARCH 11A', 'Introduction to Visual Studies', 'Architecture', 'Th', '14:00', undefined, 'Wurster 170'],
  ['INFO 159', 'Natural Language Processing', 'Information', 'MW', '15:30', undefined, 'South Hall 202'],
];

const stanford: Row[] = [
  ['CS 106A', 'Programming Methodology', 'Computer Science', 'MWF', '13:30', undefined, 'Hewlett 200'],
  ['CS 106B', 'Programming Abstractions', 'Computer Science', 'MWF', '10:30', undefined, 'Hewlett 200'],
  ['CS 107', 'Computer Organization and Systems', 'Computer Science', 'MWF', '14:30', undefined, 'NVIDIA Auditorium'],
  ['CS 109', 'Introduction to Probability for Computer Scientists', 'Computer Science', 'MWF', '13:30', undefined, 'Hewlett 201'],
  ['CS 110', 'Principles of Computer Systems', 'Computer Science', 'MWF', '11:30', undefined, 'Hewlett 200'],
  ['CS 111', 'Operating Systems Principles', 'Computer Science', 'TuTh', '10:30', undefined, 'Hewlett 201'],
  ['CS 124', 'From Languages to Information', 'Computer Science', 'TuTh', '13:30', undefined, 'Gates B01'],
  ['CS 129', 'Applied Machine Learning', 'Computer Science', 'MW', '15:00', undefined, 'Hewlett 200'],
  ['CS 145', 'Data Management and Data Systems', 'Computer Science', 'TuTh', '15:00', undefined, 'Hewlett 201'],
  ['CS 147', 'Human-Computer Interaction Design', 'Computer Science', 'MW', '13:30', undefined, 'NVIDIA Auditorium'],
  ['CS 148', 'Introduction to Computer Graphics and Imaging', 'Computer Science', 'MW', '11:30', undefined, 'Gates B01'],
  ['CS 161', 'Design and Analysis of Algorithms', 'Computer Science', 'MW', '13:30', undefined, 'Hewlett 200'],
  ['CS 221', 'Artificial Intelligence: Principles and Techniques', 'Computer Science', 'MW', '13:30', undefined, 'NVIDIA Auditorium'],
  ['CS 224N', 'Natural Language Processing with Deep Learning', 'Computer Science', 'TuTh', '16:30', undefined, 'NVIDIA Auditorium'],
  ['CS 229', 'Machine Learning', 'Computer Science', 'MW', '10:30', undefined, 'NVIDIA Auditorium'],
  ['CS 231N', 'Deep Learning for Computer Vision', 'Computer Science', 'TuTh', '12:00', undefined, 'NVIDIA Auditorium'],
  ['CS 246', 'Mining Massive Data Sets', 'Computer Science', 'TuTh', '13:30', undefined, 'Hewlett 200'],
  ['MATH 51', 'Linear Algebra, Multivariable Calculus, and Modern Applications', 'Mathematics', 'MWF', '09:30', undefined, 'Hewlett 201'],
  ['MATH 53', 'Differential Equations with Linear Algebra, Fourier Methods, and Modern Applications', 'Mathematics', 'MWF', '11:30', undefined, '380-380C'],
  ['STATS 116', 'Theory of Probability', 'Statistics', 'MWF', '10:30', undefined, 'Sequoia 200'],
  ['STATS 200', 'Introduction to Statistical Inference', 'Statistics', 'TuTh', '10:30', undefined, 'Hewlett 201'],
  ['ECON 1', 'Principles of Economics', 'Economics', 'MW', '09:30', undefined, 'CEMEX Auditorium'],
  ['ECON 50', 'Economic Analysis I', 'Economics', 'TuTh', '13:30', undefined, 'Landau 140'],
  ['ECON 102A', 'Introduction to Statistical Methods (Postcalculus) for Social Scientists', 'Economics', 'MWF', '13:30', undefined, 'Landau 140'],
  ['MS&E 111', 'Introduction to Optimization', 'Management Science & Engineering', 'MW', '11:30', undefined, 'Huang 18'],
  ['MS&E 178', 'The Spirit of Entrepreneurship', 'Management Science & Engineering', 'Th', '16:30', undefined, 'Huang 18'],
  ['ENGR 40M', 'An Intro to Making: What is EE', 'Engineering', 'TuTh', '13:30', undefined, 'Packard 101'],
  ['EE 101A', 'Circuits I', 'Electrical Engineering', 'MWF', '11:30', undefined, 'Packard 101'],
  ['ME 101', 'Visual Thinking', 'Mechanical Engineering', 'MW', '13:30', undefined, 'Building 550'],
  ['PSYCH 1', 'Introduction to Psychology', 'Psychology', 'TuTh', '10:30', undefined, 'CEMEX Auditorium'],
  ['SYMSYS 1', 'Minds and Machines', 'Symbolic Systems', 'MWF', '11:30', undefined, 'Hewlett 200'],
  ['BIO 82', 'Genetics', 'Biology', 'MWF', '10:30', undefined, 'Hewlett 200'],
  ['CHEM 31A', 'Chemical Principles I', 'Chemistry', 'MWF', '09:30', undefined, 'Braun Auditorium'],
  ['PHYSICS 41', 'Mechanics', 'Physics', 'MWF', '13:30', undefined, 'Hewlett 200'],
  ['POLISCI 1', 'Introduction to International Relations', 'Political Science', 'TuTh', '15:00', undefined, 'Cubberley Auditorium'],
  ['PWR 1', 'Writing & Rhetoric 1', 'Program in Writing and Rhetoric', 'MW', '10:30', undefined, 'Sweet Hall 025'],
  ['HISTORY 1', 'Global Human History', 'History', 'TuTh', '13:30', undefined, 'Building 200-002'],
  ['MUSIC 21', 'Introduction to Musicianship', 'Music', 'TuTh', '10:30', undefined, 'Braun Music 105'],
  ['ARTSTUDI 140', 'Introduction to Painting', 'Art Practice', 'Tu', '13:30', undefined, 'McMurtry 250'],
  ['KORLANG 1', 'First-Year Korean, First Quarter', 'Korean Language', 'MTuWTh', '09:30', undefined, 'Building 260-113'],
];

const ucla: Row[] = [
  ['COM SCI 31', 'Introduction to Computer Science I', 'Computer Science', 'MWF', '10:00', undefined, 'Franz 1178'],
  ['COM SCI 32', 'Introduction to Computer Science II', 'Computer Science', 'MWF', '14:00', undefined, 'Boelter 3400'],
  ['COM SCI 33', 'Introduction to Computer Organization', 'Computer Science', 'TuTh', '10:00', undefined, 'Boelter 3400'],
  ['COM SCI 35L', 'Software Construction', 'Computer Science', 'TuTh', '14:00', undefined, 'Dodd 147'],
  ['COM SCI 111', 'Operating Systems Principles', 'Computer Science', 'MW', '16:00', undefined, 'Boelter 3400'],
  ['COM SCI 118', 'Computer Network Fundamentals', 'Computer Science', 'MW', '10:00', undefined, 'Boelter 3400'],
  ['COM SCI 143', 'Database Systems', 'Computer Science', 'TuTh', '12:00', undefined, 'Boelter 3400'],
  ['COM SCI 161', 'Fundamentals of Artificial Intelligence', 'Computer Science', 'MW', '14:00', undefined, 'Boelter 3400'],
  ['COM SCI 180', 'Introduction to Algorithms and Complexity', 'Computer Science', 'TuTh', '16:00', undefined, 'Boelter 3400'],
  ['COM SCI M146', 'Introduction to Machine Learning', 'Computer Science', 'MW', '12:00', undefined, 'Boelter 3400'],
  ['MATH 31A', 'Differential and Integral Calculus', 'Mathematics', 'MWF', '08:00', undefined, 'Haines 39'],
  ['MATH 32A', 'Calculus of Several Variables', 'Mathematics', 'MWF', '13:00', undefined, 'Kinsey 1200B'],
  ['MATH 33A', 'Linear Algebra and Applications', 'Mathematics', 'MWF', '11:00', undefined, 'Franz 1178'],
  ['MATH 61', 'Introduction to Discrete Structures', 'Mathematics', 'MWF', '15:00', undefined, 'MS 4000A'],
  ['STATS 10', 'Introduction to Statistical Reasoning', 'Statistics', 'TuTh', '11:00', undefined, 'Broad 2160E'],
  ['STATS 100A', 'Introduction to Probability', 'Statistics', 'MWF', '12:00', undefined, 'Boelter 5249'],
  ['ECON 1', 'Principles of Economics', 'Economics', 'TuTh', '09:30', undefined, 'Moore 100'],
  ['ECON 11', 'Microeconomic Theory', 'Economics', 'MW', '15:30', undefined, 'Bunche 2209A'],
  ['ECON 41', 'Statistics for Economists', 'Economics', 'TuTh', '14:00', undefined, 'Dodd 147'],
  ['MGMT 1A', 'Principles of Accounting', 'Management', 'MW', '12:00', undefined, 'Gold Hall B301'],
  ['PSYCH 10', 'Introductory Psychology', 'Psychology', 'MW', '10:00', undefined, 'Moore 100'],
  ['PSYCH 100A', 'Psychological Statistics', 'Psychology', 'TuTh', '12:30', undefined, 'Franz 1178'],
  ['LIFESCI 7A', 'Cell and Molecular Biology', 'Life Sciences', 'MWF', '09:00', undefined, 'Moore 100'],
  ['CHEM 14A', 'Atomic and Molecular Structure', 'Chemistry', 'MWF', '10:00', undefined, 'CS 24'],
  ['PHYSICS 1A', 'Physics for Scientists and Engineers: Mechanics', 'Physics', 'MWF', '14:00', undefined, 'Knudsen 1220B'],
  ['POL SCI 10', 'Introduction to Political Theory', 'Political Science', 'TuTh', '11:00', undefined, 'Haines 39'],
  ['COMM 10', 'Introduction to Communication', 'Communication', 'TuTh', '14:00', undefined, 'Broad 2160E'],
  ['SOCIOL 1', 'Introductory Sociology', 'Sociology', 'MW', '13:00', undefined, 'Haines 39'],
  ['FILM TV 106A', 'History of the American Motion Picture', 'Film, TV & Digital Media', 'W', '14:00', undefined, 'Melnitz 1409'],
  ['ART 11A', 'Drawing', 'Art', 'Tu', '13:00', undefined, 'Broad 1250'],
  ['ENGL 4W', 'Critical Reading and Writing', 'English', 'MW', '11:00', undefined, 'Humanities A26'],
  ['HIST 1C', 'Introduction to Western Civilization: Circa 1715 to Present', 'History', 'MWF', '12:00', undefined, 'Haines 39'],
  ['KOREA 1', 'Elementary Modern Korean', 'Asian Languages & Cultures', 'MTuWTh', '10:00', undefined, 'Royce 156'],
  ['DESMA 22', 'Form', 'Design Media Arts', 'Th', '09:00', undefined, 'Broad 4240'],
  ['EC ENGR 3', 'Introduction to Electrical Engineering', 'Electrical & Computer Engineering', 'TuTh', '10:00', undefined, 'Boelter 5440'],
  ['MECH&AE 101', 'Statics and Strength of Materials', 'Mechanical & Aerospace Engineering', 'MWF', '11:00', undefined, 'Boelter 5420'],
  ['BIOENGR 10', 'Introduction to Bioengineering', 'Bioengineering', 'MW', '14:00', undefined, 'Engineering VI 289'],
  ['PUB HLT 150', 'Contemporary Health Issues', 'Public Health', 'TuTh', '15:30', undefined, 'CHS 33-105A'],
];

const mit: Row[] = [
  ['6.100A', 'Introduction to Computer Science Programming in Python', 'EECS', 'TuTh', '15:00', undefined, '26-100'],
  ['6.1010', 'Fundamentals of Programming', 'EECS', 'MW', '14:00', undefined, '34-101'],
  ['6.1020', 'Software Construction', 'EECS', 'MW', '13:00', undefined, '32-123'],
  ['6.1200', 'Mathematics for Computer Science', 'EECS', 'TuTh', '14:30', undefined, '34-101'],
  ['6.1210', 'Introduction to Algorithms', 'EECS', 'TuTh', '11:00', undefined, '26-100'],
  ['6.1220', 'Design and Analysis of Algorithms', 'EECS', 'TuTh', '14:30', undefined, '32-123'],
  ['6.1800', 'Computer Systems Engineering', 'EECS', 'MW', '14:00', undefined, '32-123'],
  ['6.1910', 'Computation Structures', 'EECS', 'TuTh', '13:00', undefined, '32-155'],
  ['6.3900', 'Introduction to Machine Learning', 'EECS', 'TuTh', '09:30', undefined, '26-100'],
  ['6.5830', 'Database Systems', 'EECS', 'MW', '14:30', undefined, '32-124'],
  ['6.8611', 'Quantitative Methods for Natural Language Processing', 'EECS', 'TuTh', '11:00', undefined, '32-141'],
  ['6.2000', 'Electrical Circuits: Modeling and Design', 'EECS', 'MW', '11:00', undefined, '34-101'],
  ['18.01', 'Calculus', 'Mathematics', 'MWF', '12:00', undefined, '10-250'],
  ['18.02', 'Multivariable Calculus', 'Mathematics', 'MWF', '10:00', undefined, '26-100'],
  ['18.03', 'Differential Equations', 'Mathematics', 'MWF', '13:00', undefined, '54-100'],
  ['18.06', 'Linear Algebra', 'Mathematics', 'MWF', '11:00', undefined, '26-100'],
  ['18.600', 'Probability and Random Variables', 'Mathematics', 'MWF', '14:00', undefined, '32-123'],
  ['8.01', 'Physics I', 'Physics', 'MWF', '10:00', undefined, '26-152'],
  ['8.02', 'Physics II', 'Physics', 'MWF', '13:00', undefined, '26-152'],
  ['7.012', 'Introductory Biology', 'Biology', 'MWF', '11:00', undefined, '10-250'],
  ['5.111', 'Principles of Chemical Science', 'Chemistry', 'MWF', '12:00', undefined, '10-250'],
  ['3.091', 'Introduction to Solid-State Chemistry', 'Materials Science', 'MWF', '11:00', undefined, '10-250'],
  ['14.01', 'Principles of Microeconomics', 'Economics', 'TuTh', '13:00', undefined, 'E51-315'],
  ['14.02', 'Principles of Macroeconomics', 'Economics', 'MW', '13:00', undefined, 'E51-315'],
  ['15.053', 'Optimization Methods in Business Analytics', 'Sloan Management', 'MW', '13:00', undefined, 'E51-325'],
  ['15.390', 'New Enterprises', 'Sloan Management', 'W', '16:00', undefined, 'E62-233'],
  ['2.001', 'Mechanics and Materials I', 'Mechanical Engineering', 'MW', '11:00', undefined, '3-270'],
  ['2.00B', 'Toy Product Design', 'Mechanical Engineering', 'MW', '14:00', undefined, 'N51-310'],
  ['16.001', 'Unified Engineering: Materials and Structures', 'Aeronautics & Astronautics', 'MWF', '09:00', undefined, '33-419'],
  ['9.00', 'Introduction to Psychological Science', 'Brain & Cognitive Sciences', 'TuTh', '11:00', undefined, '32-123'],
  ['24.00', 'Problems of Philosophy', 'Philosophy', 'TuTh', '15:00', undefined, '32-124'],
  ['21W.011', 'Writing and Rhetoric: Rhetoric and Contemporary Issues', 'Writing', 'TuTh', '13:00', undefined, '14N-325'],
  ['21M.301', 'Harmony and Counterpoint I', 'Music', 'MW', '15:00', undefined, '4-364'],
  ['21G.991', 'Korean I', 'Global Languages', 'MTuWTh', '10:00', undefined, '16-644'],
  ['4.021', 'Design Studio: How to Design', 'Architecture', 'TuTh', '13:00', undefined, '3-402'],
  ['CMS.100', 'Introduction to Media Studies', 'Comparative Media Studies', 'MW', '11:00', undefined, '56-114'],
  ['1.000', 'Introduction to Computer Programming and Numerical Methods for Engineering Applications', 'Civil & Environmental Engineering', 'MW', '14:30', undefined, '1-134'],
  ['20.020', 'Introduction to Biological Engineering Design', 'Biological Engineering', 'MW', '15:00', undefined, '56-154'],
];

const sfsu: Row[] = [
  ['CSC 210', 'Introduction to Computer Programming', 'Computer Science', 'MW', '09:30', undefined, 'Thornton 428'],
  ['CSC 220', 'Data Structures', 'Computer Science', 'TuTh', '11:00', undefined, 'Thornton 428'],
  ['CSC 230', 'Discrete Mathematical Structures for Computer Science', 'Computer Science', 'MW', '14:00', undefined, 'HSS 306'],
  ['CSC 340', 'Programming Methodology', 'Computer Science', 'TuTh', '14:00', undefined, 'Thornton 331'],
  ['CSC 415', 'Operating System Principles', 'Computer Science', 'MW', '11:00', undefined, 'Thornton 428'],
  ['CSC 510', 'Analysis of Algorithms', 'Computer Science', 'TuTh', '09:30', undefined, 'HSS 306'],
  ['CSC 648', 'Software Engineering', 'Computer Science', 'Th', '16:00', undefined, 'Thornton 331'],
  ['CSC 675', 'Introduction to Database Systems', 'Computer Science', 'MW', '15:30', undefined, 'Thornton 428'],
  ['MATH 226', 'Calculus I', 'Mathematics', 'MWF', '09:00', undefined, 'Thornton 211'],
  ['MATH 227', 'Calculus II', 'Mathematics', 'MWF', '11:00', undefined, 'Thornton 211'],
  ['MATH 324', 'Probability and Statistics with Computing', 'Mathematics', 'TuTh', '12:30', undefined, 'Thornton 211'],
  ['ECON 101', 'Introduction to Microeconomic Analysis', 'Economics', 'MW', '12:30', undefined, 'HSS 154'],
  ['ECON 102', 'Introduction to Macroeconomic Analysis', 'Economics', 'TuTh', '11:00', undefined, 'HSS 154'],
  ['BUS 300GW', 'Business Communication for Professionals — GWAR', 'Business', 'W', '18:00', undefined, 'BUS 118'],
  ['ACCT 100', 'Introduction to Financial Accounting', 'Accounting', 'MW', '17:00', undefined, 'BUS 118'],
  ['MKTG 431', 'Principles of Marketing', 'Marketing', 'TuTh', '15:30', undefined, 'BUS 118'],
  ['PSY 200', 'General Psychology', 'Psychology', 'MW', '09:30', undefined, 'HSS 154'],
  ['BIOL 230', 'Introductory Biology I', 'Biology', 'TuTh', '08:00', undefined, 'Hensill 205'],
  ['CHEM 115', 'General Chemistry I', 'Chemistry', 'MWF', '10:00', undefined, 'Hensill 205'],
  ['PHYS 220', 'General Physics with Calculus I', 'Physics', 'TuTh', '09:30', undefined, 'Thornton 211'],
  ['PLSI 200', 'American Politics', 'Political Science', 'MW', '11:00', undefined, 'HSS 154'],
  ['COMM 150', 'Fundamentals of Oral Communication', 'Communication Studies', 'TuTh', '11:00', undefined, 'HUM 383'],
  ['ENG 114', 'Writing the First Year: Finding Your Voice', 'English', 'MWF', '12:00', undefined, 'HUM 287'],
  ['ART 235', 'Introduction to Drawing', 'Art', 'Tu', '13:00', undefined, 'Fine Arts 330'],
  ['CINE 200', 'Introduction to Cinema Studies', 'Cinema', 'W', '14:00', undefined, 'Fine Arts 101'],
  ['KOR 101', 'First Semester Korean', 'Modern Languages', 'MWF', '10:00', undefined, 'HUM 384'],
  ['KIN 250', 'Introduction to Kinesiology', 'Kinesiology', 'MW', '14:00', undefined, 'Gym 101'],
  ['DES 210', 'Introduction to Design', 'Design', 'TuTh', '12:30', undefined, 'Fine Arts 145'],
];

export const catalogCourses: CatalogCourse[] = [
  ...expand('s_berkeley', TERM, berkeley),
  ...expand('s_stanford', TERM, stanford),
  ...expand('s_ucla', TERM, ucla),
  ...expand('s_mit', TERM, mit),
  ...expand('s_sfsu', TERM, sfsu),
];

/** 수업의 학기 라벨 ("Fall 2026") — 옛 행은 원본 코드로 저장돼 있어 맞춰 읽는다 */
export const courseTerm = (c: CatalogCourse) => normalizeTermLabel(c.term ?? '');

/** 학교에 수업이 있는 학기들 (오래된 것부터). 시간 없는 공개 카탈로그('catalog') 같은 라벨은 빼지 않는다 */
export function catalogTerms(courses: CatalogCourse[], schoolId: ID): string[] {
  const s = new Set<string>();
  for (const c of courses) if (c.schoolId === schoolId) s.add(courseTerm(c));
  return [...s].sort((a, b) => termOrder(a) - termOrder(b) || a.localeCompare(b));
}

/**
 * 어느 학기 목록을 보여줄지: 요청한 학기 → 없으면 지금 학기(있으면) → 그것도 없으면 '' (학기 구분 없이 전부).
 * 지금 학기 수업이 없는 학교(쿼터제 Autumn, 공개 카탈로그만 있는 학교, 아직 옛 코드로 저장된 행)는 예전처럼 전부 보여준다.
 */
export function resolveCatalogTerm(courses: CatalogCourse[], schoolId: ID, requested = '', now: Date = new Date()): string {
  if (requested.trim()) return requested.trim();
  const cur = termLabel(currentTerm(now));
  const terms = catalogTerms(courses, schoolId);
  if (terms.includes(cur)) return cur;
  // 쿼터제(Stanford)는 가을 학기를 Autumn 이라 부른다
  const autumn = cur.replace(/^Fall /, 'Autumn ');
  return terms.includes(autumn) ? autumn : '';
}

/** 코드·이름·학과·교수로 검색. 코드 앞부분 일치를 먼저 보여준다. term 을 주면 그 학기 수업만 */
export function searchCatalog(courses: CatalogCourse[], schoolId: ID, query: string, limit = 30, department = '', term = ''): CatalogCourse[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const mine = courses.filter((c) => c.schoolId === schoolId && (!department || c.department === department) && (!term || courseTerm(c) === term));
  // 학과를 골랐으면 그 학과 수업을 과목 번호 순으로 전부 (검색어가 있으면 그 안에서 찾기)
  if (!q) return (department ? [...mine].sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true })) : mine).slice(0, department ? 400 : limit);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');
  const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const scored = mine.map((c) => {
    const code = norm(c.code);
    // 바뀐 과목 번호 — Berkeley 는 제목에 "(formerly MATH 1A)" 를 붙여 둔다. 옛 번호로 찾아도 나오게
    const formerly = /\(formerly ([^)]+)\)/i.exec(c.title)?.[1] ?? '';
    let score = 0;
    if (code === q || compact(c.code) === compact(q)) score = 100;
    else if (formerly && compact(formerly) === compact(q)) score = 95;
    else if (formerly && compact(q).length >= 3 && compact(formerly).startsWith(compact(q))) score = 70;
    else if (code.startsWith(q) || compact(c.code).startsWith(compact(q))) score = 80;
    else if (norm(c.title).includes(q)) score = 60;
    else if (norm(c.department).includes(q)) score = 40;
    else if (c.instructor && norm(c.instructor).includes(q)) score = 30;
    else if (code.includes(q)) score = 20;
    return { c, score };
  }).filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.c.code.localeCompare(b.c.code));
  return scored.slice(0, limit).map((x) => x.c);
}

/** 학교의 학과(과목 분류) 목록 — 수업 수와 함께, 이름순. term 을 주면 그 학기 기준 */
export function catalogDepartments(courses: CatalogCourse[], schoolId: ID, term = ''): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const c of courses) if (c.schoolId === schoolId && c.department && (!term || courseTerm(c) === term)) m.set(c.department, (m.get(c.department) ?? 0) + 1);
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}
