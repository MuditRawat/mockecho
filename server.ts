/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy-initialized Gemini client to prevent server crash if key is missing
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust content generation helper with retries and fallback models to prevent 503 errors and manage quota/rate limits
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    model?: string;
    contents: string;
    config?: any;
  },
  maxRetries = 2
) {
  const primaryModel = params.model || "gemini-2.5-flash";
  const defaultFallbacks = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.6-flash"
  ];
  // Ensure primary model is first, followed by unique fallback models
  const modelsToTry = Array.from(new Set([primaryModel, ...defaultFallbacks]));

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini] Requesting ${model} (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        if (response && response.text) {
          console.log(`[Gemini] Successfully generated response using ${model}.`);
          return response;
        }
        throw new Error("Empty text returned from model");
      } catch (err: any) {
        lastError = err;
        const errStr = typeof err === 'object' ? JSON.stringify(err) : String(err);
        const errMessage = err?.message || String(err) || "";

        // Check if error is quota exceeded, rate limited, or resource exhausted
        const isQuotaExceeded = 
          errMessage.includes("429") || 
          errMessage.toLowerCase().includes("quota") || 
          errMessage.toLowerCase().includes("limit") || 
          errMessage.toLowerCase().includes("resource_exhausted") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("429") ||
          err?.status === "RESOURCE_EXHAUSTED" ||
          err?.status === 429 ||
          err?.statusCode === 429;

        if (isQuotaExceeded) {
          console.log(`[Gemini] Quota/Rate limit reached for ${model}. Switching to fallback...`);
          break; // Break current model's attempts loop to switch to next fallback model immediately
        }

        console.warn(`[Gemini] Attempt ${attempt + 1} with ${model} failed:`, errMessage);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential/linear backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after all attempts and fallbacks.");
}

