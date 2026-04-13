import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, casesTable, examsTable } from "@workspace/db";
import {
  GetExamParams,
  GetExamResponse,
  CompleteExamCaseParams,
  CompleteExamCaseBody,
  CompleteExamCaseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const EXAM_SIZE = 12;

function formatExam(exam: any) {
  return {
    id: exam.id,
    caseIds: exam.caseIds,
    currentCaseIndex: exam.currentCaseIndex,
    sessionIds: exam.sessionIds || [],
    scores: exam.scores || [],
    status: exam.status as "in_progress" | "completed",
    startedAt: exam.startedAt,
    completedAt: exam.completedAt ?? null,
  };
}

// POST /exams — create a new exam, randomly pick up to EXAM_SIZE cases
router.post("/exams", async (req, res): Promise<void> => {
  const allCases = await db.select({ id: casesTable.id }).from(casesTable);

  if (allCases.length === 0) {
    res.status(400).json({ error: "No cases available to create an exam." });
    return;
  }

  // Shuffle and pick up to EXAM_SIZE
  const shuffled = allCases.map((c) => c.id).sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, EXAM_SIZE);

  const [exam] = await db
    .insert(examsTable)
    .values({
      caseIds: selectedIds,
      currentCaseIndex: 0,
      sessionIds: [],
      scores: [],
      status: "in_progress",
    })
    .returning();

  res.status(201).json(GetExamResponse.parse(formatExam(exam)));
});

// GET /exams/:id
router.get("/exams/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid exam id" });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  res.json(GetExamResponse.parse(formatExam(exam)));
});

// POST /exams/:id/complete-case — record completed case session and advance
router.post("/exams/:id/complete-case", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid exam id" });
    return;
  }

  const body = CompleteExamCaseBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const updatedSessionIds = [...(exam.sessionIds || []), body.data.sessionId];
  const updatedScores = [...(exam.scores || []), body.data.score];
  const newIndex = exam.currentCaseIndex + 1;
  const isLastCase = newIndex >= exam.caseIds.length;

  const [updated] = await db
    .update(examsTable)
    .set({
      sessionIds: updatedSessionIds,
      scores: updatedScores,
      currentCaseIndex: newIndex,
      status: isLastCase ? "completed" : "in_progress",
      completedAt: isLastCase ? new Date() : null,
    })
    .where(eq(examsTable.id, id))
    .returning();

  res.json(CompleteExamCaseResponse.parse(formatExam(updated)));
});

export default router;
