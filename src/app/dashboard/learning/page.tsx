'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiBook, FiPlay, FiX, FiSearch, FiStar, FiAward, FiTrendingUp,
    FiChevronRight, FiExternalLink, FiDownload, FiCheck, FiClock,
    FiYoutube, FiFilter, FiRefreshCw, FiChevronDown, FiTarget,
    FiUsers, FiGrid, FiList, FiZap, FiBarChart2, FiSettings, FiVideo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// DB video type (from learning_videos table)
interface DBVideo { id: string; title: string; youtube_id: string | null; youtube_url: string | null; topic: string; form_level: string; subject_id: string; duration: string; channel: string; }

// ─────────────────────────────────────────────────────────────────────────────
// KICD-ALIGNED CURRICULUM DATA — 15 Subjects, Form 1-4 + CBC
// ─────────────────────────────────────────────────────────────────────────────
const FORMS = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
const CBC_JSS_GRADES = ['Grade 7', 'Grade 8', 'Grade 9'];   // Junior Secondary
const CBC_SSS_GRADES = ['Grade 10', 'Grade 11', 'Grade 12']; // Senior Secondary
const CBC_ALL_GRADES  = [...CBC_JSS_GRADES, ...CBC_SSS_GRADES];

interface Video { id: string; title: string; duration: string; youtubeId: string; channel: string; isVerified?: boolean; }
interface Topic { name: string; videos: Video[]; }
interface SubjectData {
    id: string; name: string; icon: string; color: string;
    gradient: string; category: '8-4-4' | 'CBC' | 'Both';
    description: string;
    topics: Record<string, Topic[]>;
}

