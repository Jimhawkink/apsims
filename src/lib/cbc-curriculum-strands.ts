// ════════════════════════════════════════════════════════════
// KENYA KICD OFFICIAL CBC STRANDS & SUB-STRANDS CATALOG
// Complete Curriculum Coverage: Senior School, Junior Secondary & Primary
// ════════════════════════════════════════════════════════════

export interface KICDSubStrand {
    id: string | number;
    sub_strand_name: string;
    outcomes: string[];
    inquiry_questions: string[];
}

export interface KICDStrand {
    id: string | number;
    strand_name: string;
    code: string;
    sub_strands: KICDSubStrand[];
}

export const KICD_SUBJECT_STRANDS: Record<string, KICDStrand[]> = {
    // ── 1. AGRICULTURE & NUTRITION / AGRICULTURE ───────────────────
    'agriculture': [
        {
            id: 'AGR-S1',
            strand_name: 'Conserving Agricultural Environment',
            code: 'AGR-CAE',
            sub_strands: [
                {
                    id: 'AGR-SS1',
                    sub_strand_name: 'Soil Conservation & Management',
                    outcomes: ['Construct soil conservation structures', 'Identify causes and control measures of soil erosion', 'Apply soil fertility enhancement practices'],
                    inquiry_questions: ['How can we prevent loss of topsoil in our community?', 'Why is soil conservation critical to food security?']
                },
                {
                    id: 'AGR-SS2',
                    sub_strand_name: 'Water Harvesting & Storage',
                    outcomes: ['Construct simple farm water harvesting systems', 'Apply drip and furrow irrigation methods', 'Maintain clean farm water storage facilities'],
                    inquiry_questions: ['How can farmers harvest runoff water for dry season farming?', 'What are the benefits of water conservation in agriculture?']
                },
                {
                    id: 'AGR-SS3',
                    sub_strand_name: 'Agroforestry & Environmental Protection',
                    outcomes: ['Plant and manage multipurpose farm trees', 'Explain the ecological benefits of agroforestry', 'Establish tree nursery and care for seedlings'],
                    inquiry_questions: ['How does agroforestry contribute to climate resilience?', 'Which tree species best complement food crops?']
                }
            ]
        },
        {
            id: 'AGR-S2',
            strand_name: 'Crop Production',
            code: 'AGR-CP',
            sub_strands: [
                {
                    id: 'AGR-SS4',
                    sub_strand_name: 'Field Crops & Nursery Practices',
                    outcomes: ['Prepare nursery beds and raise crop seedlings', 'Transplant seedlings using recommended spacing', 'Manage crop pests, weeds and diseases'],
                    inquiry_questions: ['What factors ensure high seedling survival rate?', 'How do farmers choose between organic and synthetic pest control?']
                },
                {
                    id: 'AGR-SS5',
                    sub_strand_name: 'Horticulture & Vegetable Production',
                    outcomes: ['Establish kitchen gardens and multi-storey gardens', 'Produce indigenous vegetables and high-value fruits', 'Harvest and handle vegetables to minimize post-harvest loss'],
                    inquiry_questions: ['How can urban and smallholder farmers maximize vegetable yield?', 'Why are indigenous vegetables gaining commercial importance?']
                },
                {
                    id: 'AGR-SS6',
                    sub_strand_name: 'Harvesting & Post-Harvest Handling',
                    outcomes: ['Determine crop maturity indices for timely harvesting', 'Apply drying and grading techniques for grains and produce', 'Construct and maintain modern grain storage cribs and silos'],
                    inquiry_questions: ['What causes post-harvest loss in grain storage?', 'How do modern storage technologies reduce aflatoxin contamination?']
                }
            ]
        },
        {
            id: 'AGR-S3',
            strand_name: 'Animal Production',
            code: 'AGR-AP',
            sub_strands: [
                {
                    id: 'AGR-SS7',
                    sub_strand_name: 'Small Domestic Animals & Poultry',
                    outcomes: ['Rear poultry, rabbits and small stock using recommended housing', 'Formulate balanced rations for poultry and rabbits', 'Identify signs of common animal diseases and apply prophylaxis'],
                    inquiry_questions: ['Why is poultry and rabbit rearing ideal for youth and smallholders?', 'What biosecurity measures prevent poultry disease outbreaks?']
                },
                {
                    id: 'AGR-SS8',
                    sub_strand_name: 'Livestock Husbandry & Health',
                    outcomes: ['Manage dairy cattle, goats and sheep for milk and meat', 'Apply livestock breeding, selection and artificial insemination principles', 'Control external and internal livestock parasites'],
                    inquiry_questions: ['How does animal health management impact dairy productivity?', 'What breeding practices improve local livestock breeds?']
                },
                {
                    id: 'AGR-SS9',
                    sub_strand_name: 'Animal Feeds & Fodder Conservation',
                    outcomes: ['Establish fodder crops such as Napier grass, Desmodium and Brachiaria', 'Make silage and hay for dry season livestock feeding', 'Calculate animal feed requirements based on body weight'],
                    inquiry_questions: ['How can farmers conserve fodder to withstand prolonged droughts?', 'What is the nutritional value of leguminous fodders?']
                }
            ]
        },
        {
            id: 'AGR-S4',
            strand_name: 'Agriculture & Technology',
            code: 'AGR-AT',
            sub_strands: [
                {
                    id: 'AGR-SS10',
                    sub_strand_name: 'Farm Structures & Fencing',
                    outcomes: ['Construct standard farm fences and gates', 'Design and build cost-effective livestock shelters and storage cribs', 'Maintain farm buildings and water distribution pipes'],
                    inquiry_questions: ['What considerations determine the siting of farm structures?', 'How does proper livestock housing improve productivity?']
                },
                {
                    id: 'AGR-SS11',
                    sub_strand_name: 'Farm Machinery, Tools & Smart Farming',
                    outcomes: ['Operate and maintain hand tools, knapsack sprayers and garden implements', 'Apply digital applications in crop scouting and weather forecasting', 'Explore precision agriculture techniques such as drip timers and soil sensors'],
                    inquiry_questions: ['How can digital technology transform smallholder farming in Kenya?', 'What safety precautions are necessary when handling farm implements?']
                }
            ]
        },
        {
            id: 'AGR-S5',
            strand_name: 'Food & Nutrition',
            code: 'AGR-FN',
            sub_strands: [
                {
                    id: 'AGR-SS12',
                    sub_strand_name: 'Meal Planning & Nutritional Value',
                    outcomes: ['Plan balanced meals using locally available diverse food groups', 'Explain the role of micronutrients in human growth and disease prevention', 'Modify diets for vulnerable groups including children and the elderly'],
                    inquiry_questions: ['How can a family achieve complete nutrition from a home garden?', 'What dietary practices prevent nutritional deficiency diseases?']
                },
                {
                    id: 'AGR-SS13',
                    sub_strand_name: 'Food Safety, Hygiene & Preservation',
                    outcomes: ['Apply hygienic food handling and cross-contamination prevention', 'Preserve vegetables, fruits, meat and milk using solar drying, fermentation and smoking', 'Store cooked and perishable foods at safe temperatures'],
                    inquiry_questions: ['How do food preservation methods prolong shelf-life without nutrient loss?', 'What are the critical control points in domestic food hygiene?']
                }
            ]
        },
        {
            id: 'AGR-S6',
            strand_name: 'Agribusiness & Farm Management',
            code: 'AGR-AFM',
            sub_strands: [
                {
                    id: 'AGR-SS14',
                    sub_strand_name: 'Farm Financial Records & Budgeting',
                    outcomes: ['Prepare farm inventory, cash books and production ledgers', 'Calculate gross margins and profit/loss for agricultural enterprises', 'Formulate a simple farm business plan'],
                    inquiry_questions: ['Why are farm records essential for securing agricultural credit?', 'How does enterprise budgeting help farmers make profitable decisions?']
                },
                {
                    id: 'AGR-SS15',
                    sub_strand_name: 'Agricultural Marketing & Value Addition',
                    outcomes: ['Package and brand farm produce for local and regional markets', 'Explore direct-to-consumer and digital agricultural market channels', 'Process raw produce into value-added items such as yoghurt, jam and flour'],
                    inquiry_questions: ['How does value addition increase farmer profit margins?', 'What marketing strategies best connect rural producers to urban markets?']
                }
            ]
        }
    ],

    // ── 2. MATHEMATICS ─────────────────────────────────────────────
    'mathematics': [
        {
            id: 'MAT-S1',
            strand_name: 'Numbers & Operations',
            code: 'MAT-NUM',
            sub_strands: [
                { id: 'MAT-SS1', sub_strand_name: 'Integers, Fractions & Decimals', outcomes: ['Perform operations on directed numbers', 'Solve multi-step problems involving fractions and decimals', 'Apply order of operations (BODMAS) accurately'], inquiry_questions: ['How do negative numbers model real-world debts and temperatures?', 'Where are fraction operations used in architectural and engineering scale plans?'] },
                { id: 'MAT-SS2', sub_strand_name: 'Ratios, Proportions & Percentages', outcomes: ['Divide quantities in given ratios', 'Solve direct and inverse proportion problems', 'Calculate percentage profit, loss, discount and commission'], inquiry_questions: ['How does proportional reasoning help in business and financial decisions?', 'How do inflation and percentage rates affect the purchasing power of money?'] },
                { id: 'MAT-SS3', sub_strand_name: 'Indices, Logarithms & Standard Form', outcomes: ['Apply laws of indices in simplification', 'Convert between index and logarithmic form', 'Express large and small quantities in scientific notation'], inquiry_questions: ['Why are logarithmic scales used to measure earthquakes (Richter) and sound (decibels)?', 'How do indices simplify calculations involving atomic scale and astronomical distances?'] }
            ]
        },
        {
            id: 'MAT-S2',
            strand_name: 'Algebra',
            code: 'MAT-ALG',
            sub_strands: [
                { id: 'MAT-SS4', sub_strand_name: 'Algebraic Expressions & Factorisation', outcomes: ['Expand binomial expressions', 'Factorise quadratic expressions completely', 'Simplify rational algebraic fractions'], inquiry_questions: ['How do algebraic patterns model geometric areas and sequences?', 'Why is factorisation crucial in finding roots of polynomial equations?'] },
                { id: 'MAT-SS5', sub_strand_name: 'Linear & Simultaneous Equations', outcomes: ['Formulate linear equations from practical situations', 'Solve simultaneous equations graphically and algebraically (substitution and elimination)', 'Solve linear inequalities and represent solutions on number lines and regions'], inquiry_questions: ['How do economists use simultaneous equations to determine market equilibrium price?', 'How do inequalities model resource allocation constraints in manufacturing?'] },
                { id: 'MAT-SS6', sub_strand_name: 'Quadratic Equations & Functions', outcomes: ['Solve quadratic equations by factorisation, completing square and quadratic formula', 'Sketch quadratic graphs and identify vertices and axes of symmetry', 'Apply quadratic models to projectile motion and profit maximization'], inquiry_questions: ['Why does the trajectory of a kicked ball follow a parabolic quadratic curve?', 'How does the discriminant reveal the nature of solutions in quadratic analysis?'] }
            ]
        },
        {
            id: 'MAT-S3',
            strand_name: 'Geometry & Trigonometry',
            code: 'MAT-GEO',
            sub_strands: [
                { id: 'MAT-SS7', sub_strand_name: 'Angles, Polygons & Geometric Construction', outcomes: ['Calculate interior and exterior angles of regular polygons', 'Construct triangles, perpendicular bisectors and angle bisectors using compass and ruler', 'Apply properties of parallel lines and transversals'], inquiry_questions: ['How do architects and surveyors apply geometric angle theorems?', 'Why are triangular trusses structurally rigid in building construction?'] },
                { id: 'MAT-SS8', sub_strand_name: 'Circle Theorems & Chords', outcomes: ['Apply theorems of angle subtended at center and circumference', 'Prove and use cyclic quadrilateral properties', 'Solve problems involving tangents and secants to circles'], inquiry_questions: ['How do satellite orbits and circular radar zones rely on circle theorems?', 'What geometric principles govern the design of circular gears and wheels?'] },
                { id: 'MAT-SS9', sub_strand_name: 'Trigonometric Ratios & Applications', outcomes: ['Calculate sine, cosine and tangent for acute and obtuse angles', 'Apply sine and cosine rules to non-right angled triangles', 'Solve problems involving angles of elevation, depression, bearings and distances'], inquiry_questions: ['How do navigators and pilots calculate course direction using bearings and trigonometry?', 'How can surveyors measure the height of a mountain without climbing it?'] }
            ]
        },
        {
            id: 'MAT-S4',
            strand_name: 'Measurements & Calculus',
            code: 'MAT-MEA',
            sub_strands: [
                { id: 'MAT-SS10', sub_strand_name: 'Perimeter, Area & Surface Area', outcomes: ['Calculate areas of plane figures including sectors and segments', 'Determine surface area of prisms, cylinders, cones and spheres', 'Apply Simpson rule and trapezoidal rule to estimate irregular areas'], inquiry_questions: ['How do civil engineers calculate land area with irregular boundaries?', 'What geometric shape minimizes surface area for a given storage volume?'] },
                { id: 'MAT-SS11', sub_strand_name: 'Volume & Capacity of Solids', outcomes: ['Calculate volume of pyramids, frustums and composite solids', 'Convert between cubic units and liquid capacity (litres, millilitres)', 'Solve practical problems involving density, mass and volume'], inquiry_questions: ['How do water engineers calculate reservoir and tank holding capacity?', 'How is the frustum formula applied in constructing bucket and hopper volumes?'] },
                { id: 'MAT-SS12', sub_strand_name: 'Introduction to Calculus (Differentiation & Integration)', outcomes: ['Find derivatives of polynomial functions from first principles and power rule', 'Determine gradients of curves, turning points, maxima and minima', 'Integrate polynomial functions and find area under curves'], inquiry_questions: ['How does differentiation help engineers determine the maximum efficiency of an engine?', 'How does integration calculate total work done or total distance from velocity?'] }
            ]
        },
        {
            id: 'MAT-S5',
            strand_name: 'Statistics & Probability',
            code: 'MAT-STA',
            sub_strands: [
                { id: 'MAT-SS13', sub_strand_name: 'Data Presentation & Frequency Distributions', outcomes: ['Construct frequency tables, histograms, polygons and cumulative frequency curves (ogives)', 'Interpret stem-and-leaf plots and pie charts', 'Read medians and quartiles from ogives'], inquiry_questions: ['How can visual data representations accurately inform policy or mislead the public?', 'What insights does cumulative frequency provide about population percentiles?'] },
                { id: 'MAT-SS14', sub_strand_name: 'Measures of Central Tendency & Dispersion', outcomes: ['Calculate mean, median and mode for grouped and ungrouped data', 'Determine range, interquartile range, variance and standard deviation', 'Compare datasets using mean and standard deviation'], inquiry_questions: ['Why is standard deviation more informative than range in assessing risk or consistency?', 'When is the median preferred over the mean in reporting household incomes?'] },
                { id: 'MAT-SS15', sub_strand_name: 'Probability & Tree Diagrams', outcomes: ['Calculate theoretical and experimental probabilities', 'Apply addition and multiplication laws of probability for mutually exclusive and independent events', 'Construct probability tree diagrams to solve conditional probability problems'], inquiry_questions: ['How do insurance companies calculate actuarial risk using probability?', 'How does understanding probability prevent misconceptions in games of chance and weather forecasts?'] }
            ]
        }
    ],

    // ── 3. ENGLISH ─────────────────────────────────────────────────
    'english': [
        {
            id: 'ENG-S1',
            strand_name: 'Listening and Speaking',
            code: 'ENG-LS',
            sub_strands: [
                { id: 'ENG-SS1', sub_strand_name: 'Oral Communication & Public Speaking', outcomes: ['Deliver persuasive and informative speeches with confidence', 'Engage in formal academic debates using structured rebuttal', 'Use non-verbal cues (eye contact, posture, gestures) effectively'], inquiry_questions: ['What makes an oral presentation compelling and memorable?', 'How does active listening strengthen critical dialogue in a democracy?'] },
                { id: 'ENG-SS2', sub_strand_name: 'Pronunciation, Stress & Intonation', outcomes: ['Distinguish minimal sound pairs in English', 'Apply correct word stress in multi-syllabic words and sentence intonation', 'Recognize and adapt speech registers in varied formal and informal settings'], inquiry_questions: ['How does intonation alter the intended meaning of an utterance?', 'How can speakers overcome pronunciation challenges to achieve clarity?'] }
            ]
        },
        {
            id: 'ENG-S2',
            strand_name: 'Reading and Comprehension',
            code: 'ENG-RC',
            sub_strands: [
                { id: 'ENG-SS3', sub_strand_name: 'Intensive Reading & Literary Analysis', outcomes: ['Analyse themes, characterization and style in prose, drama and poetry', 'Identify and interpret figurative language, irony and symbolism', 'Evaluate author perspective, tone and underlying biases'], inquiry_questions: ['How does literature reflect and challenge societal values and injustices?', 'How do poetic devices create emotional resonance in readers?'] },
                { id: 'ENG-SS4', sub_strand_name: 'Critical Reading & Synthesis', outcomes: ['Extract main ideas and supporting evidence from expository texts', 'Summarize and paraphrase information accurately without plagiarism', 'Synthesize arguments from multiple source texts to draw reasoned conclusions'], inquiry_questions: ['How can critical readers evaluate credibility in digital media and news?', 'What strategies differentiate factual evidence from author opinion?'] }
            ]
        },
        {
            id: 'ENG-S3',
            strand_name: 'Writing',
            code: 'ENG-WR',
            sub_strands: [
                { id: 'ENG-SS5', sub_strand_name: 'Functional & Professional Writing', outcomes: ['Draft formal letters, curriculum vitae, memoranda and meeting minutes', 'Write structured project proposals and investigative reports', 'Follow conventions of academic referencing and citation'], inquiry_questions: ['Why is conciseness and clarity vital in corporate communication?', 'How does the layout of official documents convey institutional authority?'] },
                { id: 'ENG-SS6', sub_strand_name: 'Creative & Expository Writing', outcomes: ['Write engaging narrative compositions with vivid character development', 'Compose balanced argumentative and discursive essays', 'Use cohesive devices and varied sentence structures to enhance flow'], inquiry_questions: ['How can a writer hook and sustain reader interest throughout an essay?', 'What role does sensory detail play in descriptive and narrative writing?'] }
            ]
        },
        {
            id: 'ENG-S4',
            strand_name: 'Grammar and Language Use',
            code: 'ENG-GL',
            sub_strands: [
                { id: 'ENG-SS7', sub_strand_name: 'Parts of Speech & Syntax', outcomes: ['Use complex noun phrases, verb tenses and passive voice accurately', 'Construct complex and compound-complex sentences with correct clause punctuation', 'Apply subject-verb agreement and conditional clauses correctly'], inquiry_questions: ['How does syntactic variety prevent monotony in extended writing?', 'When is the passive voice preferred in scientific and objective reportage?'] },
                { id: 'ENG-SS8', sub_strand_name: 'Punctuation, Vocabulary & Mechanics', outcomes: ['Use semicolons, colons, dashes and apostrophes with precision', 'Expand academic and domain-specific vocabulary using affixes and context clues', 'Eliminate common grammatical errors such as dangling modifiers and comma splices'], inquiry_questions: ['How can a misplaced comma or semicolon alter legal and contractual meaning?', 'How does reading diverse genres naturally expand active vocabulary?'] }
            ]
        }
    ],

    // ── 4. KISWAHILI ───────────────────────────────────────────────
    'kiswahili': [
        {
            id: 'KSW-S1',
            strand_name: 'Kusikiliza na Kuzungumza',
            code: 'KSW-KK',
            sub_strands: [
                { id: 'KSW-SS1', sub_strand_name: 'Mazungumzo Rasmi na Mahojiano', outcomes: ['Kuwasiliana kwa ufasaha katika mikutano, mijadala na hotuba rasmi', 'Kutumia lugha ya adabu na heshima kulingana na hadhira na muktadha', 'Kufanya na kujibu maswali ya mahojiano kwa umakini'], inquiry_questions: ['Ni mbinu zipi humwezesha mzungumzaji kuathiri hisia za hadhira yake?', 'Kwa nini heshima na unyenyekevu ni nguzo kuu katika mazungumzo ya Kiswahili?'] },
                { id: 'KSW-SS2', sub_strand_name: 'Matamshi, Lafudhi na Fonolojia', outcomes: ['Kutamka sauti changamano za Kiswahili kwa usahihi (k.m. ng\', gh, dh, th)', 'Kutofautisha maana kupitia kiimbo, mkazo na shada katika sentensi', 'Kuepuka athari za lugha ya mama katika matamshi ya Kiswahili sanifu'], inquiry_questions: ['Je, mkazo na kiimbo vina athari gani katika kubadilisha maana ya sentensi?', 'Mwanafunzi anawezaje kumudu matamshi sanifu bila athari za lugha ya kwanza?'] }
            ]
        },
        {
            id: 'KSW-S2',
            strand_name: 'Kusoma na Ufahamu',
            code: 'KSW-KU',
            sub_strands: [
                { id: 'KSW-SS3', sub_strand_name: 'Usomaji wa Kina na Ufupisho', outcomes: ['Kusoma na kueleza ujumbe mzito katika taarifa za kitaaluma na habari', 'Kufupisha makala ndefu bila kupoteza kiini cha hoja kuu', 'Kutambua mbinu za ushawishi na maoni ya mwandishi katika matini'], inquiry_questions: ['Ni hatua zipi thabiti zinazofaa kufuatwa wakati wa kuandika ufupisho bora?', 'Ufahamu wa kusoma unamsaidiaje mwanafunzi katika maisha yake ya kila siku?'] },
                { id: 'KSW-SS4', sub_strand_name: 'Uchambuzi wa Fasihi Simulizi na Andishi', outcomes: ['Kuchambua sifa za ngano, vitendawili, methali na nyimbo za kitamaduni', 'Kutathmini wahusika, mandhari na maudhui katika riwaya na tamthilia teule', 'Kufafanua arudhi na tamathali za usemi katika mashairi ya kimapokeo na kisasa'], inquiry_questions: ['Fasihi simulizi ina nafasi gani katika kuelimisha jamii ya kisasa?', 'Washairi hutumiaje tamathali za usemi kufikisha ujumbe mzito kwa jamii?'] }
            ]
        },
        {
            id: 'KSW-S3',
            strand_name: 'Kuandika',
            code: 'KSW-KD',
            sub_strands: [
                { id: 'KSW-SS5', sub_strand_name: 'Insha za Kiuamilifu na Mawasiliano Rasmi', outcomes: ['Kuandika barua rasmi, tawasifu (CV), kumbukumbu za mikutano na ripoti za kiuchunguzi', 'Kuandaa tahariri, hotuba na matangazo kwa kufuata miundo sanifu', 'Kutumia msamiati wa kitaalamu unaofaa katika kila aina ya insha'], inquiry_questions: ['Kwa nini muundo sahihi ni muhimu katika uandishi wa kumbukumbu za mkutano?', 'Barua rasmi inatofautianaje na barua ya kirafiki katika lugha na muundo?'] },
                { id: 'KSW-SS6', sub_strand_name: 'Insha za Kubuni na Methali', outcomes: ['Kutungua insha za masimulizi zinazosisimua zenye msuko madhubuti', 'Kufafanua maana ya ndani na ya nje ya methali kupitia insha ya kisa', 'Kutumia nahau, misemo na taswira kuimarisha mvuto wa mtindo wa uandishi'], inquiry_questions: ['Mwandishi anawezaje kujenga taharuki na mshikamano katika insha ya kubuni?', 'Methali za Kiswahili zinabebaje hekima na falsafa ya maisha ya Mwafrika?'] }
            ]
        },
        {
            id: 'KSW-S4',
            strand_name: 'Sarufi na Matumizi ya Lugha',
            code: 'KSW-SR',
            sub_strands: [
                { id: 'KSW-SS7', sub_strand_name: 'Ngeli za Nomino na Upatanisho wa Kisarufi', outcomes: ['Kupanga nomino katika ngeli zake sahihi (A-WA, KI-VI, U-I, LI-YA, n.k.)', 'Kutumia viambishi na upatanisho sahihi wa kisarufi katika sentensi', 'Kubadilisha sentensi kutoka umoja hadi wingi bila kukiuka sheria za ngeli'], inquiry_questions: ['Upatanisho wa kisarufi unachangiaje katika kufanya Kiswahili kiwe lugha yenye urari?', 'Mwanafunzi anawezaje kukumbuka ngeli zote za Kiswahili bila kutatizika?'] },
                { id: 'KSW-SS8', sub_strand_name: 'Unyambulishaji wa Vitenzi na Miundo ya Sentensi', outcomes: ['Kunyambua vitenzi katika kauli mbalimbali (kutenda, kutendwa, kutendea, kutendeana, n.k.)', 'Kuchanganua sentensi sahili, ambatano na changamano kwa njia ya jedwali na mishale', 'Kubadilisha kauli halisi kuwa kauli taarifa kwa usahihi wa wakati'], inquiry_questions: ['Unyambulishaji vitenzi unawezeshaje uundaji wa maneno mapya katika Kiswahili?', 'Sentensi changamano inatofautianaje na sentensi ambatano katika ujenzi wa hoja?'] }
            ]
        }
    ],

    // ── 5. BIOLOGY ─────────────────────────────────────────────────
    'biology': [
        {
            id: 'BIO-S1',
            strand_name: 'Cell Biology & Organisation',
            code: 'BIO-CB',
            sub_strands: [
                { id: 'BIO-SS1', sub_strand_name: 'Microscopy & Cell Structure', outcomes: ['Prepare and stain biological specimens for microscopic observation', 'Compare prokaryotic, plant and animal cell ultrastructures', 'Calculate magnification and actual size of biological cells'], inquiry_questions: ['How has electron microscopy transformed our understanding of cellular organelles?', 'How does cellular differentiation enable complex multicellular life?'] },
                { id: 'BIO-SS2', sub_strand_name: 'Cell Physiology (Diffusion, Osmosis, Active Transport)', outcomes: ['Investigate diffusion and osmosis using living tissues (potato cylinders, visking tubing)', 'Explain water relations in plant cells (turgidity, plasmolysis) and animal cells (haemolysis, crenation)', 'Explain the biological significance of active transport against concentration gradients'], inquiry_questions: ['Why would plant cells burst without a rigid cellulose cell wall?', 'How do root hair cells absorb mineral ions from low-concentration soil solutions?'] }
            ]
        },
        {
            id: 'BIO-S2',
            strand_name: 'Genetics, Evolution & Biotechnology',
            code: 'BIO-GE',
            sub_strands: [
                { id: 'BIO-SS3', sub_strand_name: 'Mendelian Genetics & Inheritance', outcomes: ['Construct genetic crosses using Punnett squares to predict phenotypic and genotypic ratios', 'Explain inheritance of sex, ABO blood groups and sex-linked traits (haemophilia, colour blindness)', 'Distinguish between continuous and discontinuous variations in living organisms'], inquiry_questions: ['How do genetic mutations lead to phenotypic variation and inherited disorders?', 'Why are males more frequently affected by X-linked recessive genetic conditions?'] },
                { id: 'BIO-SS4', sub_strand_name: 'Evolution & Modern Biotechnology', outcomes: ['Analyse evidence for organic evolution from comparative anatomy, fossils and DNA', 'Explain Darwin theory of natural selection and industrial melanism', 'Describe applications of genetic engineering in agriculture and medicine (insulin, GMOs)'], inquiry_questions: ['How does bacterial resistance to antibiotics provide real-time evidence of natural selection?', 'What ethical considerations surround gene editing technologies like CRISPR?'] }
            ]
        },
        {
            id: 'BIO-S3',
            strand_name: 'Ecology & Environmental Biology',
            code: 'BIO-ECO',
            sub_strands: [
                { id: 'BIO-SS5', sub_strand_name: 'Ecosystem Dynamics & Energy Flow', outcomes: ['Construct food chains, food webs and ecological pyramids of numbers, biomass and energy', 'Investigate biotic and abiotic factors using ecological sampling techniques (quadrats, transects)', 'Trace carbon and nitrogen cycles and their roles in ecosystem balance'], inquiry_questions: ['Why does energy decrease by approximately 90% at each successive trophic level?', 'How does human destruction of wetlands destabilize regional microclimates?'] },
                { id: 'BIO-SS6', sub_strand_name: 'Conservation, Pollution & Biodiversity', outcomes: ['Analyse causes, effects and solutions to air, water and soil pollution', 'Explain the mechanism and ecological consequences of eutrophication in water bodies', 'Design community interventions for biodiversity conservation and climate resilience'], inquiry_questions: ['How does plastic pollution threaten aquatic food chains and human health?', 'What biological strategies can restore degraded ecosystems in Kenya?'] }
            ]
        },
        {
            id: 'BIO-S4',
            strand_name: 'Human Biology & Health Systems',
            code: 'BIO-HB',
            sub_strands: [
                { id: 'BIO-SS7', sub_strand_name: 'Digestive & Circulatory Systems', outcomes: ['Trace pathways of mechanical and chemical digestion and enzyme action', 'Describe the structure and function of the human heart, blood vessels and blood components', 'Explain the ABO and Rhesus blood grouping systems and blood transfusion compatibility'], inquiry_questions: ['How does the villus adaptation maximize the rate of nutrient absorption?', 'How does atherosclerosis lead to hypertension and myocardial infarction?'] },
                { id: 'BIO-SS8', sub_strand_name: 'Respiratory, Excretory & Nervous Systems', outcomes: ['Explain the mechanism of gaseous exchange in human alveoli and control of breathing', 'Describe the structure of the nephron and urine formation (ultrafiltration and selective reabsorption)', 'Trace reflex arcs and explain the transmission of nerve impulses across synapses'], inquiry_questions: ['How does the kidney maintain osmoregulation and blood pH balance?', 'How do neurotoxins and recreational drugs disrupt synaptic transmission?'] }
            ]
        }
    ],

    // ── 6. CHEMISTRY ───────────────────────────────────────────────
    'chemistry': [
        {
            id: 'CHE-S1',
            strand_name: 'Structure, Bonding & Atomic Theory',
            code: 'CHE-SB',
            sub_strands: [
                { id: 'CHE-SS1', sub_strand_name: 'Atomic Structure & Periodic Table', outcomes: ['Determine electron configurations of elements up to atomic number 20', 'Explain trends in atomic radius, ionization energy and electronegativity across periods and down groups', 'Differentiate between isotopes and calculate relative atomic mass'], inquiry_questions: ['How does atomic structure dictate chemical reactivity and valency?', 'Why are noble gases chemically inert while alkali metals are violently reactive?'] },
                { id: 'CHE-SS2', sub_strand_name: 'Chemical Bonding & Intermolecular Forces', outcomes: ['Illustrate ionic, covalent, coordinate and metallic bonding using Lewis dot diagrams', 'Relate bonding types to physical properties: melting points, electrical conductivity, solubility', 'Distinguish between giant ionic, giant covalent, simple molecular and metallic structures'], inquiry_questions: ['Why does diamond not conduct electricity while graphite is an excellent conductor?', 'How do hydrogen bonds explain the anomalous density and boiling point of water?'] }
            ]
        },
        {
            id: 'CHE-S2',
            strand_name: 'Chemical Reactions & Stoichiometry',
            code: 'CHE-RS',
            sub_strands: [
                { id: 'CHE-SS3', sub_strand_name: 'The Mole Concept & Gas Volumes', outcomes: ['Calculate molar masses, percentage composition and empirical and molecular formulae', 'Perform stoichiometry calculations involving reacting masses, molar gas volumes and solution molarity', 'Perform volumetric titrations to determine concentrations of unknown solutions'], inquiry_questions: ['Why is the mole considered the fundamental counting unit of chemistry?', 'How do pharmaceutical chemists ensure exact stoichiometric drug dosages?'] },
                { id: 'CHE-SS4', sub_strand_name: 'Acids, Bases, Salts & Qualitative Analysis', outcomes: ['Explain Arrhenius and Bronsted-Lowry acid-base theories and pH scale', 'Prepare soluble and insoluble salts using crystallization and precipitation methods', 'Identify cations and anions in unknown salts using flame tests and reagent precipitates'], inquiry_questions: ['How does soil pH affect crop nutrient uptake in Kenyan agriculture?', 'What chemical principles underpin industrial water softening and effluent neutralization?'] }
            ]
        },
        {
            id: 'CHE-S3',
            strand_name: 'Physical Chemistry & Energetics',
            code: 'CHE-PC',
            sub_strands: [
                { id: 'CHE-SS5', sub_strand_name: 'Thermochemistry & Reaction Rates', outcomes: ['Construct energy level diagrams for exothermic and endothermic reactions', 'Determine enthalpy of solution, combustion and displacement experimentally', 'Investigate factors affecting reaction rates: temperature, concentration, surface area and catalysts'], inquiry_questions: ['How do catalysts lower activation energy without being consumed in reactions?', 'How is chemical bond energy harnessed in renewable biofuels and hydrogen cells?'] },
                { id: 'CHE-SS6', sub_strand_name: 'Chemical Equilibrium & Electrochemistry', outcomes: ['Apply Le Chatelier principle to predict shifts in reversible equilibrium systems', 'Set up simple galvanic cells and calculate standard electrode potentials and cell EMF', 'Investigate electrolysis of molten salts and aqueous solutions and its industrial applications (electroplating, aluminium extraction)'], inquiry_questions: ['How does electroplating prevent corrosion and enhance aesthetic value?', 'How does Le Chatelier principle optimize ammonia production in the Haber process?'] }
            ]
        },
        {
            id: 'CHE-S4',
            strand_name: 'Organic & Environmental Chemistry',
            code: 'CHE-OE',
            sub_strands: [
                { id: 'CHE-SS7', sub_strand_name: 'Hydrocarbons, Alkanols & Polymers', outcomes: ['Name, draw and compare alkanes, alkenes and alkynes and their combustion/addition reactions', 'Describe the preparation and reactions of ethanol (fermentation, esterification, oxidation)', 'Differentiate between addition and condensation polymers and natural vs synthetic fibers'], inquiry_questions: ['Why are non-biodegradable synthetic polymers an acute environmental threat?', 'How are fossil fuels refined through fractional distillation into diverse fuels?'] },
                { id: 'CHE-SS8', sub_strand_name: 'Industrial Chemistry, Metals & Pollution', outcomes: ['Describe extraction of iron, copper and aluminium from their mineral ores', 'Explain industrial manufacture of sulfuric acid (Contact process) and ammonia (Haber process)', 'Analyse air and water pollution causes (greenhouse effect, acid rain) and pollution remediation techniques'], inquiry_questions: ['How can industrial waste gases be scrubbed to prevent acid rain?', 'What makes circular economy recycling of scrap metal energy-efficient?'] }
            ]
        }
    ],

    // ── 7. PHYSICS ─────────────────────────────────────────────────
    'physics': [
        {
            id: 'PHY-S1',
            strand_name: 'Mechanics & Properties of Matter',
            code: 'PHY-MP',
            sub_strands: [
                { id: 'PHY-SS1', sub_strand_name: 'Measurement, Kinematics & Vectors', outcomes: ['Use vernier calipers and micrometer screw gauges to measure small dimensions accurately', 'Derive and apply linear equations of motion to horizontal and vertical projectiles', 'Resolve vector forces into perpendicular components and find resultant forces'], inquiry_questions: ['Why are precision measurements vital in aviation and mechanical engineering?', 'How does acceleration due to gravity govern the motion of falling bodies?'] },
                { id: 'PHY-SS2', sub_strand_name: 'Newton Laws, Momentum, Work & Energy', outcomes: ['State and apply Newton three laws of motion to real-world collision problems', 'Calculate work done, kinetic energy, gravitational potential energy and power output', 'Determine efficiency, velocity ratio and mechanical advantage of simple machines'], inquiry_questions: ['How do seatbelts and crumple zones utilize momentum principles to save lives?', 'Why can no real machine achieve 100% mechanical efficiency?'] }
            ]
        },
        {
            id: 'PHY-S2',
            strand_name: 'Waves, Sound & Optics',
            code: 'PHY-WSO',
            sub_strands: [
                { id: 'PHY-SS3', sub_strand_name: 'Wave Motion, Sound & Acoustics', outcomes: ['Distinguish between transverse and longitudinal waves and calculate speed, frequency and wavelength', 'Explain reflection, refraction, diffraction and interference of water and sound waves', 'Calculate velocity of sound using echo methods and resonance tubes'], inquiry_questions: ['How do noise-cancelling headphones employ destructive wave interference?', 'How does ultrasound imaging visualize internal human organs safely?'] },
                { id: 'PHY-SS4', sub_strand_name: 'Geometric Optics (Refraction & Lenses)', outcomes: ['Construct ray diagrams for curved mirrors and thin convex and concave lenses', 'Apply the lens formula and calculate magnification of optical instruments', 'Explain eye defects (myopia, hypermetropia) and their optical corrections'], inquiry_questions: ['How do telescopes and compound microscopes manipulate light rays to produce magnified images?', 'How does total internal reflection enable ultra-fast fiber optic internet transmission?'] }
            ]
        },
        {
            id: 'PHY-S3',
            strand_name: 'Electricity & Magnetism',
            code: 'PHY-EM',
            sub_strands: [
                { id: 'PHY-SS5', sub_strand_name: 'Current Electricity & Circuit Laws', outcomes: ['Verify Ohm law and calculate equivalent resistance of series and parallel circuits', 'Apply Kirchhoff laws to complex electrical circuits', 'Calculate electrical energy consumption and cost in domestic power installations'], inquiry_questions: ['Why are domestic appliances connected in parallel rather than in series?', 'How does the three-pin plug and earthing mechanism safeguard against fatal electric shock?'] },
                { id: 'PHY-SS6', sub_strand_name: 'Electromagnetism & Induction', outcomes: ['Map magnetic fields around permanent magnets and current-carrying conductors', 'Demonstrate Faraday law and Lenz law of electromagnetic induction', 'Explain the operating principles of electric motors, dynamos and AC step-up/step-down transformers'], inquiry_questions: ['Why is electrical power transmitted across national grids at high voltages and low currents?', 'How do magnetic levitation (Maglev) trains eliminate mechanical friction?'] }
            ]
        },
        {
            id: 'PHY-S4',
            strand_name: 'Thermal & Modern Physics',
            code: 'PHY-TMP',
            sub_strands: [
                { id: 'PHY-SS7', sub_strand_name: 'Thermal Physics & Gas Laws', outcomes: ['Determine specific heat capacity of solids and liquids using method of mixtures', 'State and apply Boyle law, Charles law and the ideal gas equation', 'Explain greenhouse effect and thermal energy transfer mechanisms (conduction, convection, radiation)'], inquiry_questions: ['Why does the high specific heat capacity of water moderate coastal climates?', 'How do pressure cookers cook food faster by manipulating boiling point?'] },
                { id: 'PHY-SS8', sub_strand_name: 'Radioactivity, Photoelectric Effect & Electronics', outcomes: ['Differentiate between alpha, beta and gamma radiation and balance nuclear equations', 'Calculate half-life and explain industrial and medical applications of radioisotopes', 'Explain the photoelectric effect, Einstein equation and solar photovoltaic cell operation'], inquiry_questions: ['How do solar photovoltaic panels directly convert sunlight into electricity?', 'Why is nuclear radiation both a lifesaving medical tool and a hazardous hazard?'] }
            ]
        }
    ],

    // ── 8. COMPUTER STUDIES / COMPUTER SCIENCE ─────────────────────
    'computer studies': [
        {
            id: 'COMP-S1',
            strand_name: 'Foundations of Computing & Hardware',
            code: 'COMP-FC',
            sub_strands: [
                { id: 'COMP-SS1', sub_strand_name: 'Computer Architecture & Hardware Components', outcomes: ['Identify internal computer components: CPU, RAM, ROM, motherboard and power supply', 'Categorize input, output, storage and communication peripheral devices', 'Assemble and troubleshoot basic personal computer hardware connections'], inquiry_questions: ['How does the fetch-decode-execute cycle govern central processing unit speed?', 'Why is solid-state storage (SSD) replacing traditional magnetic hard drives?'] }
            ]
        },
        {
            id: 'COMP-S2',
            strand_name: 'Software, Operating Systems & Productivity',
            code: 'COMP-SOP',
            sub_strands: [
                { id: 'COMP-SS2', sub_strand_name: 'Operating Systems & File Management', outcomes: ['Manage files, directories, user permissions and system resources', 'Install, update and configure open-source and proprietary operating systems', 'Differentiate between GUI, CLI and mobile operating systems'], inquiry_questions: ['How does an operating system manage concurrency and multitasking in memory?', 'Why is automated file backup critical in mitigating data loss from hardware failure?'] },
                { id: 'COMP-SS3', sub_strand_name: 'Word Processing & Advanced Spreadsheets', outcomes: ['Create professional reports with table of contents, citations and mail merge', 'Formulate advanced spreadsheet functions: VLOOKUP, IF statements, pivot tables and charts', 'Model financial and statistical scenarios using spreadsheet forecasting tools'], inquiry_questions: ['How do businesses use spreadsheet pivot tables to extract actionable market intelligence?', 'How does automated mail merge accelerate personalized mass communication?'] }
            ]
        },
        {
            id: 'COMP-S3',
            strand_name: 'Networks, Internet & Cybersecurity',
            code: 'COMP-NIC',
            sub_strands: [
                { id: 'COMP-SS4', sub_strand_name: 'Computer Networks & Internet Protocols', outcomes: ['Differentiate between LAN, WAN, MAN and peer-to-peer vs client-server topologies', 'Configure network devices: routers, switches, access points and Ethernet cabling', 'Explain the OSI model layers and role of IP addresses and DNS in internet routing'], inquiry_questions: ['How do data packets travel across the global internet without losing integrity?', 'What are the pros and cons of cloud computing compared to on-premises servers?'] },
                { id: 'COMP-SS5', sub_strand_name: 'Cybersecurity, Data Privacy & Ethics', outcomes: ['Identify cyber threats: malware, phishing, ransomware and social engineering', 'Apply strong authentication, data encryption and firewall protections', 'Adhere to Kenya Computer Misuse and Cybercrimes Act and Data Protection Act'], inquiry_questions: ['How can individuals and institutions defend against sophisticated social engineering attacks?', 'What ethical dilemmas arise from AI surveillance, biometrics and personal data monetization?'] }
            ]
        },
        {
            id: 'COMP-S4',
            strand_name: 'Programming, Databases & Web Development',
            code: 'COMP-PDW',
            sub_strands: [
                { id: 'COMP-SS6', sub_strand_name: 'Algorithms & Computer Programming', outcomes: ['Design algorithms using structured flowcharts and pseudocode', 'Write clean code in Python/JavaScript using variables, loops, conditionals and functions', 'Debug code systematically and document program modules'], inquiry_questions: ['How does algorithmic efficiency impact software performance on large datasets?', 'Why is modular programming essential in building scalable software systems?'] },
                { id: 'COMP-SS7', sub_strand_name: 'Databases & Web Technologies', outcomes: ['Design relational database tables with primary and foreign keys and normalisation', 'Execute SQL queries (SELECT, INSERT, UPDATE, DELETE, JOIN) to extract and manipulate data', 'Build responsive web pages using HTML5, CSS3 and JavaScript'], inquiry_questions: ['How do relational databases maintain data consistency across millions of transactions?', 'What makes a website accessible, responsive and search-engine optimized?'] }
            ]
        }
    ],

    // ── 9. BUSINESS STUDIES ────────────────────────────────────────
    'business studies': [
        {
            id: 'BUS-S1',
            strand_name: 'Business Environment & Entrepreneurship',
            code: 'BUS-BEE',
            sub_strands: [
                { id: 'BUS-SS1', sub_strand_name: 'Forms of Business Units & Ownership', outcomes: ['Compare sole proprietorships, partnerships, cooperatives and limited liability companies', 'Explain procedures of incorporating a public and private limited company in Kenya', 'Evaluate sources of long-term and short-term business financing'], inquiry_questions: ['Why do entrepreneurs choose corporate status over sole proprietorship despite legal formalities?', 'How do savings and credit cooperative societies (SACCOs) empower Kenyan communities?'] },
                { id: 'BUS-SS2', sub_strand_name: 'Entrepreneurial Opportunities & Business Planning', outcomes: ['Identify viable business opportunities in the local community', 'Formulate a comprehensive business plan including marketing, operations and financial projections', 'Apply ethical and socially responsible business practices'], inquiry_questions: ['What characteristics distinguish successful entrepreneurs from ordinary managers?', 'How does a well-researched business plan mitigate market risk and attract investors?'] }
            ]
        },
        {
            id: 'BUS-S2',
            strand_name: 'Financial Accounting & Bookkeeping',
            code: 'BUS-FAB',
            sub_strands: [
                { id: 'BUS-SS3', sub_strand_name: 'Source Documents & Books of Original Entry', outcomes: ['Prepare receipts, invoices, debit notes and credit notes', 'Record transactions in sales, purchases and three-column cash books', 'Extract a trial balance from double-entry general ledgers'], inquiry_questions: ['Why must every financial transaction be backed by a verifiable source document?', 'How does the double-entry bookkeeping convention ensure mathematical accuracy?'] },
                { id: 'BUS-SS4', sub_strand_name: 'Financial Statements & Ratio Analysis', outcomes: ['Prepare trading, profit and loss statements and balance sheets (statement of financial position)', 'Calculate liquidity, profitability and turnover ratios', 'Interpret financial statements to assess business viability and creditworthiness'], inquiry_questions: ['How does a profitable business still face bankruptcy due to poor cashflow management?', 'What do liquidity ratios tell creditors about a company short-term solvency?'] }
            ]
        },
        {
            id: 'BUS-S3',
            strand_name: 'Trade, Commerce & Supply Chain',
            code: 'BUS-TCS',
            sub_strands: [
                { id: 'BUS-SS5', sub_strand_name: 'Home & International Trade', outcomes: ['Explain channels of distribution for retail and wholesale commerce', 'Analyse documents used in international trade (bill of lading, letter of credit, customs declarations)', 'Explain the role of regional economic blocs: EAC, COMESA and AfCFTA'], inquiry_questions: ['How does digital e-commerce disrupt traditional retail distribution intermediaries?', 'How does the African Continental Free Trade Area (AfCFTA) expand market opportunities for Kenya?'] },
                { id: 'BUS-SS6', sub_strand_name: 'Aids to Trade: Banking, Insurance & Transport', outcomes: ['Explain commercial banking services, mobile money and central bank monetary policy', 'Apply insurance principles (insurable interest, utmost good faith, indemnity, subrogation)', 'Evaluate road, rail, air and pipeline transport modes based on speed, cost and cargo type'], inquiry_questions: ['How has mobile money (M-Pesa) accelerated financial inclusion in Kenya?', 'Why does the principle of indemnity ensure insurance is not used for speculative profit?'] }
            ]
        }
    ],

    // ── 10. VISUAL ARTS / FINE ARTS ────────────────────────────────
    'fine arts': [
        {
            id: 'ART-S1',
            strand_name: 'Drawing and Painting',
            code: 'ART-DP',
            sub_strands: [
                { id: 'ART-SS1', sub_strand_name: 'Drawing Techniques & Observational Studies', outcomes: ['Apply principles of line, form, shade, texture and one/two-point perspective', 'Produce accurate observational drawings from still life and human figure poses', 'Develop expressive personal drawing styles using charcoal, graphite and ink'], inquiry_questions: ['How does perspective create the illusion of three-dimensional depth on a flat surface?', 'How does shading with cross-hatching and tonal wash communicate volume and light source?'] },
                { id: 'ART-SS2', sub_strand_name: 'Painting & Color Theory', outcomes: ['Apply color harmony, complementary contrasts and color psychology in compositions', 'Use acrylic, watercolor and oil media employing wet-on-wet and impasto techniques', 'Create original paintings expressing contemporary social, environmental and cultural themes'], inquiry_questions: ['How do painters use warm and cool color palettes to evoke specific moods?', 'How does abstract painting communicate ideas beyond photographic realism?'] }
            ]
        },
        {
            id: 'ART-S2',
            strand_name: 'Graphic Design & Applied Arts',
            code: 'ART-GD',
            sub_strands: [
                { id: 'ART-SS3', sub_strand_name: 'Graphic Design, Typography & Branding', outcomes: ['Design corporate logos, posters, book covers and packaging mockups', 'Apply layout principles, visual hierarchy and readable typography', 'Utilize manual and digital vector tools in branding projects'], inquiry_questions: ['What makes an advertising poster visually memorable and persuasive?', 'How does brand identity packaging communicate product value to consumers?'] },
                { id: 'ART-SS4', sub_strand_name: 'Fabric, Textile & Craft Design', outcomes: ['Produce decorative textiles using tie & dye, batik and silk-screen printing', 'Create woven, macramé and beadwork crafts from indigenous and recycled materials', 'Market and exhibit crafted decorative and utilitarian items'], inquiry_questions: ['How can traditional Kenyan craft motifs be integrated into modern textile fashion?', 'What eco-friendly methods exist for creating natural dyes from local plants?'] }
            ]
        },
        {
            id: 'ART-S3',
            strand_name: 'Sculpture, 3D Art & Art History',
            code: 'ART-S3D',
            sub_strands: [
                { id: 'ART-SS5', sub_strand_name: 'Sculpture & Three-Dimensional Construction', outcomes: ['Model 3D sculptural forms using clay, papier-mâché and wire armature', 'Carve relief and free-standing sculptures from soft stone and wood', 'Construct assemblage sculptures from found scrap and recycled materials'], inquiry_questions: ['How does negative space interact with mass and form in 3D sculpture?', 'How can public sculptures commemorate local history and collective memory?'] },
                { id: 'ART-SS6', sub_strand_name: 'Art History & Cultural Heritage', outcomes: ['Trace the development of Kenyan and African traditional and contemporary art', 'Compare artistic traditions across African cultures and global art movements', 'Critique works of art using formal visual analysis criteria'], inquiry_questions: ['What was the sacred and social role of traditional masks and body adornment in Africa?', 'How have contemporary African artists influenced the international art market?'] }
            ]
        }
    ],

    // ── 11. HISTORY & CITIZENSHIP / HISTORY & GOVT ─────────────────
    'history': [
        {
            id: 'HIS-S1',
            strand_name: 'Kenyan History & Culture',
            code: 'HIS-KH',
            sub_strands: [
                { id: 'HIS-SS1', sub_strand_name: 'Pre-Colonial Kenya & Migration Patterns', outcomes: ['Explain origin, migration and settlement of Bantu, Nilotic and Cushitic communities', 'Analyse social, economic and political structures of traditional Kenyan societies', 'Examine traditional trade networks and inter-community interactions'], inquiry_questions: ['How did migration and trade foster cultural integration among pre-colonial Kenyans?', 'What indigenous governance systems maintained peace before colonial rule?'] },
                { id: 'HIS-SS2', sub_strand_name: 'Colonial Era & Struggle for Independence', outcomes: ['Explain reasons for British colonization and African resistance (Nandi, Agiriama, Bukusu)', 'Analyse the impact of colonial land alienation, taxation and forced labor', 'Evaluate the role of early political associations, trade unions and the Mau Mau in achieving independence'], inquiry_questions: ['How did colonial policies disrupt traditional African land tenure and economy?', 'What sacrifices and strategies enabled freedom fighters to attain Kenya independence in 1963?'] }
            ]
        },
        {
            id: 'HIS-S2',
            strand_name: 'African History & Global Relations',
            code: 'HIS-AGR',
            sub_strands: [
                { id: 'HIS-SS3', sub_strand_name: 'African Civilizations & Pan-Africanism', outcomes: ['Analyse political organization and economic prosperity of ancient African kingdoms (Ghana, Mali, Songhai)', 'Explain the transatlantic and Indian Ocean slave trade and their devastating impacts', 'Trace the Pan-African movement and its contribution to continental liberation and the African Union'], inquiry_questions: ['How does knowledge of pre-colonial African empires debunk colonial historical biases?', 'What are the contemporary achievements and challenges of Pan-African unity?'] },
                { id: 'HIS-SS4', sub_strand_name: 'World Wars & International Organizations', outcomes: ['Examine causes and consequences of World War I and World War II on Africa', 'Explain the structure and peacekeeping role of the United Nations (UN) and Commonwealth', 'Analyse the Cold War and the Non-Aligned Movement in global geopolitics'], inquiry_questions: ['Why were thousands of African soldiers conscripted to fight in European world wars?', 'How effective is the United Nations Security Council in preventing contemporary armed conflicts?'] }
            ]
        },
        {
            id: 'HIS-S3',
            strand_name: 'Citizenship, Governance & Constitution',
            code: 'HIS-CGC',
            sub_strands: [
                { id: 'HIS-SS5', sub_strand_name: 'National Values, Human Rights & Citizenship', outcomes: ['Define rights, responsibilities and duties of Kenyan citizens under Chapter Four (Bill of Rights)', 'Promote national cohesion, patriotism, integrity and non-discrimination', 'Participate actively in civic decision-making and community service'], inquiry_questions: ['How does citizen participation in public hearings ensure accountable governance?', 'What balances exist between fundamental individual rights and public security?'] },
                { id: 'HIS-SS6', sub_strand_name: 'The Constitution & Devolution in Kenya', outcomes: ['Analyse the structure and constitutional functions of the Executive, Legislature and Judiciary', 'Explain the objectives and challenges of devolved county government under the 2010 Constitution', 'Evaluate the electoral process, independent commissions and anti-corruption mechanisms in Kenya'], inquiry_questions: ['How does the separation of powers prevent authoritarian abuse in government?', 'How has devolution decentralized economic development and healthcare services to rural counties?'] }
            ]
        }
    ],

    // ── 12. GEOGRAPHY ──────────────────────────────────────────────
    'geography': [
        {
            id: 'GEO-S1',
            strand_name: 'Physical Geography & Geomorphology',
            code: 'GEO-PG',
            sub_strands: [
                { id: 'GEO-SS1', sub_strand_name: 'The Earth, Rocks & Earth Movements', outcomes: ['Explain the origin of the solar system, earth rotation, revolution and seasons', 'Classify igneous, sedimentary and metamorphic rocks and their economic significance', 'Analyse folding, faulting and vulcanicity in the formation of the Great Rift Valley'], inquiry_questions: ['How do plate tectonic movements cause devastating earthquakes and tsunamis?', 'How does the East African Rift System influence regional geothermal power generation?'] },
                { id: 'GEO-SS2', sub_strand_name: 'Weathering, Mass Wasting & River Systems', outcomes: ['Differentiate between physical, chemical and biological weathering processes', 'Explain factors causing landslides and mudflows in mountainous Kenyan counties', 'Trace the profile and landforms of a river from youthful stage to delta formation'], inquiry_questions: ['How does deforestation accelerate destructive slope failure and landslides?', 'How do river catchment management practices protect hydroelectric dams from siltation?'] }
            ]
        },
        {
            id: 'GEO-S2',
            strand_name: 'Weather, Climate & Environmental Management',
            code: 'GEO-WCE',
            sub_strands: [
                { id: 'GEO-SS3', sub_strand_name: 'Weather Elements & Climatic Regions of Kenya', outcomes: ['Measure and record atmospheric temperature, rainfall, pressure and humidity using weather instruments', 'Explain factors influencing climate: latitude, altitude, relief and ocean currents', 'Examine the causes, impacts and adaptation strategies for global climate change and desertification'], inquiry_questions: ['How do automatic weather stations enhance agricultural planting advisories?', 'Why are arid and semi-arid lands (ASALs) in Kenya disproportionately affected by climate variability?'] },
                { id: 'GEO-SS4', sub_strand_name: 'Forestry, Wildlife & Eco-Tourism', outcomes: ['Classify natural and plantation forests and their conservation measures in Kenya', 'Explain economic significance and human-wildlife conflict mitigation in national parks and reserves', 'Design community-based eco-tourism initiatives that protect wildlife biodiversity'], inquiry_questions: ['How can Kenya balance forest conservation with the demand for timber and agricultural land?', 'What strategies effectively curb illegal poaching and habitat encroachment?'] }
            ]
        },
        {
            id: 'GEO-S3',
            strand_name: 'Human & Economic Geography',
            code: 'GEO-HEG',
            sub_strands: [
                { id: 'GEO-SS5', sub_strand_name: 'Agriculture, Mining & Energy Resources', outcomes: ['Compare tea, coffee, sugarcane and dairy farming in Kenya with agricultural systems in other countries', 'Explain distribution and extraction methods of trona (Lake Magadi), titanium and oil in Kenya', 'Evaluate renewable energy sources: geothermal, hydro, wind and solar power generation'], inquiry_questions: ['How has Kenya emerged as a global leader in geothermal energy development?', 'What environmental rehabilitation must accompany open-cast mineral mining?'] },
                { id: 'GEO-SS6', sub_strand_name: 'Map Reading & Fieldwork Techniques', outcomes: ['Calculate scale, distances, gradient and cross-sections on 1:50,000 topographical maps', 'Identify human and physical features on maps using conventional symbols and six-figure grid references', 'Conduct physical and socio-economic geographic fieldwork and compile structured reports'], inquiry_questions: ['How do GIS and satellite imagery enhance contemporary land-use planning?', 'Why is direct field observation indispensable in geographic research?'] }
            ]
        }
    ],

    // ── 13. RELIGIOUS EDUCATION (CRE) ──────────────────────────────
    'religious education': [
        {
            id: 'CRE-S1',
            strand_name: 'Creation & Old Testament Teachings',
            code: 'CRE-COT',
            sub_strands: [
                { id: 'CRE-SS1', sub_strand_name: 'The Bible & Creation Accounts', outcomes: ['Explain the biblical accounts of creation in Genesis and human responsibility towards the environment', 'Discuss the origin and consequences of sin and alienation from God', 'Compare biblical creation with traditional African myths of origin'], inquiry_questions: ['How does human stewardship over creation inspire environmental conservation today?', 'What moral lessons emerge from the fall of man in Genesis?'] },
                { id: 'CRE-SS2', sub_strand_name: 'Covenant, Faith of Abraham & Prophets', outcomes: ['Trace the covenant between God and Abraham and its importance to Christian faith', 'Examine the leadership and prophetic role of Moses, Elijah, Amos and Jeremiah', 'Apply prophetic teachings on social justice, honesty and care for the needy in modern society'], inquiry_questions: ['Why did prophets like Amos vehemently condemn corruption and false worship?', 'How does Abrahamic faith inspire resilience in times of personal crisis?'] }
            ]
        },
        {
            id: 'CRE-S2',
            strand_name: 'The Life & Ministry of Jesus Christ',
            code: 'CRE-LMJ',
            sub_strands: [
                { id: 'CRE-SS3', sub_strand_name: 'Early Life & Galilean Ministry of Jesus', outcomes: ['Describe the annunciation, birth and early life of Jesus Christ in Luke gospel', 'Explain the baptism and temptation of Jesus and their theological significance', 'Analyse the miracles and parables of Jesus concerning the Kingdom of God'], inquiry_questions: ['How did Jesus parables challenge conventional social hierarchies and hypocrisy?', 'What values of compassion and service did Jesus demonstrate in his healing miracles?'] },
                { id: 'CRE-SS4', sub_strand_name: 'The Passion, Resurrection & The Early Church', outcomes: ['Narrate the events of the Last Supper, trial, crucifixion and resurrection of Jesus', 'Explain the descent of the Holy Spirit on Pentecost and unity in the early Christian community', 'Demonstrate fruits and gifts of the Holy Spirit in personal and community living'], inquiry_questions: ['How did the resurrection of Christ transform the fearful disciples into bold apostles?', 'How does the early church model of sharing resources inspire modern philanthropy?'] }
            ]
        },
        {
            id: 'CRE-S3',
            strand_name: 'Christian Approaches to Contemporary Issues',
            code: 'CRE-CACI',
            sub_strands: [
                { id: 'CRE-SS5', sub_strand_name: 'Christian Ethics on Family, Marriage & Youth', outcomes: ['Explain biblical teachings on sacredness of marriage, family and human sexuality', 'Examine causes and Christian solutions to marital breakdown, domestic violence and teenage pregnancy', 'Cultivate self-discipline, integrity and peer resistance among young people'], inquiry_questions: ['How can Christian values guide young people through peer pressure and social media influence?', 'What support systems does the church provide for struggling families?'] },
                { id: 'CRE-SS6', sub_strand_name: 'Social Justice, Wealth & Good Governance', outcomes: ['Apply Christian principles to wealth acquisition, honest labor, taxation and fair wages', 'Evaluate Christian approaches to law, order, human rights, peace and conflict resolution', 'Participate actively in combating social vices: tribalism, corruption and substance abuse'], inquiry_questions: ['What does the Bible teach about the ethical obligations of wealthy individuals to the poor?', 'How can Christians act as the salt and light of integrity in public service?'] }
            ]
        }
    ]
};