// Fallback question generator when Gemini API quota or rate limits are hit
function generateFallbackQuestions(role: string, subject: string, difficulty: string, questionCount: number, format: string, previousQuestions?: string[]) {
  const numCount = Number(questionCount) || 5;
  const questions: any[] = [];
  
  const templates = [
    {
      topic: `${subject} Core Architectural Concepts`,
      questionText: `As a ${role}, how would you architect a scalable solution for ${subject}? What key principles, design patterns, and tradeoffs guide your decision-making?`,
      modelAnswer: `A robust architecture requires clear separation of concerns, defensive error handling, optimization for throughput and latency, and proper observability. Tradeoffs include balancing simplicity, maintainability, and scalability.`,
      keywords: ["scalability", "architecture", "tradeoffs", "design patterns", "maintainability"],
      mcqText: `Which architectural best practice is most critical when designing system components for ${subject}?`,
      mcqOptions: [
        { id: "a", text: "Decoupling component responsibilities and isolating side effects" },
        { id: "b", text: "Tightly coupling all business logic into a single monolithic script" },
        { id: "c", text: "Omitting error logging to maximize network execution speed" },
        { id: "d", text: "Disabling validation checks in production environments" }
      ],
      correctId: "a",
      explanation: "Decoupling responsibilities ensures modularity, testability, and long-term maintainability in production systems."
    },
    {
      topic: `${subject} Performance & Optimization`,
      questionText: `What methodologies and tools do you use to diagnose and resolve performance bottlenecks in ${subject}? Walk through a practical scenario.`,
      modelAnswer: `Performance tuning involves profiling memory and CPU utilization, identifying synchronous blocking calls, implementing caching or concurrency, and verifying performance metrics.`,
      keywords: ["profiling", "caching", "bottlenecks", "latency", "optimization"],
      mcqText: `When diagnosing performance bottlenecks in ${subject}, which metric directly measures processing delay under heavy load?`,
      mcqOptions: [
        { id: "a", text: "Request Latency / Response Time" },
        { id: "b", text: "Repository File Count" },
        { id: "c", text: "Git Commit Frequency" },
        { id: "d", text: "Variable Name Length" }
      ],
      correctId: "a",
      explanation: "Latency measures the time taken to process a request and directly reflects system responsiveness under load."
    },
    {
      topic: `${subject} Fault Tolerance & Resiliency`,
      questionText: `How do you ensure fault tolerance and system resilience when dependent services experience transient failures in ${subject}?`,
      modelAnswer: `Resiliency is achieved through graceful degradation, exponential backoff retries, circuit breaker patterns, and continuous monitoring/alerting.`,
      keywords: ["resiliency", "circuit breaker", "exponential backoff", "fault tolerance", "monitoring"],
      mcqText: `What pattern prevents repeated cascading failures when an external dependency in ${subject} becomes unresponsive?`,
      mcqOptions: [
        { id: "a", text: "Circuit Breaker pattern" },
        { id: "b", text: "Infinite tight retry loop" },
        { id: "c", text: "Hardcoding static fallback values everywhere" },
        { id: "d", text: "Setting request timeout to infinity" }
      ],
      correctId: "a",
      explanation: "The Circuit Breaker pattern trips after consecutive failures, shielding downstreams from cascading outages."
    },
    {
      topic: `${subject} Real-World Implementation & Migration`,
      questionText: `Describe your strategy for refactoring or migrating a critical ${subject} component while ensuring zero downtime and backward compatibility.`,
      modelAnswer: `Safe refactoring involves writing automated regression tests, executing canary or blue-green rollouts, maintaining backward compatibility, and monitoring error rates.`,
      keywords: ["refactoring", "backward compatibility", "canary rollout", "testing", "monitoring"],
      mcqText: `Which deployment strategy minimizes operational risk by routing a small percentage of production traffic to a new version of ${subject}?`,
      mcqOptions: [
        { id: "a", text: "Canary Deployment" },
        { id: "b", text: "Big Bang Release" },
        { id: "c", text: "Direct Database Dropping" },
        { id: "d", text: "Manual File Copying" }
      ],
      correctId: "a",
      explanation: "Canary deployments direct a small fraction of real user traffic to the new version to validate stability before full rollout."
    },
    {
      topic: `${subject} Security & Best Practices`,
      questionText: `What security controls and data protection mechanisms are essential when building ${subject} features for ${role}?`,
      modelAnswer: `Security practices include rigorous input validation, enforcing the principle of least privilege, encrypting sensitive data in transit and at rest, and keeping dependencies audited.`,
      keywords: ["security", "encryption", "input validation", "least privilege", "audit"],
      mcqText: `Which practice is essential for safeguarding sensitive application data in ${subject}?`,
      mcqOptions: [
        { id: "a", text: "Encrypting sensitive data in transit and at rest with key rotation" },
        { id: "b", text: "Storing secret keys in client-side public bundles" },
        { id: "c", text: "Disabling TLS/SSL encryption to reduce header overhead" },
        { id: "d", text: "Granting root admin privileges to all background tasks" }
      ],
      correctId: "a",
      explanation: "Strong end-to-end encryption at rest and in transit prevents unauthorized interception and data leakage."
    },
    {
      topic: `${subject} Data Consistency & Caching Strategies`,
      questionText: `In a distributed system handling ${subject}, how do you balance caching for low latency against the risk of serving stale data?`,
      modelAnswer: `Managing cache consistency requires defining TTL policies, write-through/write-behind cache strategies, and active cache invalidation signals upon updates.`,
      keywords: ["caching", "stale data", "cache invalidation", "consistency", "latency"],
      mcqText: `When utilizing a read-aside cache for ${subject}, what should occur when a cache miss happens?`,
      mcqOptions: [
        { id: "a", text: "Fetch data from primary database, write result to cache, and return to caller" },
        { id: "b", text: "Return null immediately without querying the database" },
        { id: "c", text: "Purge all records from the primary database" },
        { id: "d", text: "Throw an unhandled exception and exit the request handler" }
      ],
      correctId: "a",
      explanation: "Read-aside cache misses trigger a primary database query, populate the cache for subsequent reads, and return fresh data."
    },
    {
      topic: `${subject} Concurrency & Race Conditions`,
      questionText: `Walk through a scenario where asynchronous processing or concurrent updates in ${subject} could cause a race condition, and explain how you would resolve it.`,
      modelAnswer: `Preventing race conditions requires mutex locks, optimistic concurrency controls, atomic operations, or message queues to sequence mutations safely.`,
      keywords: ["concurrency", "race conditions", "mutex", "optimistic locking", "atomic"],
      mcqText: `Which mechanism effectively prevents race conditions during state updates in concurrent ${subject} workflows?`,
      mcqOptions: [
        { id: "a", text: "Optimistic concurrency locking with version tokens" },
        { id: "b", text: "Ignoring thread safety and relying on client retries" },
        { id: "c", text: "Increasing CPU clock speed without code changes" },
        { id: "d", text: "Removing all database constraint checks" }
      ],
      correctId: "a",
      explanation: "Optimistic concurrency locking checks version tokens before writing, rejecting conflicting concurrent modifications."
    },
    {
      topic: `${subject} Observability & Telemetry`,
      questionText: `How do you design an effective observability and alerting framework for ${subject} in production?`,
      modelAnswer: `Observability encompasses structured logging, distributed request tracing, metric collection (latency, error rates, throughput), and actionable alerts.`,
      keywords: ["observability", "structured logging", "distributed tracing", "telemetry", "alerting"],
      mcqText: `Which component of observability allows tracing a single request across multiple microservices in ${subject}?`,
      mcqOptions: [
        { id: "a", text: "Distributed Tracing with Correlation IDs" },
        { id: "b", text: "Static code analysis warnings" },
        { id: "c", text: "Client-side browser cookies" },
        { id: "d", text: "Local console log statements without metadata" }
      ],
      correctId: "a",
      explanation: "Distributed tracing uses unique correlation IDs propagated across network calls to visualize request journeys."
    },
    {
      topic: `${subject} API Design & Backward Compatibility`,
      questionText: `As a ${role}, what principles do you follow when designing resilient REST/GraphQL APIs for ${subject} that need to evolve over time?`,
      modelAnswer: `Robust API design relies on explicit resource contracts, deprecation strategies, non-breaking schema expansions, semantic versioning, and defensive payload parsing.`,
      keywords: ["API design", "versioning", "backward compatibility", "contracts", "schema"],
      mcqText: `Which change to a public ${subject} API endpoint represents a breaking change for existing clients?`,
      mcqOptions: [
        { id: "a", text: "Removing or renaming a required response field" },
        { id: "b", text: "Adding an optional query parameter with a default value" },
        { id: "c", text: "Adding a new optional field to JSON responses" },
        { id: "d", text: "Improving backend query execution speed" }
      ],
      correctId: "a",
      explanation: "Deleting or renaming existing required fields breaks client deserialization logic expecting those keys."
    },
    {
      topic: `${subject} Edge Case & Error Handling`,
      questionText: `Explain how you design defensive error boundaries and fail-safe defaults in ${subject} to prevent catastrophic system crashes.`,
      modelAnswer: `Defensive handling involves wrapping volatile boundaries in error catch blocks, serving graceful fallback UI or data, logging context, and maintaining partial system functionality.`,
      keywords: ["error boundaries", "fail-safe", "defensive programming", "graceful degradation", "exception handling"],
      mcqText: `What is the main objective of implementing error boundaries in ${subject}?`,
      mcqOptions: [
        { id: "a", text: "To isolate component failures gracefully without crashing the entire application" },
        { id: "b", text: "To suppress all error logs and hide bugs from developers" },
        { id: "c", text: "To bypass network authentication constraints" },
        { id: "d", text: "To automatically fix syntax errors in production" }
      ],
      correctId: "a",
      explanation: "Error boundaries catch unhandled runtime errors in tree branches, rendering fallback interfaces rather than crashing the full application."
    }
  ];

  // Randomize template offset based on timestamp and previous questions length
  const offset = Math.abs((Date.now() + (previousQuestions?.length || 0) * 17) % templates.length);
  const shuffledTemplates = [...templates.slice(offset), ...templates.slice(0, offset)];

  for (let i = 0; i < numCount; i++) {
    const t = shuffledTemplates[i % shuffledTemplates.length];
    const isMcq = format === 'mcq' || (format !== 'subjective' && format !== 'application' && i > 0 && i % 2 === 1);
    
    if (isMcq) {
      questions.push({
        id: `q_fb_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        type: "mcq_single",
        subject,
        difficulty,
        questionText: t.mcqText,
        suggestedDuration: 60,
        options: t.mcqOptions,
        correctOptionId: t.correctId,
        explanation: t.explanation
      });
    } else {
      questions.push({
        id: `q_fb_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        type: "subjective",
        subject,
        difficulty,
        questionText: t.questionText,
        suggestedDuration: 120,
        modelAnswer: t.modelAnswer,
        keywords: t.keywords
      });
    }
  }

  return enforceMcqRules(questions, format, numCount);
}

