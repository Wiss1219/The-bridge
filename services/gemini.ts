import { GoogleGenAI, Modality } from "@google/genai";
import { LearnerProfile, Exercise, ExerciseType, ExerciseResult, ProgressReport } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// ─── PDF ──────────────────────────────────────────────────────────────────────

export const extractPdfContent = async (pdfData: string): Promise<string> => {
  try {
    const r = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [
        { inlineData: { mimeType: 'application/pdf', data: pdfData } },
        { text: "Extract all text from this document. Return plain text only." }
      ]}
    });
    return r.text || "";
  } catch (e) { console.error(e); return ""; }
};

// ─── SPEECH ───────────────────────────────────────────────────────────────────

export const generateSpeech = async (text: string, voiceName = 'Charon'): Promise<string | null> => {
  try {
    const r = await getAi().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    });
    return r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) { console.error("TTS error:", e); return null; }
};

// ─── ADAPTIVE EXERCISE GENERATOR ─────────────────────────────────────────────

const TYPE_INSTRUCTIONS: Record<ExerciseType, string> = {
  mcq: `Multiple-choice with exactly 4 options. "options" is an array of 4 strings. "correctAnswer" matches one option exactly.`,
  fill_blank: `Fill-in-the-blank. Use ___ as the blank. "options" is null. "correctAnswer" is the word(s) to fill.`,
  true_false: `True/false statement. "options" must be exactly ["True","False"]. "correctAnswer" is "True" or "False".`,
  open_ended: `Open conceptual question. "options" is null. "correctAnswer" is a model answer.`,
};

export const generateAdaptiveExercise = async (
  profile: LearnerProfile,
  type: ExerciseType,
  focusTopic?: string,
  pdfContext?: string | null
): Promise<Exercise | null> => {
  const topicHint = focusTopic
    ? `Focus on this sub-topic: "${focusTopic}".`
    : profile.weakAreas.length
    ? `Target these weak areas: ${profile.weakAreas.slice(0, 3).join(', ')}.`
    : `Cover general ${profile.subject} concepts.`;

  const ctx = pdfContext
    ? `\nSOURCE DOCUMENT (use ONLY this):\n"${pdfContext.substring(0, 14000)}"\n`
    : '';

  const langInstruction = profile.language === 'ar' 
    ? 'CRITICAL INSTRUCTION: You MUST generate the ENTIRE response (question, options, explanation, hints, and topic) STRICTLY in the Arabic language. Use formal Arabic.'
    : 'Generate the response in English.';

  const prompt = `You are an expert adaptive tutor. Generate ONE educational exercise.

LEARNER: ${profile.name} | Subject: ${profile.subject} | Level: ${profile.currentLevel} | Language: ${profile.language === 'ar' ? 'Arabic' : 'English'}
Weak areas: ${profile.weakAreas.join(', ') || 'None yet'} | Strong: ${profile.strongAreas.join(', ') || 'None yet'}
${topicHint}
Exercise type: ${type} — ${TYPE_INSTRUCTIONS[type]}
${ctx}
Include 2 progressive hints.
${langInstruction}

Return ONLY valid JSON (no markdown):
{
  "id": "ex_${Date.now()}",
  "type": "${type}",
  "question": "string",
  "options": ["string"] or null,
  "correctAnswer": "string",
  "explanation": "string (2-3 sentences)",
  "topic": "string (specific sub-topic)",
  "difficulty": "${profile.currentLevel}",
  "hints": ["gentle hint", "stronger hint"]
}`;

  try {
    const r = await getAi().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: pdfContext ? {} : { tools: [{ googleSearch: {} }] }
    });
    const text = (r.text || '').replace(/```json\n?|```/g, '').trim();
    return JSON.parse(text) as Exercise;
  } catch (e) { console.error("Exercise gen error:", e); return null; }
};

// ─── OPEN-ENDED EVALUATOR ─────────────────────────────────────────────────────

export const evaluateOpenEndedAnswer = async (
  question: string,
  modelAnswer: string,
  userAnswer: string,
  profile: LearnerProfile
): Promise<{ isCorrect: boolean; score: number; feedback: string }> => {
  const langInstruction = profile.language === 'ar' ? 'Write your feedback strictly in Arabic.' : 'Write your feedback in English.';
  const prompt = `Evaluate this ${profile.subject} student answer for conceptual correctness (not exact wording).
Question: "${question}"
Model answer: "${modelAnswer}"
Student answer: "${userAnswer}"
${langInstruction}
Return ONLY JSON: { "isCorrect": boolean, "score": number (0-100), "feedback": "2 sentences: what was right, what was missing" }`;
  try {
    const r = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return JSON.parse((r.text || '').replace(/```json\n?|```/g, '').trim());
  } catch { return { isCorrect: false, score: 0, feedback: "Could not evaluate. Please try again." }; }
};

// ─── PROGRESS REPORT ──────────────────────────────────────────────────────────

export const generateProgressReport = async (
  profile: LearnerProfile,
  results: ExerciseResult[]
): Promise<ProgressReport | null> => {
  const correct = results.filter(r => r.isCorrect).length;
  const score = Math.round((correct / Math.max(results.length, 1)) * 100);
  const summary = results.map(r =>
    `- "${r.question.substring(0, 70)}" | Topic: ${r.topic} | Correct: ${r.isCorrect} | Time: ${r.timeTaken}s`
  ).join('\n');

  const langInstruction = profile.language === 'ar' ? 'Write the aiCoachMessage, strengthsSummary, and weaknessesSummary STRICTLY in Arabic.' : 'Write in English.';

  const prompt = `You are an AI learning coach. Analyze this student's session.
Student: ${profile.name} | Subject: ${profile.subject} | Level: ${profile.currentLevel}
Results (${correct}/${results.length} correct, ${score}%):
${summary}

${langInstruction}
Return ONLY JSON:
{
  "overallScore": ${score},
  "strengthsSummary": "2 sentences about strengths",
  "weaknessesSummary": "2 sentences about weaknesses",
  "recommendedTopics": ["topic1","topic2","topic3"],
  "nextDifficulty": "Beginner"|"Intermediate"|"Advanced"|"Expert",
  "aiCoachMessage": "3-4 personal, specific, encouraging sentences"
}`;

  try {
    const r = await getAi().models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const data = JSON.parse((r.text || '').replace(/```json\n?|```/g, '').trim());
    return { ...data, sessionResults: results };
  } catch (e) { console.error("Report error:", e); return null; }
};