// ════════════════════════════════════════════════════════════
// HELPER: Match subject name to KICD strands catalog
// ════════════════════════════════════════════════════════════
export function getKICDStrandsForSubject(subjectName: string): KICDStrand[] {
    if (!subjectName) return [];
    const norm = subjectName.toLowerCase().trim();

    // Direct and fuzzy matching
    if (norm.includes('agri') || norm.includes('nutrition')) {
        return KICD_SUBJECT_STRANDS['agriculture'];
    }
    if (norm.includes('math')) {
        return KICD_SUBJECT_STRANDS['mathematics'];
    }
    if (norm.includes('eng') || norm.includes('literature')) {
        return KICD_SUBJECT_STRANDS['english'];
    }
    if (norm.includes('kisw') || norm.includes('fasihi')) {
        return KICD_SUBJECT_STRANDS['kiswahili'];
    }
    if (norm.includes('bio')) {
        return KICD_SUBJECT_STRANDS['biology'];
    }
    if (norm.includes('chem')) {
        return KICD_SUBJECT_STRANDS['chemistry'];
    }
    if (norm.includes('phys')) {
        return KICD_SUBJECT_STRANDS['physics'];
    }
    if (norm.includes('comp') || norm.includes('ict') || norm.includes('tech')) {
        return KICD_SUBJECT_STRANDS['computer studies'];
    }
    if (norm.includes('bus') || norm.includes('econ') || norm.includes('commerce')) {
        return KICD_SUBJECT_STRANDS['business studies'];
    }
    if (norm.includes('art') || norm.includes('craft') || norm.includes('design')) {
        return KICD_SUBJECT_STRANDS['fine arts'];
    }
    if (norm.includes('hist') || norm.includes('citizen') || norm.includes('gov')) {
        return KICD_SUBJECT_STRANDS['history'];
    }
    if (norm.includes('geo') || norm.includes('environment')) {
        return KICD_SUBJECT_STRANDS['geography'];
    }
    if (norm.includes('relig') || norm.includes('cre') || norm.includes('ire') || norm.includes('hre') || norm.includes('christian')) {
        return KICD_SUBJECT_STRANDS['religious education'];
    }

    // Default fallback: return Agriculture if nothing matched, or generic
    return KICD_SUBJECT_STRANDS['agriculture'];
}
