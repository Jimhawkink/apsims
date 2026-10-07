// Shared CBC Senior School curriculum data — KICD Grades 10-12
// Used by: cbc-tracking page and cbc-marks page

const CBC_SENIOR_DATA = {
  pathways: {
    STEM: {
      label: 'Science, Technology, Engineering & Mathematics',
      icon: 'ðŸ”¬',
      color: '#0ea5e9',
      gradient: 'from-sky-500 to-blue-600',
      bg: '#f0f9ff',
      border: '#bae6fd',
    },
    ARTS: {
      label: 'Arts & Sports Science',
      icon: 'ðŸŽ¨',
      color: '#d946ef',
      gradient: 'from-fuchsia-500 to-purple-600',
      bg: '#fdf4ff',
      border: '#f0abfc',
    },
    SOCIAL: {
      label: 'Social Sciences',
      icon: 'ðŸŒ',
      color: '#f59e0b',
      gradient: 'from-amber-500 to-orange-600',
      bg: '#fffbeb',
      border: '#fde68a',
    },
    CORE: {
      label: 'Compulsory Core',
      icon: 'ðŸ“š',
      color: '#10b981',
      gradient: 'from-emerald-500 to-teal-600',
      bg: '#f0fdf4',
      border: '#a7f3d0',
    },
  },
  subjects: [
    // â”€â”€ CORE COMPULSORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'ENG', code: 'ENG', pathway: 'CORE', name: 'English',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: true,
      strands: [
        {
          id: 'ENG-S1', name: 'Listening and Speaking', code: 'ENG-LS',
          sub_strands: [
            { id: 'ENG-SS1', name: 'Oral Communication', outcomes: ['Engage in formal debates and academic discussions with fluency', 'Apply effective public speaking techniques', 'Use appropriate register in varied contexts', 'Demonstrate active listening and critical response'] },
            { id: 'ENG-SS2', name: 'Pronunciation and Intonation', outcomes: ['Apply correct stress, rhythm and intonation patterns', 'Distinguish sounds in different accents of English'] },
          ]
        },
        {
          id: 'ENG-S2', name: 'Reading and Comprehension', code: 'ENG-RC',
          sub_strands: [
            { id: 'ENG-SS3', name: 'Intensive Reading', outcomes: ['Analyse literary devices in unseen texts', 'Synthesize information from multiple sources', 'Apply critical reading strategies', 'Evaluate author purpose and viewpoint'] },
            { id: 'ENG-SS4', name: 'Extensive Reading', outcomes: ['Read widely across genres for personal growth', 'Sustain independent reading projects'] },
          ]
        },
        {
          id: 'ENG-S3', name: 'Writing', code: 'ENG-WR',
          sub_strands: [
            { id: 'ENG-SS5', name: 'Functional Writing', outcomes: ['Produce well-structured essays and reports', 'Write formal letters, proposals and memos', 'Apply academic writing conventions', 'Use research skills in written work'] },
            { id: 'ENG-SS6', name: 'Creative Writing', outcomes: ['Produce original creative texts in varied forms', 'Demonstrate voice and style in creative writing'] },
          ]
        },
        {
          id: 'ENG-S4', name: 'Grammar and Language Use', code: 'ENG-GL',
          sub_strands: [
            { id: 'ENG-SS7', name: 'Grammar in Context', outcomes: ['Apply grammar rules in complex sentence construction', 'Use punctuation, spelling and vocabulary accurately', 'Demonstrate knowledge of varieties of English'] },
          ]
        },
      ]
    },
    {
      id: 'KSW', code: 'KSW', pathway: 'CORE', name: 'Kiswahili / KSL',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: true,
      strands: [
        {
          id: 'KSW-S1', name: 'Kusikiliza na Kuzungumza', code: 'KSW-KK',
          sub_strands: [
            { id: 'KSW-SS1', name: 'Mazungumzo', outcomes: ['Kuwasiliana kwa ufanisi katika mazingira rasmi', 'Kutumia lugha ya heshima na adabu ipasavyo', 'Kueleza na kutetea hoja kwa ushahidi'] },
            { id: 'KSW-SS2', name: 'Matamshi na Lafudhi', outcomes: ['Kutamka maneno kwa usahihi wa kifonolojia', 'Kuzingatia muundo wa sentensi za mazungumzo'] },
          ]
        },
        {
          id: 'KSW-S2', name: 'Kusoma', code: 'KSW-KS',
          sub_strands: [
            { id: 'KSW-SS3', name: 'Usomaji wa Kina', outcomes: ['Kuchunguza dhamira na ujumbe katika maandishi', 'Kutumia mbinu za usomaji makini', 'Kutathmini matumizi ya lugha ya kisanaa'] },
          ]
        },
        {
          id: 'KSW-S3', name: 'Kuandika', code: 'KSW-KA',
          sub_strands: [
            { id: 'KSW-SS4', name: 'Uandishi wa Insha', outcomes: ['Kuandika insha za aina mbalimbali kwa ufasaha', 'Kutumia msamiati na sarufi sahihi katika uandishi', 'Kuandika ripoti, barua rasmi na maombi'] },
          ]
        },
        {
          id: 'KSW-S4', name: 'Fasihi na Utamaduni', code: 'KSW-FU',
          sub_strands: [
            { id: 'KSW-SS5', name: 'Fasihi Andishi', outcomes: ['Kuchunguza riwaya, diwani na tamthilia', 'Kulinganisha kazi za fasihi za waandishi mbalimbali'] },
            { id: 'KSW-SS6', name: 'Fasihi Simulizi', outcomes: ['Kuhifadhi na kusimulisha hadithi za kimapokeo', 'Kuelewa umuhimu wa fasihi simulizi katika utamaduni'] },
          ]
        },
      ]
    },
    {
      id: 'CSL', code: 'CSL', pathway: 'CORE', name: 'Community Service Learning',
      grades: [10, 11, 12], lessons_per_week: 2, compulsory: true,
      strands: [
        {
          id: 'CSL-S1', name: 'Service Projects', code: 'CSL-SP',
          sub_strands: [
            { id: 'CSL-SS1', name: 'Project Design and Planning', outcomes: ['Identify community needs through structured inquiry', 'Design service learning projects with clear objectives', 'Develop project timelines and resource plans'] },
            { id: 'CSL-SS2', name: 'Project Implementation', outcomes: ['Execute community projects effectively', 'Collaborate with community stakeholders', 'Demonstrate leadership and initiative in service'] },
          ]
        },
        {
          id: 'CSL-S2', name: 'Reflection and Learning', code: 'CSL-RL',
          sub_strands: [
            { id: 'CSL-SS3', name: 'Critical Reflection', outcomes: ['Reflect on personal growth through service experiences', 'Analyse social issues addressed through projects', 'Document and present project outcomes'] },
          ]
        },
        {
          id: 'CSL-S3', name: 'Civic Competency', code: 'CSL-CC',
          sub_strands: [
            { id: 'CSL-SS4', name: 'Citizenship and Values', outcomes: ['Apply constitutional values in community engagement', 'Demonstrate responsible citizenship and patriotism', 'Advocate for social justice and equity'] },
          ]
        },
      ]
    },
    {
      id: 'PE', code: 'PE', pathway: 'CORE', name: 'Physical Education',
      grades: [10, 11, 12], lessons_per_week: 2, compulsory: true,
      strands: [
        {
          id: 'PE-S1', name: 'Physical Fitness and Health', code: 'PE-FH',
          sub_strands: [
            { id: 'PE-SS1', name: 'Fitness Components', outcomes: ['Demonstrate cardiovascular endurance through sustained activity', 'Apply strength and flexibility training principles', 'Design personal fitness programmes', 'Monitor and evaluate personal fitness progress'] },
          ]
        },
        {
          id: 'PE-S2', name: 'Games and Sports', code: 'PE-GS',
          sub_strands: [
            { id: 'PE-SS2', name: 'Team Sports', outcomes: ['Apply tactics and strategies in team sports', 'Demonstrate sportsmanship and fair play', 'Lead and participate effectively in team activities'] },
            { id: 'PE-SS3', name: 'Individual Sports', outcomes: ['Perform technical skills in individual sports', 'Set and pursue personal performance goals'] },
          ]
        },
        {
          id: 'PE-S3', name: 'Health and Wellness', code: 'PE-HW',
          sub_strands: [
            { id: 'PE-SS4', name: 'Health Education', outcomes: ['Apply principles of personal health and hygiene', 'Understand and manage lifestyle diseases', 'Demonstrate first aid and emergency response skills'] },
          ]
        },
      ]
    },
    // â”€â”€ STEM PATHWAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'MATH', code: 'MATH', pathway: 'STEM', name: 'Mathematics',
      grades: [10, 11, 12], lessons_per_week: 5, compulsory: false,
      strands: [
        {
          id: 'MATH-S1', name: 'Numbers and Algebra', code: 'MATH-NA',
          sub_strands: [
            { id: 'MATH-SS1', name: 'Number Theory', outcomes: ['Apply properties of real and complex numbers', 'Solve problems involving indices and logarithms', 'Understand surds and irrational numbers'] },
            { id: 'MATH-SS2', name: 'Algebra', outcomes: ['Solve linear, quadratic and simultaneous equations', 'Apply algebraic identities and factorization', 'Work with sequences and series', 'Solve inequalities and absolute value problems'] },
            { id: 'MATH-SS3', name: 'Matrices and Transformations', outcomes: ['Perform matrix operations and find determinants', 'Apply matrices to solve systems of equations', 'Describe geometric transformations using matrices'] },
          ]
        },
        {
          id: 'MATH-S2', name: 'Geometry and Trigonometry', code: 'MATH-GT',
          sub_strands: [
            { id: 'MATH-SS4', name: 'Euclidean Geometry', outcomes: ['Apply theorems on circles, polygons and triangles', 'Prove geometric theorems', 'Apply coordinate geometry principles'] },
            { id: 'MATH-SS5', name: 'Trigonometry', outcomes: ['Apply trigonometric ratios and identities', 'Solve trigonometric equations', 'Apply sine and cosine rules in problem solving', 'Graph trigonometric functions and transformations'] },
          ]
        },
        {
          id: 'MATH-S3', name: 'Calculus', code: 'MATH-CA',
          sub_strands: [
            { id: 'MATH-SS6', name: 'Differential Calculus', outcomes: ['Find limits of functions', 'Apply rules of differentiation', 'Use calculus to solve optimisation problems', 'Find equations of tangents and normals'] },
            { id: 'MATH-SS7', name: 'Integral Calculus', outcomes: ['Apply rules of integration', 'Calculate areas under curves', 'Apply integration in volume of revolution'] },
          ]
        },
        {
          id: 'MATH-S4', name: 'Statistics and Probability', code: 'MATH-SP',
          sub_strands: [
            { id: 'MATH-SS8', name: 'Statistics', outcomes: ['Organise and represent data in tables and graphs', 'Calculate measures of central tendency and dispersion', 'Interpret statistical data critically'] },
            { id: 'MATH-SS9', name: 'Probability', outcomes: ['Apply probability rules to real events', 'Construct and use probability trees', 'Apply binomial and normal distributions'] },
          ]
        },
      ]
    },
    {
      id: 'BIO', code: 'BIO', pathway: 'STEM', name: 'Biology',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'BIO-S1', name: 'Cell Biology and Biochemistry', code: 'BIO-CB',
          sub_strands: [
            { id: 'BIO-SS1', name: 'Cell Structure and Function', outcomes: ['Describe the structure of prokaryotic and eukaryotic cells', 'Explain roles of cell organelles', 'Describe cell division: mitosis and meiosis', 'Explain osmosis, diffusion and active transport'] },
            { id: 'BIO-SS2', name: 'Biochemistry', outcomes: ['Describe structure and function of carbohydrates, proteins and lipids', 'Explain role of enzymes in metabolism', 'Understand ATP and energy transformations'] },
          ]
        },
        {
          id: 'BIO-S2', name: 'Physiology and Anatomy', code: 'BIO-PA',
          sub_strands: [
            { id: 'BIO-SS3', name: 'Human Physiology', outcomes: ['Explain structure and function of the digestive system', 'Describe respiratory and circulatory systems', 'Explain excretion and homeostasis', 'Describe the nervous and endocrine systems'] },
            { id: 'BIO-SS4', name: 'Plant Biology', outcomes: ['Explain photosynthesis and its factors', 'Describe transport systems in plants', 'Explain plant growth and tropisms'] },
          ]
        },
        {
          id: 'BIO-S3', name: 'Genetics and Evolution', code: 'BIO-GE',
          sub_strands: [
            { id: 'BIO-SS5', name: 'Genetics', outcomes: ['Explain Mendelian inheritance principles', 'Apply laws of probability in genetics', 'Describe mutation and chromosomal aberrations', 'Understand molecular basis of inheritance (DNA, RNA)'] },
            { id: 'BIO-SS6', name: 'Evolution', outcomes: ['Explain Darwin\'s theory of natural selection', 'Describe evidence for evolution', 'Explain speciation and biodiversity'] },
          ]
        },
        {
          id: 'BIO-S4', name: 'Ecology and Environment', code: 'BIO-EE',
          sub_strands: [
            { id: 'BIO-SS7', name: 'Ecology', outcomes: ['Describe food chains, webs and energy flow', 'Explain population dynamics and carrying capacity', 'Analyse human impact on ecosystems'] },
            { id: 'BIO-SS8', name: 'Conservation', outcomes: ['Evaluate biodiversity conservation strategies', 'Apply sustainable use principles to Kenya\'s ecosystems'] },
          ]
        },
      ]
    },
    {
      id: 'CHEM', code: 'CHEM', pathway: 'STEM', name: 'Chemistry',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'CHEM-S1', name: 'Physical Chemistry', code: 'CHEM-PC',
          sub_strands: [
            { id: 'CHEM-SS1', name: 'Atomic Structure', outcomes: ['Describe models of atomic structure', 'Explain electronic configuration and periodicity', 'Apply quantum numbers and orbitals'] },
            { id: 'CHEM-SS2', name: 'Chemical Bonding', outcomes: ['Explain ionic, covalent and metallic bonding', 'Describe intermolecular forces and properties', 'Apply VSEPR theory to molecular shapes'] },
            { id: 'CHEM-SS3', name: 'Thermochemistry', outcomes: ['Apply Hess\'s law and enthalpy changes', 'Calculate energy changes in reactions', 'Understand entropy and free energy'] },
            { id: 'CHEM-SS4', name: 'Kinetics and Equilibrium', outcomes: ['Explain factors affecting reaction rates', 'Apply collision theory and activation energy', 'Apply Le Chatelier\'s principle to equilibria'] },
          ]
        },
        {
          id: 'CHEM-S2', name: 'Organic Chemistry', code: 'CHEM-OC',
          sub_strands: [
            { id: 'CHEM-SS5', name: 'Hydrocarbons', outcomes: ['Name and draw structures of alkanes, alkenes, alkynes', 'Describe reactions of hydrocarbons', 'Explain isomerism types'] },
            { id: 'CHEM-SS6', name: 'Functional Groups', outcomes: ['Describe properties of alcohols, carboxylic acids, esters, amines', 'Write equations for organic reactions', 'Apply organic chemistry to industrial processes'] },
          ]
        },
        {
          id: 'CHEM-S3', name: 'Inorganic Chemistry', code: 'CHEM-IC',
          sub_strands: [
            { id: 'CHEM-SS7', name: 'Periodic Table Trends', outcomes: ['Explain periodic trends in atomic radius, ionization energy and electronegativity', 'Describe properties of s, p, d block elements'] },
            { id: 'CHEM-SS8', name: 'Electrochemistry', outcomes: ['Explain oxidation and reduction', 'Apply electrochemical cells and electrolysis', 'Calculate quantities in electrolysis using Faraday\'s laws'] },
          ]
        },
      ]
    },
    {
      id: 'PHY', code: 'PHY', pathway: 'STEM', name: 'Physics',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'PHY-S1', name: 'Mechanics', code: 'PHY-ME',
          sub_strands: [
            { id: 'PHY-SS1', name: 'Kinematics', outcomes: ['Analyse motion using equations of motion', 'Interpret displacement-time and velocity-time graphs', 'Solve projectile motion problems'] },
            { id: 'PHY-SS2', name: 'Newton\'s Laws and Forces', outcomes: ['Apply Newton\'s three laws to real situations', 'Solve problems involving friction and inclined planes', 'Analyse circular motion and centripetal force'] },
            { id: 'PHY-SS3', name: 'Work, Energy and Power', outcomes: ['Calculate work, kinetic and potential energy', 'Apply principle of conservation of energy', 'Solve power problems in mechanical systems'] },
          ]
        },
        {
          id: 'PHY-S2', name: 'Waves and Optics', code: 'PHY-WO',
          sub_strands: [
            { id: 'PHY-SS4', name: 'Waves', outcomes: ['Describe properties of transverse and longitudinal waves', 'Apply wave equations and phenomena', 'Explain sound production, propagation and resonance'] },
            { id: 'PHY-SS5', name: 'Optics', outcomes: ['Apply laws of reflection and refraction', 'Describe lenses and mirrors using ray diagrams', 'Explain optical instruments and their applications'] },
          ]
        },
        {
          id: 'PHY-S3', name: 'Electricity and Magnetism', code: 'PHY-EM',
          sub_strands: [
            { id: 'PHY-SS6', name: 'Electric Fields', outcomes: ['Apply Coulomb\'s law and electric field concepts', 'Solve circuit problems using Ohm\'s law and Kirchhoff\'s rules', 'Calculate capacitance and energy stored'] },
            { id: 'PHY-SS7', name: 'Electromagnetism', outcomes: ['Explain magnetic fields and electromagnetic induction', 'Describe AC and DC generators and motors', 'Apply Faraday\'s and Lenz\'s laws'] },
          ]
        },
        {
          id: 'PHY-S4', name: 'Modern Physics', code: 'PHY-MP',
          sub_strands: [
            { id: 'PHY-SS8', name: 'Atomic and Nuclear Physics', outcomes: ['Describe the structure of the nucleus', 'Explain radioactivity types and nuclear reactions', 'Solve half-life and decay problems', 'Apply Einstein\'s mass-energy equivalence'] },
          ]
        },
      ]
    },
    {
      id: 'COMP', code: 'COMP', pathway: 'STEM', name: 'Computer Studies',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'COMP-S1', name: 'Computer Systems', code: 'COMP-CS',
          sub_strands: [
            { id: 'COMP-SS1', name: 'Hardware and Architecture', outcomes: ['Explain computer hardware components and functions', 'Describe CPU architecture and memory hierarchy', 'Understand input/output devices and interfaces'] },
            { id: 'COMP-SS2', name: 'Operating Systems', outcomes: ['Explain functions of operating systems', 'Manage files and processes in an OS environment', 'Configure basic OS settings and security'] },
          ]
        },
        {
          id: 'COMP-S2', name: 'Programming and Algorithms', code: 'COMP-PA',
          sub_strands: [
            { id: 'COMP-SS3', name: 'Algorithms and Problem Solving', outcomes: ['Design algorithms using flowcharts and pseudocode', 'Analyse algorithm complexity', 'Apply searching and sorting algorithms'] },
            { id: 'COMP-SS4', name: 'Programming', outcomes: ['Write programs in a high-level language', 'Apply control structures, functions and OOP', 'Debug and test programs systematically', 'Develop small-scale software projects'] },
          ]
        },
        {
          id: 'COMP-S3', name: 'Data and Information Management', code: 'COMP-DI',
          sub_strands: [
            { id: 'COMP-SS5', name: 'Databases', outcomes: ['Design relational databases using ER diagrams', 'Write SQL queries to retrieve and manipulate data', 'Apply database normalisation principles'] },
            { id: 'COMP-SS6', name: 'Data Science Basics', outcomes: ['Collect, clean and analyse data sets', 'Create visualisations to represent data insights', 'Apply basic statistical tools in data analysis'] },
          ]
        },
        {
          id: 'COMP-S4', name: 'Networks and Cybersecurity', code: 'COMP-NC',
          sub_strands: [
            { id: 'COMP-SS7', name: 'Networks', outcomes: ['Describe network topologies and protocols', 'Configure basic LAN and WLAN settings', 'Explain internet services and cloud computing'] },
            { id: 'COMP-SS8', name: 'Cybersecurity', outcomes: ['Identify common cybersecurity threats', 'Apply security measures to protect data', 'Understand digital ethics and responsible use of ICT'] },
          ]
        },
      ]
    },
    {
      id: 'AGR', code: 'AGR', pathway: 'STEM', name: 'Agriculture',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'AGR-S1', name: 'Crop Production', code: 'AGR-CP',
          sub_strands: [
            { id: 'AGR-SS1', name: 'Field Crops', outcomes: ['Apply principles of soil preparation and crop establishment', 'Manage crop nutrition and irrigation', 'Control pests, diseases and weeds', 'Harvest and post-harvest management of field crops'] },
            { id: 'AGR-SS2', name: 'Horticulture', outcomes: ['Produce vegetable, fruit and ornamental crops', 'Apply greenhouse farming techniques', 'Apply organic farming principles'] },
          ]
        },
        {
          id: 'AGR-S2', name: 'Livestock Production', code: 'AGR-LP',
          sub_strands: [
            { id: 'AGR-SS3', name: 'Animal Husbandry', outcomes: ['Apply principles of dairy, beef and poultry farming', 'Manage animal health and veterinary care', 'Apply feeding and breeding management'] },
          ]
        },
        {
          id: 'AGR-S3', name: 'Agribusiness and Economics', code: 'AGR-AE',
          sub_strands: [
            { id: 'AGR-SS4', name: 'Farm Management', outcomes: ['Prepare a farm business plan', 'Calculate farm costs and returns', 'Apply marketing strategies for agricultural products', 'Use digital tools in farm management'] },
          ]
        },
      ]
    },
    // â”€â”€ SOCIAL SCIENCES PATHWAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'HIST', code: 'HIST', pathway: 'SOCIAL', name: 'History & Citizenship',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'HIST-S1', name: 'Kenyan History', code: 'HIST-KH',
          sub_strands: [
            { id: 'HIST-SS1', name: 'Pre-colonial Kenya', outcomes: ['Analyse political, social and economic organisation of pre-colonial communities', 'Evaluate the role of trade and cultural exchange', 'Assess the impact of migration on Kenyan communities'] },
            { id: 'HIST-SS2', name: 'Colonial Period', outcomes: ['Explain the process of colonisation in Kenya', 'Analyse African resistance to colonial rule', 'Evaluate the impact of colonialism on Kenya\'s development'] },
            { id: 'HIST-SS3', name: 'Independence and Modern Kenya', outcomes: ['Describe the independence movement and key figures', 'Evaluate Kenya\'s political and economic development since independence', 'Analyse constitutional development and governance'] },
          ]
        },
        {
          id: 'HIST-S2', name: 'African and World History', code: 'HIST-AW',
          sub_strands: [
            { id: 'HIST-SS4', name: 'African History', outcomes: ['Analyse the Atlantic Slave Trade and its impact', 'Evaluate African nationalism and decolonisation', 'Assess the role of the African Union in continental development'] },
            { id: 'HIST-SS5', name: 'World History', outcomes: ['Explain the causes and consequences of World Wars', 'Analyse the Cold War and its global effects', 'Evaluate globalisation and its impact on Africa'] },
          ]
        },
        {
          id: 'HIST-S3', name: 'Citizenship and Governance', code: 'HIST-CG',
          sub_strands: [
            { id: 'HIST-SS6', name: 'Civic Education', outcomes: ['Explain the structure and functions of Kenya\'s government', 'Analyse democratic processes and civic rights', 'Apply constitutional values to community issues', 'Evaluate international relations and Kenya\'s foreign policy'] },
          ]
        },
      ]
    },
    {
      id: 'GEO', code: 'GEO', pathway: 'SOCIAL', name: 'Geography',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'GEO-S1', name: 'Physical Geography', code: 'GEO-PG',
          sub_strands: [
            { id: 'GEO-SS1', name: 'Geomorphology', outcomes: ['Explain internal and external forces shaping the earth', 'Describe major landforms and their formation', 'Analyse soil formation and properties'] },
            { id: 'GEO-SS2', name: 'Weather and Climate', outcomes: ['Explain weather elements and instruments', 'Describe climate types and their distribution', 'Analyse climate change causes and impacts on Kenya'] },
          ]
        },
        {
          id: 'GEO-S2', name: 'Human Geography', code: 'GEO-HG',
          sub_strands: [
            { id: 'GEO-SS3', name: 'Population and Settlement', outcomes: ['Analyse population growth, distribution and density', 'Evaluate factors influencing settlement patterns', 'Apply demographic concepts to Kenyan data'] },
            { id: 'GEO-SS4', name: 'Economic Geography', outcomes: ['Describe industries and their location factors', 'Analyse agricultural systems in Kenya and Africa', 'Evaluate trade patterns and economic development'] },
          ]
        },
        {
          id: 'GEO-S3', name: 'Environmental Geography', code: 'GEO-EG',
          sub_strands: [
            { id: 'GEO-SS5', name: 'Environmental Management', outcomes: ['Evaluate environmental challenges in Kenya', 'Apply sustainable development principles', 'Analyse conservation strategies for natural resources'] },
          ]
        },
      ]
    },
    {
      id: 'BUS', code: 'BUS', pathway: 'SOCIAL', name: 'Business Studies',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'BUS-S1', name: 'Business Concepts and Environment', code: 'BUS-BC',
          sub_strands: [
            { id: 'BUS-SS1', name: 'Business Organisation', outcomes: ['Distinguish forms of business ownership', 'Explain factors of production and their rewards', 'Analyse internal and external business environments'] },
          ]
        },
        {
          id: 'BUS-S2', name: 'Commerce and Trade', code: 'BUS-CT',
          sub_strands: [
            { id: 'BUS-SS2', name: 'Trade and Commerce', outcomes: ['Explain local, regional and international trade', 'Describe commercial documents used in trade', 'Evaluate banking and financial services', 'Apply consumer rights and responsibilities'] },
          ]
        },
        {
          id: 'BUS-S3', name: 'Entrepreneurship', code: 'BUS-EN',
          sub_strands: [
            { id: 'BUS-SS3', name: 'Entrepreneurship Skills', outcomes: ['Identify business opportunities through market research', 'Develop a comprehensive business plan', 'Apply marketing mix strategies', 'Manage a small business enterprise'] },
          ]
        },
        {
          id: 'BUS-S4', name: 'Accounting Principles', code: 'BUS-AP',
          sub_strands: [
            { id: 'BUS-SS4', name: 'Financial Accounting', outcomes: ['Apply double-entry bookkeeping', 'Prepare final accounts for sole traders', 'Interpret financial statements', 'Calculate financial ratios for analysis'] },
          ]
        },
      ]
    },
    {
      id: 'ECO', code: 'ECO', pathway: 'SOCIAL', name: 'Economics',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'ECO-S1', name: 'Microeconomics', code: 'ECO-MI',
          sub_strands: [
            { id: 'ECO-SS1', name: 'Demand and Supply', outcomes: ['Explain demand, supply and market equilibrium', 'Analyse price elasticity and its applications', 'Apply consumer and producer theory'] },
            { id: 'ECO-SS2', name: 'Market Structures', outcomes: ['Describe perfect competition, monopoly and oligopoly', 'Analyse pricing strategies in different market structures', 'Evaluate government intervention in markets'] },
          ]
        },
        {
          id: 'ECO-S2', name: 'Macroeconomics', code: 'ECO-MA',
          sub_strands: [
            { id: 'ECO-SS3', name: 'National Income', outcomes: ['Explain methods of measuring national income', 'Analyse GDP trends and economic growth in Kenya', 'Evaluate economic development strategies'] },
            { id: 'ECO-SS4', name: 'Money and Banking', outcomes: ['Explain functions of money and banking system', 'Analyse monetary policy and its effects', 'Evaluate fiscal policy and government budget'] },
          ]
        },
      ]
    },
    // â”€â”€ ARTS & SPORTS SCIENCE PATHWAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'ART', code: 'ART', pathway: 'ARTS', name: 'Visual Arts',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'ART-S1', name: 'Drawing and Painting', code: 'ART-DP',
          sub_strands: [
            { id: 'ART-SS1', name: 'Drawing Techniques', outcomes: ['Apply principles of line, form, shade and perspective', 'Produce accurate observational drawings', 'Develop personal drawing style'] },
            { id: 'ART-SS2', name: 'Painting', outcomes: ['Apply colour theory in painting compositions', 'Use a variety of painting media and techniques', 'Create paintings expressing personal themes and ideas'] },
          ]
        },
        {
          id: 'ART-S2', name: 'Design and Applied Arts', code: 'ART-DA',
          sub_strands: [
            { id: 'ART-SS3', name: 'Graphic Design', outcomes: ['Apply principles of graphic design in layout and typography', 'Use digital and manual tools in design projects', 'Create branding and communication materials'] },
            { id: 'ART-SS4', name: 'Craft and Applied Design', outcomes: ['Produce craft objects combining form and function', 'Apply Kenyan cultural motifs in design', 'Document design processes in a portfolio'] },
          ]
        },
        {
          id: 'ART-S3', name: 'Art History and Criticism', code: 'ART-HC',
          sub_strands: [
            { id: 'ART-SS5', name: 'Art History', outcomes: ['Trace the development of Kenyan and African art', 'Compare artistic traditions across cultures', 'Evaluate the social role of art in society'] },
          ]
        },
      ]
    },
    {
      id: 'MUSIC', code: 'MUSIC', pathway: 'ARTS', name: 'Music',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'MUSIC-S1', name: 'Music Theory and Literacy', code: 'MUSIC-TL',
          sub_strands: [
            { id: 'MUSIC-SS1', name: 'Music Theory', outcomes: ['Read and write music notation accurately', 'Identify and analyse musical scales, chords and keys', 'Apply harmonic principles in composition'] },
          ]
        },
        {
          id: 'MUSIC-S2', name: 'Performance', code: 'MUSIC-PF',
          sub_strands: [
            { id: 'MUSIC-SS2', name: 'Vocal Performance', outcomes: ['Perform with correct breathing and vocal technique', 'Sing in tune with expression and style', 'Perform solo and ensemble vocal works'] },
            { id: 'MUSIC-SS3', name: 'Instrumental Performance', outcomes: ['Play an instrument with technical proficiency', 'Perform in ensemble settings with precision', 'Interpret musical pieces with appropriate style'] },
          ]
        },
        {
          id: 'MUSIC-S3', name: 'Composition and Technology', code: 'MUSIC-CT',
          sub_strands: [
            { id: 'MUSIC-SS4', name: 'Composition', outcomes: ['Compose original melodies and harmonies', 'Arrange existing works for different instruments', 'Use digital audio tools in music creation'] },
          ]
        },
      ]
    },
    {
      id: 'DRAMA', code: 'DRAMA', pathway: 'ARTS', name: 'Performing Arts (Drama)',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'DRAMA-S1', name: 'Theatre Performance', code: 'DRAMA-TP',
          sub_strands: [
            { id: 'DRAMA-SS1', name: 'Acting and Voice', outcomes: ['Apply Stanislavski and other acting methodologies', 'Develop characterisation through voice, body and emotion', 'Perform scene studies with authenticity and presence'] },
            { id: 'DRAMA-SS2', name: 'Stage Production', outcomes: ['Understand elements of stagecraft and production design', 'Collaborate in full production of a play', 'Apply stage management principles'] },
          ]
        },
        {
          id: 'DRAMA-S2', name: 'Dramatic Writing', code: 'DRAMA-DW',
          sub_strands: [
            { id: 'DRAMA-SS3', name: 'Playwriting', outcomes: ['Write original short plays with clear structure', 'Develop compelling characters and dialogue', 'Script adaptations of existing texts'] },
          ]
        },
      ]
    },
    {
      id: 'SPORT', code: 'SPORT', pathway: 'ARTS', name: 'Sports Science',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'SPORT-S1', name: 'Exercise Physiology', code: 'SPORT-EP',
          sub_strands: [
            { id: 'SPORT-SS1', name: 'Human Body in Exercise', outcomes: ['Explain muscular, skeletal and cardiovascular responses to exercise', 'Design training programmes based on physiological principles', 'Evaluate the effects of nutrition on performance'] },
          ]
        },
        {
          id: 'SPORT-S2', name: 'Sports Psychology', code: 'SPORT-SP',
          sub_strands: [
            { id: 'SPORT-SS2', name: 'Mental Skills in Sport', outcomes: ['Apply goal-setting and motivation techniques', 'Manage pre-competition anxiety and stress', 'Develop team cohesion and leadership in sport'] },
          ]
        },
        {
          id: 'SPORT-S3', name: 'Coaching and Officiating', code: 'SPORT-CO',
          sub_strands: [
            { id: 'SPORT-SS3', name: 'Coaching Principles', outcomes: ['Apply principles of effective sports coaching', 'Plan and conduct coaching sessions', 'Officiate games according to rules and regulations'] },
          ]
        },
      ]
    },
    // â”€â”€ TECHNICAL VOCATIONAL PATHWAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'BUILD', code: 'BUILD', pathway: 'STEM', name: 'Building & Construction',
      grades: [10, 11, 12], lessons_per_week: 5, compulsory: false,
      strands: [
        {
          id: 'BUILD-S1', name: 'Construction Technology', code: 'BUILD-CT',
          sub_strands: [
            { id: 'BUILD-SS1', name: 'Materials and Tools', outcomes: ['Identify and select appropriate construction materials', 'Use hand and power tools safely', 'Maintain tools and equipment properly'] },
            { id: 'BUILD-SS2', name: 'Building Structures', outcomes: ['Construct masonry walls and foundations', 'Install roofing systems and frames', 'Apply plastering and finishing techniques'] },
          ]
        },
        {
          id: 'BUILD-S2', name: 'Technical Drawing', code: 'BUILD-TD',
          sub_strands: [
            { id: 'BUILD-SS3', name: 'Architectural Drawing', outcomes: ['Read and interpret construction drawings', 'Produce basic architectural plans and elevations', 'Use CAD software in construction drawing'] },
          ]
        },
      ]
    },
    {
      id: 'ELEC', code: 'ELEC', pathway: 'STEM', name: 'Electrical Technology',
      grades: [10, 11, 12], lessons_per_week: 5, compulsory: false,
      strands: [
        {
          id: 'ELEC-S1', name: 'Electrical Fundamentals', code: 'ELEC-EF',
          sub_strands: [
            { id: 'ELEC-SS1', name: 'DC and AC Circuits', outcomes: ['Apply Ohm\'s law and Kirchhoff\'s laws', 'Analyse series, parallel and complex DC circuits', 'Describe AC generation and characteristics'] },
          ]
        },
        {
          id: 'ELEC-S2', name: 'Electrical Installations', code: 'ELEC-EI',
          sub_strands: [
            { id: 'ELEC-SS2', name: 'Domestic Wiring', outcomes: ['Install domestic electrical circuits safely', 'Apply IEE wiring regulations', 'Test and fault-find electrical installations'] },
          ]
        },
      ]
    },
    {
      id: 'HOME', code: 'HOME', pathway: 'STEM', name: 'Home Science',
      grades: [10, 11, 12], lessons_per_week: 4, compulsory: false,
      strands: [
        {
          id: 'HOME-S1', name: 'Food and Nutrition', code: 'HOME-FN',
          sub_strands: [
            { id: 'HOME-SS1', name: 'Nutritional Science', outcomes: ['Explain functions of nutrients in the body', 'Plan balanced diets for different life stages', 'Apply food safety and preservation techniques', 'Evaluate factors affecting food choices'] },
          ]
        },
        {
          id: 'HOME-S2', name: 'Textiles and Clothing', code: 'HOME-TC',
          sub_strands: [
            { id: 'HOME-SS2', name: 'Clothing Construction', outcomes: ['Apply pattern drafting and cutting techniques', 'Construct garments using a sewing machine', 'Apply finishing techniques and quality checks'] },
          ]
        },
        {
          id: 'HOME-S3', name: 'Child Development and Family', code: 'HOME-CF',
          sub_strands: [
            { id: 'HOME-SS3', name: 'Family and Community', outcomes: ['Analyse stages of child development', 'Apply principles of positive parenting', 'Evaluate family resource management strategies'] },
          ]
        },
      ]
    },
  ],
};

// â”€â”€â”€ Rubric â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RUBRIC = {
  EE: { label: 'Exceeding Expectations', short: 'Excellent', color: '#059669', bg: 'rgba(5,150,105,0.12)', border: '#6ee7b7', glow: '#10b98155' },
  ME: { label: 'Meeting Expectations', short: 'Proficient', color: '#2563eb', bg: 'rgba(37,99,235,0.10)', border: '#93c5fd', glow: '#3b82f655' },
  AE: { label: 'Approaching Expectations', short: 'Developing', color: '#d97706', bg: 'rgba(217,119,6,0.10)', border: '#fcd34d', glow: '#f59e0b55' },
  BE: { label: 'Below Expectations', short: 'Needs Support', color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: '#fca5a5', glow: '#ef444455' },
};

export { CBC_SENIOR_DATA };
export const getSubjectById = (id: string) => CBC_SENIOR_DATA.subjects.find(s => s.id === id);
export const getSubjectStrands = (subjectId: string) => getSubjectById(subjectId)?.strands ?? [];