// Fallback answer evaluation when Gemini API fails
function generateFallbackAnswerEvaluation(question: any, userAnswer: string | string[], timeTakenSeconds: number) {
  const answerStr = Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || "").trim();
  const wordCount = answerStr ? answerStr.split(/\s+/).length : 0;
  
  if (!answerStr) {
    return {
      technicalAccuracy: 0,
      communication: null,
      clarity: null,
      completeness: 0,
      confidence: null,
      overallScore: 0,
      strengths: [],
      weaknesses: ["No response was provided for this question."],
      improvementSuggestions: "Please provide a spoken or written response to allow technical and communication evaluation.",
      expectedVsActualDiff: "No response was submitted by the candidate."
    };
  }

  const keywords: string[] = Array.isArray(question?.keywords) ? question.keywords : [];
  let keywordHits = 0;
  const matchedKw: string[] = [];
  keywords.forEach(kw => {
    if (answerStr.toLowerCase().includes(kw.toLowerCase())) {
      keywordHits++;
      matchedKw.push(kw);
    }
  });

  const keywordRatio = keywords.length > 0 ? keywordHits / keywords.length : 0.5;
  const accuracyScore = Math.round(Math.min(95, Math.max(10, keywordRatio * 80 + (wordCount > 15 ? 15 : 0))));
  const commScore = wordCount >= 5 ? Math.round(Math.min(95, Math.max(40, 50 + (wordCount > 15 ? 30 : 10)))) : null;
  const clarityScore = wordCount >= 5 ? Math.round(Math.min(95, Math.max(40, 55 + (wordCount >= 10 && wordCount <= 120 ? 25 : 0)))) : null;
  const completenessScore = Math.round(Math.min(95, Math.max(10, keywordRatio * 85)));
  const confidenceScore = wordCount >= 5 ? Math.round(Math.min(95, Math.max(40, 55 + (timeTakenSeconds > 10 ? 20 : 10)))) : null;

  const validScores = [accuracyScore, commScore, clarityScore, completenessScore, confidenceScore].filter(s => typeof s === 'number') as number[];
  const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : accuracyScore;

  const strengths: string[] = [];
  if (matchedKw.length > 0) {
    strengths.push(`Incorporated key domain concepts (${matchedKw.join(', ')}).`);
  }
  if (wordCount > 25 && commScore && commScore >= 70) {
    strengths.push(`Articulated a structured response with clear technical detail.`);
  }

  return {
    technicalAccuracy: accuracyScore,
    communication: commScore,
    clarity: clarityScore,
    completeness: completenessScore,
    confidence: confidenceScore,
    overallScore,
    strengths,
    weaknesses: keywordHits < keywords.length && keywords.length > 0 ? [`Omitted key domain concepts: ${keywords.filter(kw => !answerStr.toLowerCase().includes(kw.toLowerCase())).join(', ')}.`] : ["Submitted response could benefit from deeper technical specificity."],
    improvementSuggestions: question?.modelAnswer ? `Compare with expected guidelines: "${question.modelAnswer}"` : "Focus on structured technical explanations and concrete real-world examples.",
    expectedVsActualDiff: `Candidate response word count: ${wordCount}. Matched keywords: ${matchedKw.join(', ') || 'None'}.`
  };
}

