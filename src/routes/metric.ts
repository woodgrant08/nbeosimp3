import { Router, type IRouter } from "express";
import { eq, count, avg, sum, sql } from "drizzle-orm";
import { db, casesTable, sessionsTable, settingsTable } from "@workspace/db";
import {
  GetMetricsResponse,
  GetTestDateResponse,
  SetTestDateBody,
  SetTestDateResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/metrics", async (_req, res): Promise<void> => {
  const allCases = await db.select().from(casesTable);
  const completedSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "completed"))
    .orderBy(sessionsTable.completedAt);

  const timedOutSessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "timed_out"));

  const allFinishedSessions = [...completedSessions, ...timedOutSessions];

  // Total cases completed (unique)
  const completedCaseIds = new Set(completedSessions.map((s) => s.caseId));
  const totalCasesCompleted = completedCaseIds.size;

  // Average score
  const scores = completedSessions.map((s) => s.score).filter((s) => s !== null) as number[];
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  // Total time practiced (sessions * 15 minutes, in minutes)
  const totalTimePracticed = allFinishedSessions.length * 15;

  // Cases by topic
  const topicMap = new Map<string, { total: number; completed: Set<number>; scores: number[] }>();
  for (const c of allCases) {
    if (!topicMap.has(c.topic)) {
      topicMap.set(c.topic, { total: 0, completed: new Set(), scores: [] });
    }
    topicMap.get(c.topic)!.total++;
  }

  for (const s of completedSessions) {
    const caseRow = allCases.find((c) => c.id === s.caseId);
    if (caseRow) {
      const topic = topicMap.get(caseRow.topic);
      if (topic) {
        topic.completed.add(s.caseId);
        if (s.score !== null) topic.scores.push(s.score);
      }
    }
  }

  const casesByTopic = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    completed: data.completed.size,
    total: data.total,
    averageScore:
      data.scores.length > 0
        ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
        : null,
  }));

  // Recent sessions
  const recentSessionsRaw = await db
    .select()
    .from(sessionsTable)
    .orderBy(sql`${sessionsTable.completedAt} DESC NULLS LAST, ${sessionsTable.startedAt} DESC`)
    .limit(10);

  const recentSessions = recentSessionsRaw.map((s) => {
    const caseRow = allCases.find((c) => c.id === s.caseId);
    return {
      sessionId: s.id,
      caseId: s.caseId,
      caseTitle: caseRow?.title || "Unknown Case",
      topic: caseRow?.topic || "Unknown",
      score: s.score ?? null,
      completedAt: s.completedAt ?? null,
      status: s.status,
    };
  });

  // Score distribution
  const buckets = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  for (const s of completedSessions) {
    if (s.score !== null) {
      const bucket = buckets.find((b) => s.score! >= b.min && s.score! <= b.max);
      if (bucket) bucket.count++;
    }
  }

  const scoreDistribution = buckets.map(({ range, count }) => ({ range, count }));

  const result = {
    totalCasesCompleted,
    averageScore,
    totalTimePracticed,
    casesByTopic,
    recentSessions,
    scoreDistribution,
  };

  res.json(GetMetricsResponse.parse(result));
});

router.get("/test-date", async (_req, res): Promise<void> => {
  const [setting] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "test_date"));

  res.json(GetTestDateResponse.parse({ date: setting?.value ?? null }));
});

router.put("/test-date", async (req, res): Promise<void> => {
  const body = SetTestDateBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  await db
    .insert(settingsTable)
    .values({ key: "test_date", value: body.data.date })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: body.data.date } });

  res.json(SetTestDateResponse.parse({ date: body.data.date }));
});

export default router;
