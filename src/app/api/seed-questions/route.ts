import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';


const SEED_QUESTIONS = [
  // ===== MATHEMATICS =====
  {q:"Solve the quadratic equation: 2x² - 5x - 3 = 0",type:"calculation",diff:"medium",marks:4,ans:"x = 3 or x = -½",exp:"Using factorization: (2x+1)(x-3)=0",ms:"Factor correctly (1mk), solve 2x+1=0 → x=-½ (1mk), solve x-3=0 → x=3 (1mk), both solutions (1mk)",bl:"apply",sub:"Mathematics",steps:"2x²-5x-3=0 → (2x+1)(x-3)=0 → x=-1/2 or x=3"},
  {q:"Find the gradient of the line passing through points A(2,3) and B(6,11)",type:"short_answer",diff:"easy",marks:2,ans:"Gradient = 2",exp:"gradient = (y2-y1)/(x2-x1) = (11-3)/(6-2) = 8/4 = 2",ms:"Correct formula (1mk), correct answer (1mk)",bl:"apply",sub:"Mathematics"},
  {q:"A Kenyan farmer has a rectangular plot of land with perimeter 120m. If the length is twice the width, find the area of the plot.",type:"calculation",diff:"medium",marks:5,ans:"Area = 800 m²",exp:"Let width=w, length=2w. 2(2w+w)=120, 6w=120, w=20m, l=40m. Area=20×40=800m²",ms:"Let statement (1mk), perimeter equation (1mk), solve w=20 (1mk), l=40 (1mk), area=800m² (1mk)",bl:"apply",sub:"Mathematics",steps:"Let width=w, length=2w\n2(2w+w)=120\n6w=120\nw=20m, l=40m\nArea=20×40=800m²"},
  {q:"Simplify: (3x²y³)² ÷ (9x³y²)",type:"calculation",diff:"medium",marks:3,ans:"x·y⁴",exp:"(9x⁴y⁶)÷(9x³y²) = x^(4-3)·y^(6-2) = xy⁴",ms:"Expand numerator correctly (1mk), apply index laws (1mk), simplified answer (1mk)",bl:"apply",sub:"Mathematics"},
  {q:"The interior angle of a regular polygon is 156°. Find the number of sides.",type:"calculation",diff:"hard",marks:3,ans:"15 sides",exp:"Exterior angle = 180-156 = 24°. Number of sides = 360/24 = 15",ms:"Exterior angle = 24° (1mk), formula 360/n (1mk), n=15 (1mk)",bl:"apply",sub:"Mathematics"},
  {q:"A matatu from Nairobi to Mombasa covers 480 km in 6 hours. It then returns at 100 km/h. Calculate the average speed for the whole journey.",type:"calculation",diff:"hard",marks:4,ans:"88.9 km/h",exp:"Speed to Mombasa=80km/h. Time return=480/100=4.8hrs. Total=960km, Total time=10.8hrs. Avg=960/10.8=88.9km/h",ms:"Speed going (1mk), time returning (1mk), total distance & time (1mk), average speed (1mk)",bl:"analyze",sub:"Mathematics"},
  {q:"Given that sin θ = 3/5 and θ is acute, find the value of cos θ and tan θ.",type:"calculation",diff:"medium",marks:4,ans:"cos θ = 4/5, tan θ = 3/4",exp:"Using Pythagoras: adj = √(25-9) = 4. cos θ = 4/5, tan θ = 3/4",ms:"Finding adjacent side (1mk), cos θ (1mk), tan θ (1mk), all correct (1mk)",bl:"apply",sub:"Mathematics"},
  {q:"A shopkeeper in Nakuru bought goods for KES 4,000 and sold them at a profit of 25%. Calculate the selling price.",type:"short_answer",diff:"easy",marks:2,ans:"KES 5,000",exp:"Profit = 25% of 4000 = 1000. SP = 4000 + 1000 = 5000",ms:"Profit amount (1mk), selling price (1mk)",bl:"apply",sub:"Mathematics"},
  {q:"Which of the following is the value of 2³ × 3²?\nA) 36  B) 72  C) 54  D) 48",type:"multiple_choice",diff:"easy",marks:1,ans:"B) 72",exp:"2³=8, 3²=9, 8×9=72",ms:"Award 1 mark for correct answer B",bl:"remember",sub:"Mathematics",opts:[{key:"A",value:"36"},{key:"B",value:"72"},{key:"C",value:"54"},{key:"D",value:"48"}]},
  {q:"Make x the subject of the formula: y = (ax+b)/(cx-d)",type:"calculation",diff:"hard",marks:4,ans:"x = (yd+b)/(yc-a)",exp:"y(cx-d)=ax+b → ycx-yd=ax+b → ycx-ax=yd+b → x(yc-a)=yd+b → x=(yd+b)/(yc-a)",ms:"Cross multiply (1mk), collect x terms (1mk), factor out x (1mk), final answer (1mk)",bl:"apply",sub:"Mathematics"},
  // ===== ENGLISH =====
  {q:"Read the passage and answer: 'The sun set behind Mount Kenya, casting long shadows across the tea plantations of Kericho.' What literary device is used in this sentence?",type:"short_answer",diff:"easy",marks:2,ans:"Imagery (visual imagery/personification of shadows)",exp:"The author creates a visual picture using descriptive language about the sunset and shadows",ms:"Identify imagery (1mk), explain how it works (1mk)",bl:"analyze",sub:"English"},
  {q:"Write a composition of about 250 words on: 'The day I learned an important lesson about honesty.'",type:"essay",diff:"medium",marks:20,ans:"Creative writing piece with introduction, body (narrating the experience), and conclusion with the lesson learned",exp:"Students should demonstrate narrative skills, proper grammar, and moral reflection",ms:"Introduction (3mk), content/plot development (8mk), language & grammar (5mk), conclusion with lesson (4mk)",bl:"create",sub:"English"},
  {q:"Identify the figure of speech: 'The wind howled through the empty corridors of the abandoned school.'",type:"short_answer",diff:"easy",marks:2,ans:"Personification",exp:"The wind is given the human quality of howling",ms:"Correct identification (1mk), brief explanation (1mk)",bl:"understand",sub:"English"},
  {q:"Rewrite the sentence in passive voice: 'The students cleaned the classroom thoroughly.'",type:"short_answer",diff:"easy",marks:2,ans:"The classroom was cleaned thoroughly by the students.",exp:"Subject and object switch positions; verb changes to past participle with 'was'",ms:"Correct passive construction (1mk), correct word order (1mk)",bl:"apply",sub:"English"},
  // ===== KISWAHILI =====
  {q:"Eleza maana ya methali: 'Haraka haraka haina baraka'",type:"short_answer",diff:"easy",marks:3,ans:"Kufanya mambo kwa haraka hakuna faida; ni vizuri kufanya mambo kwa utulivu na umakini",exp:"Methali hii inafundisha kuwa uvumilivu na subira huleta matokeo mazuri",ms:"Maana sahihi (2mk), mfano wa matumizi (1mk)",bl:"understand",sub:"Kiswahili"},
  {q:"Andika sentensi ifuatayo katika wakati ujao: 'Wanafunzi wanasoma vitabu vya Kiswahili.'",type:"short_answer",diff:"easy",marks:2,ans:"Wanafunzi watasoma vitabu vya Kiswahili.",exp:"Wakati ujao unatumia kiambishi 'ta' badala ya 'na'",ms:"Kiambishi sahihi (1mk), sentensi sahihi (1mk)",bl:"apply",sub:"Kiswahili"},
  // ===== BIOLOGY =====
  {q:"Describe the process of photosynthesis and write the balanced chemical equation.",type:"short_answer",diff:"medium",marks:5,ans:"6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (in the presence of light energy and chlorophyll)",exp:"Green plants use light energy to convert carbon dioxide and water into glucose and oxygen",ms:"Correct equation (2mk), role of chlorophyll (1mk), role of light (1mk), products (1mk)",bl:"understand",sub:"Biology"},
  {q:"State three differences between arteries and veins.",type:"short_answer",diff:"easy",marks:3,ans:"1. Arteries have thick muscular walls; veins have thin walls. 2. Arteries carry blood away from heart; veins carry blood to heart. 3. Arteries have no valves (except aortic); veins have valves.",exp:"Structural and functional differences between the two types of blood vessels",ms:"1 mark for each correct difference (3mk total)",bl:"remember",sub:"Biology"},
  {q:"Explain the role of enzymes in digestion. Give two examples of digestive enzymes and their functions.",type:"short_answer",diff:"medium",marks:5,ans:"Enzymes are biological catalysts that speed up chemical reactions. Amylase breaks down starch to maltose. Pepsin breaks down proteins to peptides.",exp:"Enzymes lower activation energy and are specific to substrates (lock and key model)",ms:"Definition of enzymes (1mk), role in digestion (1mk), example 1 with function (1.5mk), example 2 with function (1.5mk)",bl:"understand",sub:"Biology"},
  {q:"Which of the following is NOT a function of the liver?\nA) Bile production  B) Blood sugar regulation  C) Pumping blood  D) Detoxification",type:"multiple_choice",diff:"easy",marks:1,ans:"C) Pumping blood",exp:"Pumping blood is the function of the heart, not the liver",ms:"Award 1 mark for correct answer C",bl:"remember",sub:"Biology",opts:[{key:"A",value:"Bile production"},{key:"B",value:"Blood sugar regulation"},{key:"C",value:"Pumping blood"},{key:"D",value:"Detoxification"}]},
  // ===== CHEMISTRY =====
  {q:"Balance the following chemical equation: Fe + HCl → FeCl₂ + H₂",type:"short_answer",diff:"easy",marks:2,ans:"Fe + 2HCl → FeCl₂ + H₂",exp:"One iron atom reacts with two molecules of hydrochloric acid",ms:"Correct balancing (1mk), correct products (1mk)",bl:"apply",sub:"Chemistry"},
  {q:"Describe a laboratory test to distinguish between an acid and a base using litmus paper.",type:"short_answer",diff:"easy",marks:3,ans:"Dip blue litmus in the solution: if it turns red, it's acidic. Dip red litmus: if it turns blue, it's basic. If neither changes, it's neutral.",exp:"Litmus paper is an indicator that changes color depending on pH",ms:"Acid test (1mk), base test (1mk), neutral explanation (1mk)",bl:"understand",sub:"Chemistry"},
  {q:"Calculate the relative molecular mass of calcium carbonate (CaCO₃). (Ca=40, C=12, O=16)",type:"calculation",diff:"easy",marks:2,ans:"100",exp:"Ca(40) + C(12) + 3×O(16) = 40+12+48 = 100",ms:"Correct calculation (1mk), correct answer with units (1mk)",bl:"apply",sub:"Chemistry"},
  // ===== PHYSICS =====
  {q:"A car accelerates uniformly from rest to 20 m/s in 5 seconds. Calculate: (a) the acceleration (b) the distance covered",type:"calculation",diff:"medium",marks:4,ans:"(a) 4 m/s² (b) 50 m",exp:"a = (v-u)/t = (20-0)/5 = 4 m/s². s = ut + ½at² = 0 + ½(4)(25) = 50m",ms:"Acceleration formula (1mk), a=4m/s² (1mk), distance formula (1mk), s=50m (1mk)",bl:"apply",sub:"Physics",steps:"a = (v-u)/t = (20-0)/5 = 4 m/s²\ns = ut + ½at² = 0 + ½(4)(5²) = 50m"},
  {q:"State Ohm's Law and use it to calculate the current flowing through a 10Ω resistor connected to a 12V battery.",type:"calculation",diff:"easy",marks:3,ans:"Ohm's Law: V=IR. Current I = V/R = 12/10 = 1.2A",exp:"Ohm's law states that current is directly proportional to voltage and inversely proportional to resistance",ms:"State Ohm's Law (1mk), correct substitution (1mk), I=1.2A (1mk)",bl:"apply",sub:"Physics"},
  {q:"Explain why a thick glass tumbler cracks when hot water is poured into it.",type:"short_answer",diff:"medium",marks:3,ans:"The inner surface expands rapidly due to heat while the outer surface remains cool. This uneven expansion creates stress, causing the glass to crack.",exp:"Glass is a poor conductor of heat, so heat doesn't distribute evenly",ms:"Inner expansion (1mk), outer remains cool (1mk), stress/cracking explanation (1mk)",bl:"analyze",sub:"Physics"},
  // ===== HISTORY =====
  {q:"Explain three factors that led to the scramble and partition of Africa in the 19th century.",type:"essay",diff:"medium",marks:6,ans:"1. Industrial Revolution created need for raw materials and markets. 2. Nationalism and European rivalry. 3. Missionary activities and 'civilizing mission'. 4. Strategic interests (Suez Canal). 5. Exploration reports about Africa's resources.",exp:"European powers competed to colonize Africa driven by economic, political, and social factors",ms:"3 well-explained factors × 2 marks each. Identification (1mk) + explanation (1mk) per factor",bl:"understand",sub:"History"},
  {q:"Describe the role of Mekatilili wa Menza in the resistance against British colonial rule in Kenya.",type:"essay",diff:"medium",marks:5,ans:"Mekatilili wa Menza was a Giriama woman who led the Giriama resistance against British colonial policies including forced labor, taxation, and land alienation in 1913-1914.",exp:"She mobilized the Giriama people, performed traditional rituals to unite warriors, and was eventually captured and exiled",ms:"Background (1mk), cause of resistance (1mk), her role/actions (2mk), outcome (1mk)",bl:"understand",sub:"History"},
  // ===== GEOGRAPHY =====
  {q:"Explain how the Rift Valley in Kenya was formed.",type:"short_answer",diff:"medium",marks:4,ans:"The Rift Valley was formed by tectonic forces. Tensional forces caused the earth's crust to develop faults. The land between parallel faults sank (downthrow) forming a graben/rift valley, while the sides remained as escarpments.",exp:"The Great Rift Valley extends from Lebanon to Mozambique, passing through Kenya",ms:"Tectonic forces (1mk), faulting (1mk), sinking/graben (1mk), escarpments (1mk)",bl:"understand",sub:"Geography"},
  {q:"Name three types of rainfall and explain how relief rainfall occurs.",type:"short_answer",diff:"medium",marks:5,ans:"Types: Relief (orographic), Convectional, Cyclonic (frontal). Relief rainfall: Moist air hits a mountain, rises, cools, condenses, and precipitates on the windward side. The leeward side receives less rain (rain shadow).",exp:"Relief rainfall is common on the windward side of mountains like Mt. Kenya",ms:"3 types (1mk each=3mk), relief rainfall process (2mk)",bl:"understand",sub:"Geography"},
  // ===== BUSINESS STUDIES =====
  {q:"Explain four functions of the Nairobi Securities Exchange (NSE).",type:"short_answer",diff:"medium",marks:4,ans:"1. Provides a platform for buying/selling shares. 2. Facilitates capital mobilization. 3. Provides investment opportunities. 4. Acts as a barometer of the economy.",exp:"The NSE is Kenya's stock exchange where securities are traded",ms:"1 mark for each well-explained function (4mk)",bl:"understand",sub:"Business Studies"},
  {q:"Calculate the net profit from: Sales KES 500,000; Cost of goods sold KES 300,000; Expenses KES 80,000.",type:"calculation",diff:"easy",marks:3,ans:"Net Profit = KES 120,000",exp:"Gross Profit = 500,000 - 300,000 = 200,000. Net Profit = 200,000 - 80,000 = 120,000",ms:"Gross profit (1mk), deduct expenses (1mk), net profit (1mk)",bl:"apply",sub:"Business Studies"},
  // ===== CRE =====
  {q:"Describe five teachings of Jesus in the Sermon on the Mount (Matthew 5-7).",type:"essay",diff:"medium",marks:10,ans:"1. The Beatitudes (blessed are the poor in spirit). 2. Salt and light of the world. 3. Love your enemies. 4. The Lord's Prayer. 5. Do not judge others. 6. The Golden Rule.",exp:"The Sermon on the Mount is Jesus' most famous teaching, covering ethics and Kingdom values",ms:"Each teaching: identification (1mk) + explanation (1mk) = 2mk × 5 = 10mk",bl:"remember",sub:"CRE"},
  // ===== AGRICULTURE =====
  {q:"Explain five factors that influence the type of farming practiced in Kenya.",type:"essay",diff:"medium",marks:10,ans:"1. Climate (rainfall, temperature). 2. Soil type and fertility. 3. Land tenure system. 4. Capital availability. 5. Market demand. 6. Government policy. 7. Technology.",exp:"Kenya has diverse farming systems from pastoralism in arid areas to intensive horticulture in highlands",ms:"Each factor: identification (1mk) + explanation (1mk) = 2mk × 5 = 10mk",bl:"understand",sub:"Agriculture"},
  {q:"State four advantages of crop rotation in farming.",type:"short_answer",diff:"easy",marks:4,ans:"1. Controls pests and diseases. 2. Maintains soil fertility. 3. Controls weeds. 4. Maximizes use of soil nutrients.",exp:"Crop rotation involves growing different crops in a planned sequence",ms:"1 mark for each advantage (4mk)",bl:"remember",sub:"Agriculture"},
];

