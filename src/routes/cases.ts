import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db, casesTable, sessionsTable } from "@workspace/db";
import {
  ListCasesQueryParams,
  ListCasesResponse,
  GetCaseResponse,
  AskPatientBody,
  AskPatientResponse,
  RequestAncillaryTestsBody,
  RequestAncillaryTestsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cases", async (req: Request, res: Response): Promise<void> => {
  const query = ListCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let dbQuery = db.select().from(casesTable);
  const cases = await dbQuery;

  const completedSessions = await db
    .select({
      caseId: sessionsTable.caseId,
      maxScore: sql<number>`max(${sessionsTable.score})`,
    })
    .from(sessionsTable)
    .where(eq(sessionsTable.status, "completed"))
    .groupBy(sessionsTable.caseId);

  const completedMap = new Map(completedSessions.map((s) => [s.caseId, s.maxScore]));

  let filtered = cases;
  if (query.data.topic) {
    filtered = cases.filter((c) => c.topic.toLowerCase().includes(query.data.topic!.toLowerCase()));
  }

  const result = filtered.map((c) => ({
    id: c.id,
    title: c.title,
    topic: c.topic,
    difficulty: c.difficulty as "easy" | "medium" | "hard",
    chiefComplaint: c.chiefComplaint,
    completed: completedMap.has(c.id),
    bestScore: completedMap.get(c.id) ?? null,
  }));

  res.json(ListCasesResponse.parse(result));
});

router.get("/cases/:id", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case id" });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const result = {
    id: caseRow.id,
    title: caseRow.title,
    topic: caseRow.topic,
    difficulty: caseRow.difficulty as "easy" | "medium" | "hard",
    chiefComplaint: caseRow.chiefComplaint,
    patientDemographics: caseRow.patientDemographics as any,
    reviewOfSystems: caseRow.reviewOfSystems,
    currentMedications: caseRow.currentMedications,
    examFindings: caseRow.examFindings as any,
    availableAncillaryTests: caseRow.availableAncillaryTests,
    keyPoints: caseRow.keyPoints,
    modelAssessment: caseRow.modelAssessment,
    modelPlan: caseRow.modelPlan,
  };

  res.json(GetCaseResponse.parse(result));
});

router.post("/cases/:id/ask", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case id" });
    return;
  }

  const body = AskPatientBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const caseData = caseRow as any;
  const question = body.data.question.toLowerCase();

  // Build contextual patient answer based on case data
  const answer = generatePatientAnswer(question, caseData);

  res.json(AskPatientResponse.parse({ answer }));
});

router.post("/cases/:id/ancillary-tests", async (req: Request, res: Response): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case id" });
    return;
  }

  const body = RequestAncillaryTestsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRow) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const ancillaryResults = caseRow.ancillaryTestResults as Record<string, any>;
  const requestedRaw = body.data.requestedTests.toLowerCase();

  const results: Array<{ testName: string; result: string; interpretation?: string }> = [];

  // Match requested tests to available test results
  for (const [testName, testData] of Object.entries(ancillaryResults)) {
    if (requestedRaw.includes(testName.toLowerCase()) || isTestRequested(requestedRaw, testName)) {
      results.push({
        testName,
        result: typeof testData === "string" ? testData : (testData as any).result,
        interpretation: typeof testData === "object" ? (testData as any).interpretation : undefined,
      });
    }
  }

  // If no specific tests matched, return a generic "not available" for tests not in the case
  if (results.length === 0) {
    results.push({
      testName: "Requested Tests",
      result: "The tests you requested are not available for this patient at this time. Please refer to the available tests listed in the case.",
    });
  }

  res.json(RequestAncillaryTestsResponse.parse({ results }));
});

function isTestRequested(requested: string, testName: string): boolean {
  const aliases: Record<string, string[]> = {
    "OCT": ["oct", "optical coherence tomography"],
    "Visual Fields": ["visual field", "vf", "perimetry", "humphrey", "goldmann"],
    "Corneal Topography": ["topography", "topo"],
    "Fluorescein Angiography": ["fa", "fluorescein", "angiography"],
    "B-Scan Ultrasound": ["b-scan", "b scan", "ultrasound", "bscan"],
    "A-Scan Ultrasound": ["a-scan", "a scan", "axial length"],
    "ERG": ["erg", "electroretinogram", "electroretinography"],
    "Pachymetry": ["pachymetry", "corneal thickness"],
    "Specular Microscopy": ["specular", "endothelial cell"],
    "Color Vision": ["color vision", "ishihara", "colour"],
    "Amsler Grid": ["amsler"],
    "Cover Test": ["cover test", "cover-uncover"],
    "Worth 4 Dot": ["worth 4", "worth four"],
    "Stereopsis": ["stereopsis", "stereo", "titmus"],
  };

  const lowerTest = testName.toLowerCase();
  const testAliases = aliases[testName] || [lowerTest];

  return testAliases.some((alias) => requested.includes(alias));
}

