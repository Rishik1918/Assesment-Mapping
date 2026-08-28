'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, Info, Sparkles, 
  ZoomIn, ZoomOut, 
  ChevronLeft, ChevronRight, ArrowRight, Menu,
  Maximize2, X
} from 'lucide-react';
import { processFileToImages, getPdfPageCount, checkPdfSwapLocally } from '@/utils/pdf';

// Schema Interfaces
interface Question {
  id: string;
  number: string;
  text: string;
  marks: number;
}

interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

interface AnswerLocation {
  pageIndex: number;
  boundingBox: BoundingBox;
}

interface Answer {
  questionNumber: string;
  studentAnswerText: string;
  pageIndex: number;
  boundingBox: BoundingBox;
  locations?: AnswerLocation[];
  evaluation: {
    status: 'correct' | 'incorrect' | 'partial';
    marksAwarded: number;
    feedback: string;
  };
}

interface UnmatchedAnswer {
  studentAnswerText: string;
  pageIndex: number;
  boundingBox: BoundingBox;
}

interface AssessmentResult {
  questions: Question[];
  answers: Answer[];
  unansweredQuestions: string[];
  unmatchedAnswers: UnmatchedAnswer[];
  overallSummary: {
    totalMarksObtained: number;
    totalPossibleMarks: number;
    overallFeedback: string;
  };
}

// ----------------------------------------------------
// INLINE VECTOR SVGS MATCHING FIGMA SCREENSHOTS EXACTLY
// ----------------------------------------------------
const MOCK_ANSWER_SHEET = [
  // Page 1: Q1 and Q2 (Photosynthesis definitions and plant diagram)
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background:%23fafaf9; font-family:'Courier New', monospace; padding:40px;">
    <!-- Renders lined paper background -->
    <rect width="100%" height="100%" fill="%23faf6f0" />
    <path d="M 0,50 L 800,50 M 0,100 L 800,100 M 0,150 L 800,150 M 0,200 L 800,200 M 0,250 L 800,250 M 0,300 L 800,300 M 0,350 L 800,350 M 0,400 L 800,400 M 0,450 L 800,450 M 0,500 L 800,500 M 0,550 L 800,550 M 0,600 L 800,600 M 0,650 L 800,650 M 0,700 L 800,700 M 0,750 L 800,750 M 0,800 L 800,800 M 0,850 L 800,850 M 0,900 L 800,900" fill="none" stroke="%23ebdcc5" stroke-width="0.5" />
    
    <!-- Red margin line -->
    <line x1="90" y1="0" x2="90" y2="1000" stroke="%23fca5a5" stroke-width="1.5" />
    
    <!-- Handwritten Q1 -->
    <text x="40" y="80" font-size="16" font-weight="bold" fill="%231e3a8a">Q1.</text>
    <text x="110" y="80" font-size="15" font-weight="bold" fill="%231e293b">Photosynthesis is the process used by</text>
    <text x="110" y="110" font-size="15" fill="%23334155">green plants and some other organisms</text>
    <text x="110" y="140" font-size="15" fill="%23334155">to convert light energy into chemical</text>
    <text x="110" y="170" font-size="15" fill="%23334155">energy.</text>
    
    <!-- Chemical Equation -->
    <text x="110" y="220" font-size="14" font-weight="bold" fill="%231e3a8a">6CO₂ + 6H₂O --[Light/Chlorophyll]--&gt; C₆H₁₂O₆ + 6O₂</text>
    
    <!-- Photosynthesis Diagram -->
    <!-- Sun -->
    <circle cx="580" cy="360" r="25" fill="none" stroke="%23d97706" stroke-width="2" />
    <path d="M 580,325 L 580,310 M 580,395 L 580,410 M 545,360 L 530,360 M 615,360 L 630,360 M 555,335 L 545,325 M 605,385 L 615,395 M 555,385 L 545,395 M 605,335 L 615,325" stroke="%23d97706" stroke-width="2" />
    <text x="580" y="445" font-size="12" fill="%23d97706" text-anchor="middle">Sunlight</text>
    
    <!-- Plant drawing -->
    <!-- Stem & Leaves -->
    <path d="M 380,480 Q 380,380 380,360" fill="none" stroke="%23059669" stroke-width="3" />
    <path d="M 380,440 Q 320,410 330,390 Q 360,400 380,430" fill="%2310b981" stroke="%23059669" stroke-width="1.5" />
    <path d="M 380,410 Q 440,390 430,370 Q 400,380 380,405" fill="%2310b981" stroke="%23059669" stroke-width="1.5" />
    <!-- Roots & Soil -->
    <path d="M 380,480 L 380,520 M 380,490 L 360,510 M 380,500 L 400,515" stroke="%2378350f" stroke-width="2" />
    <path d="M 280,480 Q 380,485 480,480" fill="none" stroke="%2378350f" stroke-width="2" />
    
    <!-- Diagram Labels -->
    <text x="260" y="380" font-size="13" fill="%23334155" text-anchor="end">Carbon dioxide</text>
    <path d="M 270,375 L 340,390" stroke="%23475569" stroke-width="1" marker-end="url(%23arrow)" />
    
    <text x="500" y="380" font-size="13" fill="%23334155" text-anchor="start">Oxygen</text>
    <path d="M 410,385 L 490,375" stroke="%23475569" stroke-width="1" />
    
    <text x="380" y="550" font-size="13" fill="%23334155" text-anchor="middle">Water</text>
    <path d="M 380,535 L 380,515" stroke="%23475569" stroke-width="1" />
    
    <!-- Q2 Handwritten Answer -->
    <text x="40" y="630" font-size="16" font-weight="bold" fill="%231e3a8a">Q2.</text>
    <text x="110" y="630" font-size="15" font-weight="bold" fill="%231e293b">The process mainly occurs in the</text>
    <text x="110" y="660" font-size="15" fill="%23334155">chloroplast of the plant cell. It has</text>
    <text x="110" y="690" font-size="15" fill="%23334155">two main stages:</text>
    <text x="110" y="720" font-size="15" fill="%23334155">1. Light reaction - Captures light energy.</text>
    <text x="110" y="750" font-size="15" fill="%23334155">2. Dark reaction - Uses energy to</text>
    <text x="110" y="780" font-size="15" fill="%23334155">   make glucose.</text>

    <!-- Marker definition -->
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="%23475569" />
      </marker>
    </defs>
  </svg>`,

  // Page 2: Q3, Q5, and Q6 (Math steps and math drawings)
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background:%23faf6f0; font-family:'Courier New', monospace; padding:40px;">
    <rect width="100%" height="100%" fill="%23faf6f0" />
    <path d="M 0,50 L 800,50 M 0,100 L 800,100 M 0,150 L 800,150 M 0,200 L 800,200 M 0,250 L 800,250 M 0,300 L 800,300 M 0,350 L 800,350 M 0,400 L 800,400 M 0,450 L 800,450 M 0,500 L 800,500 M 0,550 L 800,550 M 0,600 L 800,600 M 0,650 L 800,650 M 0,700 L 800,700 M 0,750 L 800,750 M 0,800 L 800,800 M 0,850 L 800,850 M 0,900 L 800,900" fill="none" stroke="%23ebdcc5" stroke-width="0.5" />
    <line x1="90" y1="0" x2="90" y2="1000" stroke="%23fca5a5" stroke-width="1.5" />
    
    <!-- Q3 math -->
    <text x="40" y="80" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 3.</text>
    <text x="110" y="80" font-size="15" fill="%230f172a">To solve: 3x + 7 = 22</text>
    <text x="110" y="110" font-size="15" fill="%230f172a">Step 1: Subtract 7 from both sides</text>
    <text x="180" y="140" font-size="15" font-weight="bold" fill="%231e3a8a">3x = 22 - 7 = 15</text>
    <text x="110" y="175" font-size="15" fill="%230f172a">Step 2: Divide by 3</text>
    <text x="180" y="205" font-size="15" font-weight="bold" fill="%231e3a8a">x = 15 / 3 = 5</text>
    <text x="110" y="240" font-size="15" fill="%23059669">Correct value is x = 5.</text>
    
    <!-- Q5 diagram -->
    <text x="40" y="320" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 5.</text>
    <text x="110" y="320" font-size="15" font-weight="bold" fill="%231e293b">Alveolus structure diagram:</text>
    <!-- Alveolar sac circles -->
    <path d="M 250,420 C 230,400 230,360 260,350 C 280,330 320,330 330,360 C 360,350 390,380 380,410 C 400,430 390,470 360,480 C 350,510 300,510 280,480 C 250,490 230,460 250,420 Z" fill="none" stroke="%23334155" stroke-width="2" />
    <text x="310" y="420" font-size="12" fill="%23475569" text-anchor="middle">Air Space</text>
    
    <!-- Capillary line looping around -->
    <path d="M 200,380 Q 280,300 420,370 Q 430,460 300,530" fill="none" stroke="%23dc2626" stroke-width="1.5" />
    <text x="430" y="420" font-size="11" fill="%23dc2626">Capillary</text>
    
    <!-- Q6 digest diagram note -->
    <text x="40" y="600" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 6.</text>
    <text x="110" y="600" font-size="14" fill="%230f172a">Digestive system parts: Esophagus, Stomach,</text>
    <text x="110" y="630" font-size="14" fill="%230f172a">Small Intestine, Large Intestine, Liver.</text>
    <text x="110" y="660" font-size="14" fill="%23dc2626">[Pancreas is not labeled in draft]</text>
  </svg>`,

  // Page 3: Q7, Q8, Q10 (Nephron structure and explanation)
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background:%23faf6f0; font-family:'Courier New', monospace; padding:40px;">
    <rect width="100%" height="100%" fill="%23faf6f0" />
    <path d="M 0,50 L 800,50 M 0,100 L 800,100 M 0,150 L 800,150 M 0,200 L 800,200 M 0,250 L 800,250 M 0,300 L 800,300 M 0,350 L 800,350 M 0,400 L 800,400 M 0,450 L 800,450 M 0,500 L 800,500" fill="none" stroke="%23ebdcc5" stroke-width="0.5" />
    <line x1="90" y1="0" x2="90" y2="1000" stroke="%23fca5a5" stroke-width="1.5" />
    
    <!-- Q7 Nephron -->
    <text x="40" y="80" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 7.</text>
    <text x="110" y="80" font-size="15" font-weight="bold" fill="%231e293b">Nephron Sketch &amp; Labels:</text>
    
    <!-- Bowman's Capsule cup -->
    <path d="M 180,180 Q 210,130 250,150 Q 290,170 290,200 Q 290,230 250,230 Q 210,240 180,200" fill="none" stroke="%23334155" stroke-width="2" />
    <text x="240" y="125" font-size="11" fill="%23475569">Bowman's Capsule</text>
    
    <!-- Glomerulus inside cup -->
    <path d="M 220,180 Q 240,160 230,195 Q 260,180 240,210 Q 220,200 235,185" fill="none" stroke="%23dc2626" stroke-width="1.5" />
    <text x="150" y="160" font-size="11" fill="%23dc2626">Glomerulus</text>
    
    <!-- Tubule loop -->
    <path d="M 285,200 Q 350,200 370,250 L 370,350 Q 370,380 390,380 Q 410,380 410,350 L 410,230 Q 430,200 500,200" fill="none" stroke="%23334155" stroke-width="2" />
    <text x="390" y="415" font-size="11" fill="%23475569" text-anchor="middle">Loop of Henle</text>
    
    <!-- Q8 Explanation -->
    <text x="40" y="470" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 8.</text>
    <text x="110" y="470" font-size="14" fill="%230f172a">Palisade cells: Top layer, highly column-shaped,</text>
    <text x="110" y="500" font-size="14" fill="%230f172a">tightly packed, contain most chloroplasts for photosynthesis.</text>
    <text x="110" y="530" font-size="14" fill="%230f172a">Spongy cells: Lower layer, rounded shape, loose packing</text>
    <text x="110" y="560" font-size="14" fill="%230f172a">with extensive air spaces for gas exchange.</text>
  </svg>`,

  // Page 4: Q11, Q12, Q13 (Etiolation, transpiration, ventilation calculation)
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background:%23faf6f0; font-family:'Courier New', monospace; padding:40px;">
    <rect width="100%" height="100%" fill="%23faf6f0" />
    <path d="M 0,50 L 800,50 M 0,100 L 800,100 M 0,150 L 800,150 M 0,200 L 800,200 M 0,250 L 800,250 M 0,300 L 800,300 M 0,350 L 800,350 M 0,400 L 800,400 M 0,450 L 800,450 M 0,500 L 800,500 M 0,550 L 800,550 M 0,600 L 800,600 M 0,650 L 800,650 M 0,700 L 800,700" fill="none" stroke="%23ebdcc5" stroke-width="0.5" />
    <line x1="90" y1="0" x2="90" y2="1000" stroke="%23fca5a5" stroke-width="1.5" />
    
    <!-- Q11 etiolation -->
    <text x="40" y="80" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 11.</text>
    <text x="110" y="80" font-size="14" font-weight="bold" fill="%231e293b">a) Plant B etiolated due to darkness.</text>
    <text x="110" y="110" font-size="14" fill="%23334155">It grows longer/weaker stems to find light sources.</text>
    <text x="110" y="145" font-size="14" font-weight="bold" fill="%231e293b">b) Recommendation:</text>
    <text x="110" y="175" font-size="14" fill="%23b91c1c">Provide daily watering to support root growth.</text>
    
    <!-- Q12 transpiration -->
    <text x="40" y="250" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 12.</text>
    <text x="110" y="250" font-size="14" fill="%230f172a">Transpiration is the evaporation of water vapor</text>
    <text x="110" y="280" font-size="14" fill="%230f172a">from plant leaves through the stomatal openings.</text>
    <text x="110" y="310" font-size="14" fill="%230f172a">This creates a negative pressure pull (transpiration pull)</text>
    <text x="110" y="340" font-size="14" fill="%230f172a">to draw water up from the roots via xylem tubes.</text>
    
    <!-- Q13 alveolar calculations -->
    <text x="40" y="440" font-size="16" font-weight="bold" fill="%231e3a8a">Ans 13.</text>
    <text x="110" y="440" font-size="14" font-weight="bold" fill="%231e293b">Alveolar Ventilation calculation:</text>
    <text x="110" y="475" font-size="14" fill="%230f172a">Formula: AV = (Tidal Volume - Dead Space) * Resp. Rate</text>
    <text x="110" y="505" font-size="14" fill="%230f172a">Given: Dead Space = 0.15 L</text>
    <text x="110" y="535" font-size="14" fill="%230f172a">Let average Tidal Volume = 0.50 L, Resp. Rate = 12 breaths/min</text>
    <text x="110" y="570" font-size="14" fill="%230f172a">AV = (0.50 - 0.15) * 12</text>
    <text x="110" y="600" font-size="14" fill="%230f172a">AV = 0.35 * 12</text>
    <text x="110" y="630" font-size="15" font-weight="bold" fill="%23059669">AV = 4.2 L / min</text>
    
    <text x="700" y="960" font-size="12" fill="%23b45309">Page 4</text>
  </svg>`
];