const SEED_PAPERS = [
  {title:"KCSE Mathematics Paper 1",sub:"Mathematics",year:2023,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE Mathematics Paper 2",sub:"Mathematics",year:2023,type:"KCSE",paper:2,marks:100,dur:150},
  {title:"KCSE Mathematics Paper 1",sub:"Mathematics",year:2022,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE Mathematics Paper 2",sub:"Mathematics",year:2022,type:"KCSE",paper:2,marks:100,dur:150},
  {title:"KCSE English Paper 1 (Composition)",sub:"English",year:2023,type:"KCSE",paper:1,marks:60,dur:120},
  {title:"KCSE English Paper 2 (Comprehension)",sub:"English",year:2023,type:"KCSE",paper:2,marks:80,dur:150},
  {title:"KCSE English Paper 3 (Literature)",sub:"English",year:2023,type:"KCSE",paper:3,marks:80,dur:150},
  {title:"KCSE Biology Paper 1",sub:"Biology",year:2023,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Biology Paper 2",sub:"Biology",year:2023,type:"KCSE",paper:2,marks:80,dur:120},
  {title:"KCSE Biology Paper 3 (Practical)",sub:"Biology",year:2023,type:"KCSE",paper:3,marks:40,dur:105},
  {title:"KCSE Chemistry Paper 1",sub:"Chemistry",year:2023,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Chemistry Paper 2",sub:"Chemistry",year:2023,type:"KCSE",paper:2,marks:80,dur:120},
  {title:"KCSE Physics Paper 1",sub:"Physics",year:2023,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Physics Paper 2",sub:"Physics",year:2023,type:"KCSE",paper:2,marks:80,dur:120},
  {title:"KCSE Kiswahili Insha",sub:"Kiswahili",year:2023,type:"KCSE",paper:1,marks:60,dur:120},
  {title:"KCSE Kiswahili Lugha",sub:"Kiswahili",year:2023,type:"KCSE",paper:2,marks:80,dur:150},
  {title:"KCSE History Paper 1",sub:"History",year:2023,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE History Paper 2",sub:"History",year:2023,type:"KCSE",paper:2,marks:100,dur:150},
  {title:"KCSE Geography Paper 1",sub:"Geography",year:2023,type:"KCSE",paper:1,marks:75,dur:120},
  {title:"KCSE Geography Paper 2",sub:"Geography",year:2023,type:"KCSE",paper:2,marks:75,dur:120},
  {title:"KCSE Business Studies Paper 1",sub:"Business Studies",year:2023,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE Business Studies Paper 2",sub:"Business Studies",year:2023,type:"KCSE",paper:2,marks:100,dur:150},
  {title:"KCSE CRE Paper 1",sub:"CRE",year:2023,type:"KCSE",paper:1,marks:80,dur:150},
  {title:"KCSE CRE Paper 2",sub:"CRE",year:2023,type:"KCSE",paper:2,marks:80,dur:150},
  {title:"KCSE Agriculture Paper 1",sub:"Agriculture",year:2023,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE Agriculture Paper 2",sub:"Agriculture",year:2023,type:"KCSE",paper:2,marks:100,dur:150},
  // 2022 papers
  {title:"KCSE Biology Paper 1",sub:"Biology",year:2022,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Chemistry Paper 1",sub:"Chemistry",year:2022,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Physics Paper 1",sub:"Physics",year:2022,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE English Paper 1",sub:"English",year:2022,type:"KCSE",paper:1,marks:60,dur:120},
  // 2021
  {title:"KCSE Mathematics Paper 1",sub:"Mathematics",year:2021,type:"KCSE",paper:1,marks:100,dur:150},
  {title:"KCSE Biology Paper 1",sub:"Biology",year:2021,type:"KCSE",paper:1,marks:80,dur:120},
  {title:"KCSE Chemistry Paper 1",sub:"Chemistry",year:2021,type:"KCSE",paper:1,marks:80,dur:120},
  // Mock papers
  {title:"Alliance High Mock Mathematics Paper 1",sub:"Mathematics",year:2023,type:"Mock",paper:1,marks:100,dur:150},
  {title:"Maranda High Mock Biology Paper 1",sub:"Biology",year:2023,type:"Mock",paper:1,marks:80,dur:120},
  {title:"Kenya High Mock English Paper 2",sub:"English",year:2023,type:"Mock",paper:2,marks:80,dur:150},
];

export async function POST() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  try {
    // Get subjects
    const { data: subjects } = await supabase.from('school_subjects').select('id, subject_name');
    const subMap: Record<string, number> = {};
    (subjects || []).forEach((s: any) => { subMap[s.subject_name] = s.id; });

    // Seed questions
    let qCount = 0;
    for (const sq of SEED_QUESTIONS) {
      const subId = subMap[sq.sub];
      if (!subId) continue;
      // Check if already exists
      const { data: existing } = await supabase.from('school_question_bank').select('id').eq('question_text', sq.q).limit(1);
      if (existing && existing.length > 0) continue;
      
      const payload: any = {
        subject_id: subId, question_text: sq.q, question_type: sq.type,
        difficulty: sq.diff, marks: sq.marks, correct_answer: sq.ans,
        explanation: sq.exp, marking_scheme: sq.ms, blooms_level: sq.bl,
        source: 'seed', is_approved: true, approval_status: 'approved', created_by: 'System Seed',
      };
      if (sq.opts) payload.options = sq.opts;
      if (sq.steps) payload.calculation_steps = sq.steps;
      
      const { error } = await supabase.from('school_question_bank').insert([payload]);
      if (!error) qCount++;
    }

    // Seed past papers
    let pCount = 0;
    for (const sp of SEED_PAPERS) {
      const subId = subMap[sp.sub];
      if (!subId) continue;
      const { data: existing } = await supabase.from('school_past_papers').select('id').eq('title', sp.title).eq('year', sp.year).limit(1);
      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from('school_past_papers').insert([{
        title: sp.title, subject_id: subId, year: sp.year, exam_type: sp.type,
        paper_number: sp.paper, total_marks: sp.marks, duration_minutes: sp.dur,
        uploaded_by: 'System Seed', file_url: '', downloads: 0,
        instructions: `This is a ${sp.type} ${sp.sub} Paper ${sp.paper} (${sp.year}). Total marks: ${sp.marks}. Duration: ${sp.dur} minutes.`,
      }]);
      if (!error) pCount++;
    }

    return NextResponse.json({ success: true, questions: qCount, papers: pCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
