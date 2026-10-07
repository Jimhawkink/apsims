// CBC Senior School — Subject to Strands mapping
// Used by CBC Marks Entry for expandable per-strand score entry.
// Subject names MUST match the school_subjects.subject_name values in the DB.
// Strand IDs MUST match the tracker's CBC_SENIOR_DATA strand IDs exactly.

export type CBCStrand = { id: string; name: string };

const SUBJECT_STRANDS: Record<string, CBCStrand[]> = {
  // CORE COMPULSORY
  'English': [
    { id: 'ENG-S1', name: 'Listening and Speaking' },
    { id: 'ENG-S2', name: 'Reading and Comprehension' },
    { id: 'ENG-S3', name: 'Writing' },
    { id: 'ENG-S4', name: 'Grammar and Language Use' },
  ],
  'Kiswahili / KSL': [
    { id: 'KSW-S1', name: 'Kusikiliza na Kuzungumza' },
    { id: 'KSW-S2', name: 'Kusoma' },
    { id: 'KSW-S3', name: 'Kuandika' },
    { id: 'KSW-S4', name: 'Fasihi na Utamaduni' },
  ],
  'Kiswahili': [
    { id: 'KSW-S1', name: 'Kusikiliza na Kuzungumza' },
    { id: 'KSW-S2', name: 'Kusoma' },
    { id: 'KSW-S3', name: 'Kuandika' },
    { id: 'KSW-S4', name: 'Fasihi na Utamaduni' },
  ],
  'Community Service Learning': [
    { id: 'CSL-S1', name: 'Service Projects' },
    { id: 'CSL-S2', name: 'Reflection and Learning' },
    { id: 'CSL-S3', name: 'Civic Competency' },
  ],
  'Physical Education': [
    { id: 'PE-S1', name: 'Physical Fitness and Health' },
    { id: 'PE-S2', name: 'Games and Sports' },
    { id: 'PE-S3', name: 'Health and Wellness' },
  ],
  // STEM
  'Mathematics': [
    { id: 'MATH-S1', name: 'Numbers and Algebra' },
    { id: 'MATH-S2', name: 'Geometry and Trigonometry' },
    { id: 'MATH-S3', name: 'Calculus' },
    { id: 'MATH-S4', name: 'Statistics and Probability' },
  ],
  'Biology': [
    { id: 'BIO-S1', name: 'Cell Biology and Biochemistry' },
    { id: 'BIO-S2', name: 'Physiology and Anatomy' },
    { id: 'BIO-S3', name: 'Genetics and Evolution' },
    { id: 'BIO-S4', name: 'Ecology and Environment' },
  ],
  'Chemistry': [
    { id: 'CHEM-S1', name: 'Physical Chemistry' },
    { id: 'CHEM-S2', name: 'Organic Chemistry' },
    { id: 'CHEM-S3', name: 'Inorganic Chemistry' },
  ],
  'Physics': [
    { id: 'PHY-S1', name: 'Mechanics' },
    { id: 'PHY-S2', name: 'Waves and Optics' },
    { id: 'PHY-S3', name: 'Electricity and Magnetism' },
    { id: 'PHY-S4', name: 'Modern Physics' },
  ],
  'Computer Studies': [
    { id: 'COMP-S1', name: 'Computer Systems' },
    { id: 'COMP-S2', name: 'Programming and Algorithms' },
    { id: 'COMP-S3', name: 'Data and Information Management' },
    { id: 'COMP-S4', name: 'Networks and Cybersecurity' },
  ],
  'Agriculture': [
    { id: 'AGR-S1', name: 'Crop Production' },
    { id: 'AGR-S2', name: 'Livestock Production' },
    { id: 'AGR-S3', name: 'Agribusiness and Economics' },
  ],
  'Building & Construction': [
    { id: 'BUILD-S1', name: 'Construction Technology' },
    { id: 'BUILD-S2', name: 'Technical Drawing' },
  ],
  'Building and Construction': [
    { id: 'BUILD-S1', name: 'Construction Technology' },
    { id: 'BUILD-S2', name: 'Technical Drawing' },
  ],
  'Electrical Technology': [
    { id: 'ELEC-S1', name: 'Electrical Fundamentals' },
    { id: 'ELEC-S2', name: 'Electrical Installations' },
  ],
  'Home Science': [
    { id: 'HOME-S1', name: 'Food and Nutrition' },
    { id: 'HOME-S2', name: 'Textiles and Clothing' },
    { id: 'HOME-S3', name: 'Child Development and Family' },
  ],
  // SOCIAL SCIENCES
  'History & Citizenship': [
    { id: 'HIST-S1', name: 'Kenyan History' },
    { id: 'HIST-S2', name: 'African and World History' },
    { id: 'HIST-S3', name: 'Citizenship and Governance' },
  ],
  'Geography': [
    { id: 'GEO-S1', name: 'Physical Geography' },
    { id: 'GEO-S2', name: 'Human Geography' },
    { id: 'GEO-S3', name: 'Environmental Geography' },
  ],
  'Business Studies': [
    { id: 'BUS-S1', name: 'Business Concepts and Environment' },
    { id: 'BUS-S2', name: 'Commerce and Trade' },
    { id: 'BUS-S3', name: 'Entrepreneurship' },
    { id: 'BUS-S4', name: 'Accounting Principles' },
  ],
  'Economics': [
    { id: 'ECO-S1', name: 'Microeconomics' },
    { id: 'ECO-S2', name: 'Macroeconomics' },
  ],
  // ARTS & SPORTS
  'Visual Arts': [
    { id: 'ART-S1', name: 'Drawing and Painting' },
    { id: 'ART-S2', name: 'Design and Applied Arts' },
    { id: 'ART-S3', name: 'Art History and Criticism' },
  ],
  'Fine Arts': [
    { id: 'ART-S1', name: 'Drawing and Painting' },
    { id: 'ART-S2', name: 'Design and Applied Arts' },
    { id: 'ART-S3', name: 'Art History and Criticism' },
  ],
  'Music': [
    { id: 'MUSIC-S1', name: 'Music Theory and Literacy' },
    { id: 'MUSIC-S2', name: 'Performance' },
    { id: 'MUSIC-S3', name: 'Composition and Technology' },
  ],
  'Performing Arts (Drama)': [
    { id: 'DRAMA-S1', name: 'Theatre Performance' },
    { id: 'DRAMA-S2', name: 'Dramatic Writing' },
  ],
  'Performing Arts': [
    { id: 'DRAMA-S1', name: 'Theatre Performance' },
    { id: 'DRAMA-S2', name: 'Dramatic Writing' },
  ],
  'Sports Science': [
    { id: 'SPORT-S1', name: 'Exercise Physiology' },
    { id: 'SPORT-S2', name: 'Sports Psychology' },
    { id: 'SPORT-S3', name: 'Coaching and Officiating' },
  ],
};

/**
 * Get strands for a subject by its exact name or a partial/fuzzy match.
 * Returns empty array if subject has no strand data.
 */
export function getCBCStrands(subjectName: string): CBCStrand[] {
  if (!subjectName) return [];
  // Exact match first
  if (SUBJECT_STRANDS[subjectName]) return SUBJECT_STRANDS[subjectName];
  // Case-insensitive match
  const lower = subjectName.toLowerCase();
  const key = Object.keys(SUBJECT_STRANDS).find(k => k.toLowerCase() === lower);
  if (key) return SUBJECT_STRANDS[key];
  // Partial match (subject name contains or is contained in a key)
  const partial = Object.keys(SUBJECT_STRANDS).find(k =>
    lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  return partial ? SUBJECT_STRANDS[partial] : [];
}