const SUBJECTS: SubjectData[] = [
    {
        id: 'mathematics', name: 'Mathematics', icon: '📐', color: '#3b82f6',
        gradient: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
        category: 'Both', description: 'Algebra, Geometry, Statistics, Calculus & more',
        topics: {
            'Form 1': [
                { name: 'Natural Numbers', videos: [
                    { id:'m1-1', title:'Natural Numbers - Introduction & Number Line', duration:'14:22', youtubeId:'vSw0rkk7_IM', channel:'KICD Kenya' },
                    { id:'m1-2', title:'Factors, Multiples & Prime Numbers', duration:'18:05', youtubeId:'Z_yiMjqF8UA', channel:'Math Kenya' },
                ]},
                { name: 'Fractions & Decimals', videos: [
                    { id:'m1-3', title:'Operations on Fractions - Full Lesson', duration:'22:14', youtubeId:'0X8QS5F0_c4', channel:'KICD Kenya' },
                    { id:'m1-4', title:'Converting Fractions to Decimals', duration:'11:30', youtubeId:'pJu1kCaWIJA', channel:'Math Kenya' },
                ]},
                { name: 'Algebraic Expressions', videos: [
                    { id:'m1-5', title:'Introduction to Algebra - Variables & Expressions', duration:'19:45', youtubeId:'NybHckSEQBI', channel:'KICD Kenya' },
                ]},
                { name: 'Linear Equations', videos: [
                    { id:'m1-6', title:'Solving Linear Equations Step by Step', duration:'16:38', youtubeId:'l3XzepN03KQ', channel:'Math Kenya' },
                ]},
                { name: 'Commercial Arithmetic', videos: [
                    { id:'m1-7', title:'Profit, Loss & Percentage - Kenya Form 1', duration:'20:12', youtubeId:'_lfKU5nSfAk', channel:'KICD Kenya' },
                ]},
                { name: 'Geometry - Angles & Polygons', videos: [
                    { id:'m1-8', title:'Angles on a Straight Line & Triangles', duration:'17:55', youtubeId:'0A8f7xhTFxo', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Indices & Logarithms', videos: [
                    { id:'m2-1', title:'Laws of Indices - Form 2 Mathematics', duration:'24:10', youtubeId:'X8jsijhllIA', channel:'KICD Kenya' },
                    { id:'m2-2', title:'Logarithms - Introduction & Applications', duration:'21:33', youtubeId:'zw-madH0tpc', channel:'Math Kenya' },
                ]},
                { name: 'Equations of Straight Lines', videos: [
                    { id:'m2-3', title:'Gradient and Equations of Straight Lines', duration:'18:44', youtubeId:'MXV65i9g1Xg', channel:'KICD Kenya' },
                ]},
                { name: 'Quadratic Expressions', videos: [
                    { id:'m2-4', title:'Factorising Quadratic Expressions', duration:'22:08', youtubeId:'eF6zYNzlZKQ', channel:'Math Kenya' },
                ]},
                { name: 'Trigonometry', videos: [
                    { id:'m2-5', title:'Sine, Cosine & Tangent - Right Triangles', duration:'19:27', youtubeId:'g0pu4nRkZOI', channel:'KICD Kenya' },
                ]},
                { name: 'Vectors', videos: [
                    { id:'m2-6', title:'Vectors - Introduction and Operations', duration:'23:15', youtubeId:'fNk_zzaMoSs', channel:'Math Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Quadratic Equations & Inequalities', videos: [
                    { id:'m3-1', title:'Solving Quadratic Equations - 3 Methods', duration:'25:42', youtubeId:'2ZzuZvz33X0', channel:'KICD Kenya' },
                ]},
                { name: 'Matrices', videos: [
                    { id:'m3-2', title:'Matrices - Operations and Determinants', duration:'28:15', youtubeId:'rowWM-MijXU', channel:'KICD Kenya' },
                ]},
                { name: 'Sequence & Series', videos: [
                    { id:'m3-3', title:'AP and GP - Arithmetic & Geometric Progressions', duration:'22:50', youtubeId:'pXo0bG4iAyg', channel:'Math Kenya' },
                ]},
                { name: 'Probability', videos: [
                    { id:'m3-4', title:'Probability - Sample Space and Events', duration:'20:18', youtubeId:'uzkc-qNVoOk', channel:'KICD Kenya' },
                ]},
                { name: 'Differentiation', videos: [
                    { id:'m3-5', title:'Introduction to Differentiation & Calculus', duration:'31:22', youtubeId:'5yfh5cf4-0Y', channel:'Math Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'Integration', videos: [
                    { id:'m4-1', title:'Integration - Anti-differentiation & Applications', duration:'27:44', youtubeId:'rfG8ce4nNh0', channel:'KICD Kenya' },
                ]},
                { name: 'KCSE Revision - Paper 1', videos: [
                    { id:'m4-2', title:'KCSE Mathematics Paper 1 - Full Revision', duration:'58:30', youtubeId:'tHYis-DP0oQ', channel:'KCSE Kenya' },
                ]},
                { name: 'KCSE Revision - Paper 2', videos: [
                    { id:'m4-3', title:'KCSE Mathematics Paper 2 - Full Revision', duration:'62:15', youtubeId:'8vV3KeT0ymo', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'english', name: 'English', icon: '📖', color: '#8b5cf6',
        gradient: 'linear-gradient(135deg,#6d28d9,#8b5cf6)',
        category: 'Both', description: 'Comprehension, Grammar, Writing & Literature',
        topics: {
            'Form 1': [
                { name: 'Parts of Speech', videos: [
                    { id:'e1-1', title:'Parts of Speech - Nouns, Verbs, Adjectives', duration:'16:20', youtubeId:'rNSzCkxCMuE', channel:'KICD Kenya' },
                ]},
                { name: 'Comprehension Skills', videos: [
                    { id:'e1-2', title:'Reading Comprehension Strategies', duration:'14:45', youtubeId:'tFhUPsRhIBk', channel:'English Kenya' },
                ]},
                { name: 'Essay Writing', videos: [
                    { id:'e1-3', title:'Composition Writing - Form 1 Kenya', duration:'18:30', youtubeId:'1J6XMqeKSr8', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Oral Skills', videos: [
                    { id:'e2-1', title:'Oral Skills - Listening & Speaking', duration:'15:22', youtubeId:'8Gv0H-vPoDc', channel:'KICD Kenya' },
                ]},
                { name: 'Tenses & Grammar', videos: [
                    { id:'e2-2', title:'English Tenses - Past, Present, Future', duration:'20:15', youtubeId:'8e3S5z6XKRU', channel:'English Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Literature - Set Texts', videos: [
                    { id:'e3-1', title:'A Doll\'s House - Analysis & Themes', duration:'25:40', youtubeId:'8kXJ9hVQkGI', channel:'KICD Kenya' },
                ]},
                { name: 'Summary Writing', videos: [
                    { id:'e3-2', title:'Summary Writing - Techniques & Practice', duration:'17:28', youtubeId:'lzYydisXdNw', channel:'English Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'e4-1', title:'KCSE English - Paper 1 & 2 Full Revision', duration:'45:15', youtubeId:'8Z8KtB2FrDY', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'biology', name: 'Biology', icon: '🧬', color: '#10b981',
        gradient: 'linear-gradient(135deg,#065f46,#10b981)',
        category: '8-4-4', description: 'Cell biology, Ecology, Genetics & Human physiology',
        topics: {
            'Form 1': [
                { name: 'Introduction to Biology', videos: [
                    { id:'b1-1', title:'Biology Form 1 - Introduction, Equipment & Safety', duration:'20:15', youtubeId:'9RpbcDMsYoA', channel:'KICD Kenya' },
                    { id:'b1-2', title:'The Microscope - Parts and Usage', duration:'15:30', youtubeId:'bHDyFHfXRcI', channel:'Bio Kenya' },
                ]},
                { name: 'Cell Biology', videos: [
                    { id:'b1-3', title:'Plant vs Animal Cells - Full Comparison', duration:'22:44', youtubeId:'URUJD5NEXC8', channel:'KICD Kenya' },
                    { id:'b1-4', title:'Diffusion, Osmosis and Active Transport', duration:'24:18', youtubeId:'aubZU0iWtgI', channel:'Bio Kenya' },
                ]},
                { name: 'Nutrition', videos: [
                    { id:'b1-5', title:'Nutrition in Plants - Photosynthesis', duration:'26:35', youtubeId:'DXOQ2rHqIzI', channel:'KICD Kenya' },
                ]},
                { name: 'Ecology', videos: [
                    { id:'b1-6', title:'Ecology - Food Chains and Food Webs', duration:'18:22', youtubeId:'v5tbOmPdVNs', channel:'Bio Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Transport in Plants', videos: [
                    { id:'b2-1', title:'Transpiration and Water Transport in Plants', duration:'21:18', youtubeId:'8FuNMWGJFbA', channel:'KICD Kenya' },
                ]},
                { name: 'Respiration', videos: [
                    { id:'b2-2', title:'Aerobic and Anaerobic Respiration', duration:'19:55', youtubeId:'AqDiTBAs2AQ', channel:'Bio Kenya' },
                ]},
                { name: 'Excretion', videos: [
                    { id:'b2-3', title:'Excretion - The Kidney and Nephron', duration:'23:40', youtubeId:'2wYcOUBTaXM', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Genetics', videos: [
                    { id:'b3-1', title:'Genetics - DNA, Genes and Chromosomes', duration:'28:15', youtubeId:'AhsIF-wZVZs', channel:'KICD Kenya' },
                    { id:'b3-2', title:'Mendel\'s Laws of Inheritance', duration:'25:42', youtubeId:'Mehz7tCxjSE', channel:'Bio Kenya' },
                ]},
                { name: 'Evolution', videos: [
                    { id:'b3-3', title:'Evolution and Natural Selection', duration:'22:30', youtubeId:'0SCjhI86grU', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'b4-1', title:'KCSE Biology - Paper 1 Revision (MCQ)', duration:'40:00', youtubeId:'1sHKIWBTlDE', channel:'KCSE Kenya' },
                    { id:'b4-2', title:'KCSE Biology Practicals - Full Guide', duration:'35:18', youtubeId:'qGJyKEiAzqE', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'chemistry', name: 'Chemistry', icon: '⚗️', color: '#f59e0b',
        gradient: 'linear-gradient(135deg,#b45309,#f59e0b)',
        category: '8-4-4', description: 'Acids, Bases, Organic Chemistry & Lab Practicals',
        topics: {
            'Form 1': [
                { name: 'Introduction to Chemistry', videos: [
                    { id:'c1-1', title:'Lab Safety and Basic Chemistry Equipment', duration:'16:22', youtubeId:'gGGFSBHW3lM', channel:'KICD Kenya' },
                ]},
                { name: 'Elements & Periodic Table', videos: [
                    { id:'c1-2', title:'The Periodic Table - Groups and Periods', duration:'24:10', youtubeId:'0RRVV4Diomg', channel:'KICD Kenya' },
                ]},
                { name: 'Water', videos: [
                    { id:'c1-3', title:'Water - Properties, Hardness & Purification', duration:'20:45', youtubeId:'B2h0r7JjMls', channel:'Chemistry Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Acids, Bases & Salts', videos: [
                    { id:'c2-1', title:'Acids and Bases - Properties and pH Scale', duration:'22:33', youtubeId:'GE76JX15o_s', channel:'KICD Kenya' },
                    { id:'c2-2', title:'Preparation of Salts - Neutralization', duration:'25:15', youtubeId:'TbCsOEoIBiw', channel:'Chemistry Kenya' },
                ]},
                { name: 'Carbon & Its Compounds', videos: [
                    { id:'c2-3', title:'Carbon - Allotropes and Properties', duration:'19:28', youtubeId:'N1oKTonZzvM', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Organic Chemistry', videos: [
                    { id:'c3-1', title:'Organic Chemistry - Alkanes, Alkenes & Alkynes', duration:'30:15', youtubeId:'bXkPAEIOYzA', channel:'KICD Kenya' },
                ]},
                { name: 'Electrochemistry', videos: [
                    { id:'c3-2', title:'Electrochemistry - Electrolysis & Cells', duration:'27:40', youtubeId:'GCt0JtV1pYQ', channel:'Chemistry Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'c4-1', title:'KCSE Chemistry Paper 1 Revision', duration:'50:22', youtubeId:'VW9apUMRK2E', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'physics', name: 'Physics', icon: '⚡', color: '#06b6d4',
        gradient: 'linear-gradient(135deg,#0e7490,#06b6d4)',
        category: '8-4-4', description: 'Mechanics, Electricity, Waves & Modern Physics',
        topics: {
            'Form 1': [
                { name: 'Introduction to Physics', videos: [
                    { id:'p1-1', title:'Introduction to Physics - Quantities & Units', duration:'17:45', youtubeId:'2kmpTvGXkEs', channel:'KICD Kenya' },
                ]},
                { name: 'Measurement', videos: [
                    { id:'p1-2', title:'Measurement - Length, Mass, Time & Volume', duration:'20:30', youtubeId:'HuFR79AqRSo', channel:'Physics Kenya' },
                ]},
                { name: 'Force', videos: [
                    { id:'p1-3', title:'Forces - Types, Newton\'s Laws', duration:'22:18', youtubeId:'ou9YMWlJgkE', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Electricity', videos: [
                    { id:'p2-1', title:'Electricity - Current, Voltage, Resistance', duration:'25:40', youtubeId:'mc979OhitAg', channel:'KICD Kenya' },
                    { id:'p2-2', title:'Ohm\'s Law and Circuits', duration:'21:15', youtubeId:'wibBfHGXBbo', channel:'Physics Kenya' },
                ]},
                { name: 'Waves', videos: [
                    { id:'p2-3', title:'Waves - Types, Properties and Applications', duration:'23:55', youtubeId:'Rbuhdo0AZDU', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Electrostatics', videos: [
                    { id:'p3-1', title:'Electrostatics - Charge, Electric Field', duration:'24:22', youtubeId:'GjPB4xJzJNM', channel:'KICD Kenya' },
                ]},
                { name: 'Radioactivity', videos: [
                    { id:'p3-2', title:'Radioactivity - Alpha, Beta, Gamma', duration:'26:45', youtubeId:'KnNfenPHBzg', channel:'Physics Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'p4-1', title:'KCSE Physics Paper 1 Full Revision', duration:'55:18', youtubeId:'t3bsKvjf1Q4', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'geography', name: 'Geography', icon: '🌍', color: '#22c55e',
        gradient: 'linear-gradient(135deg,#166534,#22c55e)',
        category: '8-4-4', description: 'Physical, Human & Regional Geography of Kenya & Africa',
        topics: {
            'Form 1': [
                { name: 'Introducing Geography', videos: [
                    { id:'g1-1', title:'What is Geography? Branches & Importance', duration:'14:30', youtubeId:'Q7kS0KBGXJA', channel:'KICD Kenya' },
                ]},
                { name: 'The Earth', videos: [
                    { id:'g1-2', title:'Structure of the Earth & Latitude/Longitude', duration:'18:45', youtubeId:'Ul-yHHYFZeA', channel:'Geo Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Soils', videos: [
                    { id:'g2-1', title:'Soils of Kenya - Formation, Types & Uses', duration:'22:10', youtubeId:'xrNME6hZG_E', channel:'KICD Kenya' },
                ]},
                { name: 'Vegetation', videos: [
                    { id:'g2-2', title:'Natural Vegetation of Africa', duration:'19:35', youtubeId:'h8oBpT3OECQ', channel:'Geo Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Agriculture in Africa', videos: [
                    { id:'g3-1', title:'Agriculture in Africa - Types and Cash Crops', duration:'24:15', youtubeId:'wV6NszFMJgA', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'g4-1', title:'KCSE Geography Paper 1 Revision', duration:'48:22', youtubeId:'e_g32a4qDzs', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'history', name: 'History & Govt', icon: '🏛️', color: '#f97316',
        gradient: 'linear-gradient(135deg,#c2410c,#f97316)',
        category: '8-4-4', description: 'Kenya, African & World History + Government & Civics',
        topics: {
            'Form 1': [
                { name: 'Prehistory of Kenya', videos: [
                    { id:'h1-1', title:'Early Man in Kenya - Rift Valley Origins', duration:'18:20', youtubeId:'j3d-OEWSXGQ', channel:'KICD Kenya' },
                ]},
                { name: 'Kenyan Communities', videos: [
                    { id:'h1-2', title:'Bantu, Nilotic & Cushitic Communities of Kenya', duration:'22:40', youtubeId:'9pMnlpqHGmQ', channel:'History Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Colonial Period', videos: [
                    { id:'h2-1', title:'European Colonization of Africa', duration:'24:15', youtubeId:'vCNKxf2PQGA', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'African Nationalism', videos: [
                    { id:'h3-1', title:'African Nationalism & Independence Movements', duration:'26:30', youtubeId:'xNF6h3RM0qc', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'h4-1', title:'KCSE History - Government & Civics Revision', duration:'42:18', youtubeId:'7LH_eDsLO0E', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'cre', name: 'CRE', icon: '✝️', color: '#a855f7',
        gradient: 'linear-gradient(135deg,#7e22ce,#a855f7)',
        category: '8-4-4', description: 'Christian Religious Education — Old & New Testament',
        topics: {
            'Form 1': [
                { name: 'Creation', videos: [
                    { id:'r1-1', title:'Genesis - Creation Stories and Meaning', duration:'16:45', youtubeId:'yqBPYGUvsBQ', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'The Person of Jesus Christ', videos: [
                    { id:'r2-1', title:'Life and Ministry of Jesus Christ', duration:'20:30', youtubeId:'9zJB0K2HTXA', channel:'CRE Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Christian Ethics', videos: [
                    { id:'r3-1', title:'Christian Ethics - Family & Social Issues', duration:'18:22', youtubeId:'U1bhO1ZtGS0', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'r4-1', title:'KCSE CRE Full Revision', duration:'38:15', youtubeId:'hj88TFTEJkQ', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'agriculture', name: 'Agriculture', icon: '🌾', color: '#84cc16',
        gradient: 'linear-gradient(135deg,#3f6212,#84cc16)',
        category: '8-4-4', description: 'Crop Production, Animal Husbandry & Farm Management',
        topics: {
            'Form 1': [
                { name: 'Introduction to Agriculture', videos: [
                    { id:'a1-1', title:'Importance of Agriculture in Kenya', duration:'15:20', youtubeId:'lHqHoLs-LMc', channel:'KICD Kenya' },
                ]},
                { name: 'Soil & its Importance', videos: [
                    { id:'a1-2', title:'Soil Formation, Types & Fertility', duration:'20:45', youtubeId:'IF3phJEdnDg', channel:'Agri Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Crop Production', videos: [
                    { id:'a2-1', title:'Crop Husbandry - Planting, Weeding & Harvesting', duration:'22:18', youtubeId:'V2_kKaZF1j4', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Animal Husbandry', videos: [
                    { id:'a3-1', title:'Dairy Cattle Management in Kenya', duration:'24:30', youtubeId:'vHVbhZ5nAoE', channel:'Agri Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'a4-1', title:'KCSE Agriculture Revision Paper 1 & 2', duration:'44:22', youtubeId:'rBXxKUuEHNM', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'business', name: 'Business Studies', icon: '💼', color: '#0ea5e9',
        gradient: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
        category: '8-4-4', description: 'Commerce, Accounting, Economics & Entrepreneurship',
        topics: {
            'Form 1': [
                { name: 'Business Activities', videos: [
                    { id:'bs1-1', title:'Introduction to Business - Types & Importance', duration:'17:30', youtubeId:'8lmTJLT2kVA', channel:'KICD Kenya' },
                ]},
                { name: 'Trade', videos: [
                    { id:'bs1-2', title:'Trade - Local, Regional & International', duration:'19:45', youtubeId:'J-X6D4XM_Co', channel:'Business Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Accounting', videos: [
                    { id:'bs2-1', title:'Double Entry Bookkeeping - Full Lesson', duration:'28:40', youtubeId:'5YXmXxC5NOo', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Financial Statements', videos: [
                    { id:'bs3-1', title:'Final Accounts - Trading, P&L, Balance Sheet', duration:'32:15', youtubeId:'H4JzO1-HPNE', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'bs4-1', title:'KCSE Business Studies Full Revision', duration:'52:10', youtubeId:'HzTpkXS7DhE', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'kiswahili', name: 'Kiswahili', icon: '🇰🇪', color: '#ec4899',
        gradient: 'linear-gradient(135deg,#be185d,#ec4899)',
        category: 'Both', description: 'Lugha, Fasihi & Mazungumzo ya Kiswahili',
        topics: {
            'Form 1': [
                { name: 'Sarufi - Nomino & Vitenzi', videos: [
                    { id:'k1-1', title:'Sarufi ya Kiswahili - Sehemu za Sentensi', duration:'18:22', youtubeId:'MxmEcBFqGGw', channel:'KICD Kenya' },
                ]},
                { name: 'Fasihi - Hadithi Fupi', videos: [
                    { id:'k1-2', title:'Hadithi Fupi - Mchezo wa Kuigiza', duration:'15:40', youtubeId:'DNFbM4FaLJ4', channel:'Kiswahili Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Insha na Uandishi', videos: [
                    { id:'k2-1', title:'Jinsi ya Kuandika Insha Nzuri', duration:'20:15', youtubeId:'jNpR8H0qzF4', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Fasihi ya Watunzi', videos: [
                    { id:'k3-1', title:'Ushairi wa Kiswahili - Vipengele na Mifano', duration:'22:30', youtubeId:'0L2oBkmqCrk', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'Marudio ya KCSE', videos: [
                    { id:'k4-1', title:'Kiswahili KCSE - Marudio Kamili', duration:'45:22', youtubeId:'nfhJ7Pt7Xso', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'computer', name: 'Computer Studies', icon: '💻', color: '#6366f1',
        gradient: 'linear-gradient(135deg,#4338ca,#6366f1)',
        category: '8-4-4', description: 'Hardware, Software, Programming & ICT Applications',
        topics: {
            'Form 1': [
                { name: 'Introduction to Computers', videos: [
                    { id:'cs1-1', title:'History of Computers & ICT in Kenya', duration:'16:45', youtubeId:'EHMNas66UeY', channel:'KICD Kenya' },
                    { id:'cs1-2', title:'Hardware Components - CPU, RAM, Storage', duration:'20:30', youtubeId:'5kkV_4AqgqQ', channel:'CS Kenya' },
                ]},
                { name: 'Operating Systems', videos: [
                    { id:'cs1-3', title:'Operating Systems - Windows & Linux Basics', duration:'18:22', youtubeId:'RhHR8bI5x6M', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Word Processing', videos: [
                    { id:'cs2-1', title:'Microsoft Word - Full Tutorial for Students', duration:'25:40', youtubeId:'3c4EMDHsMu8', channel:'CS Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Programming', videos: [
                    { id:'cs3-1', title:'Introduction to Programming - Python Basics', duration:'30:15', youtubeId:'rfscVS0vtbw', channel:'KICD Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'cs4-1', title:'KCSE Computer Studies Full Revision', duration:'42:18', youtubeId:'E8Ks8Rn9UwQ', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
    {
        id: 'homescience', name: 'Home Science', icon: '🏠', color: '#f43f5e',
        gradient: 'linear-gradient(135deg,#be123c,#f43f5e)',
        category: '8-4-4', description: 'Food, Clothing, Housing & Home Management',
        topics: {
            'Form 1': [
                { name: 'Food & Nutrition', videos: [
                    { id:'hs1-1', title:'Food Nutrients - Functions & Sources', duration:'18:30', youtubeId:'qb8TjzLFj_k', channel:'KICD Kenya' },
                ]},
            ],
            'Form 2': [
                { name: 'Clothing & Textiles', videos: [
                    { id:'hs2-1', title:'Fibres and Fabrics - Natural vs Synthetic', duration:'16:45', youtubeId:'YXXaZq6yb4o', channel:'KICD Kenya' },
                ]},
            ],
            'Form 3': [
                { name: 'Childcare', videos: [
                    { id:'hs3-1', title:'Child Development - Stages and Care', duration:'20:22', youtubeId:'mOVbsBM6GJ4', channel:'HS Kenya' },
                ]},
            ],
            'Form 4': [
                { name: 'KCSE Revision', videos: [
                    { id:'hs4-1', title:'KCSE Home Science Revision', duration:'38:15', youtubeId:'Gg3P7BVv6yk', channel:'KCSE Kenya' },
                ]},
            ],
        },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// CBC SUBJECTS — Junior Secondary (Gr 7-9) + Senior Secondary (Gr 10-12)
// ─────────────────────────────────────────────────────────────────────────────
const CBC_SUBJECTS: SubjectData[] = [
    {
        id:'cbc-maths', name:'Mathematics', icon:'📐', color:'#3b82f6',
        gradient:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
        category:'CBC', description:'Numbers, Algebra, Geometry, Statistics — CBC Junior & Senior Secondary',
        topics:{
            'Grade 7':[
                { name:'Whole Numbers & Place Value', videos:[
                    { id:'cg7m1', title:'CBC Grade 7 Mathematics — Whole Numbers', duration:'18:30', youtubeId:'vSw0rkk7_IM', channel:'KICD CBC' },
                    { id:'cg7m2', title:'Number Patterns & Sequences — Grade 7', duration:'15:22', youtubeId:'Z_yiMjqF8UA', channel:'CBC Kenya' },
                ]},
                { name:'Fractions, Decimals & Percentages', videos:[
                    { id:'cg7m3', title:'Fractions & Decimals — CBC Grade 7', duration:'20:14', youtubeId:'0X8QS5F0_c4', channel:'KICD CBC' },
                ]},
                { name:'Algebra — Introduction', videos:[
                    { id:'cg7m4', title:'Introduction to Algebra for Grade 7', duration:'19:45', youtubeId:'NybHckSEQBI', channel:'CBC Kenya' },
                ]},
                { name:'Geometry & Measurement', videos:[
                    { id:'cg7m5', title:'2D Shapes, Angles & Perimeter — Grade 7', duration:'17:55', youtubeId:'0A8f7xhTFxo', channel:'KICD CBC' },
                ]},
            ],
            'Grade 8':[
                { name:'Indices & Powers', videos:[
                    { id:'cg8m1', title:'Indices, Powers and Roots — Grade 8 CBC', duration:'22:10', youtubeId:'X8jsijhllIA', channel:'KICD CBC' },
                ]},
                { name:'Linear Equations & Inequalities', videos:[
                    { id:'cg8m2', title:'Solving Linear Equations — CBC Grade 8', duration:'18:44', youtubeId:'l3XzepN03KQ', channel:'CBC Kenya' },
                ]},
                { name:'Geometry — Circles & Polygons', videos:[
                    { id:'cg8m3', title:'Circles, Polygons and Constructions — Grade 8', duration:'21:30', youtubeId:'MXV65i9g1Xg', channel:'KICD CBC' },
                ]},
                { name:'Statistics & Data', videos:[
                    { id:'cg8m4', title:'Data Collection, Tables & Graphs — Grade 8', duration:'16:18', youtubeId:'uzkc-qNVoOk', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 9':[
                { name:'Quadratic Expressions', videos:[
                    { id:'cg9m1', title:'Factorising Quadratics — CBC Grade 9', duration:'24:08', youtubeId:'eF6zYNzlZKQ', channel:'KICD CBC' },
                ]},
                { name:'Trigonometry — Right Triangles', videos:[
                    { id:'cg9m2', title:'Sine, Cosine & Tangent — Grade 9', duration:'19:27', youtubeId:'g0pu4nRkZOI', channel:'CBC Kenya' },
                ]},
                { name:'Vectors & Transformations', videos:[
                    { id:'cg9m3', title:'Vectors & Transformations — Grade 9 CBC', duration:'23:15', youtubeId:'fNk_zzaMoSs', channel:'KICD CBC' },
                ]},
                { name:'Probability', videos:[
                    { id:'cg9m4', title:'Probability Basics — CBC Grade 9', duration:'20:18', youtubeId:'pXo0bG4iAyg', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 10':[
                { name:'Advanced Algebra & Functions', videos:[
                    { id:'cg10m1', title:'Functions, Domain & Range — CBC Grade 10', duration:'28:15', youtubeId:'2ZzuZvz33X0', channel:'KICD CBC' },
                    { id:'cg10m2', title:'Quadratic Functions & Graphs — Grade 10', duration:'25:42', youtubeId:'rowWM-MijXU', channel:'CBC Kenya' },
                ]},
                { name:'Sequences & Series', videos:[
                    { id:'cg10m3', title:'Arithmetic & Geometric Sequences — Grade 10', duration:'22:50', youtubeId:'pXo0bG4iAyg', channel:'KICD CBC' },
                ]},
                { name:'Statistics & Probability', videos:[
                    { id:'cg10m4', title:'Statistics — Measures of Central Tendency — Grade 10', duration:'21:30', youtubeId:'uzkc-qNVoOk', channel:'CBC Kenya' },
                ]},
                { name:'Introduction to Calculus', videos:[
                    { id:'cg10m5', title:'Limits and Introduction to Differentiation — Grade 10', duration:'31:22', youtubeId:'5yfh5cf4-0Y', channel:'KICD CBC' },
                ]},
                { name:'Matrices', videos:[
                    { id:'cg10m6', title:'Matrices — Operations & Applications — Grade 10', duration:'28:15', youtubeId:'rowWM-MijXU', channel:'KICD CBC' },
                ]},
            ],
            'Grade 11':[
                { name:'Differential Calculus', videos:[
                    { id:'cg11m1', title:'Differentiation Rules & Applications — Grade 11', duration:'35:20', youtubeId:'rfG8ce4nNh0', channel:'KICD CBC' },
                ]},
            ],
            'Grade 12':[
                { name:'Integral Calculus & KCSEE Revision', videos:[
                    { id:'cg12m1', title:'Integration & Area Under Curve — Grade 12', duration:'38:44', youtubeId:'rfG8ce4nNh0', channel:'KICD CBC' },
                ]},
            ],
        },
    },
    {
        id:'cbc-english', name:'English', icon:'📖', color:'#8b5cf6',
        gradient:'linear-gradient(135deg,#6d28d9,#8b5cf6)',
        category:'CBC', description:'Listening, Speaking, Reading, Writing — CBC Curriculum',
        topics:{
            'Grade 7':[
                { name:'Listening & Speaking', videos:[
                    { id:'cg7e1', title:'Oral Communication Skills — Grade 7 CBC English', duration:'16:20', youtubeId:'rNSzCkxCMuE', channel:'KICD CBC' },
                ]},
                { name:'Reading Comprehension', videos:[
                    { id:'cg7e2', title:'Reading Strategies & Comprehension — Grade 7', duration:'14:45', youtubeId:'tFhUPsRhIBk', channel:'CBC Kenya' },
                ]},
                { name:'Grammar & Language Use', videos:[
                    { id:'cg7e3', title:'Parts of Speech & Sentence Structure — Grade 7', duration:'18:30', youtubeId:'8e3S5z6XKRU', channel:'KICD CBC' },
                ]},
            ],
            'Grade 8':[
                { name:'Creative Writing', videos:[
                    { id:'cg8e1', title:'Creative Writing & Composition — Grade 8 CBC', duration:'20:15', youtubeId:'1J6XMqeKSr8', channel:'KICD CBC' },
                ]},
                { name:'Literature & Drama', videos:[
                    { id:'cg8e2', title:'Drama & Performance Skills — Grade 8', duration:'17:28', youtubeId:'lzYydisXdNw', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 9':[
                { name:'Essay & Report Writing', videos:[
                    { id:'cg9e1', title:'Formal Writing — Essays & Reports — Grade 9', duration:'22:40', youtubeId:'8Z8KtB2FrDY', channel:'KICD CBC' },
                ]},
            ],
            'Grade 10':[
                { name:'Advanced Comprehension & Analysis', videos:[
                    { id:'cg10e1', title:'Critical Reading & Text Analysis — Grade 10 CBC', duration:'24:15', youtubeId:'8Gv0H-vPoDc', channel:'KICD CBC' },
                    { id:'cg10e2', title:'Literary Analysis — Prose, Poetry & Drama — Gr 10', duration:'27:30', youtubeId:'8kXJ9hVQkGI', channel:'CBC Kenya' },
                ]},
                { name:'Research & Academic Writing', videos:[
                    { id:'cg10e3', title:'Academic Research Writing — Grade 10', duration:'20:18', youtubeId:'lzYydisXdNw', channel:'KICD CBC' },
                ]},
                { name:'Oral & Communication Skills', videos:[
                    { id:'cg10e4', title:'Public Speaking & Debating — Grade 10 CBC', duration:'18:45', youtubeId:'8Gv0H-vPoDc', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-kiswahili', name:'Kiswahili', icon:'🇰🇪', color:'#ec4899',
        gradient:'linear-gradient(135deg,#be185d,#ec4899)',
        category:'CBC', description:'Lugha ya Kiswahili — Sarufi, Fasihi na Mawasiliano',
        topics:{
            'Grade 7':[
                { name:'Sarufi — Maneno na Sentensi', videos:[
                    { id:'cg7k1', title:'Sarufi ya Kiswahili — Grade 7 CBC', duration:'18:22', youtubeId:'MxmEcBFqGGw', channel:'KICD CBC' },
                ]},
                { name:'Uandishi wa Insha', videos:[
                    { id:'cg7k2', title:'Uandishi wa Hadithi — Grade 7', duration:'15:40', youtubeId:'DNFbM4FaLJ4', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Fasihi — Mashairi na Hadithi', videos:[
                    { id:'cg8k1', title:'Ushairi wa Kiswahili — Grade 8 CBC', duration:'20:15', youtubeId:'0L2oBkmqCrk', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Fasihi Simulizi', videos:[
                    { id:'cg9k1', title:'Fasihi Simulizi — Ngano na Methali — Grade 9', duration:'19:30', youtubeId:'nfhJ7Pt7Xso', channel:'KICD CBC' },
                ]},
            ],
            'Grade 10':[
                { name:'Fasihi ya Watunzi Mashuhuri', videos:[
                    { id:'cg10k1', title:'Masomo ya Fasihi — Watunzi wa Kiswahili — Grade 10', duration:'26:15', youtubeId:'0L2oBkmqCrk', channel:'KICD CBC' },
                    { id:'cg10k2', title:'Uchambuzi wa Tamthilia — Grade 10 CBC', duration:'22:40', youtubeId:'jNpR8H0qzF4', channel:'CBC Kenya' },
                ]},
                { name:'Uandishi wa Hati Rasmi', videos:[
                    { id:'cg10k3', title:'Barua Rasmi na Ripoti — Kiswahili Grade 10', duration:'18:30', youtubeId:'MxmEcBFqGGw', channel:'KICD CBC' },
                ]},
            ],
        },
    },
    {
        id:'cbc-science', name:'Integrated Science', icon:'🔬', color:'#10b981',
        gradient:'linear-gradient(135deg,#065f46,#10b981)',
        category:'CBC', description:'Biology + Chemistry + Physics integrated — JSS Grade 7-9',
        topics:{
            'Grade 7':[
                { name:'Scientific Investigation Skills', videos:[
                    { id:'cg7s1', title:'Scientific Method & Lab Safety — Grade 7 CBC', duration:'20:15', youtubeId:'9RpbcDMsYoA', channel:'KICD CBC' },
                ]},
                { name:'Living Things & Environment', videos:[
                    { id:'cg7s2', title:'Classification of Living Things — Grade 7', duration:'22:44', youtubeId:'URUJD5NEXC8', channel:'CBC Kenya' },
                    { id:'cg7s3', title:'Ecosystems & Food Webs — Grade 7', duration:'18:22', youtubeId:'v5tbOmPdVNs', channel:'KICD CBC' },
                ]},
                { name:'Matter & Materials', videos:[
                    { id:'cg7s4', title:'States of Matter & Changes — Grade 7 Science', duration:'16:22', youtubeId:'gGGFSBHW3lM', channel:'KICD CBC' },
                ]},
                { name:'Energy & Motion', videos:[
                    { id:'cg7s5', title:'Forces, Motion & Energy — Grade 7', duration:'22:18', youtubeId:'ou9YMWlJgkE', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Cell Biology', videos:[
                    { id:'cg8s1', title:'Cell Structure & Functions — Grade 8 CBC Science', duration:'22:44', youtubeId:'URUJD5NEXC8', channel:'KICD CBC' },
                    { id:'cg8s2', title:'Diffusion and Osmosis — Grade 8', duration:'24:18', youtubeId:'aubZU0iWtgI', channel:'CBC Kenya' },
                ]},
                { name:'Chemical Reactions', videos:[
                    { id:'cg8s3', title:'Acids, Bases & Indicators — Grade 8', duration:'22:33', youtubeId:'GE76JX15o_s', channel:'KICD CBC' },
                ]},
                { name:'Electricity & Magnetism', videos:[
                    { id:'cg8s4', title:'Electric Circuits & Magnetism — Grade 8', duration:'25:40', youtubeId:'mc979OhitAg', channel:'CBC Kenya' },
                ]},
                { name:'Human Body Systems', videos:[
                    { id:'cg8s5', title:'Digestive, Respiratory & Circulatory Systems — Gr 8', duration:'23:40', youtubeId:'2wYcOUBTaXM', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Genetics & Heredity', videos:[
                    { id:'cg9s1', title:'DNA, Genes & Inheritance — CBC Grade 9', duration:'28:15', youtubeId:'AhsIF-wZVZs', channel:'KICD CBC' },
                ]},
                { name:'Organic Chemistry Intro', videos:[
                    { id:'cg9s2', title:'Carbon Compounds & Organic Chemistry — Grade 9', duration:'24:10', youtubeId:'bXkPAEIOYzA', channel:'CBC Kenya' },
                ]},
                { name:'Waves & Sound', videos:[
                    { id:'cg9s3', title:'Waves, Sound & Light — Grade 9 Integrated Science', duration:'23:55', youtubeId:'Rbuhdo0AZDU', channel:'KICD CBC' },
                ]},
                { name:'Environment & Sustainability', videos:[
                    { id:'cg9s4', title:'Climate Change & Environmental Conservation — Gr 9', duration:'19:45', youtubeId:'h8oBpT3OECQ', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-social', name:'Social Studies', icon:'🌍', color:'#f97316',
        gradient:'linear-gradient(135deg,#c2410c,#f97316)',
        category:'CBC', description:'History + Geography + Civics integrated — JSS Grade 7-9',
        topics:{
            'Grade 7':[
                { name:'Our Community & Kenya', videos:[
                    { id:'cg7ss1', title:'Communities of Kenya — History & Culture — Grade 7', duration:'18:20', youtubeId:'9pMnlpqHGmQ', channel:'KICD CBC' },
                ]},
                { name:'Physical Features of Kenya', videos:[
                    { id:'cg7ss2', title:'Geography of Kenya — Mountains, Lakes & Rivers', duration:'18:45', youtubeId:'Ul-yHHYFZeA', channel:'CBC Kenya' },
                ]},
                { name:'Citizenship & Governance', videos:[
                    { id:'cg7ss3', title:'The Constitution of Kenya — Grade 7 Civics', duration:'15:30', youtubeId:'7LH_eDsLO0E', channel:'KICD CBC' },
                ]},
            ],
            'Grade 8':[
                { name:'East Africa — History & Geography', videos:[
                    { id:'cg8ss1', title:'East African Community & History — Grade 8', duration:'22:10', youtubeId:'vCNKxf2PQGA', channel:'KICD CBC' },
                ]},
                { name:'Economic Activities in Africa', videos:[
                    { id:'cg8ss2', title:'Agriculture, Trade & Industry in Africa — Grade 8', duration:'24:15', youtubeId:'wV6NszFMJgA', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 9':[
                { name:'Africa & the World', videos:[
                    { id:'cg9ss1', title:'Africa in the Global Context — Grade 9 Social Studies', duration:'26:30', youtubeId:'xNF6h3RM0qc', channel:'KICD CBC' },
                ]},
                { name:'Disaster Risk & Peace', videos:[
                    { id:'cg9ss2', title:'Disaster Risk Reduction & Conflict Resolution — Gr 9', duration:'18:45', youtubeId:'Q7kS0KBGXJA', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-pretec', name:'Pre-Technical Studies', icon:'🔧', color:'#64748b',
        gradient:'linear-gradient(135deg,#334155,#64748b)',
        category:'CBC', description:'Technology, Engineering, Design & Innovation — JSS',
        topics:{
            'Grade 7':[
                { name:'Introduction to Technology', videos:[
                    { id:'cg7pt1', title:'Technology Around Us — Grade 7 Pre-Technical', duration:'15:22', youtubeId:'EHMNas66UeY', channel:'KICD CBC' },
                ]},
                { name:'Basic Woodwork & Metalwork', videos:[
                    { id:'cg7pt2', title:'Woodwork Tools & Safety — Grade 7', duration:'18:30', youtubeId:'5kkV_4AqgqQ', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Electricity & Electronics', videos:[
                    { id:'cg8pt1', title:'Basic Electrical Circuits — Grade 8 Pre-Technical', duration:'25:40', youtubeId:'mc979OhitAg', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Design & Innovation', videos:[
                    { id:'cg9pt1', title:'Design Thinking & Prototyping — Grade 9', duration:'22:15', youtubeId:'rfscVS0vtbw', channel:'KICD CBC' },
                ]},
                { name:'ICT & Computing', videos:[
                    { id:'cg9pt2', title:'Programming Basics — Grade 9 Pre-Technical', duration:'30:15', youtubeId:'rfscVS0vtbw', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-agri', name:'Agriculture & Nutrition', icon:'🌾', color:'#84cc16',
        gradient:'linear-gradient(135deg,#3f6212,#84cc16)',
        category:'CBC', description:'Crop Production, Animal Care & Nutrition — JSS Grade 7-9',
        topics:{
            'Grade 7':[
                { name:'Introduction to Agriculture', videos:[
                    { id:'cg7ag1', title:'Importance of Agriculture — CBC Grade 7', duration:'15:20', youtubeId:'lHqHoLs-LMc', channel:'KICD CBC' },
                ]},
                { name:'Food & Nutrition Basics', videos:[
                    { id:'cg7ag2', title:'Food Nutrients & Balanced Diet — Grade 7', duration:'18:30', youtubeId:'qb8TjzLFj_k', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Crop Husbandry', videos:[
                    { id:'cg8ag1', title:'Planting, Fertilizers & Irrigation — Grade 8', duration:'22:18', youtubeId:'V2_kKaZF1j4', channel:'KICD CBC' },
                ]},
                { name:'Animal Rearing', videos:[
                    { id:'cg8ag2', title:'Poultry & Livestock Management — Grade 8', duration:'20:30', youtubeId:'vHVbhZ5nAoE', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 9':[
                { name:'Agribusiness & Entrepreneurship', videos:[
                    { id:'cg9ag1', title:'Agribusiness — Starting a Farm Enterprise — Grade 9', duration:'24:22', youtubeId:'rBXxKUuEHNM', channel:'KICD CBC' },
                ]},
            ],
        },
    },
    {
        id:'cbc-creative', name:'Creative Arts & Sports', icon:'🎨', color:'#f43f5e',
        gradient:'linear-gradient(135deg,#be123c,#f43f5e)',
        category:'CBC', description:'Fine Art, Music, Dance, Drama & Physical Education — JSS',
        topics:{
            'Grade 7':[
                { name:'Visual Arts — Drawing & Painting', videos:[
                    { id:'cg7ca1', title:'Basic Drawing Techniques — Grade 7 Creative Arts', duration:'16:45', youtubeId:'YXXaZq6yb4o', channel:'KICD CBC' },
                ]},
                { name:'Music — Rhythm & Melody', videos:[
                    { id:'cg7ca2', title:'Introduction to Music — Notes & Rhythm — Grade 7', duration:'14:30', youtubeId:'Gg3P7BVv6yk', channel:'CBC Kenya' },
                ]},
                { name:'Sports & Physical Health', videos:[
                    { id:'cg7ca3', title:'Physical Fitness & Health — Grade 7', duration:'12:22', youtubeId:'mOVbsBM6GJ4', channel:'KICD CBC' },
                ]},
            ],
            'Grade 8':[
                { name:'Drama & Performance', videos:[
                    { id:'cg8ca1', title:'Drama Performance & Script Writing — Grade 8', duration:'20:30', youtubeId:'lzYydisXdNw', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Portfolio & Exhibition', videos:[
                    { id:'cg9ca1', title:'Building Your Creative Portfolio — Grade 9', duration:'18:15', youtubeId:'YXXaZq6yb4o', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-business', name:'Business Studies', icon:'💼', color:'#0ea5e9',
        gradient:'linear-gradient(135deg,#0369a1,#0ea5e9)',
        category:'CBC', description:'Entrepreneurship, Commerce & Financial Literacy — JSS & SSS',
        topics:{
            'Grade 7':[
                { name:'Introduction to Business', videos:[
                    { id:'cg7bs1', title:'What is Business? Entrepreneurship — Grade 7 CBC', duration:'17:30', youtubeId:'8lmTJLT2kVA', channel:'KICD CBC' },
                ]},
                { name:'Financial Literacy', videos:[
                    { id:'cg7bs2', title:'Money, Saving & Budgeting — Grade 7', duration:'15:45', youtubeId:'J-X6D4XM_Co', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Trade & Commerce', videos:[
                    { id:'cg8bs1', title:'Local & International Trade — Grade 8 CBC', duration:'19:45', youtubeId:'J-X6D4XM_Co', channel:'KICD CBC' },
                ]},
                { name:'Basic Bookkeeping', videos:[
                    { id:'cg8bs2', title:'Simple Bookkeeping & Accounts — Grade 8', duration:'24:40', youtubeId:'5YXmXxC5NOo', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 9':[
                { name:'Entrepreneurship Project', videos:[
                    { id:'cg9bs1', title:'Business Plan & Entrepreneurship — Grade 9', duration:'26:15', youtubeId:'8lmTJLT2kVA', channel:'KICD CBC' },
                ]},
            ],
            'Grade 10':[
                { name:'Financial Statements & Analysis', videos:[
                    { id:'cg10bs1', title:'Financial Statements — Grade 10 Business (CBC)', duration:'32:15', youtubeId:'H4JzO1-HPNE', channel:'KICD CBC' },
                    { id:'cg10bs2', title:'Ratio Analysis & Business Performance — Grade 10', duration:'28:40', youtubeId:'5YXmXxC5NOo', channel:'CBC Kenya' },
                ]},
                { name:'Marketing & Consumer Behaviour', videos:[
                    { id:'cg10bs3', title:'Marketing Mix & Strategies — Grade 10 CBC', duration:'24:22', youtubeId:'HzTpkXS7DhE', channel:'KICD CBC' },
                ]},
                { name:'Business Law & Ethics', videos:[
                    { id:'cg10bs4', title:'Business Law — Contracts & Ethics — Grade 10', duration:'20:15', youtubeId:'HzTpkXS7DhE', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-history-geo', name:'History & Geography', icon:'🗺️', color:'#22c55e',
        gradient:'linear-gradient(135deg,#166534,#22c55e)',
        category:'CBC', description:'African History, World Geography & Governance — SSS Grade 10+',
        topics:{
            'Grade 10':[
                { name:'Kenya & East Africa — Modern History', videos:[
                    { id:'cg10hg1', title:'Modern History of Kenya — Independence to Now — Gr 10', duration:'28:15', youtubeId:'xNF6h3RM0qc', channel:'KICD CBC' },
                    { id:'cg10hg2', title:'East African Integration & EAC — Grade 10', duration:'22:40', youtubeId:'vCNKxf2PQGA', channel:'CBC Kenya' },
                ]},
                { name:'Physical Geography of Africa', videos:[
                    { id:'cg10hg3', title:'Africa — Physical Features, Climate & Vegetation — Gr 10', duration:'24:15', youtubeId:'e_g32a4qDzs', channel:'KICD CBC' },
                ]},
                { name:'World Affairs & Governance', videos:[
                    { id:'cg10hg4', title:'International Relations & UN — Grade 10 CBC', duration:'20:30', youtubeId:'7LH_eDsLO0E', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-physics-10', name:'Physics (SSS)', icon:'⚡', color:'#06b6d4',
        gradient:'linear-gradient(135deg,#0e7490,#06b6d4)',
        category:'CBC', description:'Advanced Physics — CBC Senior Secondary Grade 10+',
        topics:{
            'Grade 10':[
                { name:'Mechanics & Kinematics', videos:[
                    { id:'cg10ph1', title:'Motion, Velocity & Acceleration — Grade 10 CBC Physics', duration:'25:40', youtubeId:'2kmpTvGXkEs', channel:'KICD CBC' },
                    { id:'cg10ph2', title:'Newton\'s Laws Applied — Grade 10', duration:'22:18', youtubeId:'ou9YMWlJgkE', channel:'CBC Kenya' },
                ]},
                { name:'Electricity & Circuits', videos:[
                    { id:'cg10ph3', title:'Electric Current, Ohm\'s Law & Circuits — Grade 10', duration:'25:40', youtubeId:'mc979OhitAg', channel:'KICD CBC' },
                    { id:'cg10ph4', title:'Kirchhoff\'s Laws & Complex Circuits — Grade 10', duration:'28:15', youtubeId:'wibBfHGXBbo', channel:'CBC Kenya' },
                ]},
                { name:'Thermal Physics', videos:[
                    { id:'cg10ph5', title:'Heat Transfer, Thermodynamics — Grade 10 CBC', duration:'23:30', youtubeId:'HuFR79AqRSo', channel:'KICD CBC' },
                ]},
                { name:'Waves & Optics', videos:[
                    { id:'cg10ph6', title:'Wave Properties, Sound & Light — Grade 10', duration:'24:22', youtubeId:'Rbuhdo0AZDU', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-chemistry-10', name:'Chemistry (SSS)', icon:'⚗️', color:'#f59e0b',
        gradient:'linear-gradient(135deg,#b45309,#f59e0b)',
        category:'CBC', description:'Advanced Chemistry — CBC Senior Secondary Grade 10+',
        topics:{
            'Grade 10':[
                { name:'Atomic Structure & Periodicity', videos:[
                    { id:'cg10ch1', title:'Atomic Structure & Periodic Table — Grade 10 CBC', duration:'24:10', youtubeId:'0RRVV4Diomg', channel:'KICD CBC' },
                ]},
                { name:'Chemical Bonding', videos:[
                    { id:'cg10ch2', title:'Ionic, Covalent & Metallic Bonds — Grade 10', duration:'22:33', youtubeId:'GE76JX15o_s', channel:'CBC Kenya' },
                ]},
                { name:'Organic Chemistry', videos:[
                    { id:'cg10ch3', title:'Organic Chemistry — Functional Groups — Grade 10 CBC', duration:'30:15', youtubeId:'bXkPAEIOYzA', channel:'KICD CBC' },
                    { id:'cg10ch4', title:'Alkanes, Alkenes & Polymers — Grade 10', duration:'27:40', youtubeId:'N1oKTonZzvM', channel:'CBC Kenya' },
                ]},
                { name:'Electrochemistry', videos:[
                    { id:'cg10ch5', title:'Electrolysis & Electrochemical Cells — Grade 10', duration:'27:40', youtubeId:'GCt0JtV1pYQ', channel:'KICD CBC' },
                ]},
            ],
        },
    },
    {
        id:'cbc-biology-10', name:'Biology (SSS)', icon:'🧬', color:'#10b981',
        gradient:'linear-gradient(135deg,#065f46,#10b981)',
        category:'CBC', description:'Advanced Biology — CBC Senior Secondary Grade 10+',
        topics:{
            'Grade 10':[
                { name:'Cell Biology & Biochemistry', videos:[
                    { id:'cg10bi1', title:'Cell Structure, Organelles & Biochemistry — Grade 10', duration:'28:15', youtubeId:'URUJD5NEXC8', channel:'KICD CBC' },
                    { id:'cg10bi2', title:'Enzymes, Respiration & Photosynthesis — Grade 10', duration:'26:35', youtubeId:'DXOQ2rHqIzI', channel:'CBC Kenya' },
                ]},
                { name:'Genetics & Biotechnology', videos:[
                    { id:'cg10bi3', title:'DNA Replication, Genetics & Biotechnology — Gr 10', duration:'30:15', youtubeId:'AhsIF-wZVZs', channel:'KICD CBC' },
                    { id:'cg10bi4', title:'Genetic Engineering & GMOs — Grade 10 CBC', duration:'25:42', youtubeId:'Mehz7tCxjSE', channel:'CBC Kenya' },
                ]},
                { name:'Human Physiology', videos:[
                    { id:'cg10bi5', title:'Nervous System & Hormones — Grade 10 CBC', duration:'24:40', youtubeId:'2wYcOUBTaXM', channel:'KICD CBC' },
                ]},
                { name:'Ecology & Conservation', videos:[
                    { id:'cg10bi6', title:'Ecosystems, Biodiversity & Conservation — Grade 10', duration:'22:30', youtubeId:'0SCjhI86grU', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-cs-10', name:'Computer Science (SSS)', icon:'💻', color:'#6366f1',
        gradient:'linear-gradient(135deg,#4338ca,#6366f1)',
        category:'CBC', description:'Programming, Data Science & ICT — CBC Senior Secondary Gr 10+',
        topics:{
            'Grade 10':[
                { name:'Programming with Python', videos:[
                    { id:'cg10cs1', title:'Python Programming — Variables, Loops & Functions — Gr 10', duration:'30:15', youtubeId:'rfscVS0vtbw', channel:'KICD CBC' },
                    { id:'cg10cs2', title:'Object-Oriented Programming — Grade 10 CBC', duration:'28:40', youtubeId:'E8Ks8Rn9UwQ', channel:'CBC Kenya' },
                ]},
                { name:'Web Development Basics', videos:[
                    { id:'cg10cs3', title:'HTML, CSS & JavaScript Basics — Grade 10', duration:'35:22', youtubeId:'3c4EMDHsMu8', channel:'KICD CBC' },
                ]},
                { name:'Data & Databases', videos:[
                    { id:'cg10cs4', title:'Databases & SQL Introduction — Grade 10 CBC', duration:'26:15', youtubeId:'5kkV_4AqgqQ', channel:'CBC Kenya' },
                ]},
                { name:'Cybersecurity & Ethics', videos:[
                    { id:'cg10cs5', title:'Cybersecurity, Privacy & Digital Ethics — Grade 10', duration:'20:30', youtubeId:'RhHR8bI5x6M', channel:'KICD CBC' },
                ]},
            ],
        },
    },
    {
        id:'cbc-re', name:'Religious Education', icon:'🙏', color:'#a855f7',
        gradient:'linear-gradient(135deg,#7e22ce,#a855f7)',
        category:'CBC', description:'Christian, Islamic & Hindu Religious Education — JSS',
        topics:{
            'Grade 7':[
                { name:'God & Creation', videos:[
                    { id:'cg7re1', title:'Creation & the Nature of God — CBC Grade 7 RE', duration:'16:45', youtubeId:'yqBPYGUvsBQ', channel:'KICD CBC' },
                ]},
            ],
            'Grade 8':[
                { name:'Moral Values & Ethics', videos:[
                    { id:'cg8re1', title:'Moral Values in Society — Grade 8 RE', duration:'18:22', youtubeId:'U1bhO1ZtGS0', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Faith, Family & Community', videos:[
                    { id:'cg9re1', title:'Faith & Community Life — Grade 9 CBC Religious Ed', duration:'20:30', youtubeId:'9zJB0K2HTXA', channel:'CBC Kenya' },
                ]},
            ],
        },
    },
    {
        id:'cbc-lifeskills', name:'Life Skills', icon:'🌱', color:'#14b8a6',
        gradient:'linear-gradient(135deg,#0f766e,#14b8a6)',
        category:'CBC', description:'Health, Wellbeing, Relationships & Life Competencies — JSS',
        topics:{
            'Grade 7':[
                { name:'Personal Identity & Self-Esteem', videos:[
                    { id:'cg7ls1', title:'Who Am I? Self-Esteem & Identity — Grade 7', duration:'14:30', youtubeId:'mOVbsBM6GJ4', channel:'KICD CBC' },
                ]},
                { name:'Health & Hygiene', videos:[
                    { id:'cg7ls2', title:'Personal Health & Hygiene — Grade 7 Life Skills', duration:'15:22', youtubeId:'qb8TjzLFj_k', channel:'CBC Kenya' },
                ]},
            ],
            'Grade 8':[
                { name:'Relationships & Social Skills', videos:[
                    { id:'cg8ls1', title:'Healthy Relationships & Peer Pressure — Grade 8', duration:'17:40', youtubeId:'mOVbsBM6GJ4', channel:'KICD CBC' },
                ]},
            ],
            'Grade 9':[
                { name:'Career Awareness & Goal Setting', videos:[
                    { id:'cg9ls1', title:'Career Planning & Goal Setting — Grade 9 CBC', duration:'19:15', youtubeId:'8lmTJLT2kVA', channel:'KICD CBC' },
                ]},
            ],
        },
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// KCSE PAST PAPERS DATA
// ─────────────────────────────────────────────────────────────────────────────
const PAST_PAPERS_YEARS = [2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010];
const PAPER_SUBJECTS = ['Mathematics','English','Kiswahili','Biology','Physics','Chemistry','Geography','History & Govt','CRE','Agriculture','Business Studies','Computer Studies'];

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ DATA — Sample MCQs per subject
// ─────────────────────────────────────────────────────────────────────────────
interface QuizQuestion { q: string; options: string[]; correct: number; explanation: string; }
const QUIZ_BANK: Record<string, QuizQuestion[]> = {
    mathematics: [
        { q:'Simplify: 3x + 2y - x + 4y', options:['2x + 6y','4x + 6y','2x + 2y','4x + 2y'], correct:0, explanation:'3x - x = 2x, 2y + 4y = 6y. Answer: 2x + 6y' },
        { q:'Solve: 2x + 5 = 13', options:['x = 3','x = 4','x = 9','x = 5'], correct:1, explanation:'2x = 13 - 5 = 8, x = 4' },
        { q:'What is the area of a circle with radius 7cm? (π = 22/7)', options:['44 cm²','154 cm²','88 cm²','22 cm²'], correct:1, explanation:'A = πr² = (22/7) × 7² = 22 × 7 = 154 cm²' },
        { q:'Convert 0.75 to a fraction in its simplest form', options:['75/100','3/4','15/20','7/10'], correct:1, explanation:'0.75 = 75/100 = 3/4' },
        { q:'Find the HCF of 24 and 36', options:['6','12','4','8'], correct:1, explanation:'Factors of 24: 1,2,3,4,6,8,12,24. Factors of 36: 1,2,3,4,6,9,12,18,36. HCF = 12' },
    ],
    biology: [
        { q:'What is the powerhouse of the cell?', options:['Nucleus','Ribosome','Mitochondria','Chloroplast'], correct:2, explanation:'Mitochondria produce ATP energy through respiration.' },
        { q:'Which type of cell does NOT have a nucleus?', options:['Nerve cell','Red blood cell','White blood cell','Muscle cell'], correct:1, explanation:'Mature red blood cells (erythrocytes) have no nucleus to maximize haemoglobin space.' },
        { q:'Photosynthesis occurs in which organelle?', options:['Mitochondria','Chloroplast','Ribosome','Nucleus'], correct:1, explanation:'Chloroplasts contain chlorophyll which traps light energy for photosynthesis.' },
        { q:'What is the function of stomata in plants?', options:['Absorb water','Gas exchange','Produce glucose','Anchor the plant'], correct:1, explanation:'Stomata are pores for CO₂ and O₂ exchange and transpiration.' },
        { q:'Which blood group is the universal donor?', options:['AB','O','A','B'], correct:1, explanation:'Blood group O negative is the universal donor as it has no antigens.' },
    ],
    chemistry: [
        { q:'What is the chemical formula of water?', options:['HO','H₂O','H₂O₂','OH'], correct:1, explanation:'Water is H₂O — two hydrogen atoms and one oxygen atom.' },
        { q:'An atom with 8 protons and 8 neutrons belongs to which element?', options:['Carbon','Nitrogen','Oxygen','Sulphur'], correct:2, explanation:'Atomic number 8 = Oxygen (O)' },
        { q:'What is pH of a neutral solution?', options:['0','7','14','1'], correct:1, explanation:'pH 7 is neutral. Below 7 is acidic, above 7 is basic.' },
        { q:'Which gas is produced when hydrochloric acid reacts with zinc?', options:['Oxygen','Carbon dioxide','Hydrogen','Chlorine'], correct:2, explanation:'Zn + 2HCl → ZnCl₂ + H₂↑. Hydrogen gas is produced.' },
        { q:'What type of bond holds two chlorine atoms in Cl₂?', options:['Ionic bond','Covalent bond','Metallic bond','Hydrogen bond'], correct:1, explanation:'Non-metals share electrons → covalent bond.' },
    ],
    physics: [
        { q:'What is the SI unit of electric current?', options:['Volt','Ohm','Ampere','Watt'], correct:2, explanation:'Electric current is measured in Amperes (A).' },
        { q:'A car accelerates from 0 to 30 m/s in 10 seconds. What is the acceleration?', options:['3 m/s²','0.3 m/s²','300 m/s²','30 m/s²'], correct:0, explanation:'a = Δv/t = 30/10 = 3 m/s²' },
        { q:'Which type of mirror forms only virtual images?', options:['Plane mirror','Concave mirror','Convex mirror','Both plane and convex'], correct:3, explanation:'Both plane mirrors and convex mirrors always form virtual, erect, diminished images.' },
        { q:'What happens to resistance when temperature increases (for metals)?', options:['Decreases','Stays same','Increases','Becomes zero'], correct:2, explanation:'For metals, resistance increases with temperature due to increased lattice vibration.' },
        { q:'Speed of light in vacuum is approximately:', options:['3×10⁶ m/s','3×10⁸ m/s','3×10¹⁰ m/s','3×10⁴ m/s'], correct:1, explanation:'c ≈ 3×10⁸ m/s (300,000,000 m/s)' },
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — extract YouTube video ID from URL or return raw ID
// ─────────────────────────────────────────────────────────────────────────────
function ytEmbed(id: string) {
    return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1&showinfo=0`;
}
function ytThumb(id: string) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS STORAGE (localStorage)
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'apsims_learning_progress';
function getProgress(): Record<string, { watched: string[]; quizScores: Record<string,number> }> {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function markWatched(subjectId: string, videoId: string) {
    const p = getProgress();
    if (!p[subjectId]) p[subjectId] = { watched: [], quizScores: {} };
    if (!p[subjectId].watched.includes(videoId)) p[subjectId].watched.push(videoId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function saveQuizScore(subjectId: string, topic: string, score: number) {
    const p = getProgress();
    if (!p[subjectId]) p[subjectId] = { watched: [], quizScores: {} };
    p[subjectId].quizScores[topic] = score;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO PLAYER MODAL — Smart: Real ID → direct embed | No ID → live search
// ─────────────────────────────────────────────────────────────────────────────
function VideoModal({ video, subject, onClose }: { video: Video; subject: SubjectData; onClose: () => void }) {
    useEffect(() => {
        markWatched(subject.id, video.id);
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, []);

    const [playing,    setPlaying]    = useState(false);
    const [loaded,     setLoaded]     = useState(false);
    const [thumbError, setThumbError] = useState(false);
    const [useFallback, setUseFallback] = useState(false);

    // isVerified = ONLY admin DB videos have this flag — static topic videos always use search
    const isVerified   = !!(video.isVerified && video.youtubeId && video.youtubeId.length === 11);
    const useSearch    = !isVerified || useFallback;
    const thumbUrl     = (!useSearch) ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : null;
    const directEmbed  = (!useSearch)
        ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`
        : null;
    const moeQuery     = encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD');
    const searchEmbed  = `https://www.youtube-nocookie.com/embed?listType=search&list=${moeQuery}&autoplay=1&rel=0&modestbranding=1`;
    const embedSrc     = directEmbed || searchEmbed;
    const ytSearchUrl  = `https://www.youtube.com/results?search_query=${moeQuery}`;
    const ytUrl        = (!useSearch)
        ? `https://www.youtube.com/watch?v=${video.youtubeId}`
        : ytSearchUrl;

    // Auto-fallback: if verified video not loaded after 5s, switch to MoE search embed
    useEffect(() => {
        if (!playing || useSearch) return;
        const t = setTimeout(() => { if (!loaded) { setUseFallback(true); setLoaded(false); } }, 5000);
        return () => clearTimeout(t);
    }, [playing, useSearch, loaded]);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(14px)' }}
            onClick={onClose}>
            <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
                style={{ animation: 'scaleIn 0.2s ease-out' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4" style={{ background: subject.gradient }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{subject.icon}</span>
                        <div className="min-w-0">
                            <p className="text-white font-extrabold text-sm leading-snug truncate">{video.title}</p>
                            <p className="text-white/70 text-xs">
                                {subject.name} · {video.channel} · {video.duration}
                                {isVerified && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-black bg-green-500/30 text-green-300">✓ Verified</span>}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all ml-3">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Player */}
                <div style={{ background: '#000f1a', position: 'relative', paddingBottom: '56.25%' }}>
                    {!playing && (
                        <div style={{ position: 'absolute', inset: 0 }}>
                            {isVerified && !thumbError ? (
                                <img src={thumbUrl!} alt={video.title}
                                    onError={() => setThumbError(true)}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                                <div style={{
                                    width: '100%', height: '100%',
                                    background: `linear-gradient(135deg, ${subject.color}44 0%, #0f172a 55%, #1e1b4b 100%)`,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
                                }}>
                                    <span style={{ fontSize: 64, filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.7))' }}>{subject.icon}</span>
                                    <p style={{ color: '#fff', fontWeight: 900, fontSize: 14, textAlign: 'center', maxWidth: 440, padding: '0 20px', lineHeight: 1.5 }}>{video.title}</p>
                                    {!isVerified && (<p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>🔍 Will search YouTube live for the best matching lesson</p>)}
                                </div>
                            )}
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.65) 100%)' }} />
                            <button onClick={() => setPlaying(true)} style={{
                                position: 'absolute', inset: 0, width: '100%', height: '100%',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%', background: subject.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 8px 48px ${subject.color}80, 0 0 0 4px rgba(255,255,255,0.15)`,
                                }}>
                                    <FiPlay size={32} color="#fff" style={{ marginLeft: 5 }} />
                                </div>
                                <span style={{
                                    color: '#fff', fontSize: 13, fontWeight: 800,
                                    background: 'rgba(0,0,0,0.65)', padding: '6px 20px', borderRadius: 999,
                                    backdropFilter: 'blur(4px)', letterSpacing: 0.3,
                                }}>{isVerified ? '▶ Play Video' : '🔍 Find & Play on YouTube'}</span>
                            </button>
                        </div>
                    )}

                    {playing && (
                        <>
                            {!loaded && (
                                <div style={{
                                    position: 'absolute', inset: 0, zIndex: 10,
                                    background: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
                                }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        border: `4px solid ${subject.color}30`, borderTop: `4px solid ${subject.color}`,
                                        animation: 'spin 0.9s linear infinite',
                                    }} />
                                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600 }}>
                                        {isVerified ? 'Loading video...' : 'Finding best video on YouTube...'}
                                    </p>
                                </div>
                            )}
                            <iframe src={embedSrc} title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen onLoad={() => setLoaded(true)}
                                style={{
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    border: 'none', zIndex: loaded ? 15 : 0, opacity: loaded ? 1 : 0,
                                }} />
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <FiCheck size={12} /> Marked as watched
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Always visible MoE search button */}
                        <a href={ytSearchUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">
                            🎓 Search MoE YouTube
                        </a>
                        {/* Video unavailable fallback button — only for verified videos */}
                        {isVerified && !useFallback && (
                            <button onClick={() => { setUseFallback(true); setLoaded(false); setPlaying(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all border border-amber-200">
                                ⚠️ Video Unavailable? Click Here
                            </button>
                        )}
                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                            style={{ background: '#ef4444' }}>
                            <FiYoutube size={13} /> Open YouTube
                        </a>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scaleIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
                @keyframes spin    { to{transform:rotate(360deg)} }
            `}</style>
        </div>
    );
}




// ─────────────────────────────────────────────────────────────────────────────
// QUIZ COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function QuizPanel({ subjectId }: { subjectId: string }) {
    const questions = QUIZ_BANK[subjectId] || QUIZ_BANK.mathematics;
    const [current, setCurrent] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState<(number | null)[]>(Array(questions.length).fill(null));
    const [finished, setFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

    useEffect(() => {
        if (finished) return;
        const t = setInterval(() => setTimeLeft(s => { if (s <= 1) { setFinished(true); return 0; } return s - 1; }), 1000);
        return () => clearInterval(t);
    }, [finished]);

    const submit = () => {
        const a = [...answered]; a[current] = selected; setAnswered(a);
        if (current < questions.length - 1) { setCurrent(c => c + 1); setSelected(null); }
        else { setFinished(true); const score = a.filter((v, i) => v === questions[i].correct).length; saveQuizScore(subjectId, 'general', Math.round(score / questions.length * 100)); }
    };

    const score = answered.filter((v, i) => v === questions[i].correct).length;
    const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
    const pct = Math.round(score / questions.length * 100);
    const subject = SUBJECTS.find(s => s.id === subjectId);

    if (finished) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 text-3xl shadow-2xl" style={{ background: pct >= 70 ? 'linear-gradient(135deg,#059669,#10b981)' : pct >= 50 ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                    {pct >= 70 ? '🏆' : pct >= 50 ? '🎯' : '📚'}
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Quiz Complete!</h3>
                <p className="text-4xl font-black mb-1" style={{ color: pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626' }}>{pct}%</p>
                <p className="text-sm text-gray-500 mb-8">{score} / {questions.length} correct</p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-sm mb-8">
                    {questions.map((q, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl text-xs font-medium ${answered[i] === q.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span>{answered[i] === q.correct ? '✅' : '❌'}</span>
                            <span className="truncate">{q.q}</span>
                        </div>
                    ))}
                </div>
                <button onClick={() => { setCurrent(0); setSelected(null); setAnswered(Array(questions.length).fill(null)); setFinished(false); setTimeLeft(300); }}
                    className="px-8 py-3 text-sm font-bold text-white rounded-2xl shadow-lg" style={{ background: subject?.gradient || 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                    🔄 Try Again
                </button>
            </div>
        );
    }

    const q = questions[current];
    return (
        <div className="max-w-2xl mx-auto">
            {/* Timer + Progress */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {questions.map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{ background: answered[i] !== null ? (answered[i] === questions[i].correct ? '#10b981' : '#ef4444') : i === current ? (subject?.color || '#3b82f6') : '#e5e7eb' }} />
                    ))}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
                    <FiClock size={13} /> {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
                </div>
            </div>
            {/* Question */}
            <div className="rounded-2xl p-6 mb-6 shadow-sm border border-gray-100" style={{ background: '#fff' }}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Question {current + 1} of {questions.length}</p>
                <p className="text-lg font-extrabold text-gray-800 leading-snug">{q.q}</p>
            </div>
            {/* Options */}
            <div className="space-y-3 mb-6">
                {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => setSelected(oi)}
                        className="w-full text-left px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all"
                        style={{
                            borderColor: selected === oi ? (subject?.color || '#3b82f6') : '#e5e7eb',
                            background: selected === oi ? `${subject?.color || '#3b82f6'}12` : '#fff',
                            color: selected === oi ? (subject?.color || '#3b82f6') : '#374151',
                            transform: selected === oi ? 'scale(1.01)' : 'scale(1)',
                            boxShadow: selected === oi ? `0 4px 20px ${subject?.color || '#3b82f6'}22` : 'none',
                        }}>
                        <span className="font-black mr-3 text-xs" style={{ color: selected === oi ? subject?.color : '#9ca3af' }}>
                            {['A','B','C','D'][oi]}.
                        </span>
                        {opt}
                    </button>
                ))}
            </div>
            <button onClick={submit} disabled={selected === null}
                className="w-full py-4 text-sm font-black text-white rounded-2xl shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: selected !== null ? (subject?.gradient || 'linear-gradient(135deg,#1d4ed8,#3b82f6)') : '#e5e7eb', color: selected !== null ? '#fff' : '#9ca3af' }}>
                {current < questions.length - 1 ? 'Next Question →' : '✅ Submit Quiz'}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
type MainTab = 'videos' | 'papers' | 'quizzes' | 'progress';

export default function LearningPage() {
    const [tab, setTab]                 = useState<MainTab>('videos');
    const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
    const [selectedForm, setSelectedForm] = useState('Form 1');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [search, setSearch]           = useState('');
    const [paperYear, setPaperYear]     = useState(2023);
    const [paperSubject, setPaperSubject] = useState('');
    const [quizSubject, setQuizSubject] = useState('mathematics');
    const [progress, setProgress]       = useState<Record<string, any>>({});
    // Dual curriculum mode
    const [curriculumMode, setCurriculumMode] = useState<'8-4-4' | 'CBC'>('8-4-4');
    const [cbcLevel, setCbcLevel]       = useState<'JSS' | 'SSS'>('JSS');
    const [cbcGrade, setCbcGrade]       = useState('Grade 7');
    // DB custom videos from super admin
    const [dbVideos, setDbVideos]       = useState<DBVideo[]>([]);

    useEffect(() => { setProgress(getProgress()); }, [selectedVideo, tab]);

    // Load custom videos added by admin from Supabase
    useEffect(() => {
        supabase.from('learning_videos').select('*').eq('is_active', true)
            .order('sort_order').then(({ data, error }) => { if (data && !error) setDbVideos(data); });
    }, []);

    // Derived
    const activeLibrary  = curriculumMode === '8-4-4' ? SUBJECTS : CBC_SUBJECTS;
    const activeGrades   = curriculumMode === 'CBC' ? (cbcLevel === 'JSS' ? CBC_JSS_GRADES : CBC_SSS_GRADES) : FORMS;
    const activeGrade    = curriculumMode === 'CBC' ? cbcGrade : selectedForm;

    // Total videos watched
    const totalWatched = Object.values(progress).reduce((sum: number, p: any) => sum + (p.watched?.length || 0), 0);
    const total844Vids = SUBJECTS.reduce((sum, s) => sum + Object.values(s.topics).flat().reduce((ss, t: Topic) => ss + t.videos.length, 0), 0);
    const totalCBCVids = CBC_SUBJECTS.reduce((sum, s) => sum + Object.values(s.topics).flat().reduce((ss, t: Topic) => ss + t.videos.length, 0), 0);
    const totalVideos  = total844Vids + totalCBCVids;
    const bestQuiz     = Object.values(progress).reduce((best: number, p: any) => Math.max(best, ...Object.values(p.quizScores || {}).map(Number)), 0);

    // Filter subjects for current curriculum
    const filteredSubjects = activeLibrary.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

    // Topics for selected subject + active grade/form
    const topics: Topic[] = selectedSubject ? (selectedSubject.topics[activeGrade] || []) : [];

    const TAB_CONFIG: { key: MainTab; label: string; icon: string; color: string }[] = [
        { key: 'videos',    label: '📹 Video Library',  icon: '📹', color: '#3b82f6' },
        { key: 'papers',    label: '📝 KCSE Papers',    icon: '📝', color: '#f59e0b' },
        { key: 'quizzes',   label: '🧠 Topical Quizzes', icon: '🧠', color: '#8b5cf6' },
        { key: 'progress',  label: '📊 My Progress',    icon: '📊', color: '#10b981' },
    ];

    // Merge DB videos into static topics: DB videos for matching subject+form come first
    const getVideosForTopic = (subjectId: string, formLevel: string, topicName: string, staticVideos: Video[] = []): Video[] => {
        const dbMatches = dbVideos
            .filter(v => v.subject_id === subjectId && v.form_level === formLevel && v.topic.toLowerCase() === topicName.toLowerCase())
            .map(v => ({ id: v.id, title: v.title, duration: v.duration || '00:00', youtubeId: v.youtube_id || '', channel: v.channel || 'Custom', isVerified: true }));
        return dbMatches.length > 0 ? dbMatches : staticVideos;
    };

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ════ HERO ════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)', minHeight: 180 }}>
                {/* Animated dot grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '22px 22px' }} />
                {/* Glow orbs */}
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle,#818cf8,transparent)', transform: 'translate(40%,-40%)' }} />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle,#6366f1,transparent)', transform: 'translate(-40%,40%)' }} />

                <div className="relative px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                                🎓
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-black text-white">APSIMS Learning</h1>
                                    <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full text-white" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>KICD ALIGNED ✓</span>
                                </div>
                                <p className="text-indigo-300 text-sm">🇰🇪 Kenya Curriculum · {total844Vids + totalCBCVids}+ Videos · 8-4-4 Forms 1-4 · CBC Grades 7-10 · KCSE Papers · Quizzes</p>
                                <p className="text-indigo-400 text-xs mt-0.5">Defeating Zeraki Learning — Free, built-in, no extra subscription</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <FiSearch size={14} className="absolute left-3 top-3 text-white/40" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects…"
                                    className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none text-white placeholder-white/40"
                                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', width: 200 }} />
                            </div>
                            <Link href="/dashboard/learning/manage-videos"
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-white/80 text-xs font-bold hover:text-white hover:bg-white/15 transition-all"
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                title="Super Admin: Manage Videos">
                                <FiVideo size={14} /> Manage Videos
                            </Link>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
                        {[
                            { label: 'Total Videos', value: totalVideos, icon: '🎬', sub: 'Both curricula' },
                            { label: 'Videos Watched', value: totalWatched, icon: '✅', sub: `of ${totalVideos}` },
                            { label: 'Best Quiz Score', value: `${bestQuiz}%`, icon: '🏆', sub: 'personal best' },
                            { label: '8-4-4 Subjects', value: SUBJECTS.length, icon: '📚', sub: 'Forms 1-4' },
                            { label: 'CBC Subjects', value: CBC_SUBJECTS.length, icon: '🆕', sub: 'Gr 7-10' },
                            { label: 'KCSE Papers', value: '140+', icon: '📝', sub: '2010-2023' },
                        ].map((k, i) => (
                            <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{k.icon}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">{k.label}</span>
                                </div>
                                <p className="text-2xl font-black text-white">{k.value}</p>
                                <p className="text-[10px] text-white/40 mt-0.5">{k.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ════ TABS ════════════════════════════════════════════════════════ */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TAB_CONFIG.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
                        style={tab === t.key
                            ? { background: 'linear-gradient(135deg,#1e1b4b,#4338ca)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(67,56,202,0.5)' }
                            : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                        <span>{t.icon}</span> {t.label.split(' ').slice(1).join(' ')}
                    </button>
                ))}
            </div>

            {/* ════ VIDEO LIBRARY TAB ══════════════════════════════════════════ */}
            {tab === 'videos' && (
                <div className="flex flex-col gap-4">
                    {/* ── DUAL CURRICULUM TOGGLE ─────────────────────────────── */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        {/* 8-4-4 vs CBC */}
                        <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: '#f1f5f9' }}>
                            {(['8-4-4', 'CBC'] as const).map(mode => (
                                <button key={mode} onClick={() => { setCurriculumMode(mode); setSelectedSubject(null); setSelectedForm(mode === '8-4-4' ? 'Form 1' : 'Grade 7'); setCbcGrade('Grade 7'); setCbcLevel('JSS'); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all"
                                    style={curriculumMode === mode
                                        ? { background: mode === '8-4-4' ? 'linear-gradient(135deg,#1e1b4b,#4338ca)' : 'linear-gradient(135deg,#065f46,#059669)', color:'#fff', boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }
                                        : { background:'transparent', color:'#64748b' }}>
                                    {mode === '8-4-4' ? '🏫 8-4-4 (Forms 1-4)' : '🆕 CBC (Grades 7-10)'}
                                </button>
                            ))}
                        </div>

                        {/* CBC Level toggle — JSS vs SSS */}
                        {curriculumMode === 'CBC' && (
                            <div className="flex gap-1.5 p-1.5 rounded-2xl" style={{ background: '#f0fdf4' }}>
                                {([['JSS','Junior Sec Gr 7-9'],['SSS','Senior Sec Gr 10-12']] as const).map(([lvl, lbl]) => (
                                    <button key={lvl} onClick={() => { setCbcLevel(lvl); setCbcGrade(lvl==='JSS'?'Grade 7':'Grade 10'); setSelectedSubject(null); }}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={cbcLevel === lvl
                                            ? { background:'linear-gradient(135deg,#059669,#34d399)', color:'#fff', boxShadow:'0 4px 12px rgba(5,150,105,0.35)' }
                                            : { color:'#059669' }}>
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CBC Grade selector */}
                        {curriculumMode === 'CBC' && (
                            <div className="flex gap-1.5 flex-wrap">
                                {activeGrades.map(g => (
                                    <button key={g} onClick={() => { setCbcGrade(g); setSelectedSubject(null); }}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2"
                                        style={cbcGrade === g
                                            ? { borderColor:'#059669', background:'#059669', color:'#fff' }
                                            : { borderColor:'#d1fae5', background:'#f0fdf4', color:'#059669' }}>
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* 8-4-4 Form filter shown in sidebar area; just a label here */}
                        {curriculumMode === '8-4-4' && (
                            <div className="flex items-center gap-2 ml-2">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                    📚 {SUBJECTS.length} subjects · {total844Vids} videos
                                </span>
                            </div>
                        )}
                        {curriculumMode === 'CBC' && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                    🆕 {cbcLevel === 'JSS' ? 'Junior' : 'Senior'} Secondary · {cbcGrade} · {filteredSubjects.filter(s => (s.topics[cbcGrade]?.length||0)>0).length} subjects available
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── MAIN CONTENT AREA ──────────────────────────────────── */}
                <div className="flex flex-col lg:flex-row gap-5">
                    {/* LEFT: Subject Grid */}
                    <div className="lg:w-80 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between"
                                style={{ background: curriculumMode === 'CBC' ? '#f0fdf4' : '#eff6ff' }}>
                                <h3 className="text-sm font-black" style={{ color: curriculumMode === 'CBC' ? '#065f46' : '#1e1b4b' }}>
                                    {curriculumMode === 'CBC' ? '🆕 CBC Subjects' : '📚 8-4-4 Subjects'}
                                </h3>
                                <span className="text-[10px] font-bold text-gray-400">{filteredSubjects.filter(s=>curriculumMode==='CBC'?(s.topics[cbcGrade]?.length||0)>0:true).length} available</span>
                            </div>
                            <div className="p-3 space-y-1 max-h-[75vh] overflow-y-auto">
                                {filteredSubjects
                                    .filter(sub => curriculumMode !== 'CBC' || (sub.topics[cbcGrade]?.length || 0) > 0)
                                    .map(sub => {
                                    const watched = progress[sub.id]?.watched?.length || 0;
                                    const tvids   = curriculumMode === 'CBC'
                                        ? (sub.topics[cbcGrade]?.reduce((s, t: Topic) => s + t.videos.length, 0) || 0)
                                        : Object.values(sub.topics).flat().reduce((s, t: Topic) => s + t.videos.length, 0);
                                    const pct     = tvids > 0 ? Math.round((watched / tvids) * 100) : 0;
                                    const isActive = selectedSubject?.id === sub.id;
                                    return (
                                        <button key={sub.id} onClick={() => { setSelectedSubject(sub); setSelectedForm('Form 1'); }}
                                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left"
                                            style={isActive ? { background: `${sub.color}15`, border: `2px solid ${sub.color}` } : { border: '2px solid transparent' }}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm" style={{ background: sub.gradient }}>
                                                {sub.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate">{sub.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: sub.gradient }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400">{pct}%</span>
                                                </div>
                                            </div>
                                            <FiChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Topic & Video List */}
                    <div className="flex-1">
                        {!selectedSubject ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
                                <div className="text-6xl mb-4">{curriculumMode === 'CBC' ? '🆕' : '📹'}</div>
                                <h3 className="text-lg font-black text-gray-700 mb-2">Select a {curriculumMode} Subject to Start Learning</h3>
                                <p className="text-sm text-gray-400">
                                    {curriculumMode === 'CBC'
                                        ? `Showing subjects for ${cbcGrade} (${cbcLevel === 'JSS' ? 'Junior Secondary' : 'Senior Secondary'})`
                                        : 'Click any subject on the left to browse KICD-aligned videos for Forms 1–4'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Subject Header */}
                                <div className="rounded-2xl p-5 text-white" style={{ background: selectedSubject.gradient }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{selectedSubject.icon}</span>
                                            <div>
                                                <h2 className="text-lg font-black">{selectedSubject.name}</h2>
                                                <p className="text-white/70 text-xs">
                                                    {selectedSubject.description}
                                                    {curriculumMode === 'CBC' && <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-white/25">{cbcGrade} · {cbcLevel === 'JSS'?'Junior':'Senior'} Secondary</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedSubject(null)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all">
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                    {/* Form / Grade Selector */}
                                    <div className="flex gap-2 mt-4 flex-wrap">
                                        {(curriculumMode === 'CBC' ? activeGrades : FORMS).map(f => (
                                            <button key={f}
                                                onClick={() => curriculumMode === 'CBC' ? setCbcGrade(f) : setSelectedForm(f)}
                                                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                                style={activeGrade === f
                                                    ? { background: 'rgba(255,255,255,0.95)', color: '#1e1b4b' }
                                                    : { background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Topics & Videos */}
                                {topics.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                                        <div className="text-4xl mb-3">📭</div>
                                        <p className="text-sm font-bold text-gray-500 mb-1">No videos yet for {activeGrade} in {selectedSubject.name}</p>
                                        <p className="text-xs text-gray-400">Teachers can upload resources via the LMS module · This grade may have videos in other levels</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {topics.map((topic, ti) => (
                                            <div key={ti} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: `${selectedSubject.color}08` }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: selectedSubject.gradient }}>{ti + 1}</span>
                                                        <h4 className="text-sm font-black text-gray-800">{topic.name}</h4>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400">{topic.videos.length} video{topic.videos.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {topic.videos.map(vid => {
                                                        const isWatched = progress[selectedSubject.id]?.watched?.includes(vid.id);
                                                        return (
                                                            <button key={vid.id} onClick={() => setSelectedVideo(vid)}
                                                                className="group flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-md"
                                                                style={{ border: `1.5px solid ${isWatched ? selectedSubject.color+'40' : '#e5e7eb'}`, background: isWatched ? `${selectedSubject.color}08` : '#fafafa' }}>
                                                                {/* Thumbnail */}
                                                                <div className="relative flex-shrink-0 w-24 rounded-lg overflow-hidden">
                                                                    <img src={ytThumb(vid.youtubeId)} alt={vid.title}
                                                                        className="w-24 h-14 object-cover"
                                                                        onError={(e: any) => { e.target.style.display='none'; }} />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all rounded-lg">
                                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: selectedSubject.gradient }}>
                                                                            <FiPlay size={12} className="text-white ml-0.5" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] font-bold px-1 rounded">{vid.duration}</div>
                                                                </div>
                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 mb-1">{vid.title}</p>
                                                                    <p className="text-[10px] text-gray-400">{vid.channel}</p>
                                                                    {isWatched && <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700"><FiCheck size={8} /> Watched</span>}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                </div>
            )}

            {/* ════ KCSE PAST PAPERS TAB ══════════════════════════════════════ */}
            {tab === 'papers' && (
                <div className="space-y-5">
                    {/* Header */}
                    <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#92400e,#d97706,#f59e0b)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">📝</span>
                            <div>
                                <h2 className="text-xl font-black">KCSE Past Papers</h2>
                                <p className="text-amber-100 text-sm">2010 – 2023 · All Subjects · Official KNEC Questions & Marking Schemes</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-amber-200 block mb-1 uppercase">Year</label>
                                <select value={paperYear} onChange={e => setPaperYear(Number(e.target.value))}
                                    className="px-3 py-2 rounded-xl text-sm font-bold outline-none" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    {PAST_PAPERS_YEARS.map(y => <option key={y} value={y} style={{ background: '#92400e' }}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-amber-200 block mb-1 uppercase">Subject</label>
                                <select value={paperSubject} onChange={e => setPaperSubject(e.target.value)}
                                    className="px-3 py-2 rounded-xl text-sm font-bold outline-none" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                                    <option value="" style={{ background: '#92400e' }}>All Subjects</option>
                                    {PAPER_SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#92400e' }}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Papers Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(paperSubject ? PAPER_SUBJECTS.filter(s => s === paperSubject) : PAPER_SUBJECTS).map(subject => {
                            const subjectData = SUBJECTS.find(s => s.name === subject || subject.includes(s.name.split(' ')[0]));
                            // Build smart links to real paper repositories
                            const googleSearch = (paper: string) => `https://www.google.com/search?q=KCSE+${paperYear}+${encodeURIComponent(subject)}+${encodeURIComponent(paper)}+past+paper+marking+scheme+Kenya`;
                            const easyElimu = `https://www.easyelimu.com/ke/exams/kcse?search=${encodeURIComponent(subject)}`;
                            const ytSearch = (paper: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`KCSE ${paperYear} ${subject} ${paper} Kenya solved`)}`;
                            return (
                                <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                    <div className="p-4 flex items-center gap-3" style={{ background: subjectData?.gradient || 'linear-gradient(135deg,#374151,#6b7280)' }}>
                                        <span className="text-2xl">{subjectData?.icon || '📄'}</span>
                                        <div>
                                            <p className="text-white font-black text-sm">{subject}</p>
                                            <p className="text-white/70 text-[10px]">KCSE {paperYear} · 3 sources</p>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {['Paper 1', 'Paper 2'].map((paper, pi) => (
                                            <div key={pi} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                                                        style={{ background: pi === 0 ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
                                                        P{pi + 1}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700">{paper}</span>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <a href={googleSearch(paper)} target="_blank" rel="noopener noreferrer"
                                                        className="px-2.5 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1">
                                                        <FiExternalLink size={10} /> Google
                                                    </a>
                                                    <a href={ytSearch(paper)} target="_blank" rel="noopener noreferrer"
                                                        className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1">
                                                        <FiPlay size={10} /> YouTube
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                        {subject === 'Biology' || subject === 'Chemistry' || subject === 'Physics' ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#065f46,#10b981)' }}>P3</div>
                                                    <span className="text-sm font-semibold text-gray-700">Paper 3 (Practical)</span>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    <a href={googleSearch('Paper 3 Practical')} target="_blank" rel="noopener noreferrer"
                                                        className="px-2.5 py-1.5 text-[10px] font-bold text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all flex items-center gap-1">
                                                        <FiExternalLink size={10} /> Google
                                                    </a>
                                                    <a href={ytSearch('Paper 3 Practical')} target="_blank" rel="noopener noreferrer"
                                                        className="px-2.5 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all flex items-center gap-1">
                                                        <FiPlay size={10} /> YouTube
                                                    </a>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Note */}
                    <div className="rounded-xl p-4 flex items-start gap-3 border" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="text-sm font-bold text-amber-800">Official KNEC Papers</p>
                            <p className="text-xs text-amber-700 mt-0.5">Links direct to the official KNEC Portal at knec-portal.ac.ke for authentic exam papers. Teachers can also upload papers directly via the LMS module → Resources section.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ QUIZZES TAB ════════════════════════════════════════════════ */}
            {tab === 'quizzes' && (
                <div className="space-y-5">
                    {/* Header */}
                    <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed,#a78bfa)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl">🧠</span>
                            <div>
                                <h2 className="text-xl font-black">Topical Quizzes</h2>
                                <p className="text-purple-200 text-sm">Test your understanding · Instant feedback · Track your scores</p>
                            </div>
                        </div>
                        {/* Subject Selector */}
                        <div className="flex flex-wrap gap-2">
                            {['mathematics','biology','chemistry','physics'].map(sid => {
                                const sub = SUBJECTS.find(s => s.id === sid)!;
                                return (
                                    <button key={sid} onClick={() => setQuizSubject(sid)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                                        style={quizSubject === sid
                                            ? { background: 'rgba(255,255,255,0.95)', color: '#4c1d95' }
                                            : { background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                                        <span>{sub.icon}</span> {sub.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quiz Panel */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                        <QuizPanel key={quizSubject} subjectId={quizSubject} />
                    </div>
                </div>
            )}

            {/* ════ PROGRESS TAB ══════════════════════════════════════════════ */}
            {tab === 'progress' && (
                <div className="space-y-5">
                    {/* Header */}
                    <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#064e3b,#059669,#34d399)' }}>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">📊</span>
                            <div>
                                <h2 className="text-xl font-black">My Learning Progress</h2>
                                <p className="text-emerald-200 text-sm">Track your videos watched, quiz scores & study journey</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
                            {[
                                { label:'Videos Watched', value:totalWatched, icon:'🎬' },
                                { label:'Completion', value:`${totalVideos>0?Math.round(totalWatched/totalVideos*100):0}%`, icon:'📈' },
                                { label:'Best Quiz', value:`${bestQuiz}%`, icon:'🏆' },
                                { label:'Subjects Active', value:Object.keys(progress).length, icon:'📚' },
                            ].map((k,i) => (
                                <div key={i} className="rounded-xl p-3" style={{ background:'rgba(255,255,255,0.12)' }}>
                                    <span className="text-lg">{k.icon}</span>
                                    <p className="text-xl font-black text-white mt-1">{k.value}</p>
                                    <p className="text-[10px] text-emerald-200">{k.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Per-Subject Progress */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-black text-gray-800">📚 Progress by Subject</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {SUBJECTS.map(sub => {
                                const tvids   = Object.values(sub.topics).flat().reduce((s, t: Topic) => s + t.videos.length, 0);
                                const watched = progress[sub.id]?.watched?.length || 0;
                                const pct     = tvids > 0 ? Math.round((watched / tvids) * 100) : 0;
                                const scores  = Object.values(progress[sub.id]?.quizScores || {}).map(Number);
                                const bestS   = scores.length > 0 ? Math.max(...scores) : null;
                                return (
                                    <div key={sub.id}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{sub.icon}</span>
                                                <span className="text-sm font-bold text-gray-700">{sub.name}</span>
                                                {bestS !== null && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">Quiz: {bestS}%</span>}
                                            </div>
                                            <span className="text-xs font-black" style={{ color: sub.color }}>{watched}/{tvids} videos · {pct}%</span>
                                        </div>
                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: sub.gradient }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recommendation */}
                    {totalWatched === 0 && (
                        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe' }}>
                            <div className="text-4xl mb-3">🚀</div>
                            <h3 className="text-lg font-black text-blue-800">Start Your Learning Journey!</h3>
                            <p className="text-sm text-blue-600 mt-1">Watch your first video in the Video Library → your progress will be tracked here automatically</p>
                            <button onClick={() => setTab('videos')} className="mt-4 px-6 py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                📹 Go to Video Library
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ════ VIDEO MODAL ════════════════════════════════════════════════ */}
            {selectedVideo && selectedSubject && (
                <VideoModal
                    video={selectedVideo}
                    subject={selectedSubject}
                    onClose={() => { setSelectedVideo(null); setProgress(getProgress()); }}
                />
            )}
        </div>
    );
}
