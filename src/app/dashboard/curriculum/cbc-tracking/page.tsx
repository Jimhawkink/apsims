'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiSave, FiRefreshCw, FiFilter, FiDownload, FiChevronDown,
  FiChevronRight, FiSearch, FiBarChart2, FiGrid, FiList,
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiUsers,
  FiBook, FiAward, FiStar, FiInfo, FiX, FiPrinter,
  FiEye, FiEdit3, FiUpload, FiZap, FiTarget
} from 'react-icons/fi';
import { HiOutlineAcademicCap, HiOutlineSparkles, HiOutlineChartBar } from 'react-icons/hi2';

// ─── CBC Senior School Data: Grade 10–12 ────────────────────────────────────

const CBC_SENIOR_DATA = {
  pathways: {
    STEM: {
      label: 'Science, Technology, Engineering & Mathematics',
      icon: '🔬',
      color: '#0ea5e9',
      gradient: 'from-sky-500 to-blue-600',
      bg: '#f0f9ff',
      border: '#bae6fd',
    },
    ARTS: {
      label: 'Arts & Sports Science',
      icon: '🎨',
      color: '#d946ef',
      gradient: 'from-fuchsia-500 to-purple-600',
      bg: '#fdf4ff',
      border: '#f0abfc',
    },
    SOCIAL: {
      label: 'Social Sciences',
      icon: '🌍',
      color: '#f59e0b',
      gradient: 'from-amber-500 to-orange-600',
      bg: '#fffbeb',
      border: '#fde68a',
    },
    CORE: {
      label: 'Compulsory Core',
      icon: '📚',
      color: '#10b981',
      gradient: 'from-emerald-500 to-teal-600',
      bg: '#f0fdf4',
      border: '#a7f3d0',
    },
  },
  subjects: [
    // ── CORE COMPULSORY ─────────────────────────────────────────────────────
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
    // ── STEM PATHWAY ──────────────────────────────────────────────────────────
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
    // ── SOCIAL SCIENCES PATHWAY ────────────────────────────────────────────
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
    // ── ARTS & SPORTS SCIENCE PATHWAY ─────────────────────────────────────
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
    // ── TECHNICAL VOCATIONAL PATHWAY ─────────────────────────────────────
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

// ─── Rubric ──────────────────────────────────────────────────────────────────

const RUBRIC = {
  EE: { label: 'Exceeding Expectations', short: 'Excellent', color: '#059669', bg: 'rgba(5,150,105,0.12)', border: '#6ee7b7', glow: '#10b98155' },
  ME: { label: 'Meeting Expectations', short: 'Proficient', color: '#2563eb', bg: 'rgba(37,99,235,0.10)', border: '#93c5fd', glow: '#3b82f655' },
  AE: { label: 'Approaching Expectations', short: 'Developing', color: '#d97706', bg: 'rgba(217,119,6,0.10)', border: '#fcd34d', glow: '#f59e0b55' },
  BE: { label: 'Below Expectations', short: 'Needs Support', color: '#dc2626', bg: 'rgba(220,38,38,0.10)', border: '#fca5a5', glow: '#ef444455' },
};
const RUBRIC_KEYS = ['EE', 'ME', 'AE', 'BE'] as const;
type RubricKey = typeof RUBRIC_KEYS[number];

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'matrix' | 'cards' | 'analytics';
type AssessType = 'formative' | 'summative' | 'project' | 'observation' | 'practical';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getSubjectById = (id: string) => CBC_SENIOR_DATA.subjects.find(s => s.id === id);
const getPathway = (p: string) => CBC_SENIOR_DATA.pathways[p as keyof typeof CBC_SENIOR_DATA.pathways];

function computeProgress(ratings: Record<string, string>, students: any[], subject: any) {
  let total = 0, filled = 0, eeCount = 0, meCount = 0, aeCount = 0, beCount = 0;
  for (const s of students) {
    for (const strand of subject.strands) {
      for (const ss of strand.sub_strands) {
        for (let i = 0; i < ss.outcomes.length; i++) {
          const key = `${s.id}-${subject.id}-${strand.id}-${ss.id}-${i}`;
          total++;
          const r = ratings[key] as RubricKey;
          if (r) {
            filled++;
            if (r === 'EE') eeCount++;
            else if (r === 'ME') meCount++;
            else if (r === 'AE') aeCount++;
            else if (r === 'BE') beCount++;
          }
        }
      }
    }
  }
  return { total, filled, eeCount, meCount, aeCount, beCount, pct: total ? Math.round((filled / total) * 100) : 0 };
}

// ─── DB Row Types ────────────────────────────────────────────────────────────

interface CbcAssessmentRow {
  student_id: number;
  subject_code: string;
  term_id: number;
  assessment_type: string;
  rubric_level: string;
  rating_key: string;
  assessed_by: string;
  grade_level: number;
  updated_at: string;
}

interface SchoolTerm {
  id: number;
  term_name?: string;
  name?: string;
  [key: string]: unknown;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CBCSeniorTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [existingAssessments, setExistingAssessments] = useState<any[]>([]);

  const [selGrade, setSelGrade] = useState<10 | 11 | 12>(10);
  const [selSubjectId, setSelSubjectId] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selClass, setSelClass] = useState('');
  const [selPathway, setSelPathway] = useState('');
  const [assessType, setAssessType] = useState<AssessType>('formative');
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState<'entry' | 'overview' | 'reports'>('entry');

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, te, f] = await Promise.all([
      supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, grade_level, pathway').eq('status', 'Active').order('last_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    const termData = (te.data || []) as SchoolTerm[];
    setStudents(s.data || []);
    setTerms(termData);
    setForms(f.data || []);
    if (termData.length) setSelTerm(String(termData[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Load existing assessments ────────────────────────────────────────────
  useEffect(() => {
    if (!selSubjectId || !selTerm) return;
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sbClient = supabase as any;
      const { data } = await sbClient
        .from('school_cbc_assessments')
        .select('*')
        .eq('subject_code', selSubjectId)
        .eq('term_id', Number(selTerm))
        .eq('assessment_type', assessType);
      if (data) {
        setExistingAssessments(data);
        const map: Record<string, string> = {};
        data.forEach((a: any) => { map[a.rating_key] = a.rubric_level; });
        setRatings(prev => ({ ...prev, ...map }));
      }
    };
    load();
  }, [selSubjectId, selTerm, assessType]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const selectedSubject = useMemo(() => getSubjectById(selSubjectId), [selSubjectId]);

  const filteredSubjects = useMemo(() => CBC_SENIOR_DATA.subjects.filter(s => {
    const gradeMatch = s.grades.includes(selGrade);
    const pathwayMatch = !selPathway || s.pathway === selPathway;
    return gradeMatch && pathwayMatch;
  }), [selGrade, selPathway]);

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => {
      const gradeMatch = s.grade_level === selGrade || s.form_id === (selGrade - 9); // fallback
      const classMatch = !selClass || String(s.form_id) === selClass;
      const searchMatch = !searchQuery || `${s.first_name} ${s.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase());
      return gradeMatch && classMatch && searchMatch;
    });
    return list;
  }, [students, selGrade, selClass, searchQuery]);

  const progress = useMemo(() => {
    if (!selectedSubject || filteredStudents.length === 0) return null;
    return computeProgress(ratings, filteredStudents, selectedSubject);
  }, [ratings, filteredStudents, selectedSubject]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const setRating = (key: string, level: RubricKey | '') => {
    setRatings(prev => ({ ...prev, [key]: level }));
  };

  const handleSave = async () => {
    if (!selTerm || !selSubjectId) { toast.error('Select term and subject'); return; }
    setSaving(true);
    let saved = 0, updated = 0, errors = 0;

    const upserts: any[] = [];
    Object.entries(ratings).forEach(([key, level]) => {
      if (!level || !key.startsWith(`${filteredStudents[0]?.id}`)) {
        // Build upsert for all rated cells
      }
    });

    // Batch save all ratings
    const batch: CbcAssessmentRow[] = [];
    for (const [ratingKey, level] of Object.entries(ratings)) {
      if (!level) continue;
      const parts = ratingKey.split('-');
      const studentId = parts[0];
      if (!filteredStudents.find(s => String(s.id) === studentId)) continue;
      batch.push({
        student_id: Number(studentId),
        subject_code: selSubjectId,
        term_id: Number(selTerm),
        assessment_type: assessType,
        rubric_level: level,
        rating_key: ratingKey,
        assessed_by: 'teacher',
        grade_level: selGrade,
        updated_at: new Date().toISOString(),
      });
    }

    if (batch.length > 0) {
      // Cast via unknown to bypass Supabase's `never` row type for untyped tables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sbClient = supabase as any;
      const { error } = await sbClient.from('school_cbc_assessments')
        .upsert(batch, { onConflict: 'rating_key,term_id,assessment_type' });
      if (error) { toast.error('Save failed: ' + error.message); setSaving(false); return; }
      saved = batch.length;
    }

    toast.success(`✅ ${saved} assessments saved successfully!`);
    setSaving(false);
  };

  const toggleStrand = (id: string) => {
    setExpandedStrands(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!selectedSubject) return;
    const ids = selectedSubject.strands.flatMap(s => [s.id, ...s.sub_strands.map(ss => ss.id)]);
    setExpandedStrands(new Set(ids));
  };

  const collapseAll = () => setExpandedStrands(new Set());

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-2xl animate-pulse" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }} />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🎓</div>
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-gray-800">Loading CBC Senior School Tracker</p>
        <p className="text-xs text-gray-400 mt-1">Kenya Grade 10 · 11 · 12 Competency Assessment</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#faf5ff 50%,#fff7ed 100%)', fontFamily: "'Nunito', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .grade-pill { transition: all 0.2s cubic-bezier(.4,0,.2,1); }
        .grade-pill:hover { transform: translateY(-1px); }
        .rubric-btn { transition: all 0.15s ease; }
        .rubric-btn:hover:not(.active) { transform: scale(1.08); }
        .rubric-btn.active { transform: scale(1.12); box-shadow: 0 0 0 3px var(--glow); }
        .strand-header { transition: background 0.15s ease; }
        .strand-header:hover { background: rgba(99,102,241,0.06) !important; }
        .subject-card { transition: all 0.2s ease; cursor: pointer; }
        .subject-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .subject-card.selected { box-shadow: 0 0 0 2.5px #6366f1, 0 8px 24px rgba(99,102,241,0.25); }
        .tab-btn { transition: all 0.2s ease; }
        .stat-card { transition: all 0.2s ease; }
        .stat-card:hover { transform: translateY(-2px); }
        .progress-bar { transition: width 0.6s cubic-bezier(.4,0,.2,1); }
        @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease forwards; }
      `}</style>

      <div className="max-w-[1600px] mx-auto px-4 py-5 space-y-5">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)' }}>
              🎓
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight" style={{ letterSpacing: '-0.04em' }}>
                CBC Senior School Tracker
              </h1>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">
                Kenya Competency-Based Curriculum · Grades 10 · 11 · 12 · Rubric Assessment System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 bg-white hover:border-indigo-300 hover:text-indigo-600 transition">
              <FiRefreshCw size={13} /> Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 bg-white hover:border-emerald-300 hover:text-emerald-600 transition">
              <FiDownload size={13} /> Export
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 bg-white hover:border-sky-300 hover:text-sky-600 transition">
              <FiPrinter size={13} /> Print Report
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
              Save Assessments
            </button>
          </div>
        </div>

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm w-fit">
          {([['entry', '📝 Assessment Entry'], ['overview', '📊 Class Overview'], ['reports', '📋 Reports']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key as any)} className={`tab-btn px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── GRADE SELECTOR ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Grade Level</p>
              <div className="flex gap-2">
                {([10, 11, 12] as const).map(grade => (
                  <button key={grade} onClick={() => { setSelGrade(grade); setSelSubjectId(''); }} className={`grade-pill px-5 py-2 rounded-xl text-sm font-black border-2 transition-all ${selGrade === grade ? 'border-indigo-500 text-indigo-700 shadow-md' : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-indigo-300'}`}
                    style={selGrade === grade ? { background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' } : {}}>
                    Grade {grade}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-10 bg-gray-100" />

            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Pathway Filter</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelPathway('')} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${!selPathway ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                  All Pathways
                </button>
                {Object.entries(CBC_SENIOR_DATA.pathways).map(([key, pw]) => (
                  <button key={key} onClick={() => setSelPathway(key === selPathway ? '' : key)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${selPathway === key ? 'text-white shadow' : 'bg-white text-gray-600 hover:shadow-sm'}`}
                    style={selPathway === key ? { background: `linear-gradient(135deg,${pw.color},${pw.color}dd)`, borderColor: pw.color } : { borderColor: pw.border, background: pw.bg }}>
                    {pw.icon} {key === 'CORE' ? 'Core' : key === 'STEM' ? 'STEM' : key === 'ARTS' ? 'Arts & Sports' : 'Social Sciences'}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-10 bg-gray-100" />

            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Term</p>
                <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-400 min-w-[130px]">
                  <option value="">Select Term</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{(t.term_name || t.name || String(t.id)) as string}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Class / Stream</p>
                <select value={selClass} onChange={e => setSelClass(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-indigo-400 min-w-[130px]">
                  <option value="">All Classes</option>
                  {forms.filter(f => f.form_level >= 10 && f.form_level <= 12).map(f => (
                    <option key={f.id} value={f.id}>{f.form_name || `Grade ${f.form_level}`}</option>
                  ))}
                  <option value="10A">Grade 10A</option>
                  <option value="10B">Grade 10B</option>
                  <option value="11A">Grade 11A</option>
                  <option value="11B">Grade 11B</option>
                  <option value="12A">Grade 12A</option>
                  <option value="12B">Grade 12B</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Assessment Type</p>
                <div className="flex gap-1">
                  {(['formative', 'summative', 'project', 'practical', 'observation'] as const).map(t => (
                    <button key={t} onClick={() => setAssessType(t)} className={`px-2.5 py-2 rounded-lg text-[10px] font-bold border transition-all capitalize ${assessType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-500 hover:border-indigo-300 bg-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-5">
          {/* ── SUBJECT PANEL ─────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-5">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  {filteredSubjects.length} Subjects
                </p>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Grade {selGrade}</span>
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
                {Object.entries(CBC_SENIOR_DATA.pathways).map(([pKey, pathway]) => {
                  const subjects = filteredSubjects.filter(s => s.pathway === pKey);
                  if (subjects.length === 0) return null;
                  return (
                    <div key={pKey}>
                      <div className="px-3 py-2 flex items-center gap-2" style={{ background: pathway.bg }}>
                        <span className="text-base">{pathway.icon}</span>
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: pathway.color }}>
                          {pKey === 'CORE' ? 'Core Compulsory' : pKey === 'STEM' ? 'STEM' : pKey === 'ARTS' ? 'Arts & Sports Science' : 'Social Sciences'}
                        </p>
                        {pKey === 'CORE' && <span className="ml-auto text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: pathway.color }}>MUST</span>}
                      </div>
                      {subjects.map(subject => {
                        const pw = getPathway(subject.pathway);
                        const isSelected = selSubjectId === subject.id;
                        return (
                          <div key={subject.id} onClick={() => setSelSubjectId(subject.id)} className={`subject-card px-3 py-2.5 border-b border-gray-50 ${isSelected ? 'selected' : ''}`}
                            style={isSelected ? { background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' } : {}}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: isSelected ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : pw.color }}>
                                {subject.code.slice(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>{subject.name}</p>
                                <p className="text-[9px] text-gray-400">{subject.lessons_per_week} lessons/wk · {subject.strands.length} strands</p>
                              </div>
                              {subject.compulsory && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Compulsory" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-9 space-y-4">

            {/* Subject header + progress */}
            {selectedSubject && (
              <div className="animate-slide-in">
                {(() => {
                  const pw = getPathway(selectedSubject.pathway);
                  const totalOutcomes = selectedSubject.strands.reduce((a, s) => a + s.sub_strands.reduce((b, ss) => b + ss.outcomes.length, 0), 0);
                  return (
                    <div className="rounded-2xl p-4 border flex items-center gap-4 flex-wrap" style={{ background: `linear-gradient(135deg,${pw.bg},white)`, borderColor: pw.border }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `linear-gradient(135deg,${pw.color}22,${pw.color}44)` }}>
                        {pw.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-black text-gray-900" style={{ letterSpacing: '-0.03em' }}>{selectedSubject.name}</h2>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: pw.color }}>{selectedSubject.pathway}</span>
                          {selectedSubject.compulsory && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">COMPULSORY</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedSubject.strands.length} strands · {totalOutcomes} learning outcomes · {selectedSubject.lessons_per_week} lessons/week · Grade {selGrade}</p>
                      </div>
                      {progress && (
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-black text-gray-900">{progress.pct}%</p>
                            <p className="text-[10px] text-gray-400 font-bold">Completed</p>
                          </div>
                          <div className="w-32">
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="progress-bar h-full rounded-full" style={{ width: `${progress.pct}%`, background: `linear-gradient(90deg,${pw.color},${pw.color}99)` }} />
                            </div>
                            <div className="flex gap-1 mt-2">
                              {(['EE', 'ME', 'AE', 'BE'] as RubricKey[]).map(k => {
                                const count = k === 'EE' ? progress.eeCount : k === 'ME' ? progress.meCount : k === 'AE' ? progress.aeCount : progress.beCount;
                                return <div key={k} className="flex-1 h-1.5 rounded-full opacity-70" style={{ background: RUBRIC[k].color, opacity: count > 0 ? 0.8 : 0.15 }} title={`${k}: ${count}`} />;
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Student search + view controls */}
            {selectedSubject && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student name or admission no…" className="w-full pl-8 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-400 shadow-sm" />
                </div>
                <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-xl shadow-sm">
                  {([['matrix', <FiGrid key="m" size={13} />], ['cards', <FiList key="c" size={13} />], ['analytics', <FiBarChart2 key="a" size={13} />]] as const).map(([mode, icon]) => (
                    <button key={mode} onClick={() => setViewMode(mode as ViewMode)} className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-600'}`}>{icon}</button>
                  ))}
                </div>
                <button onClick={expandAll} className="px-3 py-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">Expand All</button>
                <button onClick={collapseAll} className="px-3 py-2 text-[10px] font-bold text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition">Collapse All</button>
                <p className="text-xs font-bold text-gray-400">{filteredStudents.length} learners</p>
              </div>
            )}

            {/* ── ASSESSMENT MATRIX ─────────────────────────────────────────── */}
            {selectedSubject && viewMode === 'matrix' && filteredStudents.length > 0 && (
              <div className="space-y-4 animate-slide-in">
                {selectedSubject.strands.map((strand, sIdx) => (
                  <div key={strand.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Strand header */}
                    <div className="strand-header flex items-center gap-3 px-4 py-3 cursor-pointer select-none border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }} onClick={() => toggleStrand(strand.id)}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{sIdx + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-800">{strand.name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">{strand.code} · {strand.sub_strands.length} sub-strands</p>
                      </div>
                      {expandedStrands.has(strand.id) ? <FiChevronDown size={15} className="text-gray-400" /> : <FiChevronRight size={15} className="text-gray-400" />}
                    </div>

                    {expandedStrands.has(strand.id) && strand.sub_strands.map((ss, ssIdx) => (
                      <div key={ss.id}>
                        <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition" onClick={() => toggleStrand(ss.id)}>
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-indigo-600 bg-indigo-50 flex-shrink-0">{ssIdx + 1}</div>
                          <p className="text-xs font-bold text-gray-700 flex-1">{ss.name}</p>
                          <span className="text-[9px] font-bold text-gray-400">{ss.outcomes.length} outcomes</span>
                          {expandedStrands.has(ss.id) ? <FiChevronDown size={12} className="text-gray-300" /> : <FiChevronRight size={12} className="text-gray-300" />}
                        </div>

                        {expandedStrands.has(ss.id) && (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: '#fafbff' }}>
                                  <th className="text-left px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-500 sticky left-0 z-10 bg-[#fafbff]" style={{ minWidth: 180, borderBottom: '1.5px solid #e2e8f0' }}>Learner</th>
                                  {ss.outcomes.map((oc, oIdx) => (
                                    <th key={oIdx} className="text-center px-2 py-2.5 text-[10px] font-black uppercase tracking-wider text-gray-500" style={{ minWidth: 100, borderBottom: '1.5px solid #e2e8f0' }}>
                                      <span className="block text-indigo-500 font-black">LO{oIdx + 1}</span>
                                      <span className="block text-gray-400 font-normal normal-case mt-0.5 leading-tight" style={{ maxWidth: 110, margin: 'auto', fontSize: 9 }}>{oc.slice(0, 50)}{oc.length > 50 ? '…' : ''}</span>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStudents.map((student, stIdx) => (
                                  <tr key={student.id} className="transition-colors hover:bg-indigo-50/30" style={{ borderBottom: '1px solid #f1f5f9', background: stIdx % 2 === 0 ? 'white' : '#fafbff' }}>
                                    <td className="px-3 py-2 sticky left-0 z-10" style={{ background: stIdx % 2 === 0 ? 'white' : '#fafbff', borderBottom: '1px solid #f1f5f9' }}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(135deg,hsl(${(stIdx * 47) % 360},70%,55%),hsl(${(stIdx * 47 + 30) % 360},70%,45%))` }}>
                                          {(student.first_name?.[0] || '')}{(student.last_name?.[0] || '')}
                                        </div>
                                        <div>
                                          <p className="font-bold text-gray-800 text-[11px] whitespace-nowrap">{student.last_name}, {student.first_name}</p>
                                          <p className="text-[9px] text-gray-400">{student.admission_number}</p>
                                        </div>
                                      </div>
                                    </td>
                                    {ss.outcomes.map((_, oIdx) => {
                                      const key = `${student.id}-${selectedSubject.id}-${strand.id}-${ss.id}-${oIdx}`;
                                      const current = (ratings[key] || '') as RubricKey | '';
                                      return (
                                        <td key={oIdx} className="px-1 py-2 text-center" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <div className="flex justify-center gap-0.5">
                                            {RUBRIC_KEYS.map(level => {
                                              const r = RUBRIC[level];
                                              const isActive = current === level;
                                              return (
                                                <button key={level} onClick={() => setRating(key, isActive ? '' : level)}
                                                  className={`rubric-btn ${isActive ? 'active' : ''} w-7 h-7 rounded-lg text-[9px] font-black transition-all border`}
                                                  style={{
                                                    '--glow': r.glow,
                                                    background: isActive ? r.bg : 'white',
                                                    color: isActive ? r.color : '#cbd5e1',
                                                    borderColor: isActive ? r.border : '#e2e8f0',
                                                  } as React.CSSProperties}
                                                  title={`${level} – ${r.label}`}>
                                                  {level}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ── CARDS VIEW ───────────────────────────────────────────────── */}
            {selectedSubject && viewMode === 'cards' && (
              <div className="space-y-3 animate-slide-in">
                {filteredStudents.map((student, stIdx) => {
                  const studentRatings = Object.entries(ratings).filter(([k]) => k.startsWith(`${student.id}-${selectedSubject.id}`));
                  const filled = studentRatings.filter(([, v]) => v).length;
                  const total = selectedSubject.strands.reduce((a, s) => a + s.sub_strands.reduce((b, ss) => b + ss.outcomes.length, 0), 0);
                  const pct = total ? Math.round((filled / total) * 100) : 0;
                  const dominant = studentRatings.reduce((acc: Record<string, number>, [, v]) => { if (v) acc[v] = (acc[v] || 0) + 1; return acc; }, {});
                  const topLevel = Object.entries(dominant).sort((a, b) => b[1] - a[1])[0]?.[0] as RubricKey;

                  return (
                    <div key={student.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-white" style={{ background: `linear-gradient(135deg,hsl(${(stIdx * 47) % 360},70%,55%),hsl(${(stIdx * 47 + 30) % 360},70%,45%))` }}>
                          {(student.first_name?.[0] || '')}{(student.last_name?.[0] || '')}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-gray-900 text-sm">{student.last_name}, {student.first_name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{student.admission_number} · Grade {selGrade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-gray-900">{pct}%</p>
                          <p className="text-[10px] text-gray-400">{filled}/{total} outcomes</p>
                        </div>
                        {topLevel && (
                          <div className="px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: RUBRIC[topLevel].bg, color: RUBRIC[topLevel].color, border: `1.5px solid ${RUBRIC[topLevel].border}` }}>
                            {topLevel}
                          </div>
                        )}
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div className="progress-bar h-full rounded-full" style={{ width: `${pct}%`, background: topLevel ? RUBRIC[topLevel].color : '#6366f1' }} />
                      </div>
                      {selectedSubject.strands.map(strand => (
                        <div key={strand.id} className="mb-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">{strand.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {strand.sub_strands.flatMap((ss, ssIdx) => ss.outcomes.map((_, oIdx) => {
                              const key = `${student.id}-${selectedSubject.id}-${strand.id}-${ss.id}-${oIdx}`;
                              const r = ratings[key] as RubricKey;
                              return (
                                <button key={key} onClick={() => {
                                  const levels = ['', ...RUBRIC_KEYS] as (RubricKey | '')[];
                                  const curr = levels.indexOf((ratings[key] || '') as any);
                                  setRating(key, levels[(curr + 1) % levels.length] || '');
                                }}
                                  className="w-8 h-8 rounded-lg text-[9px] font-black border transition-all hover:scale-110"
                                  style={{
                                    background: r ? RUBRIC[r].bg : '#f8fafc',
                                    color: r ? RUBRIC[r].color : '#cbd5e1',
                                    borderColor: r ? RUBRIC[r].border : '#e2e8f0',
                                  }}
                                  title={`${ss.name} - LO${oIdx + 1}`}>
                                  {r || '–'}
                                </button>
                              );
                            }))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── ANALYTICS VIEW ───────────────────────────────────────────── */}
            {selectedSubject && viewMode === 'analytics' && (
              <div className="animate-slide-in space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {([['EE', '🌟', 'Exceeding'], ['ME', '✅', 'Meeting'], ['AE', '📈', 'Approaching'], ['BE', '⚠️', 'Below']] as const).map(([k, icon, label]) => {
                    const count = k === 'EE' ? progress?.eeCount : k === 'ME' ? progress?.meCount : k === 'AE' ? progress?.aeCount : progress?.beCount;
                    const total = (progress?.filled || 1);
                    const pct = Math.round(((count || 0) / total) * 100);
                    return (
                      <div key={k} className="stat-card bg-white rounded-2xl p-4 border shadow-sm" style={{ borderColor: RUBRIC[k].border }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{icon}</span>
                          <span className="text-sm font-black" style={{ color: RUBRIC[k].color }}>{k}</span>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{count || 0}</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{label} · {pct}%</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                          <div className="progress-bar h-full rounded-full" style={{ width: `${pct}%`, background: RUBRIC[k].color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-black text-gray-800 mb-4">Strand Performance Breakdown</h3>
                  {selectedSubject.strands.map(strand => {
                    let strandTotal = 0, strandFilled = 0, eeC = 0, meC = 0, aeC = 0, beC = 0;
                    for (const student of filteredStudents) {
                      for (const ss of strand.sub_strands) {
                        for (let i = 0; i < ss.outcomes.length; i++) {
                          const key = `${student.id}-${selectedSubject.id}-${strand.id}-${ss.id}-${i}`;
                          strandTotal++;
                          const r = ratings[key] as RubricKey;
                          if (r) { strandFilled++; if (r === 'EE') eeC++; else if (r === 'ME') meC++; else if (r === 'AE') aeC++; else beC++; }
                        }
                      }
                    }
                    const spct = strandTotal ? Math.round((strandFilled / strandTotal) * 100) : 0;
                    return (
                      <div key={strand.id} className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-gray-700">{strand.name}</p>
                          <span className="text-[10px] font-black text-gray-400">{spct}% assessed</span>
                        </div>
                        <div className="flex h-4 rounded-lg overflow-hidden gap-0.5">
                          {(['EE', 'ME', 'AE', 'BE'] as RubricKey[]).map(k => {
                            const c = k === 'EE' ? eeC : k === 'ME' ? meC : k === 'AE' ? aeC : beC;
                            const w = strandFilled ? Math.round((c / strandFilled) * 100) : 0;
                            return w > 0 ? <div key={k} className="h-full flex items-center justify-center text-[8px] font-black text-white transition-all" style={{ width: `${w}%`, background: RUBRIC[k].color }} title={`${k}: ${c} (${w}%)`}>{w > 8 ? k : ''}</div> : null;
                          })}
                          {strandFilled < strandTotal && <div className="h-full bg-gray-100 flex-1" />}
                        </div>
                        <div className="flex gap-3 mt-1">
                          {(['EE', 'ME', 'AE', 'BE'] as RubricKey[]).map(k => {
                            const c = k === 'EE' ? eeC : k === 'ME' ? meC : k === 'AE' ? aeC : beC;
                            return c > 0 ? <span key={k} className="text-[9px] font-bold" style={{ color: RUBRIC[k].color }}>{k}: {c}</span> : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-sm font-black text-gray-800 mb-4">Learner Performance Ranking</h3>
                  <div className="space-y-2">
                    {filteredStudents.map((student, idx) => {
                      const sRatings = selectedSubject.strands.flatMap(strand => strand.sub_strands.flatMap((ss, ssI) => ss.outcomes.map((_, oIdx) => ratings[`${student.id}-${selectedSubject.id}-${strand.id}-${ss.id}-${oIdx}`]))).filter(Boolean) as RubricKey[];
                      const eeC = sRatings.filter(r => r === 'EE').length;
                      const meC = sRatings.filter(r => r === 'ME').length;
                      const aeC = sRatings.filter(r => r === 'AE').length;
                      const beC = sRatings.filter(r => r === 'BE').length;
                      const score = (eeC * 4 + meC * 3 + aeC * 2 + beC * 1) / Math.max(sRatings.length, 1);
                      const overall = score >= 3.5 ? 'EE' : score >= 2.5 ? 'ME' : score >= 1.5 ? 'AE' : 'BE';
                      return { student, score, overall, eeC, meC, aeC, beC, total: sRatings.length };
                    }).sort((a, b) => b.score - a.score).map((item, rank) => (
                      <div key={item.student.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black" style={{ background: rank < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][rank] : '#f1f5f9', color: rank < 3 ? 'white' : '#94a3b8' }}>
                          {rank + 1}
                        </div>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: `linear-gradient(135deg,hsl(${(rank * 47) % 360},70%,55%),hsl(${(rank * 47 + 30) % 360},70%,45%))` }}>
                          {item.student.first_name?.[0]}{item.student.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.student.last_name}, {item.student.first_name}</p>
                          <p className="text-[9px] text-gray-400">{item.student.admission_number}</p>
                        </div>
                        <div className="flex gap-1">
                          {(['EE', 'ME', 'AE', 'BE'] as RubricKey[]).map(k => {
                            const c = k === 'EE' ? item.eeC : k === 'ME' ? item.meC : k === 'AE' ? item.aeC : item.beC;
                            return <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: RUBRIC[k].bg, color: RUBRIC[k].color }}>{k}:{c}</span>;
                          })}
                        </div>
                        <div className="px-2.5 py-1 rounded-lg text-[10px] font-black text-white" style={{ background: RUBRIC[item.overall as RubricKey].color }}>
                          {item.overall}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
            {!selectedSubject && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' }}>🎓</div>
                <h3 className="text-xl font-black text-gray-800" style={{ letterSpacing: '-0.03em' }}>CBC Senior School Assessment</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Select a subject from the panel to begin entering rubric-based competency ratings for Grade {selGrade} learners.</p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
                  {RUBRIC_KEYS.map(k => (
                    <div key={k} className="p-3 rounded-xl border-2" style={{ background: RUBRIC[k].bg, borderColor: RUBRIC[k].border }}>
                      <p className="text-xl font-black" style={{ color: RUBRIC[k].color }}>{k}</p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: RUBRIC[k].color }}>{RUBRIC[k].short}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {Object.entries(CBC_SENIOR_DATA.pathways).map(([key, pw]) => (
                    <div key={key} className="px-4 py-2 rounded-xl border text-xs font-bold" style={{ background: pw.bg, borderColor: pw.border, color: pw.color }}>
                      {pw.icon} {filteredSubjects.filter(s => s.pathway === key).length} {key} subjects
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedSubject && filteredStudents.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <span className="text-4xl block mb-3">👩‍🎓</span>
                <p className="text-sm font-bold text-gray-600">No learners found for Grade {selGrade}</p>
                <p className="text-xs text-gray-400 mt-1">Check your class filter or enroll students in Grade {selGrade}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RUBRIC LEGEND ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">CBC Rubric Scale:</p>
            {RUBRIC_KEYS.map(k => (
              <div key={k} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ background: RUBRIC[k].bg, borderColor: RUBRIC[k].border }}>
                <span className="text-sm font-black" style={{ color: RUBRIC[k].color }}>{k}</span>
                <span className="text-[10px] font-semibold" style={{ color: RUBRIC[k].color }}>{RUBRIC[k].label}</span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
              <FiInfo size={12} />
              Click any rating button to toggle · Click twice to clear
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