function generatePatientAnswer(question: string, caseData: any): string {
  const personality = caseData.patientPersonality || {};
  const demographics = caseData.patientDemographics || {};
  const ros = (caseData.reviewOfSystems || []).join(", ").toLowerCase();
  const medications = (caseData.currentMedications || []).join(", ").toLowerCase();

  // Pain/discomfort questions
  if (question.includes("pain") || question.includes("hurt") || question.includes("discomfort") || question.includes("ach")) {
    if (personality.hasPain) {
      return personality.painDescription || "Yes, I've been having some pain or discomfort. It's been bothering me for a while.";
    }
    return "No, I wouldn't say it's painful exactly. More of an annoyance, really.";
  }

  // Vision questions
  if (question.includes("vision") || question.includes("see") || question.includes("blur") || question.includes("visual")) {
    return personality.visionDescription || `My vision has been ${caseData.chiefComplaint}. It started gradually and has gotten more noticeable recently.`;
  }

  // Duration/onset questions
  if (question.includes("how long") || question.includes("when") || question.includes("start") || question.includes("onset") || question.includes("began") || question.includes("duration")) {
    return personality.onsetDescription || "It's been going on for several weeks now. Maybe a couple of months.";
  }

  // Worse/better questions
  if (question.includes("worse") || question.includes("better") || question.includes("improve") || question.includes("aggravat")) {
    return personality.worseDescription || "It seems worse later in the day, especially when I've been reading or on the computer for a long time.";
  }

  // Family history
  if (question.includes("family") || question.includes("parent") || question.includes("sibling") || question.includes("heredit")) {
    return personality.familyHistory || "My mother had some eye problems, but I'm not sure exactly what it was. She wore glasses.";
  }

  // Medical history
  if (question.includes("medical") || question.includes("health") || question.includes("condition") || question.includes("diagnosis") || question.includes("disease")) {
    return personality.medicalHistory || `I have ${ros || "no significant"} medical conditions that I know of.`;
  }

  // Medications
  if (question.includes("medication") || question.includes("medicine") || question.includes("drug") || question.includes("pill") || question.includes("drop")) {
    if (medications) {
      return `I'm currently taking ${medications}.`;
    }
    return "I'm not on any medications currently.";
  }

  // Allergies
  if (question.includes("allerg")) {
    return personality.allergies || "I have no known drug allergies.";
  }

  // Occupation/work
  if (question.includes("work") || question.includes("job") || question.includes("occupation") || question.includes("computer") || question.includes("screen")) {
    return `I work as a ${demographics.occupation || "professional"}. I do spend quite a bit of time on screens.`;
  }

  // Contact lens questions
  if (question.includes("contact") || question.includes("lens")) {
    return personality.contactLens || "I don't wear contact lenses. I've only ever worn glasses.";
  }

  // Glasses questions
  if (question.includes("glass") || question.includes("spectacle") || question.includes("corrective")) {
    return personality.glasses || "Yes, I wear glasses for distance. My prescription is a few years old.";
  }

  // Systemic questions (diabetes, hypertension)
  if (question.includes("diabet")) {
    return ros.includes("diabet") ? "Yes, I have diabetes. It's been controlled with medication." : "No, I don't have diabetes.";
  }

  if (question.includes("blood pressure") || question.includes("hypertension") || question.includes("hypertensive")) {
    return ros.includes("hypertension") || ros.includes("blood pressure") ? "Yes, I have high blood pressure. I take medication for it." : "My blood pressure has always been normal.";
  }

  // Age-related questions
  if (question.includes("age") || question.includes("how old") || question.includes("old are you")) {
    return `I'm ${demographics.age} years old.`;
  }

  // Floaters
  if (question.includes("floater") || question.includes("float")) {
    return personality.floaters || "I do notice some floaters occasionally, but they've been there for years.";
  }

  // Flashes
  if (question.includes("flash") || question.includes("light") || question.includes("photopsia")) {
    return personality.flashes || "No, I haven't noticed any flashes of light.";
  }

  // Headache
  if (question.includes("headache") || question.includes("head pain")) {
    return personality.headaches || "I do get headaches occasionally, especially after reading for a long time.";
  }

  // Double vision
  if (question.includes("double") || question.includes("diplopia")) {
    return personality.diplopia || "No, I'm not seeing double.";
  }

  // Previous eye surgery
  if (question.includes("surgery") || question.includes("operation") || question.includes("lasik") || question.includes("cataract")) {
    return personality.surgery || "I haven't had any eye surgery.";
  }

  // Generic helpful responses
  const genericResponses = [
    `That's a good question. Regarding my ${caseData.chiefComplaint}, I first noticed it gradually, and it's been concerning me.`,
    "I'm not entirely sure about that. Should I be worried about it?",
    `My eye doctor previously mentioned something about my eye health, but I can't remember exactly what they said.`,
    "I think everything else has been pretty normal. This is the main thing that's been bothering me.",
  ];

  return genericResponses[Math.floor(Math.random() * genericResponses.length)];
}

export default router;
