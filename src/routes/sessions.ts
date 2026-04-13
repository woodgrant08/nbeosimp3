import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, casesTable, sessionsTable } from "@workspace/db";
import {
  CreateSessionBody,
  GetSessionParams,
  GetSessionResponse,
  SubmitSessionParams,
  SubmitSessionBody,
  SubmitSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/sessions", async (req, res): Promise<void> => {
  const body = CreateSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, body.data.caseId));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      caseId: body.data.caseId,
      historyLog: [],
      status: "in_progress",
    })
    .returning();

  res.status(201).json(GetSessionResponse.parse(formatSession(session)));
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(GetSessionResponse.parse(formatSession(session)));
});

router.post("/sessions/:id/submit", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session id" });
    return;
  }

  const body = SubmitSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, session.caseId));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  // Score the submission
  const scoring = scoreSubmission({
    assessmentAndPlan: body.data.assessmentAndPlan,
    requestedTests: body.data.requestedTests,
    historyLog: body.data.historyLog as any,
    timeExpired: body.data.timeExpired,
    caseRow,
  });

  const status = body.data.timeExpired ? "timed_out" : "completed";

  const [updatedSession] = await db
    .update(sessionsTable)
    .set({
      completedAt: new Date(),
      historyLog: body.data.historyLog as any,
      requestedTests: body.data.requestedTests,
      assessmentAndPlan: body.data.assessmentAndPlan,
      score: scoring.score,
      feedback: scoring.feedback,
      status,
    })
    .where(eq(sessionsTable.id, id))
    .returning();

  const result = {
    session: formatSession(updatedSession),
    score: scoring.score,
    feedback: scoring.feedback,
    keyPoints: caseRow.keyPoints,
    missedPoints: scoring.missedPoints,
    modelAssessment: caseRow.modelAssessment,
    modelPlan: caseRow.modelPlan,
  };

  res.json(SubmitSessionResponse.parse(result));
});

function formatSession(session: any) {
  return {
    id: session.id,
    caseId: session.caseId,
    startedAt: session.startedAt,
    completedAt: session.completedAt ?? null,
    historyLog: (session.historyLog as any) || [],
    requestedTests: session.requestedTests ?? null,
    assessmentAndPlan: session.assessmentAndPlan ?? null,
    score: session.score ?? null,
    feedback: session.feedback ?? null,
    status: session.status as "in_progress" | "completed" | "timed_out",
  };
}

function scoreSubmission(params: {
  assessmentAndPlan: string;
  requestedTests: string;
  historyLog: Array<{ role: string; message: string }>;
  timeExpired: boolean;
  caseRow: any;
}): { score: number; feedback: string; missedPoints: string[] } {
  const { assessmentAndPlan, requestedTests, historyLog, timeExpired, caseRow } = params;
  const keyPoints: string[] = caseRow.keyPoints || [];
  const ap = assessmentAndPlan.toLowerCase();
  const tests = requestedTests.toLowerCase();

  let score = 0;
  const missedPoints: string[] = [];

  // Score based on key points mentioned in assessment & plan
  const pointsHit: string[] = [];
  for (const point of keyPoints) {
    const pointWords = point.toLowerCase().split(" ").filter((w) => w.length > 4);
    const matchCount = pointWords.filter((w) => ap.includes(w)).length;
    if (matchCount >= Math.min(2, Math.ceil(pointWords.length * 0.4))) {
      pointsHit.push(point);
    } else {
      missedPoints.push(point);
    }
  }

  // Base score from key points coverage
  const keyPointScore = keyPoints.length > 0 ? (pointsHit.length / keyPoints.length) * 70 : 35;
  score += keyPointScore;

  // Score for taking history (up to 15 points)
  const candidateQuestions = historyLog.filter((h) => h.role === "candidate").length;
  const historyScore = Math.min(15, candidateQuestions * 3);
  score += historyScore;

  // Score for requesting relevant tests (up to 15 points)
  const availableTests: string[] = caseRow.availableAncillaryTests || [];
  let testScore = 0;
  if (availableTests.length > 0) {
    const testsRequested = availableTests.filter((t) =>
      tests.includes(t.toLowerCase().split(" ")[0])
    ).length;
    testScore = Math.min(15, (testsRequested / Math.max(1, availableTests.length)) * 15);
  } else {
    testScore = tests.length > 10 ? 10 : 5;
  }
  score += testScore;

  // Time penalty if expired
  if (timeExpired) {
    score = Math.max(0, score - 10);
  }

  // Cap at 100
  score = Math.min(100, Math.round(score));

  // Generate feedback
  let feedback = "";
  if (score >= 85) {
    feedback = "Excellent performance! You demonstrated strong clinical reasoning and covered the major diagnostic and management points for this case.";
  } else if (score >= 70) {
    feedback = "Good performance. You identified most key findings and formulated a reasonable assessment and plan. Review the missed points below to strengthen your approach.";
  } else if (score >= 55) {
    feedback = "Fair performance. You captured some important elements but missed several key diagnostic or management considerations. Study the model assessment carefully.";
  } else {
    feedback = "More practice needed. This case requires careful attention to the key diagnostic criteria and management principles. Review the model assessment and plan thoroughly.";
  }

  if (candidateQuestions < 3) {
    feedback += " Consider taking a more thorough history — asking targeted questions helps build rapport and gather critical diagnostic information.";
  }

  if (timeExpired) {
    feedback += " Note: The case timer expired, which resulted in a score deduction. Practice working efficiently within the 15-minute limit.";
  }

  return { score, feedback, missedPoints };
}

export default router;