// Fallback overall interview report when Gemini API fails
function generateFallbackInterviewEvaluation(role: string, subject: string, difficulty: string, questions: any[], answers: any) {
  const questionList = Array.isArray(questions) ? questions : [];
  let totalScore = 0;
  let totalAccuracy = 0;
  let accuracyCount = 0;
  let totalComm = 0;
  let commCount = 0;
  let totalClarity = 0;
  let clarityCount = 0;
  let totalComp = 0;
  let compCount = 0;
  let totalConf = 0;
  let confCount = 0;
  let answeredCount = 0;

  questionList.forEach(q => {
    const ans = answers[q.id];
    if (ans) {
      const userAnsStr = Array.isArray(ans.userAnswer) ? ans.userAnswer.join(', ') : (ans.userAnswer || '').trim();
      if (userAnsStr.length >= 1) {
        answeredCount++;
      }
      if (ans.feedback) {
        if (typeof ans.feedback.overallScore === 'number') { totalScore += ans.feedback.overallScore; }
        if (typeof ans.feedback.technicalAccuracy === 'number') { totalAccuracy += ans.feedback.technicalAccuracy; accuracyCount++; }
        if (typeof ans.feedback.communication === 'number') { totalComm += ans.feedback.communication; commCount++; }
        if (typeof ans.feedback.clarity === 'number') { totalClarity += ans.feedback.clarity; clarityCount++; }
        if (typeof ans.feedback.completeness === 'number') { totalComp += ans.feedback.completeness; compCount++; }
        if (typeof ans.feedback.confidence === 'number') { totalConf += ans.feedback.confidence; confCount++; }
      }
    }
  });

  if (answeredCount === 0) {
    return {
      averageScore: 0,
      technicalAccuracy: 0,
      communication: null,
      clarity: null,
      completeness: 0,
      confidence: null,
      summary: "There was insufficient response data to generate a reliable evaluation.",
      strengths: [],
      weaknesses: ["No candidate responses were submitted during this interview session."],
      actionableSuggestions: ["Complete interview questions with spoken or written answers to receive a full evaluation."],
      recommendedResources: [`${subject} Technical Fundamentals & Practice Guidelines`]
    };
  }

  const divisor = questionList.length > 0 ? questionList.length : 1;
  const avgScore = Math.round(totalScore / divisor);
  const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;
  const avgComm = commCount > 0 ? Math.round(totalComm / commCount) : null;
  const avgClarity = clarityCount > 0 ? Math.round(totalClarity / clarityCount) : null;
  const avgComp = compCount > 0 ? Math.round(totalComp / compCount) : 0;
  const avgConf = confCount > 0 ? Math.round(totalConf / confCount) : null;

  const strengths: string[] = [];
  if (avgAccuracy >= 80) {
    strengths.push(`Demonstrated strong technical accuracy (${avgAccuracy}/100) across domain concepts.`);
  }
  if (avgComm !== null && avgComm >= 75) {
    strengths.push(`Spoken/written communication was clear, articulate, and well-structured.`);
  }

  let summary = "";
  if (avgScore >= 80) {
    summary = `Demonstrated strong technical competency in this ${difficulty} ${subject} interview for ${role}, completing ${answeredCount} of ${questionList.length} questions effectively with high accuracy. Overall score: ${avgScore}/100.`;
  } else if (avgScore >= 60) {
    summary = `Attempted ${answeredCount} of ${questionList.length} questions in this ${difficulty} ${subject} interview for ${role}. Displayed foundational knowledge with room for deeper technical precision. Overall score: ${avgScore}/100.`;
  } else {
    summary = `Attempted ${answeredCount} of ${questionList.length} questions in this ${difficulty} ${subject} interview for ${role}; however, the submitted responses contained insufficient technical content or incorrect answers, resulting in a low score of ${avgScore}/100.`;
  }

  return {
    averageScore: avgScore,
    technicalAccuracy: avgAccuracy,
    communication: avgComm,
    clarity: avgClarity,
    completeness: avgComp,
    confidence: avgConf,
    summary,
    strengths,
    weaknesses: answeredCount < questionList.length ? [`Skipped or left ${questionList.length - answeredCount} question(s) unattempted.`] : ["Opportunity to expand on granular technical edge-cases and architectural tradeoffs."],
    actionableSuggestions: [
      "Ensure every question is attempted with concrete technical reasoning.",
      "Review core architectural patterns and edge cases for the domain."
    ],
    recommendedResources: [
      `${subject} Industry Practice Guidelines & Architecture Patterns`
    ]
  };
}

