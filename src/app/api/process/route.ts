import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Strict Schema definition for Gemini Structured Outputs
const responseSchema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      description: 'The list of all questions extracted from the Question Paper in printed order',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Unique identifier for the question, e.g. "q_1" or "q_11_a"' },
          number: { type: 'STRING', description: 'The exact question number text, e.g. "1" or "11(a)"' },
          text: { type: 'STRING', description: 'The text content of the question' },
          marks: { type: 'INTEGER', description: 'Maximum possible marks for this question' }
        },
        required: ['id', 'number', 'text', 'marks']
      }
    },
    answers: {
      type: 'ARRAY',
      description: 'The list of student answers mapped to their corresponding question numbers',
      items: {
        type: 'OBJECT',
        properties: {
          questionNumber: { type: 'STRING', description: 'The question number this answer maps to, matching one of the questions.number values (e.g. "1" or "11(a)")' },
          studentAnswerText: { type: 'STRING', description: 'Transcribed text of the student\'s handwritten answer' },
          pageIndex: { type: 'INTEGER', description: '0-based index of the primary page in the answer sheet containing this answer' },
          boundingBox: {
            type: 'OBJECT',
            description: 'The primary coordinate region of the student\'s answer on the page',
            properties: {
              ymin: { type: 'INTEGER', description: 'Top edge coordinate (0 to 1000)' },
              xmin: { type: 'INTEGER', description: 'Left edge coordinate (0 to 1000)' },
              ymax: { type: 'INTEGER', description: 'Bottom edge coordinate (0 to 1000)' },
              xmax: { type: 'INTEGER', description: 'Right edge coordinate (0 to 1000)' }
            },
            required: ['ymin', 'xmin', 'ymax', 'xmax']
          },
          locations: {
            type: 'ARRAY',
            description: 'All pages/coordinates where this answer is located. Use multiple items if the student continued their answer onto another page or another distinct region of the answer sheet.',
            items: {
              type: 'OBJECT',
              properties: {
                pageIndex: { type: 'INTEGER', description: '0-based page index' },
                boundingBox: {
                  type: 'OBJECT',
                  properties: {
                    ymin: { type: 'INTEGER' },
                    xmin: { type: 'INTEGER' },
                    ymax: { type: 'INTEGER' },
                    xmax: { type: 'INTEGER' }
                  },
                  required: ['ymin', 'xmin', 'ymax', 'xmax']
                }
              },
              required: ['pageIndex', 'boundingBox']
            }
          },
          evaluation: {
            type: 'OBJECT',
            description: 'Grading and feedback for this answer',
            properties: {
              status: { 
                type: 'STRING', 
                description: 'Evaluation status: correct, incorrect, or partial',
                enum: ['correct', 'incorrect', 'partial'] 
              },
              marksAwarded: { type: 'NUMBER', description: 'Marks awarded for this answer' },
              feedback: { type: 'STRING', description: 'Constructive feedback explaining the grade' }
            },
            required: ['status', 'marksAwarded', 'feedback']
          }
        },
        required: ['questionNumber', 'studentAnswerText', 'pageIndex', 'boundingBox', 'locations', 'evaluation']
      }
    },
    unansweredQuestions: {
      type: 'ARRAY',
      description: 'The list of question numbers that the student did not answer',
      items: { type: 'STRING' }
    },
    unmatchedAnswers: {
      type: 'ARRAY',
      description: 'Handwritten entries or answers in the answer sheet that do not correspond to any question in the paper',
      items: {
        type: 'OBJECT',
        properties: {
          studentAnswerText: { type: 'STRING', description: 'Transcribed text of the unmatched entry' },
          pageIndex: { type: 'INTEGER', description: '0-based page index' },
          boundingBox: {
            type: 'OBJECT',
            properties: {
              ymin: { type: 'INTEGER' },
              xmin: { type: 'INTEGER' },
              ymax: { type: 'INTEGER' },
              xmax: { type: 'INTEGER' }
            },
            required: ['ymin', 'xmin', 'ymax', 'xmax']
          }
        },
        required: ['studentAnswerText', 'pageIndex', 'boundingBox']
      }
    },
    overallSummary: {
      type: 'OBJECT',
      description: 'Overall assessment results summary',
      properties: {
        totalMarksObtained: { type: 'NUMBER', description: 'Sum of marks awarded' },
        totalPossibleMarks: { type: 'NUMBER', description: 'Sum of possible marks' },
        overallFeedback: { type: 'STRING', description: 'Summary critique and study advice for the student' }
      },
      required: ['totalMarksObtained', 'totalPossibleMarks', 'overallFeedback']
    }
  },
  required: ['questions', 'answers', 'unansweredQuestions', 'unmatchedAnswers', 'overallSummary']
};

interface PostProcessBoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}
interface PostProcessLocation {
  pageIndex: number;
  boundingBox: PostProcessBoundingBox;
}
interface PostProcessAnswer {
  questionNumber: string;
  studentAnswerText: string;
  pageIndex: number;
  boundingBox: PostProcessBoundingBox;
  locations?: PostProcessLocation[];
}
interface PostProcessUnmatched {
  studentAnswerText: string;
  pageIndex: number;
  boundingBox: PostProcessBoundingBox;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format. Please upload valid image/PDF documents.');
  }
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