const MOCK_RESULT: AssessmentResult = {
  questions: [
    { id: 'q1', number: '1', text: 'Which blood vessel carries blood away from the heart?', marks: 2 },
    { id: 'q2', number: '2', text: 'Which of the following organelles is primarily involved in photosynthesis?', marks: 2 },
    { id: 'q3', number: '3', text: 'Explain the role of chloroplasts in photosynthesis, naming the main pigments involved and briefly outlining the two major stages of the process.', marks: 2 },
    { id: 'q4', number: '4', text: 'Describe the flow of blood through the human heart starting from the right atrium and ending at the aorta; include the names of valves crossed.', marks: 2 },
    { id: 'q5', number: '5', text: 'Draw a labelled diagram of an alveolus showing capillaries and air space (label alveolar sac, capillary, and direction of gas exchange).', marks: 2 },
    { id: 'q6', number: '6', text: 'Draw a neat labelled diagram of the human digestive system (stomach, small intestine, large intestine, liver, pancreas) and label the site where most absorption occurs.', marks: 5 },
    { id: 'q7', number: '7', text: 'Draw and label a nephron (Bowman\'s capsule, glomerulus, proximal tubule, loop of Henle, distal tubule, collecting duct).', marks: 5 },
    { id: 'q8', number: '8', text: 'Explain the structural differences between palisade mesophyll and spongy mesophyll and state how each structure aids its function in the leaf.', marks: 5 },
    { id: 'q9', number: '9', text: 'Describe the process of transpiration in plants and name two environmental factors that increase its rate.', marks: 5 },
    { id: 'q10', number: '10', text: 'Explain how the structure of xylem vessels facilitates water transport in plants (mention one structural feature and its role).', marks: 5 },
    { id: 'q11_a', number: '11 a.', text: 'A diagram shows two potted plants - Plant A in bright light with broad green leaves, Plant B kept in dim light with pale, elongated leaves. Explain the structural differences between them.', marks: 2 },
    { id: 'q11_b', number: '11 b.', text: 'Suggest one practical measure to help Plant B recover.', marks: 3 },
    { id: 'q12', number: '12', text: 'Describe the process of transpiration in plants and name two environmental factors that increase its rate.', marks: 5 },
    { id: 'q13', number: '13', text: 'If dead space is 0.15 L per breath, calculate the alveolar ventilation per minute. Show working.', marks: 5 }
  ],
  answers: [
    {
      questionNumber: '1',
      studentAnswerText: 'Photosynthesis is the process used by green plants and some other organisms to convert light energy into chemical energy.',
      pageIndex: 0,
      boundingBox: { ymin: 60, xmin: 30, ymax: 200, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 2,
        feedback: 'Correct description. Stated the conversion of light energy into chemical energy and wrote the basic chemical equation.'
      }
    },
    {
      questionNumber: '2',
      studentAnswerText: 'The process mainly occurs in the chloroplast of the plant cell. It has two main stages: 1. Light reaction - Captures light energy. 2. Dark reaction - Uses energy to make glucose.',
      pageIndex: 0,
      boundingBox: { ymin: 610, xmin: 30, ymax: 820, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 2,
        feedback: 'Excellent work! You correctly identified the chloroplast as the organelle responsible for photosynthesis. Keep it up!'
      }
    },
    {
      questionNumber: '3',
      studentAnswerText: 'To solve: 3x + 7 = 22 -> 3x = 15 -> x = 5',
      pageIndex: 1,
      boundingBox: { ymin: 60, xmin: 30, ymax: 260, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 2,
        feedback: 'Named the chloroplast and chlorophyll pigments, and correctly outlined the light and dark reaction stages.'
      }
    },
    {
      questionNumber: '5',
      studentAnswerText: 'Alveolus structure diagram showing Air Space and surrounding Capillary loop.',
      pageIndex: 1,
      boundingBox: { ymin: 300, xmin: 30, ymax: 560, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 2,
        feedback: 'Correctly sketched the alveolus layout showing air space, capillary blood vessel, and labels.'
      }
    },
    {
      questionNumber: '6',
      studentAnswerText: 'Digestive system parts: Esophagus, Stomach, Small Intestine, Large Intestine, Liver.',
      pageIndex: 1,
      boundingBox: { ymin: 580, xmin: 30, ymax: 700, xmax: 950 },
      evaluation: {
        status: 'partial',
        marksAwarded: 4,
        feedback: 'Good description of digestive system components, but missed labeling the pancreas.'
      }
    },
    {
      questionNumber: '7',
      studentAnswerText: 'Nephron sketch showing Bowman\'s Capsule, Glomerulus, and Loop of Henle.',
      pageIndex: 2,
      boundingBox: { ymin: 60, xmin: 30, ymax: 440, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 5,
        feedback: 'Excellent sketch of a nephron. Stated and labeled all requested structures accurately.'
      }
    },
    {
      questionNumber: '8',
      studentAnswerText: 'Palisade cells: Top layer, column shaped, packed. Spongy cells: Lower layer, rounded, loose packing with air spaces.',
      pageIndex: 2,
      boundingBox: { ymin: 450, xmin: 30, ymax: 590, xmax: 950 },
      evaluation: {
        status: 'partial',
        marksAwarded: 3,
        feedback: 'Correctly contrasted the packed columns of palisade mesophyll with the loose spongy layer. Could add more detail on gas exchange mechanisms.'
      }
    },
    {
      questionNumber: '11 a.',
      studentAnswerText: 'Plant B etiolated due to darkness. It grows longer/weaker stems to find light sources.',
      pageIndex: 3,
      boundingBox: { ymin: 60, xmin: 30, ymax: 130, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 2,
        feedback: 'Correct. Explained that etiolation is the elongation response of Plant B due to the absence of light.'
      }
    },
    {
      questionNumber: '11 b.',
      studentAnswerText: 'Provide daily watering to support root growth.',
      pageIndex: 3,
      boundingBox: { ymin: 140, xmin: 30, ymax: 200, xmax: 950 },
      evaluation: {
        status: 'incorrect',
        marksAwarded: 1,
        feedback: 'Incorrect recommendation. To recover from etiolation, Plant B requires sunlight exposure, not additional water.'
      }
    },
    {
      questionNumber: '12',
      studentAnswerText: 'Transpiration is the evaporation of water vapor from plant leaves through the stomatal openings.',
      pageIndex: 3,
      boundingBox: { ymin: 230, xmin: 30, ymax: 370, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 4,
        feedback: 'Correct definition of transpiration and its driving forces (negative pressure pull).'
      }
    },
    {
      questionNumber: '13',
      studentAnswerText: 'AV = (Tidal Volume - Dead Space) * Resp. Rate. AV = (0.50 - 0.15) * 12 = 4.2 L/min.',
      pageIndex: 3,
      boundingBox: { ymin: 420, xmin: 30, ymax: 660, xmax: 950 },
      evaluation: {
        status: 'correct',
        marksAwarded: 4,
        feedback: 'Correct formula, substitution steps, and calculation results.'
      }
    }
  ],
  unansweredQuestions: ['4', '9', '10'],
  unmatchedAnswers: [],
  overallSummary: {
    totalMarksObtained: 38,
    totalPossibleMarks: 49,
    overallFeedback: "The student performed very well overall, scoring 38/49. Math and biology drawings (Alveolus, Nephron) were sketched nicely. However, the student completely skipped three major 5-mark/2-mark questions (Q4, Q9, Q10). Transpiration definition was correct, but the recommend recovery step in 11(b) was incorrect."
  }
};