// Helper function to enforce strict MCQ distribution limits, ordering, and First Question Rule
function enforceMcqRules(questions: any[], format: string, requestedCount: number): any[] {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  if (format === "mcq") return questions; // MCQs Only mode allows all MCQs

  const numCount = questions.length;
  let maxMcqs = 0;
  if (format === "subjective" || format === "application") {
    maxMcqs = 0;
  } else {
    if (numCount <= 3) maxMcqs = 1;
    else if (numCount <= 5) maxMcqs = 2;
    else maxMcqs = 3;
  }

  const convertToSubjective = (q: any) => {
    return {
      id: q.id || `q_${Math.random().toString(36).substring(2, 9)}`,
      type: "subjective",
      subject: q.subject || "General",
      difficulty: q.difficulty || "medium",
      questionText: q.questionText || "Explain your technical approach.",
      suggestedDuration: q.suggestedDuration || 120,
      modelAnswer: q.explanation || "A comprehensive summary covering core principles and technical implementation.",
      keywords: ["concepts", "implementation", "best practices"]
    };
  };

  const isMcq = (q: any) => q && (q.type === 'mcq_single' || q.type === 'mcq_multi');

  let result = [...questions];

  // 1. If format is subjective or application, ensure 0 MCQs
  if (maxMcqs === 0) {
    return result.map(q => isMcq(q) ? convertToSubjective(q) : q);
  }

  // 2. First Question Rule: Question 1 must NEVER be an MCQ
  if (isMcq(result[0])) {
    const firstSubjIdx = result.findIndex(q => !isMcq(q));
    if (firstSubjIdx > 0) {
      const temp = result[0];
      result[0] = result[firstSubjIdx];
      result[firstSubjIdx] = temp;
    } else {
      result[0] = convertToSubjective(result[0]);
    }
  }

  // 3. Enforce Max MCQ Limit
  let mcqIndices = result.map((q, idx) => isMcq(q) ? idx : -1).filter(idx => idx !== -1);
  if (mcqIndices.length > maxMcqs) {
    const excess = mcqIndices.slice(maxMcqs);
    excess.forEach(idx => {
      result[idx] = convertToSubjective(result[idx]);
    });
  }

  // 4. Spread MCQs naturally (prevent consecutive MCQs)
  for (let i = 1; i < result.length; i++) {
    if (isMcq(result[i]) && isMcq(result[i - 1])) {
      const swapSubjIdx = result.findIndex((q, idx) => idx > i && !isMcq(q));
      if (swapSubjIdx !== -1) {
        const temp = result[i];
        result[i] = result[swapSubjIdx];
        result[swapSubjIdx] = temp;
      } else {
        result[i] = convertToSubjective(result[i]);
      }
    }
  }

  return result;
}