export async function POST(request: Request) {
  try {
    const { questionPaperImages, answerSheetImages, userApiKey } = await request.json();

    if (!questionPaperImages || !Array.isArray(questionPaperImages) || questionPaperImages.length === 0) {
      return NextResponse.json({ error: 'Question paper images are required.' }, { status: 400 });
    }
    if (!answerSheetImages || !Array.isArray(answerSheetImages) || answerSheetImages.length === 0) {
      return NextResponse.json({ error: 'Answer sheet images are required.' }, { status: 400 });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API Key is missing. Please enter your Gemini API Key in the UI settings or configure GEMINI_API_KEY on the server.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct unified prompt content matching role user
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Add instructions first
    parts.push({
      text: `Task: Analyze the uploaded Question Paper pages and Student Answer Sheet pages to perform question extraction, answer extraction, student answer mapping, and grading.

Guidelines:
1. Extract ALL questions from the Question Paper in printed order.
   - Treat labelled sub-parts like "11(a)" and "11(b)" as two separate entries.
   - Preserve the original question numbering.
   - Record the possible max marks for each question.
2. Read the Student Answer Sheet.
   - Determine which question each handwritten answer corresponds to, even if they are answered out of order.
   - Transcribe the student's handwritten answer text.
   - Identify the 0-based page index and the bounding box region where the answer resides on the Answer Sheet.
   - If the student's answer spans across multiple pages or is written in multiple distinct blocks, list all of these blocks sequentially in the "locations" array. The first entry in "locations" must match the main "pageIndex" and "boundingBox".
     - IMPORTANT: Bounding box coordinates must be in the format: ymin, xmin, ymax, xmax, normalized to the range [0, 1000] relative to that specific page. Top-left is (0, 0) and bottom-right is (1000, 1000). Be highly accurate, highlighting ONLY the handwritten answer block.
3. Grade the answer:
   - status: 'correct', 'incorrect', or 'partial'.
   - marksAwarded: numeric score.
   - feedback: brief feedback explaining the grade.
4. List any questions from the paper that are unanswered.
5. List any student answers or scribbles that do not map to any question.
6. Provide an overall summary.
`
    });

    // Add question paper pages
    questionPaperImages.forEach((img: string, idx: number) => {
      const { mimeType, base64Data } = parseDataUrl(img);
      parts.push({ text: `--- START OF QUESTION PAPER PAGE ${idx + 1} ---` });
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `--- END OF QUESTION PAPER PAGE ${idx + 1} ---` });
    });

    // Add answer sheet pages
    answerSheetImages.forEach((img: string, idx: number) => {
      const { mimeType, base64Data } = parseDataUrl(img);
      parts.push({ text: `--- START OF STUDENT ANSWER SHEET PAGE ${idx + 1} ---` });
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `--- END OF STUDENT ANSWER SHEET PAGE ${idx + 1} ---` });
    });

    parts.push({
      text: "Please output the final result in JSON strictly conforming to the requested schema."
    });

    // Call the model with structured output config
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{
        role: 'user',
        parts: parts
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as unknown as undefined,
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Empty response received from the Gemini API.');
    }

    const resultJson = JSON.parse(resultText);

    // Robust Post-Processing: Validate, normalize, and clamp all coordinates
    if (resultJson.answers && Array.isArray(resultJson.answers)) {
      resultJson.answers.forEach((ans: PostProcessAnswer) => {
        // Fallback: Populate locations if missing
        if (!ans.locations || !Array.isArray(ans.locations)) {
          if (ans.pageIndex !== undefined && ans.boundingBox) {
            ans.locations = [{
              pageIndex: Number(ans.pageIndex),
              boundingBox: ans.boundingBox
            }];
          } else {
            ans.locations = [];
          }
        }

        // Clamp coordinates and resolve flipped bounds
        ans.locations.forEach((loc: PostProcessLocation) => {
          if (loc.boundingBox) {
            const b = loc.boundingBox;
            b.ymin = Math.max(0, Math.min(1000, Number(b.ymin) || 0));
            b.xmin = Math.max(0, Math.min(1000, Number(b.xmin) || 0));
            b.ymax = Math.max(0, Math.min(1000, Number(b.ymax) || 0));
            b.xmax = Math.max(0, Math.min(1000, Number(b.xmax) || 0));

            // Swap if coordinates are inverted
            if (b.ymin > b.ymax) {
              const tmp = b.ymin;
              b.ymin = b.ymax;
              b.ymax = tmp;
            }
            if (b.xmin > b.xmax) {
              const tmp = b.xmin;
              b.xmin = b.xmax;
              b.xmax = tmp;
            }
          }
          loc.pageIndex = Math.max(0, Number(loc.pageIndex) || 0);
        });

        // Ensure legacy pageIndex and boundingBox match the first entry
        if (ans.locations.length > 0) {
          ans.pageIndex = ans.locations[0].pageIndex;
          ans.boundingBox = ans.locations[0].boundingBox;
        }
      });
    }

    // Post-process unmatched entries as well
    if (resultJson.unmatchedAnswers && Array.isArray(resultJson.unmatchedAnswers)) {
      resultJson.unmatchedAnswers.forEach((ans: PostProcessUnmatched) => {
        if (ans.boundingBox) {
          const b = ans.boundingBox;
          b.ymin = Math.max(0, Math.min(1000, Number(b.ymin) || 0));
          b.xmin = Math.max(0, Math.min(1000, Number(b.xmin) || 0));
          b.ymax = Math.max(0, Math.min(1000, Number(b.ymax) || 0));
          b.xmax = Math.max(0, Math.min(1000, Number(b.xmax) || 0));

          if (b.ymin > b.ymax) {
            const tmp = b.ymin;
            b.ymin = b.ymax;
            b.ymax = tmp;
          }
          if (b.xmin > b.xmax) {
            const tmp = b.xmin;
            b.xmin = b.xmax;
            b.xmax = tmp;
          }
        }
        ans.pageIndex = Math.max(0, Number(ans.pageIndex) || 0);
      });
    }

    return NextResponse.json(resultJson);

  } catch (error) {
    console.error('Error in assessment API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during assessment processing.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