export default function AssessmentDashboard() {
  const [activeTab, setActiveTab] = useState<'exams' | 'settings'>('exams');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  
  // Files and images
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [qpPageCount, setQpPageCount] = useState<number>(0);
  const [ansPageCount, setAnsPageCount] = useState<number>(0);
  const [ansImages, setAnsImages] = useState<string[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activePageIdx, setActivePageIdx] = useState<number>(0);

  // Watch files and compute page counts dynamically
  useEffect(() => {
    if (qpFile) {
      if (qpFile.type === 'application/pdf' || qpFile.name.endsWith('.pdf')) {
        getPdfPageCount(qpFile).then(count => setQpPageCount(count));
      } else {
        setQpPageCount(1);
      }
    } else {
      setQpPageCount(0);
    }
  }, [qpFile]);

  useEffect(() => {
    if (ansFile) {
      if (ansFile.type === 'application/pdf' || ansFile.name.endsWith('.pdf')) {
        getPdfPageCount(ansFile).then(count => setAnsPageCount(count));
      } else {
        setAnsPageCount(1);
      }
    } else {
      setAnsPageCount(0);
    }
  }, [ansFile]);
  
  // Processing & result states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [result, setResult] = useState<AssessmentResult | null>(null);
  
  // Selected visual highlights
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState<string | null>(null);
  const [mobileActiveView, setMobileActiveView] = useState<'questions' | 'sheet'>('questions');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);
  
  // Zoom and scroll references
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sheetScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Customizable school/teacher details
  const [teacherName, setTeacherName] = useState<string>('Madhur Rastogi');
  const [schoolName, setSchoolName] = useState<string>('Delhi Public School');
  const [schoolBranch, setSchoolBranch] = useState<string>('Bokaro Steel City');
  const [subjectName, setSubjectName] = useState<string>('Biology');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Auto-collapse sidebar during extraction and results view
  useEffect(() => {
    if (isProcessing || result) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isProcessing, result]);

  // Load API Key and metadata from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) setGeminiApiKey(storedKey);

      const tName = localStorage.getItem('teacher_name');
      if (tName) setTeacherName(tName);

      const sName = localStorage.getItem('school_name');
      if (sName) setSchoolName(sName);

      const sBranch = localStorage.getItem('school_branch');
      if (sBranch) setSchoolBranch(sBranch);

      const subName = localStorage.getItem('subject_name');
      if (subName) setSubjectName(subName);
    }
  }, []);

  const saveApiKey = (key: string) => {
    setGeminiApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gemini_api_key', key);
    }
  };

  const saveSettings = (t: string, sn: string, sb: string, sub: string) => {
    setTeacherName(t);
    setSchoolName(sn);
    setSchoolBranch(sb);
    setSubjectName(sub);
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_name', t);
      localStorage.setItem('school_name', sn);
      localStorage.setItem('school_branch', sb);
      localStorage.setItem('subject_name', sub);
    }
  };

  // Convert File to base64 images helper
  const loadFilesToImages = async (file: File, isQP: boolean, maxDim = 1200, quality = 0.8) => {
    try {
      const images = await processFileToImages(file, maxDim, quality);
      if (!isQP) {
        setAnsImages(images);
      }
      return images;
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown file error';
      throw new Error(`Failed to read file ${file.name}: ${msg}`);
    }
  };

  // Trigger Gemini assessment extraction
  const handleProcessAssessment = async () => {
    if (!qpFile || !ansFile) {
      setApiError('Please upload both the Question Paper and Student Answer Sheet.');
      return;
    }
    if (qpFile.name === ansFile.name || (qpFile.size === ansFile.size && qpFile.size > 0)) {
      setApiError('Mismatched Files: The Question Paper and Student Answer Sheet cannot be the same file. Please upload distinct documents.');
      return;
    }
    setApiError(null);
    setIsProcessing(true);
    setResult(null);

    try {
      setProcessingStep('Converting files to canvas layouts...');
      
      const swapCheck = await checkPdfSwapLocally(qpFile, ansFile);
      if (swapCheck.swapped) {
        setApiError(swapCheck.reason || 'Mismatched Files: The Question Paper and Student Answer Sheet appear to be swapped.');
        setIsProcessing(false);
        return;
      }

      // Calculate dynamic maxDim and quality based on combined page count
      const qpPageCount = await getPdfPageCount(qpFile);
      const ansPageCount = await getPdfPageCount(ansFile);
      const totalPages = qpPageCount + ansPageCount;

      let maxDim = 1400; // default large size for small documents
      let quality = 0.85;

      // Only reduce quality if they are NOT using their own API key (because of Vercel limits)
      if (!geminiApiKey) {
        if (totalPages > 4) {
          maxDim = 1000;
          quality = 0.75;
        }
        if (totalPages > 7) {
          maxDim = 850;
          quality = 0.7;
        }
      }
      
      const paperImages = await loadFilesToImages(qpFile, true, maxDim, quality);
      const answerImages = await loadFilesToImages(ansFile, false, maxDim, quality);

      const totalBase64Length = paperImages.reduce((sum, img) => sum + img.length, 0) + answerImages.reduce((sum, img) => sum + img.length, 0);
      const estimatedBytes = totalBase64Length * 0.75;
      if (estimatedBytes > 4.2 * 1024 * 1024) {
        setApiError("Upload Size Exceeded: The uploaded documents are too large for serverless transfer (exceeds Vercel's 4.5MB limit). Please compress your PDFs or upload fewer pages.");
        setIsProcessing(false);
        return;
      }

      setProcessingStep('Sending extracted pages to Gemini AI (parsing handwriting)...');
      
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionPaperImages: paperImages,
          answerSheetImages: answerImages,
          userApiKey: geminiApiKey || undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error during processing.');
      }

      // Intercept and throw validation errors
      if (data.overallSummary?.overallFeedback === 'ERROR_MISMATCHED_FILES') {
        throw new Error('Mismatched Files: The Question Paper and Student Answer Sheet appear to be swapped. Please check and upload them in the correct slots.');
      }
      if (data.overallSummary?.overallFeedback === 'ERROR_IRRELEVANT_FILES') {
        throw new Error('Irrelevant Files: The uploaded documents do not appear to contain relevant exam questions or student answers.');
      }

      setResult(data);
      if (data.answers && data.answers.length > 0) {
        setSelectedQuestionNumber(data.answers[0].questionNumber);
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'An error occurred during AI processing.';
      setApiError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Pre-baked Mock Demo Data matching Figma exactly
  const handleLoadDemo = () => {
    setApiError(null);
    setIsProcessing(true);
    setResult(null);
    setQpFile(new File([], 'Class_10_maths_unit_test.pdf'));
    setAnsFile(new File([], 'student_1_answer_sheet.pdf'));

    setProcessingStep('Initializing files...');
    
    setTimeout(() => {
      setProcessingStep('Extracting...');
      setAnsImages(MOCK_ANSWER_SHEET);

      setTimeout(() => {
        setResult(MOCK_RESULT);
        setSelectedQuestionNumber('2'); // Pre-select Q2 like the Figma screenshot
        setIsProcessing(false);
      }, 1200);
    }, 1000);
  };

  // Scroll matching page into view without causing outer page jump
  const handleQuestionSelect = (questionNo: string) => {
    setSelectedQuestionNumber(questionNo);
    setMobileActiveView('sheet');

    const mappedAnswer = result?.answers.find(a => a.questionNumber === questionNo);
    if (mappedAnswer) {
      const pageIndex = mappedAnswer.pageIndex;
      const targetElement = pageRefs.current[pageIndex];
      const container = sheetScrollContainerRef.current;
      if (targetElement && container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const offsetTop = targetRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: Math.max(0, offsetTop - 20), behavior: 'smooth' });
      }
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      if (direction === 'in') return Math.min(prev + 10, 150);
      return Math.max(prev - 10, 70);
    });
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (!ansImages || ansImages.length === 0) return;
    let targetIdx = activePageIdx;
    if (direction === 'prev' && activePageIdx > 0) {
      targetIdx = activePageIdx - 1;
    } else if (direction === 'next' && activePageIdx < ansImages.length - 1) {
      targetIdx = activePageIdx + 1;
    }
    
    setActivePageIdx(targetIdx);
    
    const targetEl = pageRefs.current[targetIdx];
    const container = sheetScrollContainerRef.current;
    if (targetEl && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const offsetTop = targetRect.top - containerRect.top + container.scrollTop;
      container.scrollTo({ top: Math.max(0, offsetTop - 20), behavior: 'smooth' });
    }
  };

  const handleBackNavigation = () => {
    if (activeTab !== 'exams') {
      setActiveTab('exams');
      return;
    }
    if (result) {
      setResult(null);
      return;
    }
    if (qpFile || ansFile) {
      setQpFile(null);
      setAnsFile(null);
      return;
    }
  };

  const handleSwapFiles = () => {
    setApiError(null);
    const tempFile = qpFile;
    const tempCount = qpPageCount;
    setQpFile(ansFile);
    setQpPageCount(ansPageCount);
    setAnsFile(tempFile);
    setAnsPageCount(tempCount);
  };

  const currentSelectedAnswer = result?.answers.find(a => a.questionNumber === selectedQuestionNumber);

  return (
    <div 
      style={{
        background: 'linear-gradient(180deg, #F5F5F5 0%, #E9E5E5 55%, #17171766 100%)',
      }}
      className="flex h-screen text-slate-800 font-sans overflow-hidden p-3 gap-3 relative"
    >
      {/* Ambient Bottom Glow / Shadow from Figma */}
      <div 
        style={{
          position: 'absolute',
          width: '1318px',
          height: '428px',
          top: '679px',
          left: '227px',
          backgroundColor: '#17171766',
          filter: 'blur(400px)',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 1,
        }}
      />
      
      {/* 1. FIGMA SIDEBAR */}
      <aside 
        style={{
          width: isSidebarCollapsed ? '82px' : '304px',
          minWidth: isSidebarCollapsed ? '82px' : '304px',
          height: '100%',
          borderRadius: '16px',
          padding: isSidebarCollapsed ? '24px 12px' : '24px',
          justifyContent: 'space-between',
          opacity: 1,
        }}
        className="hidden lg:flex flex-col bg-white shadow-xs flex-shrink-0 transition-all duration-300 ease-in-out relative z-30 select-none overflow-hidden"
      >
        <div className="space-y-6 w-full">
          {/* Logo & Title & Collapse */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4 py-1 select-none w-full">
              <button 
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Sidebar"
                className="w-10 h-10 flex items-center justify-center hover:opacity-80 transition cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/logo.png" alt="VedaAI Logo" className="w-10 h-10 object-contain shadow-xs rounded-xl" />
              </button>
              <button 
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Sidebar"
                className="p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/collapse.png" alt="Expand Sidebar" className="w-5 h-5 object-contain" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1 select-none w-full">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/logo.png" alt="VedaAI Logo" className="w-9 h-9 object-contain rounded-lg shadow-xs" />
                <span className="font-bricolage font-bold text-[28px] text-slate-900 tracking-[-0.06em] leading-[1.4] align-middle">
                  VedaAI
                </span>
              </div>
              <button 
                onClick={() => setIsSidebarCollapsed(true)}
                title="Collapse Sidebar"
                className="p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/collapse.png" alt="Collapse Sidebar" className="w-5 h-5 object-contain" />
              </button>
            </div>
          )}

          {/* AI Teacher's Toolkit Pill */}
          {isSidebarCollapsed ? (
            <button 
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-11 h-11 mx-auto rounded-full bg-[#1c1d1f] border-2 border-[#f95738] flex items-center justify-center shadow-md cursor-pointer hover:opacity-90 transition active:scale-95"
            >
              <Sparkles size={16} className="text-white fill-white" />
            </button>
          ) : (
            <button className="w-full flex items-center justify-center gap-2 bg-[#1c1d1f] hover:bg-black text-white font-inter font-medium text-[16px] leading-[28px] tracking-[-0.04em] py-2 px-3 rounded-full border-[2px] border-[#f95738] shadow-sm transition active:scale-95">
              <Sparkles size={16} className="text-white fill-white flex-shrink-0" />
              <span className="align-middle whitespace-nowrap">AI Teacher&apos;s Toolkit</span>
            </button>
          )}

          {/* Menu Items with respective Figma icons from all_icon */}
          <nav 
            style={{
              width: isSidebarCollapsed ? '100%' : '256px',
              gap: '8px',
              opacity: 1,
            }}
            className="flex flex-col w-full"
          >
            {[
              { id: 'home', label: 'Home', iconImg: '/sidebar/home.png', disabled: true },
              { id: 'classroom', label: 'My Classroom', iconImg: '/sidebar/classroom.png', disabled: true },
              { id: 'assignments', label: 'Assignments', iconImg: '/sidebar/assignments.png', disabled: true },
              { id: 'exams', label: 'Exams', iconImg: '/sidebar/exams.png', disabled: false },
              { id: 'library', label: 'My Library', iconImg: '/sidebar/library.png', disabled: true }
            ].map((item) => {
              const isSelected = activeTab === item.id;
              
              if (isSidebarCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.disabled) {
                        setActiveTab('exams');
                      }
                    }}
                    title={item.label}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group mx-auto ${
                      isSelected 
                        ? 'bg-[#F0F2F5] text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.iconImg} 
                      alt={item.label} 
                      className={`w-[22px] h-[22px] object-contain transition-all duration-200 group-hover:scale-110 ${isSelected ? 'opacity-100 scale-105' : 'opacity-70'}`} 
                    />
                  </button>
                );
              }

              return (
                <button 
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      setActiveTab('exams');
                    }
                  }}
                  title={item.label}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
                    isSelected 
                      ? 'bg-[#F0F2F5] text-slate-900 font-bricolage font-medium text-[16px] leading-[140%] tracking-[-0.04em] align-middle shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bricolage font-normal text-[16px] leading-[140%] tracking-[-0.04em] align-middle'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={item.iconImg} 
                    alt={item.label} 
                    className={`w-[22px] h-[22px] object-contain flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isSelected ? 'opacity-100 scale-105' : 'opacity-70'}`} 
                  />
                  <span className="align-middle">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings & School Info */}
        <div 
          style={{
            width: isSidebarCollapsed ? '100%' : '256px',
            gap: '8px',
            opacity: 1,
          }}
          className="flex flex-col w-full items-center mt-6"
        >
          {isSidebarCollapsed ? (
            <button 
              onClick={() => setActiveTab('settings')}
              title="Settings"
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group mx-auto ${activeTab === 'settings' ? 'bg-[#F0F2F5] text-slate-900 shadow-xs' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sidebar/settings-icon.png" alt="Settings" className="w-[22px] h-[22px] object-contain opacity-75 group-hover:scale-110 transition-transform duration-200" />
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('settings')}
              style={{
                width: '256px',
                height: '44px',
                borderRadius: '12px',
                gap: '12px',
                paddingTop: '10px',
                paddingRight: '14px',
                paddingBottom: '10px',
                paddingLeft: '14px',
                opacity: 1,
              }}
              className={`w-full flex items-center gap-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'settings' ? 'bg-[#F0F2F5] text-slate-900 font-medium shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sidebar/settings-icon.png" alt="Settings" className="w-[22px] h-[22px] object-contain flex-shrink-0 opacity-75 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-bricolage font-normal text-[16px] leading-[140%] tracking-[-0.04em] align-middle">Settings</span>
            </button>
          )}

          {/* Delhi Public School Card */}
          {isSidebarCollapsed ? (
            <div 
              title={`${schoolName} - ${schoolBranch}`}
              className="bg-[#F0F2F5] rounded-[20px] w-11 h-11 flex items-center justify-center cursor-pointer p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sidebar/dps-logo.png" alt="DPS" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div 
              style={{
                width: '256px',
                minHeight: '72px',
                borderRadius: '20px',
                backgroundColor: '#F0F2F5',
                gap: '12px',
                padding: '12px 16px',
              }}
              className="flex items-center gap-3.5 select-none transition mt-1"
            >
              {/* School Logo */}
              <div className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/dps-logo.png" alt="Delhi Public School Logo" className="w-full h-full object-contain hover:scale-105 transition-transform duration-200" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-bricolage font-bold text-[16px] leading-[22px] tracking-[-0.04em] text-slate-900 truncate align-middle">
                  {schoolName}
                </p>
                <p className="font-bricolage font-normal text-[13px] leading-[18px] tracking-[-0.04em] text-[#5E5E5E] truncate align-middle">
                  {schoolBranch}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT WORKSPACE: TOP BAR + MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 h-full gap-3 overflow-hidden">
        
        {/* FIGMA TOP BAR */}
        <header 
          style={{
            height: '56px',
            borderRadius: '16px',
            gap: '10px',
            opacity: 1,
          }}
          className="relative flex items-center justify-between bg-white border border-slate-200/90 shadow-xs flex-shrink-0 select-none px-3 sm:pl-6 sm:pr-2"
        >
          {/* Left section: Exam field */}
          <div 
            style={{
              height: '20px',
              gap: '8px',
              opacity: 1,
            }}
            className="flex items-center gap-2 sm:gap-2.5 max-w-[663px]"
          >
            {/* Back Button: Always visible in top bar, functional when another page/state is active */}
            {(() => {
              const canGoBack = (activeTab !== 'exams' || Boolean(result) || Boolean(qpFile) || Boolean(ansFile));
              return (
                <button 
                  onClick={canGoBack ? handleBackNavigation : undefined}
                  disabled={!canGoBack}
                  className={`flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    canGoBack 
                      ? 'hover:scale-110 active:scale-95 cursor-pointer opacity-100' 
                      : 'cursor-default opacity-40'
                  }`}
                  title={canGoBack ? 'Go Back' : ''}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/top_bar/back.png" alt="Back" className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] object-contain" />
                </button>
              );
            })()}

            {/* Clipboard Icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/top_bar/clipboard.png" alt="Exams" className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] object-contain opacity-80 flex-shrink-0 hidden sm:inline" />

            <span className="font-bricolage font-semibold text-[15px] sm:text-[16px] leading-[100%] tracking-[-0.04em] text-slate-600 align-middle">
              {activeTab === 'settings' ? 'Settings' : 'Exams'}
            </span>
          </div>
          
          {/* Right section: Action Buttons + Madhur Rastogi */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Help Question Mark */}
            <button 
              title="Help"
              className="hidden md:flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/top_bar/help.png" alt="Help" className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] object-contain" />
            </button>

            {/* Bell Notifications */}
            <button 
              title="Notifications"
              className="flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/top_bar/bell.png" alt="Notifications" className="w-[30px] h-[30px] sm:w-[36px] sm:h-[36px] object-contain" />
            </button>
            
            {/* Sparkle Icon Circle Button */}
            <button 
              title="AI Assistant"
              className="hidden md:flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer transition-all duration-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/top_bar/sparkle.png" alt="Sparkle" className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] object-contain" />
            </button>
            
            {/* Madhur Rastogi Frame */}
            <div 
              style={{
                gap: '8px',
                paddingTop: '6px',
                paddingRight: '6px',
                paddingBottom: '6px',
                paddingLeft: '6px',
                opacity: 1,
              }}
              className="flex items-center justify-between hover:scale-[1.02] active:scale-98 transition-all duration-200 select-none cursor-pointer max-w-[207px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Avatar */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/top_bar/avatar.png" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <span className="font-bricolage font-semibold text-[14px] sm:text-[16px] leading-[100%] tracking-[-0.04em] text-slate-800 truncate align-middle hidden sm:inline">
                  {teacherName || 'Madhur Rastogi'}
                </span>
              </div>
              {/* Chevron Down */}
              <svg 
                width="12" 
                height="6" 
                viewBox="0 0 12 6" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="flex-shrink-0"
                style={{ opacity: 1 }}
              >
                <path d="M1 1L6 5L11 1" stroke="#303030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Hamburger Menu on Mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="block lg:hidden text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Toggle Menu"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Mobile Menu Dropdown Popover */}
          {isMobileMenuOpen && (
            <div className="absolute top-14 right-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                {[
                  { id: 'home', label: 'Home', iconImg: '/sidebar/home.png' },
                  { id: 'classroom', label: 'My Classroom', iconImg: '/sidebar/classroom.png' },
                  { id: 'assignments', label: 'Assignments', iconImg: '/sidebar/assignments.png' },
                  { id: 'exams', label: 'Exams', iconImg: '/sidebar/exams.png' },
                  { id: 'library', label: 'My Library', iconImg: '/sidebar/library.png' },
                  { id: 'settings', label: 'Settings', iconImg: '/sidebar/settings-icon.png' },
                ].map((item) => (
                  <button 
                    key={item.id}
                    onClick={() => { 
                      if (item.id === 'exams' || item.id === 'settings') {
                        setActiveTab(item.id);
                      }
                      setIsMobileMenuOpen(false); 
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                      activeTab === item.id 
                        ? 'bg-[#F0F2F5] text-slate-900 font-bricolage font-bold text-sm' 
                        : 'text-slate-600 hover:bg-slate-50 font-bricolage text-sm'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.iconImg} alt={item.label} className="w-5 h-5 object-contain" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-center gap-3 p-2 bg-[#F6F6F6] rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sidebar/dps-logo.png" alt="DPS" className="w-8 h-8 object-contain" />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-bricolage font-bold text-xs text-slate-900 truncate">{schoolName}</p>
                  <p className="font-bricolage text-[10px] text-slate-500 truncate">{schoolBranch}</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* MAIN BODY CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
          {/* CONTAINER CONTENT */}
          <div className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col justify-start sm:justify-center">
          {apiError && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl shadow-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Processing Failed</p>
                <p className="text-xs mt-1 font-medium">{apiError}</p>
              </div>
            </div>
          )}
          {/* tab: SETTINGS (API Key Setup) */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 mx-auto">
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Google Gemini API Configuration</h3>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  The application uses the secure server API key configured in Vercel environment variables by default. Evaluators can run document mappings immediately without typing any key. You can also enter a custom key below to override it.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Gemini API Key</label>
                    <input 
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiApiKey}
                      onChange={(e) => saveApiKey(e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <button 
                      onClick={() => saveApiKey('')}
                      className="text-xs font-semibold px-4 py-2 border border-slate-200 hover:bg-slate-55 rounded-lg transition"
                    >
                      Clear Key
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              <div>
                <h3 className="text-base font-bold text-slate-900 mb-2">School &amp; Teacher Customization</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Configure the metadata displayed in the sidebar, header profile, and evaluation subject banners.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Teacher Name</label>
                    <input 
                      type="text"
                      value={teacherName}
                      onChange={(e) => saveSettings(e.target.value, schoolName, schoolBranch, subjectName)}
                      className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Subject / Exam Title</label>
                    <input 
                      type="text"
                      value={subjectName}
                      onChange={(e) => saveSettings(teacherName, schoolName, schoolBranch, e.target.value)}
                      className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">School Name</label>
                    <input 
                      type="text"
                      value={schoolName}
                      onChange={(e) => saveSettings(teacherName, e.target.value, schoolBranch, subjectName)}
                      className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">School Branch</label>
                    <input 
                      type="text"
                      value={schoolBranch}
                      onChange={(e) => saveSettings(teacherName, schoolName, e.target.value, subjectName)}
                      className="w-full bg-[#f8f9fa] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setActiveTab('exams')}
                  className="text-xs font-bold bg-[#1c1d1f] hover:bg-black text-white px-6 py-3 rounded-full transition shadow-sm"
                >
                  Save &amp; Return
                </button>
              </div>
            </div>
          )}

          {/* tab: EXAMS (Workspace) */}
          {activeTab === 'exams' && (
            <>
              {/* STATE 1: UPLOAD PAGE MATCHING FIGMA EMPTY/FILLED STATE */}
              {!isProcessing && !result && (
                <div className="max-w-4xl mx-auto py-4 flex flex-col justify-center my-auto w-full">
                  
                  {/* Figma Header Title */}
                  <div className="text-center space-y-2 mb-6 sm:mb-8 select-none">
                    <h1 className="font-bricolage font-bold text-[28px] sm:text-[36px] md:text-[40px] leading-[120%] tracking-[-0.04em] text-slate-900 flex items-center justify-center flex-wrap gap-2">
                      <span>Upload</span>
                      <span className="text-[#FF5623] bg-[#FFF2EE] px-3.5 py-0.5 rounded-2xl inline-block text-center">
                        Question Paper &amp; Answer Sheets
                      </span>
                    </h1>
                    <p 
                      style={{
                        fontFamily: 'var(--font-bricolage), sans-serif',
                        fontWeight: 400,
                        fontSize: '20px',
                        lineHeight: '140%',
                        letterSpacing: '-0.04em',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#303030',
                      }}
                      className="text-center text-[16px] sm:text-[20px]"
                    >
                      Upload both files to get started
                    </p>
                  </div>

                  {/* Centered Teacher Avatar/Illustration Box */}
                  <div className="flex justify-center mb-6 sm:mb-8 select-none">
                    <div className="w-[110px] h-[110px] sm:w-[144px] sm:h-[144px] flex items-center justify-center overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/teacher-orbit.png" alt="Teacher Illustration" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  {/* Outer Box around the Dotted Boxes (Gap 14px, Padding 14px) */}
                  <div 
                    style={{
                      borderRadius: '32px',
                      backgroundColor: '#F6F6F6',
                      padding: '14px',
                      gap: '14px',
                      opacity: 1,
                    }}
                    className="flex flex-col sm:flex-row mx-auto justify-center items-center w-full sm:w-fit max-w-[791px] select-none"
                  >
                    
                    {/* 1. Question Paper Card */}
                    <div 
                      style={{
                        borderRadius: '20px',
                        padding: '10px',
                        backgroundColor: '#FFFFFF',
                        gap: '10px',
                        opacity: 1,
                      }}
                      className="flex flex-col justify-center items-center text-center cursor-pointer relative hover:bg-slate-50/70 transition w-full sm:w-[374.5px] h-[175px] sm:h-[181px] max-w-[374.5px] select-none"
                    >
                      {/* Exact 6, 6 dashes border matching Figma */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[20px]" xmlns="http://www.w3.org/2000/svg">
                        <rect 
                          x="0.75" 
                          y="0.75" 
                          width="calc(100% - 1.5px)" 
                          height="calc(100% - 1.5px)" 
                          rx="20" 
                          ry="20" 
                          fill="none" 
                          stroke="#CECECE" 
                          strokeWidth="1.5" 
                          strokeDasharray="6 6" 
                        />
                      </svg>
                      {!qpFile && (
                        <input 
                          type="file" 
                          accept="application/pdf,image/*" 
                          onChange={(e) => {
                            const file = e.target.files ? e.target.files[0] : null;
                            setQpFile(file);
                            if (file) {
                              const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' ').replace(/-/g, ' ').trim();
                              const capitalized = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                              setSubjectName(capitalized);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      )}
                      {qpFile ? (
                        <div className="relative w-full h-full flex items-center justify-center p-2">
                          <div className="relative flex items-center w-full max-w-[298px] mx-auto h-[66px] bg-[#F6F6F6] border border-slate-200/80 rounded-2xl px-3.5 select-none text-left z-10">
                            {/* Crisp PDF Vector Badge */}
                            <div className="w-[34px] h-[42px] flex-shrink-0 mr-3 flex items-center justify-center">
                              <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 6C0 2.68629 2.68629 0 6 0H22L34 12V36C34 39.3137 31.3137 42 28 42H6C2.68629 42 0 39.3137 0 36V6Z" fill="#E24B4B"/>
                                <path d="M22 0V9C22 10.6569 23.3431 12 25 12H34L22 0Z" fill="#F87171"/>
                                <text x="17" y="27" fill="white" fontFamily="system-ui, sans-serif" fontSize="9.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">PDF</text>
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bricolage font-bold text-[16px] leading-[140%] tracking-[-0.04em] text-[#303030] truncate align-middle">
                                {qpFile.name}
                              </p>
                              <p className="font-bricolage font-normal text-[14px] leading-[140%] tracking-[-0.04em] text-[#5E5E5E] align-middle">
                                {qpFile.size < 1024 * 1024 
                                  ? `${Math.round(qpFile.size / 1024)}KB` 
                                  : `${(qpFile.size / (1024 * 1024)).toFixed(0)}MB`} • {qpPageCount} {qpPageCount === 1 ? 'Page' : 'Pages'}
                              </p>
                            </div>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); setQpFile(null); }}
                              className="absolute -top-2.5 -right-2.5 w-6 h-6 hover:scale-110 transition cursor-pointer z-20"
                              title="Remove File"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/close-icon.png" alt="Remove" className="w-full h-full object-contain drop-shadow-xs" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 select-none flex flex-col items-center">
                          <div className="w-12 h-12 bg-[#F0F2F5] rounded-xl flex items-center justify-center mb-1.5 shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/upload-icon.png" alt="Upload" className="w-5 h-5 object-contain" />
                          </div>
                          <p className="font-bricolage font-semibold text-[20px] leading-[22px] tracking-[-0.06em]">
                            <span style={{ color: '#303030' }}>Upload </span>
                            <span style={{ color: '#FF5623' }}>Question Paper</span>
                          </p>
                          <p style={{ color: '#5E5E5E8C' }} className="font-bricolage font-normal text-[14px] leading-[22px] tracking-[-0.06em]">
                            Max 10MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Swap / Interchange Files Button */}
                    {(qpFile || ansFile) && (
                      <button
                        onClick={handleSwapFiles}
                        type="button"
                        className="bg-white hover:bg-slate-50 border border-slate-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:shadow transition-all shrink-0 z-20 mx-auto -my-2 sm:my-0 sm:-mx-2 group"
                        title="Swap Files"
                      >
                        <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                      </button>
                    )}

                    {/* 2. Answer Sheet Card */}
                    <div 
                      style={{
                        borderRadius: '20px',
                        padding: '10px',
                        backgroundColor: '#FFFFFF',
                        gap: '10px',
                        opacity: 1,
                      }}
                      className="flex flex-col justify-center items-center text-center cursor-pointer relative bg-white hover:bg-slate-50/70 transition w-full sm:w-[374.5px] h-[175px] sm:h-[181px] max-w-[374.5px] select-none"
                    >
                      {/* Exact 6, 6 dashes border matching Figma */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[20px]" xmlns="http://www.w3.org/2000/svg">
                        <rect 
                          x="0.75" 
                          y="0.75" 
                          width="calc(100% - 1.5px)" 
                          height="calc(100% - 1.5px)" 
                          rx="20" 
                          ry="20" 
                          fill="none" 
                          stroke="#CECECE" 
                          strokeWidth="1.5" 
                          strokeDasharray="6 6" 
                        />
                      </svg>
                      {!ansFile && (
                        <input 
                          type="file" 
                          accept="application/pdf,image/*" 
                          onChange={(e) => setAnsFile(e.target.files ? e.target.files[0] : null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      )}
                      {ansFile ? (
                        <div className="relative w-full h-full flex items-center justify-center p-2">
                          <div className="relative flex items-center w-full max-w-[298px] mx-auto h-[66px] bg-[#F6F6F6] border border-slate-200/80 rounded-2xl px-3.5 select-none text-left z-10">
                            {/* Crisp PDF Vector Badge */}
                            <div className="w-[34px] h-[42px] flex-shrink-0 mr-3 flex items-center justify-center">
                              <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 6C0 2.68629 2.68629 0 6 0H22L34 12V36C34 39.3137 31.3137 42 28 42H6C2.68629 42 0 39.3137 0 36V6Z" fill="#E24B4B"/>
                                <path d="M22 0V9C22 10.6569 23.3431 12 25 12H34L22 0Z" fill="#F87171"/>
                                <text x="17" y="27" fill="white" fontFamily="system-ui, sans-serif" fontSize="9.5" fontWeight="900" textAnchor="middle" letterSpacing="0.5">PDF</text>
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bricolage font-bold text-[16px] leading-[140%] tracking-[-0.04em] text-[#303030] truncate align-middle">
                                {ansFile.name}
                              </p>
                              <p className="font-bricolage font-normal text-[14px] leading-[140%] tracking-[-0.04em] text-[#5E5E5E] align-middle">
                                {ansFile.size < 1024 * 1024 
                                  ? `${Math.round(ansFile.size / 1024)}KB` 
                                  : `${(ansFile.size / (1024 * 1024)).toFixed(0)}MB`} • {ansPageCount} {ansPageCount === 1 ? 'Page' : 'Pages'}
                              </p>
                            </div>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); setAnsFile(null); }}
                              className="absolute -top-2.5 -right-2.5 w-6 h-6 hover:scale-110 transition cursor-pointer z-20"
                              title="Remove File"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/close-icon.png" alt="Remove" className="w-full h-full object-contain drop-shadow-xs" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 select-none flex flex-col items-center">
                          <div className="w-12 h-12 bg-[#F0F2F5] rounded-xl flex items-center justify-center mb-1.5 shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/upload-icon.png" alt="Upload" className="w-5 h-5 object-contain" />
                          </div>
                          <p className="font-bricolage font-semibold text-[20px] leading-[22px] tracking-[-0.06em]">
                            <span style={{ color: '#303030' }}>Upload </span>
                            <span style={{ color: '#FF5623' }}>Answer Sheet</span>
                          </p>
                          <p style={{ color: '#5E5E5E8C' }} className="font-bricolage font-normal text-[14px] leading-[22px] tracking-[-0.06em]">
                            Max 10MB
                          </p>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Process Buttons */}
                  <div className="flex flex-col items-center justify-center pt-6 sm:pt-8 space-y-3 sm:space-y-3.5 select-none pb-4">
                    <button 
                      onClick={handleProcessAssessment}
                      disabled={!qpFile || !ansFile}
                      className={`font-bricolage font-medium text-[14px] leading-[140%] tracking-[-0.04em] text-center px-8 py-3 rounded-full flex items-center gap-2.5 transition-all duration-200 ${
                        qpFile && ansFile 
                          ? 'bg-[#1c1d1f] hover:bg-black text-white cursor-pointer shadow-md hover:scale-[1.02] active:scale-95' 
                          : 'bg-[#303030]/50 text-white/90 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span>Start Mapping</span>
                      <ArrowRight size={15} className={qpFile && ansFile ? 'text-white' : 'text-white/90'} />
                    </button>
                    
                    <p className="font-bricolage font-normal text-[14px] leading-[22px] tracking-[-0.06em] text-[#5E5E5E] text-center px-2">
                      Once both files are uploaded, you’ll able to map answers with questions
                    </p>

                    <div className="flex items-center gap-4 w-full max-w-xs pt-2 sm:pt-3">
                      <hr className="flex-1 border-[#CECECE]" />
                      <span className="font-bricolage text-[11px] font-bold text-[#5E5E5E] tracking-wider">OR TEST INSTANTLY</span>
                      <hr className="flex-1 border-[#CECECE]" />
                    </div>

                    <button 
                      onClick={handleLoadDemo}
                      className="bg-[#1c1d1f] hover:bg-black text-white font-inter font-medium text-xs px-5 py-2 rounded-full flex items-center gap-2 border-[2px] border-[#f95738] shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Sparkles size={13} className="text-white fill-white" />
                      <span>Load Demo</span>
                    </button>
                  </div>

                </div>
              )}

              {/* STATE 2: LOADING SCREEN MATCHING FIGMA SPARKLES */}
              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-12 shadow-sm animate-in fade-in duration-300">
                  {/* Central Orange Sparkles Icon */}
                  <div className="relative mb-6">
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto animate-pulse">
                      {/* Large star in center-right */}
                      <path d="M70 30 C70 50 50 70 30 70 C50 70 70 90 70 110 C70 90 90 70 110 70 C90 70 70 50 70 30 Z" fill="#f95738" />
                      {/* Small star top-left */}
                      <path d="M35 20 C35 28 30 32 22 32 C30 32 35 36 35 44 C35 36 39 32 47 32 C39 32 35 28 35 20 Z" fill="#f95738" opacity="0.7" />
                      {/* Small star bottom-left */}
                      <path d="M90 80 C90 87 86 91 79 91 C86 91 90 95 90 102 C90 95 94 91 101 91 C94 91 90 87 90 80 Z" fill="#f95738" opacity="0.8" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Extracting...</h3>
                    <p className="text-sm text-slate-400 font-semibold">This may take a while</p>
                  </div>
                  <p className="text-[11px] font-medium text-[#f95738] bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100/50 mt-4 inline-block italic">
                    Current stage: {processingStep}
                  </p>
                </div>
              )}

              {/* STATE 3: SPLIT PANEL DISPLAY (MATCHING GRAPHICS EXTREMELY CLOSELY) */}
              {result && (
                <div className="flex flex-col h-[calc(100vh-6.5rem)] overflow-hidden space-y-4">
                  
                  {/* Overall Grading Summary Scoreboard Banner */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 flex-shrink-0">
                    
                    {/* Left/Main Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Mobile Top Row: Score box + Title */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="bg-[#fcf8f2] border border-[#f95738]/15 rounded-2xl px-4 py-2.5 text-center flex-shrink-0 shadow-xs">
                          <span className="block text-[9px] uppercase tracking-wider font-extrabold text-[#f95738]">Overall Score</span>
                          <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                            {result.overallSummary.totalMarksObtained} <span className="text-xs text-slate-400 font-medium">/ {result.overallSummary.totalPossibleMarks}</span>
                          </span>
                        </div>

                        {/* Title visible beside score on mobile */}
                        <div className="sm:hidden flex-1 min-w-0">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{subjectName || 'Exam'} Dashboard</h4>
                          <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Evaluation Complete
                          </span>
                        </div>
                      </div>

                      {/* Desktop Title & Feedback (flows full-width on mobile below score badge) */}
                      <div className="min-w-0 flex-1">
                        <h4 className="hidden sm:block font-bold text-sm text-slate-900 leading-snug">{subjectName || 'Exam'} Evaluation Dashboard</h4>
                        <p className="text-xs text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">{result.overallSummary.overallFeedback}</p>
                      </div>
                    </div>
                    
                    {/* Start New Evaluation Button */}
                    <button 
                      onClick={() => { setResult(null); setQpFile(null); setAnsFile(null); }}
                      className="w-full sm:w-auto text-center text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2.5 sm:py-2 border border-slate-200 hover:border-slate-300 rounded-full hover:bg-slate-50 bg-slate-50/50 sm:bg-white transition flex-shrink-0"
                    >
                      Start New Evaluation
                    </button>
                  </div>

                  {/* Toggle view for mobile */}
                  {/* Toggle view for mobile */}
                  <div className="flex lg:hidden bg-[#f4f5f6] p-1 rounded-full border border-slate-200/60 max-w-[320px] mx-auto w-full flex-shrink-0">
                    <button 
                      onClick={() => setMobileActiveView('questions')}
                      className={`flex-1 text-center py-2 rounded-full text-[11px] font-extrabold transition duration-200 ${mobileActiveView === 'questions' ? 'bg-[#1c1d1f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Questions
                    </button>
                    <button 
                      onClick={() => setMobileActiveView('sheet')}
                      className={`flex-1 text-center py-2 rounded-full text-[11px] font-extrabold transition duration-200 ${mobileActiveView === 'sheet' ? 'bg-[#1c1d1f] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Answer Sheet
                    </button>
                  </div>

                  {/* SPLIT VIEWS CONTAINER */}
                  <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                    
                    {/* LEFT PANEL: EXTRACTED QUESTIONS PANEL */}
                    <div className={`flex-1 lg:flex-initial lg:w-[480px] bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm ${mobileActiveView === 'questions' ? 'flex' : 'hidden lg:flex'}`}>
                      
                      <div className="border-b border-slate-100 p-4 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                        <span className="text-xs font-extrabold text-slate-900">Extracted Questions (from question paper)</span>
                        <button 
                          onClick={() => setIsAllExpanded(prev => !prev)}
                          className="text-[11px] font-bold text-slate-500 hover:text-[#f95738] transition cursor-pointer"
                        >
                          {isAllExpanded ? 'Collapse All' : 'Expand All'}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {result.questions.map((q) => {
                          const mappedAns = result.answers.find(a => a.questionNumber === q.number);
                          const isUnanswered = result.unansweredQuestions.includes(q.number);
                          const isSelected = selectedQuestionNumber === q.number;

                          // Colors matching grading statuses from screenshot
                          let scoreBadge = '';
                          
                          if (mappedAns) {
                            const status = mappedAns.evaluation.status;
                            if (status === 'correct' && mappedAns.evaluation.marksAwarded === q.marks) {
                              scoreBadge = 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]';
                            } else if (status === 'partial' || mappedAns.evaluation.marksAwarded > 0) {
                              scoreBadge = 'bg-[#fef7e0] text-[#b06000] border border-[#feebc8]';
                            } else {
                              scoreBadge = 'bg-[#fce8e6] text-[#c5221f] border border-[#fad2cf]';
                            }
                          } else if (isUnanswered) {
                            scoreBadge = 'bg-slate-100 text-slate-500 border border-slate-200';
                          }

                          return (
                            <div 
                              key={q.id}
                              onClick={() => !isUnanswered && handleQuestionSelect(q.number)}
                              className={`border rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'border-[#ff5e3a] bg-orange-50/15 shadow-sm' 
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Number circle */}
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    isSelected ? 'bg-[#ff5e3a] text-white' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {q.number.replace('.', '')}
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 leading-snug">{q.text}</p>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex-shrink-0 ${scoreBadge}`}>
                                  {mappedAns ? `${mappedAns.evaluation.marksAwarded}/${q.marks}` : `0/${q.marks}`}
                                </span>
                              </div>

                              {/* Expanded AI Critique Details */}
                              {(isSelected || isAllExpanded) && mappedAns && (
                                <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs space-y-3.5 animate-in fade-in slide-in-from-top-1">
                                  <div>
                                    <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">AI Feedback</span>
                                    <p className="mt-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-xl leading-relaxed">
                                      {mappedAns.evaluation.feedback}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Student Handwriting Transcription</span>
                                    <p className="mt-1 text-xs text-slate-500 leading-relaxed italic">
                                      &quot;{mappedAns.studentAnswerText}&quot;
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-[#f95738] bg-orange-50 border border-orange-100/50 px-2 py-1.5 rounded-lg font-bold">
                                    <Info size={11} />
                                    <span>
                                      Answer region highlighted on{' '}
                                      {mappedAns.locations && mappedAns.locations.length > 1
                                        ? `Pages ${[...new Set(mappedAns.locations.map(l => l.pageIndex + 1))].join(', ')}`
                                        : `Page ${mappedAns.pageIndex + 1}`}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT PANEL: ANSWER SHEET RENDERER & COORDINATE ZOOM HIGHLIGHTS */}
                    <div className={`flex-1 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm ${mobileActiveView === 'sheet' ? 'flex' : 'hidden lg:flex'}`}>
                      
                      {/* Canvas Header Zoom / Page controls */}
                      <div className="border-b border-slate-100 p-2.5 sm:p-3 lg:p-4 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 hidden lg:inline">Answer Sheet</span>
                        <div className="flex items-center justify-between w-full lg:w-auto lg:justify-end gap-1.5 sm:gap-3 lg:gap-6 bg-[#1c1d1f] lg:bg-transparent text-white lg:text-slate-700 px-2.5 sm:px-3 py-2 lg:p-0 rounded-2xl lg:rounded-none shadow-md lg:shadow-none mx-auto lg:mx-0 w-full lg:max-w-none">
                          
                          {/* Zoom Controls */}
                          <div className="flex items-center gap-1 sm:gap-1.5 border-r border-slate-800 lg:border-slate-200 pr-2 sm:pr-3 lg:pr-4 flex-shrink-0">
                            <button onClick={() => handleZoom('out')} className="text-slate-400 hover:text-white lg:hover:text-slate-800 p-1 transition" title="Zoom Out">
                              <ZoomOut size={14} />
                            </button>
                            <span className="text-[11px] sm:text-xs font-extrabold min-w-[28px] text-center">{zoomLevel}%</span>
                            <button onClick={() => handleZoom('in')} className="text-slate-400 hover:text-white lg:hover:text-slate-800 p-1 transition" title="Zoom In">
                              <ZoomIn size={14} />
                            </button>
                          </div>

                          {/* Navigation indicator */}
                          <div className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-extrabold pr-2 sm:pr-3 lg:pr-4 border-r border-slate-800 lg:border-slate-200 whitespace-nowrap flex-shrink-0">
                            <button onClick={() => handlePageChange('prev')} className="text-slate-400 hover:text-white lg:hover:text-slate-800 p-1 transition" title="Previous Page">
                              <ChevronLeft size={14} />
                            </button>
                            <span className="whitespace-nowrap select-none font-bold">
                              Page {activePageIdx + 1} of {ansImages.length}
                            </span>
                            <button onClick={() => handlePageChange('next')} className="text-slate-400 hover:text-white lg:hover:text-slate-800 p-1 transition" title="Next Page">
                              <ChevronRight size={14} />
                            </button>
                          </div>

                          {/* Full Screen option */}
                          <button 
                            onClick={() => setIsFullscreen(true)}
                            className="text-slate-400 hover:text-white lg:hover:text-slate-800 p-1 flex items-center gap-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap flex-shrink-0 transition"
                            title="View Fullscreen"
                          >
                            <Maximize2 size={13} />
                            <span className="hidden sm:inline">Fullscreen</span>
                          </button>

                        </div>
                      </div>

                      {/* Stacked Sheet Canvas */}
                      <div ref={sheetScrollContainerRef} className="flex-1 overflow-auto p-6 bg-[#525659] flex flex-col items-center">
                        <div 
                          style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel > 100 ? 'none' : '48rem' }}
                          className="space-y-6 transition-all duration-200 w-full"
                        >
                          {ansImages.map((imgUrl, idx) => {
                            const highlightBoxes = currentSelectedAnswer
                              ? (currentSelectedAnswer.locations && currentSelectedAnswer.locations.length > 0
                                  ? currentSelectedAnswer.locations.filter(loc => loc.pageIndex === idx).map(loc => loc.boundingBox)
                                  : (currentSelectedAnswer.pageIndex === idx ? [currentSelectedAnswer.boundingBox] : []))
                              : [];

                            return (
                              <div 
                                key={`sheet-canvas-${idx}`}
                                ref={(el) => { pageRefs.current[idx] = el; }}
                                className="relative rounded-none border border-slate-700 bg-white shadow-2xl select-none mb-6"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={imgUrl} 
                                  alt={`Answer Sheet Page ${idx + 1}`}
                                  className="w-full h-auto object-contain"
                                />

                                {/* Absolute green highlighters matching Figma Q2 badge */}
                                {highlightBoxes.map((box, boxIdx) => (
                                  <div 
                                    key={`highlight-box-${idx}-${boxIdx}`}
                                    style={{
                                      top: `${box.ymin / 10}%`,
                                      left: `${box.xmin / 10}%`,
                                      height: `${(box.ymax - box.ymin) / 10}%`,
                                      width: `${(box.xmax - box.xmin) / 10}%`,
                                    }}
                                    className="absolute border-2 border-[#34a853] bg-[#34a853]/5 rounded-xl pointer-events-none transition-all duration-300"
                                  >
                                    {/* Green tab badge on top left */}
                                    <span className="absolute -top-[21px] -left-[1.5px] text-[10px] font-extrabold px-2.5 py-0.5 rounded-t-lg text-white bg-[#34a853] pointer-events-none select-none z-10">
                                      Q{selectedQuestionNumber}
                                    </span>
                                  </div>
                                ))}

                                {/* Bottom right page label */}
                                <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200 backdrop-blur-sm">
                                  Page {idx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>

      {/* Fullscreen Overlay Component */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-[#2d2f31] z-[999] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* Fullscreen Header */}
          <div className="bg-[#1c1d1f] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-white border-b border-slate-800 flex-shrink-0">
            <span className="text-xs font-extrabold hidden sm:inline">Answer Sheet (Fullscreen)</span>
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 sm:gap-2 border-r border-slate-800 pr-2 sm:pr-4 flex-shrink-0">
                <button onClick={() => handleZoom('out')} className="text-slate-400 hover:text-white p-1 transition" title="Zoom Out">
                  <ZoomOut size={15} />
                </button>
                <span className="text-xs font-bold min-w-[28px] text-center">{zoomLevel}%</span>
                <button onClick={() => handleZoom('in')} className="text-slate-400 hover:text-white p-1 transition" title="Zoom In">
                  <ZoomIn size={15} />
                </button>
              </div>

              {/* Page Navigation */}
              <div className="flex items-center gap-1 sm:gap-2 text-xs font-bold whitespace-nowrap flex-shrink-0">
                <button onClick={() => handlePageChange('prev')} className="text-slate-400 hover:text-white p-1 transition" title="Previous Page">
                  <ChevronLeft size={15} />
                </button>
                <span className="whitespace-nowrap select-none font-bold">Page {activePageIdx + 1} of {ansImages.length}</span>
                <button onClick={() => handlePageChange('next')} className="text-slate-400 hover:text-white p-1 transition" title="Next Page">
                  <ChevronRight size={15} />
                </button>
              </div>

              <button 
                onClick={() => setIsFullscreen(false)}
                className="bg-[#f95738] hover:bg-[#e04526] text-white font-extrabold text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition shadow-md flex items-center gap-1 flex-shrink-0"
              >
                <X size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
                <span className="sm:hidden text-[11px]">Exit</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Canvas Scroll Area */}
          <div className="flex-1 overflow-auto p-8 flex flex-col items-center justify-start bg-[#141517]">
            <div 
              style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel > 100 ? 'none' : '48rem' }}
              className="space-y-6 transition-all duration-200 w-full"
            >
              {ansImages.map((imgUrl, idx) => {
                const highlightBoxes = currentSelectedAnswer
                  ? (currentSelectedAnswer.locations && currentSelectedAnswer.locations.length > 0
                      ? currentSelectedAnswer.locations.filter(loc => loc.pageIndex === idx).map(loc => loc.boundingBox)
                      : (currentSelectedAnswer.pageIndex === idx ? [currentSelectedAnswer.boundingBox] : []))
                  : [];

                return (
                  <div 
                    key={`fs-sheet-canvas-${idx}`}
                    className="relative rounded-none border border-slate-900 bg-white shadow-2xl select-none mb-8"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imgUrl} 
                      alt={`Answer Sheet Page ${idx + 1}`}
                      className="w-full h-auto object-contain"
                    />

                    {highlightBoxes.map((box, boxIdx) => (
                      <div 
                        key={`fs-highlight-box-${idx}-${boxIdx}`}
                        style={{
                          top: `${box.ymin / 10}%`,
                          left: `${box.xmin / 10}%`,
                          height: `${(box.ymax - box.ymin) / 10}%`,
                          width: `${(box.xmax - box.xmin) / 10}%`,
                        }}
                        className="absolute border-2 border-[#34a853] bg-[#34a853]/5 rounded-xl pointer-events-none transition-all duration-300"
                      >
                        <span className="absolute -top-[21px] -left-[1.5px] text-[10px] font-extrabold px-2.5 py-0.5 rounded-t-lg text-white bg-[#34a853] pointer-events-none select-none z-10">
                          Q{selectedQuestionNumber}
                        </span>
                      </div>
                    ))}

                    <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200 backdrop-blur-sm">
                      Page {idx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
