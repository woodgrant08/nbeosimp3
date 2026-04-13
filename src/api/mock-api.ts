// Types used throughout the app
export type HistoryEntry = {
  role: "candidate" | "patient"
  message: string
}

export type TestResult = {
  testName: string
  result: string
  interpretation?: string
}

export type SubmissionResult = {
  score: number | null
  feedback: string | null
  keyPoints: string[]
  missedPoints: string[]
  modelAssessment: string
  modelPlan: string
  session: {
    caseId: number
    assessmentAndPlan: string
    historyLog: HistoryEntry[]
    requestedTests: string
  }
}

export type SessionData = {
  caseId: number
  assessmentAndPlan: string
  historyLog: HistoryEntry[]
  requestedTests: string
}

// A fake NBEO case
const fakeCase = {
  id: 1,
  title: "NBEO Part 3 Demo Case",
  topic: "Glaucoma",
  difficulty: "medium",
  completed: false,
  bestScore: 0,
  chiefComplaint: "Blurry vision in the right eye for 2 weeks.",
  patientDemographics: {
    age: 62,
    sex: "Male",
    occupation: "Retired",
  },
  reviewOfSystems: [
    "No headaches",
    "No flashes/floaters",
    "No systemic disease reported",
  ],
  currentMedications: ["None"],
  examFindings: {
    visualAcuity: {
      odSc: "20/60",
      osSc: "20/25",
      odCc: "20/40",
      osCc: "20/20",
      pinhole: "20/30",
    },
    refraction: {
      odSphere: "-2.00",
      odCylinder: "-1.00",
      odAxis: "180",
      odVaWithRx: "20/25",
      osSphere: "-1.50",
      osCylinder: "-0.50",
      osAxis: "170",
      osVaWithRx: "20/20",
      addPower: "+2.00",
    },
    slitLamp: {
      lids: "Normal",
      conjunctiva: "White and quiet",
      cornea: "Clear",
      anteriorChamber: "Deep and quiet",
      iris: "Round and reactive",
      lens: "Trace NS OU",
    },
    dilatedFindings: {
      iop: { od: 26, os: 18 },
      pupilResponse: "No RAPD",
      opticDisc: { od: "C/D 0.8", os: "C/D 0.5" },
      macula: { od: "Normal", os: "Normal" },
      vessels: { od: "Normal", os: "Normal" },
      periphery: { od: "Normal", os: "Normal" },
    },
  },
  keyPoints: [
    "Identify elevated IOP",
    "Assess optic nerve cupping",
    "Order visual field testing",
  ],
  modelAssessment: "Primary open-angle glaucoma OD>OS.",
  modelPlan:
    "Start topical IOP-lowering therapy, schedule visual field and OCT, follow-up in 4–6 weeks.",
}

// ---------------------------
// Mock API Hook Implementations
// ---------------------------

// Get the case
export function useGetCase(
  _id: number,
  _options?: { query?: { enabled?: boolean } }
) {
  return { data: fakeCase, isLoading: false }
}

// Create a session
export function useCreateSession() {
  return {
    isPending: false,
    mutateAsync: async ({ data }: { data: { caseId: number } }) => {
      return { id: 1, caseId: data.caseId }
    },
  }
}

export function useListCases() {
  return {
    data: [fakeCase],
    isLoading: false,
  }
}

export function useGetTestDate() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    data: { date: today },
    isLoading: false,
  }
}

export function useSetTestDate() {
  return {
    isPending: false,
    mutate: async ({ data }: { data: { date: string } }) => {
      return { date: data.date }
    },
  }
}

// Ask the patient a question
export function useAskPatient() {
  return {
    isPending: false,
    mutateAsync: async ({
      data,
    }: {
      id: number
      data: { question: string; historyLog: HistoryEntry[] }
    }) => {
      return {
        answer: "This is a mock patient answer for: " + data.question,
      }
    },
  }
}

// Request ancillary tests
export function useRequestAncillaryTests() {
  return {
    isPending: false,
    mutateAsync: async ({
      data: _data,
    }: {
      id: number
      data: { requestedTests: string }
    }) => {
      const results: TestResult[] = [
        {
          testName: "OCT RNFL",
          result: "Thinning superior and inferior OD",
          interpretation: "Consistent with glaucoma.",
        },
      ]
      return { results }
    },
  }
}

// Submit the session
export function useSubmitSession() {
  return {
    isPending: false,
    mutateAsync: async ({
      data,
    }: {
      id: number
      data: {
        historyLog: HistoryEntry[]
        requestedTests: string
        assessmentAndPlan: string
        timeExpired: boolean
      }
    }): Promise<SubmissionResult> => {
      return {
        score: 80,
        feedback:
          "Solid work. You identified glaucoma but could expand your management plan.",
        keyPoints: fakeCase.keyPoints,
        missedPoints: ["Discuss long-term monitoring schedule"],
        modelAssessment: fakeCase.modelAssessment,
        modelPlan: fakeCase.modelPlan,
        session: {
          caseId: fakeCase.id,
          assessmentAndPlan: data.assessmentAndPlan,
          historyLog: data.historyLog,
          requestedTests: data.requestedTests,
        },
      }
    },
  }
}

export type Exam = {
  id: number
  caseIds: number[]
  currentCaseIndex: number
  status: "active" | "completed"
}

let activeExam: Exam | null = null

export function useCreateExam() {
  return {
    isPending: false,
    mutateAsync: async (_?: unknown) => {
      activeExam = {
        id: Date.now(),
        caseIds: [1, 2, 3],
        currentCaseIndex: 0,
        status: "active",
      }
      return activeExam
    },
  }
}

export function useGetExam(
  _id: number,
  _options?: { query?: { enabled?: boolean; refetchOnWindowFocus?: boolean } }
) {
  return {
    data: activeExam ? activeExam : null,
    refetch: async () => activeExam,
  }
}

export function useCompleteExamCase() {
  return {
    isPending: false,
    mutateAsync: async ({
      id,
      data: _data,
    }: {
      id: number
      data: { sessionId: number; score: number }
    }) => {
      if (!activeExam || activeExam.id !== id) {
        throw new Error("Exam not found")
      }
      const nextIndex = activeExam.currentCaseIndex + 1
      activeExam = {
        ...activeExam,
        currentCaseIndex: nextIndex,
        status: nextIndex >= activeExam.caseIds.length ? "completed" : "active",
      }
      return activeExam
    },
  }
}

export function useGetSession(
  _id: number,
  _options?: { query?: { enabled?: boolean } }
) {
  return { data: null as SessionData | null }
}

// Metrics dashboard
export function useGetMetrics() {
  return {
    data: {
      totalCasesCompleted: 3,
      averageScore: 78,
      totalTimePracticed: 60 * 5,
      casesByTopic: [{ topic: "Glaucoma", averageScore: 80 }],
      recentSessions: [
        {
          sessionId: 1,
          caseTitle: "NBEO Part 3 Demo Case",
          score: 80,
          topic: "Glaucoma",
          completedAt: new Date().toISOString(),
        },
      ],
    },
    isLoading: false,
  }
}
