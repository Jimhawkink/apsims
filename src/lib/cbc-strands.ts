// CBC Senior School — Subject → Strands → Sub-Strands mapping
// Sub-strand IDs match the tracker's CBC_SENIOR_DATA EXACTLY.
// Marks are entered per sub-strand (matching the tracker's structure).

export type CBCSubStrand = { id: string; name: string };
export type CBCStrandWithSubs = { id: string; name: string; sub_strands: CBCSubStrand[] };

const SUBJECT_STRANDS: Record<string, CBCStrandWithSubs[]> = {
  // ── CORE COMPULSORY ──────────────────────────────────────────────────────────
  'English': [
    { id: 'ENG-S1', name: 'Listening and Speaking', sub_strands: [
      { id: 'ENG-SS1', name: 'Oral Communication' },
      { id: 'ENG-SS2', name: 'Pronunciation and Intonation' },
    ]},
    { id: 'ENG-S2', name: 'Reading and Comprehension', sub_strands: [
      { id: 'ENG-SS3', name: 'Intensive Reading' },
      { id: 'ENG-SS4', name: 'Extensive Reading' },
    ]},
    { id: 'ENG-S3', name: 'Writing', sub_strands: [
      { id: 'ENG-SS5', name: 'Functional Writing' },
      { id: 'ENG-SS6', name: 'Creative Writing' },
    ]},
    { id: 'ENG-S4', name: 'Grammar and Language Use', sub_strands: [
      { id: 'ENG-SS7', name: 'Grammar in Context' },
    ]},
  ],
  'Kiswahili / KSL': [
    { id: 'KSW-S1', name: 'Kusikiliza na Kuzungumza', sub_strands: [
      { id: 'KSW-SS1', name: 'Mazungumzo' },
      { id: 'KSW-SS2', name: 'Matamshi na Lafudhi' },
    ]},
    { id: 'KSW-S2', name: 'Kusoma', sub_strands: [
      { id: 'KSW-SS3', name: 'Usomaji wa Kina' },
    ]},
    { id: 'KSW-S3', name: 'Kuandika', sub_strands: [
      { id: 'KSW-SS4', name: 'Uandishi wa Insha' },
    ]},
    { id: 'KSW-S4', name: 'Fasihi na Utamaduni', sub_strands: [
      { id: 'KSW-SS5', name: 'Fasihi Andishi' },
      { id: 'KSW-SS6', name: 'Fasihi Simulizi' },
    ]},
  ],
  'Kiswahili': [
    { id: 'KSW-S1', name: 'Kusikiliza na Kuzungumza', sub_strands: [
      { id: 'KSW-SS1', name: 'Mazungumzo' },
      { id: 'KSW-SS2', name: 'Matamshi na Lafudhi' },
    ]},
    { id: 'KSW-S2', name: 'Kusoma', sub_strands: [
      { id: 'KSW-SS3', name: 'Usomaji wa Kina' },
    ]},
    { id: 'KSW-S3', name: 'Kuandika', sub_strands: [
      { id: 'KSW-SS4', name: 'Uandishi wa Insha' },
    ]},
    { id: 'KSW-S4', name: 'Fasihi na Utamaduni', sub_strands: [
      { id: 'KSW-SS5', name: 'Fasihi Andishi' },
      { id: 'KSW-SS6', name: 'Fasihi Simulizi' },
    ]},
  ],
  'Community Service Learning': [
    { id: 'CSL-S1', name: 'Service Projects', sub_strands: [
      { id: 'CSL-SS1', name: 'Project Design and Planning' },
      { id: 'CSL-SS2', name: 'Project Implementation' },
    ]},
    { id: 'CSL-S2', name: 'Reflection and Learning', sub_strands: [
      { id: 'CSL-SS3', name: 'Critical Reflection' },
    ]},
    { id: 'CSL-S3', name: 'Civic Competency', sub_strands: [
      { id: 'CSL-SS4', name: 'Citizenship and Values' },
    ]},
  ],
  'Physical Education': [
    { id: 'PE-S1', name: 'Physical Fitness and Health', sub_strands: [
      { id: 'PE-SS1', name: 'Fitness Components' },
    ]},
    { id: 'PE-S2', name: 'Games and Sports', sub_strands: [
      { id: 'PE-SS2', name: 'Team Sports' },
      { id: 'PE-SS3', name: 'Individual Sports' },
    ]},
    { id: 'PE-S3', name: 'Health and Wellness', sub_strands: [
      { id: 'PE-SS4', name: 'Health Education' },
    ]},
  ],
  // ── STEM ─────────────────────────────────────────────────────────────────────
  'Mathematics': [
    { id: 'MATH-S1', name: 'Numbers and Algebra', sub_strands: [
      { id: 'MATH-SS1', name: 'Number Theory' },
      { id: 'MATH-SS2', name: 'Algebra' },
      { id: 'MATH-SS3', name: 'Matrices and Transformations' },
    ]},
    { id: 'MATH-S2', name: 'Geometry and Trigonometry', sub_strands: [
      { id: 'MATH-SS4', name: 'Euclidean Geometry' },
      { id: 'MATH-SS5', name: 'Trigonometry' },
    ]},
    { id: 'MATH-S3', name: 'Calculus', sub_strands: [
      { id: 'MATH-SS6', name: 'Differential Calculus' },
      { id: 'MATH-SS7', name: 'Integral Calculus' },
    ]},
    { id: 'MATH-S4', name: 'Statistics and Probability', sub_strands: [
      { id: 'MATH-SS8', name: 'Statistics' },
      { id: 'MATH-SS9', name: 'Probability' },
    ]},
  ],
  'Biology': [
    { id: 'BIO-S1', name: 'Cell Biology and Biochemistry', sub_strands: [
      { id: 'BIO-SS1', name: 'Cell Structure and Function' },
      { id: 'BIO-SS2', name: 'Biochemistry' },
    ]},
    { id: 'BIO-S2', name: 'Physiology and Anatomy', sub_strands: [
      { id: 'BIO-SS3', name: 'Human Physiology' },
      { id: 'BIO-SS4', name: 'Plant Biology' },
    ]},
    { id: 'BIO-S3', name: 'Genetics and Evolution', sub_strands: [
      { id: 'BIO-SS5', name: 'Genetics' },
      { id: 'BIO-SS6', name: 'Evolution' },
    ]},
    { id: 'BIO-S4', name: 'Ecology and Environment', sub_strands: [
      { id: 'BIO-SS7', name: 'Ecology' },
      { id: 'BIO-SS8', name: 'Conservation' },
    ]},
  ],
  'Chemistry': [
    { id: 'CHEM-S1', name: 'Physical Chemistry', sub_strands: [
      { id: 'CHEM-SS1', name: 'Atomic Structure' },
      { id: 'CHEM-SS2', name: 'Chemical Bonding' },
      { id: 'CHEM-SS3', name: 'Thermochemistry' },
      { id: 'CHEM-SS4', name: 'Kinetics and Equilibrium' },
    ]},
    { id: 'CHEM-S2', name: 'Organic Chemistry', sub_strands: [
      { id: 'CHEM-SS5', name: 'Hydrocarbons' },
      { id: 'CHEM-SS6', name: 'Functional Groups' },
    ]},
    { id: 'CHEM-S3', name: 'Inorganic Chemistry', sub_strands: [
      { id: 'CHEM-SS7', name: 'Periodic Table Trends' },
      { id: 'CHEM-SS8', name: 'Electrochemistry' },
    ]},
  ],
  'Physics': [
    { id: 'PHY-S1', name: 'Mechanics', sub_strands: [
      { id: 'PHY-SS1', name: 'Kinematics' },
      { id: 'PHY-SS2', name: "Newton's Laws and Forces" },
      { id: 'PHY-SS3', name: 'Work, Energy and Power' },
    ]},
    { id: 'PHY-S2', name: 'Waves and Optics', sub_strands: [
      { id: 'PHY-SS4', name: 'Waves' },
      { id: 'PHY-SS5', name: 'Optics' },
    ]},
    { id: 'PHY-S3', name: 'Electricity and Magnetism', sub_strands: [
      { id: 'PHY-SS6', name: 'Electric Fields' },
      { id: 'PHY-SS7', name: 'Electromagnetism' },
    ]},
    { id: 'PHY-S4', name: 'Modern Physics', sub_strands: [
      { id: 'PHY-SS8', name: 'Atomic and Nuclear Physics' },
    ]},
  ],
  'Computer Studies': [
    { id: 'COMP-S1', name: 'Computer Systems', sub_strands: [
      { id: 'COMP-SS1', name: 'Hardware and Architecture' },
      { id: 'COMP-SS2', name: 'Operating Systems' },
    ]},
    { id: 'COMP-S2', name: 'Programming and Algorithms', sub_strands: [
      { id: 'COMP-SS3', name: 'Algorithms and Problem Solving' },
      { id: 'COMP-SS4', name: 'Programming' },
    ]},
    { id: 'COMP-S3', name: 'Data and Information Management', sub_strands: [
      { id: 'COMP-SS5', name: 'Databases' },
      { id: 'COMP-SS6', name: 'Data Science Basics' },
    ]},
    { id: 'COMP-S4', name: 'Networks and Cybersecurity', sub_strands: [
      { id: 'COMP-SS7', name: 'Networks' },
      { id: 'COMP-SS8', name: 'Cybersecurity' },
    ]},
  ],
  'Agriculture': [
    { id: 'AGR-S1', name: 'Crop Production', sub_strands: [
      { id: 'AGR-SS1', name: 'Field Crops' },
      { id: 'AGR-SS2', name: 'Horticulture' },
    ]},
    { id: 'AGR-S2', name: 'Livestock Production', sub_strands: [
      { id: 'AGR-SS3', name: 'Animal Husbandry' },
    ]},
    { id: 'AGR-S3', name: 'Agribusiness and Economics', sub_strands: [
      { id: 'AGR-SS4', name: 'Farm Management' },
    ]},
  ],
  'Building & Construction': [
    { id: 'BUILD-S1', name: 'Construction Technology', sub_strands: [
      { id: 'BUILD-SS1', name: 'Materials and Tools' },
      { id: 'BUILD-SS2', name: 'Building Structures' },
    ]},
    { id: 'BUILD-S2', name: 'Technical Drawing', sub_strands: [
      { id: 'BUILD-SS3', name: 'Architectural Drawing' },
    ]},
  ],
  'Building and Construction': [
    { id: 'BUILD-S1', name: 'Construction Technology', sub_strands: [
      { id: 'BUILD-SS1', name: 'Materials and Tools' },
      { id: 'BUILD-SS2', name: 'Building Structures' },
    ]},
    { id: 'BUILD-S2', name: 'Technical Drawing', sub_strands: [
      { id: 'BUILD-SS3', name: 'Architectural Drawing' },
    ]},
  ],
  'Electrical Technology': [
    { id: 'ELEC-S1', name: 'Electrical Fundamentals', sub_strands: [
      { id: 'ELEC-SS1', name: 'DC and AC Circuits' },
    ]},
    { id: 'ELEC-S2', name: 'Electrical Installations', sub_strands: [
      { id: 'ELEC-SS2', name: 'Domestic Wiring' },
    ]},
  ],
  'Home Science': [
    { id: 'HOME-S1', name: 'Food and Nutrition', sub_strands: [
      { id: 'HOME-SS1', name: 'Nutritional Science' },
    ]},
    { id: 'HOME-S2', name: 'Textiles and Clothing', sub_strands: [
      { id: 'HOME-SS2', name: 'Clothing Construction' },
    ]},
    { id: 'HOME-S3', name: 'Child Development and Family', sub_strands: [
      { id: 'HOME-SS3', name: 'Family and Community' },
    ]},
  ],
  // ── SOCIAL SCIENCES ───────────────────────────────────────────────────────────
  'History & Citizenship': [
    { id: 'HIST-S1', name: 'Kenyan History', sub_strands: [
      { id: 'HIST-SS1', name: 'Pre-colonial Kenya' },
      { id: 'HIST-SS2', name: 'Colonial Period' },
      { id: 'HIST-SS3', name: 'Independence and Modern Kenya' },
    ]},
    { id: 'HIST-S2', name: 'African and World History', sub_strands: [
      { id: 'HIST-SS4', name: 'African History' },
      { id: 'HIST-SS5', name: 'World History' },
    ]},
    { id: 'HIST-S3', name: 'Citizenship and Governance', sub_strands: [
      { id: 'HIST-SS6', name: 'Civic Education' },
    ]},
  ],
  'Geography': [
    { id: 'GEO-S1', name: 'Physical Geography', sub_strands: [
      { id: 'GEO-SS1', name: 'Geomorphology' },
      { id: 'GEO-SS2', name: 'Weather and Climate' },
    ]},
    { id: 'GEO-S2', name: 'Human Geography', sub_strands: [
      { id: 'GEO-SS3', name: 'Population and Settlement' },
      { id: 'GEO-SS4', name: 'Economic Geography' },
    ]},
    { id: 'GEO-S3', name: 'Environmental Geography', sub_strands: [
      { id: 'GEO-SS5', name: 'Environmental Management' },
    ]},
  ],
  'Business Studies': [
    { id: 'BUS-S1', name: 'Business Concepts and Environment', sub_strands: [
      { id: 'BUS-SS1', name: 'Business Organisation' },
    ]},
    { id: 'BUS-S2', name: 'Commerce and Trade', sub_strands: [
      { id: 'BUS-SS2', name: 'Trade and Commerce' },
    ]},
    { id: 'BUS-S3', name: 'Entrepreneurship', sub_strands: [
      { id: 'BUS-SS3', name: 'Entrepreneurship Skills' },
    ]},
    { id: 'BUS-S4', name: 'Accounting Principles', sub_strands: [
      { id: 'BUS-SS4', name: 'Financial Accounting' },
    ]},
  ],
  'Economics': [
    { id: 'ECO-S1', name: 'Microeconomics', sub_strands: [
      { id: 'ECO-SS1', name: 'Demand and Supply' },
      { id: 'ECO-SS2', name: 'Market Structures' },
    ]},
    { id: 'ECO-S2', name: 'Macroeconomics', sub_strands: [
      { id: 'ECO-SS3', name: 'National Income' },
      { id: 'ECO-SS4', name: 'Money and Banking' },
    ]},
  ],
  // ── ARTS & SPORTS SCIENCE ────────────────────────────────────────────────────
  'Visual Arts': [
    { id: 'ART-S1', name: 'Drawing and Painting', sub_strands: [
      { id: 'ART-SS1', name: 'Drawing Techniques' },
      { id: 'ART-SS2', name: 'Painting' },
    ]},
    { id: 'ART-S2', name: 'Design and Applied Arts', sub_strands: [
      { id: 'ART-SS3', name: 'Graphic Design' },
      { id: 'ART-SS4', name: 'Craft and Applied Design' },
    ]},
    { id: 'ART-S3', name: 'Art History and Criticism', sub_strands: [
      { id: 'ART-SS5', name: 'Art History' },
    ]},
  ],
  // DB alias for Visual Arts
  'Fine Arts': [
    { id: 'ART-S1', name: 'Drawing and Painting', sub_strands: [
      { id: 'ART-SS1', name: 'Drawing Techniques' },
      { id: 'ART-SS2', name: 'Painting' },
    ]},
    { id: 'ART-S2', name: 'Design and Applied Arts', sub_strands: [
      { id: 'ART-SS3', name: 'Graphic Design' },
      { id: 'ART-SS4', name: 'Craft and Applied Design' },
    ]},
    { id: 'ART-S3', name: 'Art History and Criticism', sub_strands: [
      { id: 'ART-SS5', name: 'Art History' },
    ]},
  ],
  'Music': [
    { id: 'MUSIC-S1', name: 'Music Theory and Literacy', sub_strands: [
      { id: 'MUSIC-SS1', name: 'Music Theory' },
    ]},
    { id: 'MUSIC-S2', name: 'Performance', sub_strands: [
      { id: 'MUSIC-SS2', name: 'Vocal Performance' },
      { id: 'MUSIC-SS3', name: 'Instrumental Performance' },
    ]},
    { id: 'MUSIC-S3', name: 'Composition and Technology', sub_strands: [
      { id: 'MUSIC-SS4', name: 'Composition' },
    ]},
  ],
  'Performing Arts (Drama)': [
    { id: 'DRAMA-S1', name: 'Theatre Performance', sub_strands: [
      { id: 'DRAMA-SS1', name: 'Acting and Voice' },
      { id: 'DRAMA-SS2', name: 'Stage Production' },
    ]},
    { id: 'DRAMA-S2', name: 'Dramatic Writing', sub_strands: [
      { id: 'DRAMA-SS3', name: 'Playwriting' },
    ]},
  ],
  'Performing Arts': [
    { id: 'DRAMA-S1', name: 'Theatre Performance', sub_strands: [
      { id: 'DRAMA-SS1', name: 'Acting and Voice' },
      { id: 'DRAMA-SS2', name: 'Stage Production' },
    ]},
    { id: 'DRAMA-S2', name: 'Dramatic Writing', sub_strands: [
      { id: 'DRAMA-SS3', name: 'Playwriting' },
    ]},
  ],
  'Sports Science': [
    { id: 'SPORT-S1', name: 'Exercise Physiology', sub_strands: [
      { id: 'SPORT-SS1', name: 'Human Body in Exercise' },
    ]},
    { id: 'SPORT-S2', name: 'Sports Psychology', sub_strands: [
      { id: 'SPORT-SS2', name: 'Mental Skills in Sport' },
    ]},
    { id: 'SPORT-S3', name: 'Coaching and Officiating', sub_strands: [
      { id: 'SPORT-SS3', name: 'Coaching Principles' },
    ]},
  ],
};

/**
 * Get strands (with sub-strands) for a subject by name.
 * Tries exact match, then case-insensitive, then partial.
 */
export function getCBCStrands(subjectName: string): CBCStrandWithSubs[] {
  if (!subjectName) return [];
  if (SUBJECT_STRANDS[subjectName]) return SUBJECT_STRANDS[subjectName];
  const lower = subjectName.toLowerCase();
  const exact = Object.keys(SUBJECT_STRANDS).find(k => k.toLowerCase() === lower);
  if (exact) return SUBJECT_STRANDS[exact];
  const partial = Object.keys(SUBJECT_STRANDS).find(k =>
    lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  return partial ? SUBJECT_STRANDS[partial] : [];
}

/** Flatten all sub-strands from a subject's strand list */
export function getAllSubStrands(strands: CBCStrandWithSubs[]): { strandId: string; strandName: string; subId: string; subName: string }[] {
  return strands.flatMap(s =>
    s.sub_strands.map(ss => ({ strandId: s.id, strandName: s.name, subId: ss.id, subName: ss.name }))
  );
}

// Keep backward-compat type alias
export type CBCStrand = CBCStrandWithSubs;