// API: Generate Interview Questions in a single request
app.post("/api/generate-interview", async (req, res) => {
  try {
    const { role, subject, difficulty, questionCount, format, previousQuestions } = req.body;
    if (!role || !subject || !difficulty || !questionCount) {
      res.status(400).json({ error: "Missing required fields: role, subject, difficulty, questionCount" });
      return;
    }

    const ai = getGeminiClient();
    const numCount = Number(questionCount) || 5;
    
    let maxMcqs = 3;
    if (numCount <= 3) maxMcqs = 1;
    else if (numCount <= 5) maxMcqs = 2;
    else maxMcqs = 3;

    let formatInstruction = "";
    if (format === "subjective") {
      formatInstruction = `You MUST generate ONLY "subjective" type questions (long-form technical or conceptual questions). Do NOT generate multiple-choice questions (no "mcq_single" or "mcq_multi").`;
    } else if (format === "mcq") {
      formatInstruction = `You MUST generate ONLY multiple-choice questions. You MUST include a balanced mix of "mcq_single" (single correct answer) and "mcq_multi" (multiple correct answers). Favor "mcq_single" questions overall, while ensuring at least one "mcq_multi" question is included throughout the interview session. Do NOT generate "subjective" questions.`;
    } else if (format === "application") {
      formatInstruction = `You MUST generate ONLY practical, real-world scenario questions that assess how the candidate applies technical concepts in realistic industry situations ("type": "subjective"). Do NOT generate multiple-choice questions (no "mcq_single" or "mcq_multi"). Each question must describe a realistic real-world application problem or scenario.`;
    } else {
      formatInstruction = `CRITICAL FORMAT & MCQ DISTRIBUTION RULES:
1. MCQs are supporting questions, NOT the primary interview format.
2. For this ${numCount}-question interview session, you MUST generate AT MOST ${maxMcqs} multiple-choice question(s) ("mcq_single" or "mcq_multi") in total. All other ${Math.max(0, numCount - maxMcqs)} or more questions MUST be "subjective" (conceptual, practical, or scenario-based).
3. FIRST QUESTION RULE: Question 1 (index 0) MUST NEVER BE AN MCQ. Question 1 must always be a conceptual, practical, or application-based "subjective" question.
4. QUESTION ORDERING & SPREAD: Do NOT place all MCQs together. Spread any MCQ questions naturally throughout the session between subjective questions (e.g. at Question 2 or Question 4). Never make consecutive questions MCQs.
5. MCQ QUALITY: Ensure any MCQ generated is directly relevant to "${role}" and "${subject}", assessing meaningful technical judgment.`;
    }

    let difficultyInstruction = "";
    if (difficulty === "mixed") {
      difficultyInstruction = `Difficulty: Mixed (Provide a balanced combination of easy, medium, and hard questions across the session). Set each question's "difficulty" attribute to its specific level ("easy", "medium", or "hard").`;
    } else {
      difficultyInstruction = `Difficulty Level: "${difficulty}". Set each question's "difficulty" attribute to "${difficulty}".`;
    }

    const prevList = Array.isArray(previousQuestions) && previousQuestions.length > 0
      ? previousQuestions.slice(-20).map((q: string, i: number) => `${i + 1}. "${q}"`).join("\n")
      : "";

    const prevConstraint = prevList
      ? `\nPREVIOUSLY ASKED QUESTIONS TO AVOID (DO NOT repeat, rephrase, or ask questions on the exact same topic/scenario as these):\n${prevList}\n`
      : "";

    const prompt = `You are an expert corporate technical interviewer generating a completely fresh, highly dynamic, professional, and diverse set of interview questions.
Candidate Role: "${role}"
Target Subject: "${subject}"
${difficultyInstruction}

GENERATION ENTROPY ID: ${Date.now()}_${Math.random().toString(36).substring(2)}

${formatInstruction}

CRITICAL DIVERSITY & VARIETY MANDATE:
- Generate fresh, original questions. Avoid generic or repetitive textbook questions.
- Explore different sub-topics, scenarios, practical application problems, debugging challenges, architectural tradeoffs, and performance edge cases.
- If generating MCQs, invent fresh choices and realistic distractors that test deep understanding.
- If generating subjective questions, ground them in realistic industry scenarios for ${role}.
${prevConstraint}
Return your response EXACTLY as a JSON array of questions. Ensure each item conforms to the appropriate structure below:

For subjective type:
{
  "id": "q_[unique_suffix]",
  "type": "subjective",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "questionText": "The verbal question to be spoken aloud...",
  "suggestedDuration": 120,
  "modelAnswer": "A comprehensive summary of what a perfect answer covers...",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

For mcq_single type:
{
  "id": "q_[unique_suffix]",
  "type": "mcq_single",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "questionText": "The question context...",
  "suggestedDuration": 60,
  "options": [
    {"id": "a", "text": "Option A text"},
    {"id": "b", "text": "Option B text"},
    {"id": "c", "text": "Option C text"},
    {"id": "d", "text": "Option D text"}
  ],
  "correctOptionId": "b",
  "explanation": "Detailed explanation of why B is correct and others are not..."
}

For mcq_multi type:
{
  "id": "q_[unique_suffix]",
  "type": "mcq_multi",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "questionText": "The question context where multiple answers are correct...",
  "suggestedDuration": 90,
  "options": [
    {"id": "a", "text": "Option A text"},
    {"id": "b", "text": "Option B text"},
    {"id": "c", "text": "Option C text"},
    {"id": "d", "text": "Option D text"}
  ],
  "correctOptionIds": ["a", "c"],
  "explanation": "Detailed explanation of why options A and C are correct..."
}

Ensure the output is 100% valid JSON, formatted without code block wrappers or extra text.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.85,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const rawQuestions = JSON.parse(text);
    const parsedQuestions = enforceMcqRules(rawQuestions, format, numCount);
    res.json({ questions: parsedQuestions });
  } catch (err: any) {
    console.log("[Interview API] Gemini service rate-limited or unavailable. Serving smart fallback question set.");
    const { role = "Software Engineer", subject = "General Tech", difficulty = "medium", questionCount = 5, format = "mixed", previousQuestions } = req.body || {};
    const fallbackQuestions = generateFallbackQuestions(role, subject, difficulty, questionCount, format, previousQuestions);
    res.json({ questions: fallbackQuestions });
  }
});

// API: Evaluate an individual answer
app.post("/api/evaluate-answer", async (req, res) => {
  try {
    const { question, userAnswer, timeTakenSeconds } = req.body;
    if (!question) {
      res.status(400).json({ error: "Missing required field: question" });
      return;
    }

    // For MCQ questions, evaluation is calculated deterministically
    if (question.type === 'mcq_single' || question.type === 'mcq_multi') {
      let selectedIds: string[] = [];
      if (Array.isArray(userAnswer)) {
        selectedIds = userAnswer;
      } else if (typeof userAnswer === 'string' && userAnswer.trim()) {
        const trimmed = userAnswer.trim();
        if (question.options?.some((o: any) => o.id === trimmed)) {
          selectedIds = [trimmed];
        } else {
          const matched = question.options?.filter((o: any) => trimmed.includes(o.text) || o.text === trimmed);
          if (matched && matched.length > 0) {
            selectedIds = matched.map((m: any) => m.id);
          }
        }
      }

      const hasSelected = selectedIds.length > 0;

      if (!hasSelected) {
        const correctOptText = question.type === 'mcq_single'
          ? question.options?.find((o: any) => o.id === question.correctOptionId)?.text || question.correctOptionId
          : question.options?.filter((o: any) => question.correctOptionIds?.includes(o.id)).map((o: any) => o.text).join(', ') || (question.correctOptionIds || []).join(', ');

        res.json({
          feedback: {
            technicalAccuracy: 0,
            communication: null,
            clarity: null,
            completeness: 0,
            confidence: null,
            overallScore: 0,
            strengths: [],
            weaknesses: ["No response was provided for this question."],
            improvementSuggestions: `No option was selected. The correct answer was: ${correctOptText}. ${question.explanation || ''}`,
            expectedVsActualDiff: `No response was submitted by the candidate. Expected answer: ${correctOptText}.`
          }
        });
        return;
      }

      const isCorrect = question.type === 'mcq_single'
        ? selectedIds.length === 1 && selectedIds[0] === question.correctOptionId
        : Array.isArray(question.correctOptionIds) &&
          question.correctOptionIds.length === selectedIds.length &&
          question.correctOptionIds.every((id: string) => selectedIds.includes(id));

      const selectedOptTexts = question.options?.filter((o: any) => selectedIds.includes(o.id)).map((o: any) => o.text).join(', ') || selectedIds.join(', ');
      const correctOptTexts = question.type === 'mcq_single'
        ? question.options?.find((o: any) => o.id === question.correctOptionId)?.text || question.correctOptionId
        : question.options?.filter((o: any) => question.correctOptionIds?.includes(o.id)).map((o: any) => o.text).join(', ') || (question.correctOptionIds || []).join(', ');

      const score = isCorrect ? 100 : 0;

      res.json({
        feedback: {
          technicalAccuracy: score,
          communication: null,
          clarity: null,
          completeness: score,
          confidence: null,
          overallScore: score,
          strengths: isCorrect ? [`Selected the correct option: ${selectedOptTexts}`] : [],
          weaknesses: isCorrect ? [] : ['Your selected answer was incorrect.'],
          improvementSuggestions: isCorrect
            ? (question.explanation || 'Your choice is correct.')
            : `Your selected answer (${selectedOptTexts}) was incorrect. The correct answer is: ${correctOptTexts}. ${question.explanation || ''}`,
          expectedVsActualDiff: isCorrect
            ? `Your choice (${selectedOptTexts}) matches the expected solution.`
            : `Your choice: ${selectedOptTexts}. Expected choice: ${correctOptTexts}.`
        }
      });
      return;
    }

    // Handle empty or blank response for subjective/voice questions
    const rawAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(', ') : (userAnswer || "").trim();
    if (!rawAnswerStr) {
      res.json({
        feedback: {
          technicalAccuracy: 0,
          communication: null,
          clarity: null,
          completeness: 0,
          confidence: null,
          overallScore: 0,
          strengths: [],
          weaknesses: ["No response was provided for this question."],
          improvementSuggestions: "Please provide a spoken or written response to allow technical evaluation.",
          expectedVsActualDiff: "No response was submitted by the candidate."
        }
      });
      return;
    }

    // Subjective evaluation via Gemini
    const ai = getGeminiClient();
    const prompt = `You are an elite, fair technical examiner. Evaluate the candidate's verbal/text answer to the following technical interview question strictly based on evidence:

Question: "${question.questionText}"
Expected Model Answer Guideline: "${question.modelAnswer}"
Expected Keywords: ${JSON.stringify(question.keywords)}

Candidate's Answer: "${rawAnswerStr}"
Time Taken: ${timeTakenSeconds} seconds

Provide a multi-dimensional feedback review of their answer in strict JSON format.

CRITICAL EVIDENCE-BASED EVALUATION RULES:
1. "technicalAccuracy": Grade 0-100 based strictly on accuracy of facts and concepts.
2. "communication": Grade 0-100 ONLY if a spoken or written answer with meaningful content is present. If candidate remained silent or provided no meaningful answer, set to null.
3. "clarity": Grade 0-100 ONLY if candidate provided a response. If empty/meaningless, set to null.
4. "completeness": Grade 0-100 based on coverage of guidelines from the model answer.
5. "confidence": Grade 0-100 ONLY if candidate provided a response. If empty/meaningless, set to null.
6. "strengths": Array of string strengths. NEVER fabricate or invent strengths. Only list strengths explicitly supported by evidence in the candidate's response text. Return [] if no strengths exist.
7. "weaknesses": Array of string weaknesses based on missing concepts or incorrect statements.

Return EXACTLY a JSON object matching this structure:
{
  "technicalAccuracy": number,
  "communication": number | null,
  "clarity": number | null,
  "completeness": number,
  "confidence": number | null,
  "overallScore": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "improvementSuggestions": "string description with advice and recommendations",
  "expectedVsActualDiff": "string comparison describing where the candidate succeeded or what key elements they omitted"
}

Ensure the output is 100% valid JSON, formatted without code block wrappers or extra text.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const feedback = JSON.parse(text);
    res.json({ feedback });
  } catch (err: any) {
    console.log("[Interview API] Gemini service rate-limited or unavailable. Serving smart fallback answer evaluation.");
    const { question, userAnswer, timeTakenSeconds = 30 } = req.body || {};
    const fallbackFeedback = generateFallbackAnswerEvaluation(question, userAnswer, timeTakenSeconds);
    res.json({ feedback: fallbackFeedback });
  }
});

// API: Overall Interview Evaluation
app.post("/api/evaluate-interview", async (req, res) => {
  try {
    const { role, subject, difficulty, questions, answers } = req.body;
    if (!questions || !answers) {
      res.status(400).json({ error: "Missing required fields: questions, answers" });
      return;
    }

    const questionList = Array.isArray(questions) ? questions : [];
    let answeredCount = 0;
    questionList.forEach((q: any) => {
      const ans = answers[q.id];
      if (ans) {
        const str = Array.isArray(ans.userAnswer) ? ans.userAnswer.join(', ') : (ans.userAnswer || '').trim();
        if (str.length >= 3) answeredCount++;
      }
    });

    // If candidate provided no answers at all
    if (answeredCount === 0) {
      res.json({
        overallFeedback: {
          averageScore: 0,
          technicalAccuracy: 0,
          communication: null,
          clarity: null,
          completeness: 0,
          confidence: null,
          summary: "There was insufficient response data to generate a reliable evaluation.",
          strengths: [],
          weaknesses: ["No candidate responses were submitted during this interview session."],
          actionableSuggestions: ["Complete interview questions with spoken or written answers to receive a full evaluation."],
          recommendedResources: [`${subject} Technical Fundamentals & Practice Guidelines`]
        }
      });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `You are a Lead Hiring Architect. Evaluate the overall interview performance of a candidate for the role of: "${role}".
Subject: "${subject}"
Difficulty: "${difficulty}"

Here are the questions and the candidate's evaluated responses:
${questionList.map((q: any) => {
  const ans = answers[q.id];
  return `\n---
Question: ${q.questionText}
User Answer: ${ans?.userAnswer || '[No Answer Submitted]'}
Score: ${ans?.feedback?.overallScore ?? 0}/100
Technical Accuracy: ${ans?.feedback?.technicalAccuracy ?? 'Not Evaluated'}
Communication: ${ans?.feedback?.communication ?? 'Not Evaluated'}
Clarity: ${ans?.feedback?.clarity ?? 'Not Evaluated'}
Completeness: ${ans?.feedback?.completeness ?? 'Not Evaluated'}
Confidence: ${ans?.feedback?.confidence ?? 'Not Evaluated'}
Strengths: ${JSON.stringify(ans?.feedback?.strengths || [])}
Weaknesses: ${JSON.stringify(ans?.feedback?.weaknesses || [])}
`;
}).join('\n')}

Review the aggregate dimensions and output an overall composite score profile together with a high-level summary, strengths, weaknesses, actionable suggestions, and study resources.

CRITICAL EVIDENCE-BASED INTERVIEW EVALUATION RULES:
1. "summary":
   - If the candidate answered 0 or very few questions with meaningful content (< 30% of interview), set summary EXACTLY to: "There was insufficient response data to generate a reliable evaluation."
   - Otherwise, provide a constructive, objective summary strictly reflecting actual performance.
2. "communication", "clarity", "confidence":
   - Calculate average ONLY from answered questions that had actual spoken/written candidate responses. If NO spoken/written answers were provided, set "communication", "clarity", and "confidence" to null.
3. "strengths":
   - List ONLY strengths directly supported by answered questions. NEVER fabricate strengths. If no measurable strengths exist, return [].
4. "weaknesses" & "actionableSuggestions":
   - Base suggestions directly on incorrect answers, missing concepts, or weak explanations in actual responses.

Return EXACTLY a JSON object matching this structure:
{
  "averageScore": number,
  "technicalAccuracy": number | null,
  "communication": number | null,
  "clarity": number | null,
  "completeness": number | null,
  "confidence": number | null,
  "summary": "Professional high-level summary of their general performance",
  "strengths": ["Overall strength 1"],
  "weaknesses": ["Overall weakness 1"],
  "actionableSuggestions": ["Actionable suggestion 1"],
  "recommendedResources": ["Specific book, doc, or topic 1"]
}

Ensure the output is 100% valid JSON, formatted without code block wrappers or extra text.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }

    const overallFeedback = JSON.parse(text);
    res.json({ overallFeedback });
  } catch (err: any) {
    console.log("[Interview API] Gemini service rate-limited or unavailable. Serving smart fallback interview report.");
    const { role = "Software Engineer", subject = "General Tech", difficulty = "medium", questions = [], answers = {} } = req.body || {};
    const fallbackOverall = generateFallbackInterviewEvaluation(role, subject, difficulty, questions, answers);
    res.json({ overallFeedback: fallbackOverall });
  }
});

// API: Handle Supabase OAuth callback
app.get("/auth/callback", async (req, res, next) => {
  try {
    const code = req.query.code as string;
    const tokenHash = req.query.token_hash as string;
    const type = req.query.type as string;
    const errorDescription = req.query.error_description as string;
    
    if (errorDescription) {
      throw new Error(errorDescription);
    }
    
    if (!code && !tokenHash) {
      // This is likely a client-side routing fallback (e.g. email confirmation redirect containing hash parameters like #access_token=...)
      // Pass control to the next middleware (Vite or static file server) to load the client-side SPA,
      // which can then parse the hash parameters using the Supabase client.
      return next();
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials are not configured on the server.");
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
    
    let session: any = null;
    
    if (code) {
      const { data, error } = await supabaseServer.auth.exchangeCodeForSession(code);
      if (error) throw error;
      session = data?.session;
    } else if (tokenHash) {
      const { data, error } = await supabaseServer.auth.verifyOtp({
        token_hash: tokenHash,
        type: (type as any) || 'signup'
      });
      if (error) throw error;
      session = data?.session;
    }

    if (!session) {
      throw new Error("Failed to retrieve session from callback parameters.");
    }

    // Send the session data back to the opener window using postMessage and close the popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #020617;
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .spinner {
              border: 4px solid rgba(255, 255, 255, 0.1);
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border-left-color: #3b82f6;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h1 { font-size: 24px; margin-bottom: 10px; font-weight: 600; }
            p { color: #94a3b8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h1>Connecting Your Account...</h1>
          <p>This window will close automatically once the connection is completed.</p>
          <script>
            try {
              const session = ${JSON.stringify(session)};
              const type = ${JSON.stringify(req.query.type || '')};
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'SUPABASE_OAUTH_SUCCESS', 
                  session: session 
                }, '*');
                setTimeout(() => window.close(), 500);
              } else {
                if (type === 'recovery') {
                  window.location.href = '/#access_token=' + encodeURIComponent(session.access_token) + 
                                         '&refresh_token=' + encodeURIComponent(session.refresh_token) + 
                                         '&type=recovery';
                } else {
                  window.location.href = '/?verified=true';
                }
              }
            } catch (err) {
              console.error("Error in auth callback client scripts:", err);
              document.body.innerHTML = '<h1>Error</h1><p>Failed to connect window. Please try closing this popup and signing in again.</p>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #020617;
              color: #f8fafc;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              padding: 20px;
            }
            .error-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { font-size: 24px; margin-bottom: 10px; color: #ef4444; }
            p { color: #94a3b8; font-size: 14px; max-width: 400px; line-height: 1.5; }
            button {
              margin-top: 24px;
              background-color: #ef4444;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="error-icon">⚠️</div>
          <h1>Authentication Failed</h1>
          <p>${err.message || "An unexpected error occurred during the OAuth authentication flow."}</p>
          <button onclick="window.close()">Close Window</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'SUPABASE_OAUTH_FAILURE', 
                error: ${JSON.stringify(err.message || 'Authentication failed')} 
              }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

// Serve frontend build and mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
