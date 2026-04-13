import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, Activity, Send, ChevronRight,
  FileText, AlertCircle, Trophy, Coffee, BarChart2, ArrowRight
} from "lucide-react";
import {
  useCreateExam,
  useGetExam,
  useCompleteExamCase,
  useGetCase,
  useCreateSession,
  useAskPatient,
  useRequestAncillaryTests,
  useSubmitSession,
} from "@/api/mock-api";
import type { HistoryEntry, TestResult, Exam } from "@/api/mock-api";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from "@/components/ui-elements";
import { cn, formatTime } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";

// ─── Types ────────────────────────────────────────────────────────────────────
type ExamPhase =
  | "lobby"         // before exam starts
  | "pre_case"      // 2-min review
  | "history"       // free-type Q&A
  | "exam_findings" // slit lamp, etc.
  | "tests"         // ancillary tests
  | "assessment"    // A&P
  | "break"         // 4-min break between cases
  | "results";      // final exam results

// ─── Lobby ────────────────────────────────────────────────────────────────────
function ExamLobby({ onStart, isLoading }: { onStart: () => void; isLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto py-20 px-4"
    >
      <Card className="text-center p-12 border-primary/20 shadow-2xl">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <BarChart2 className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Practice Exam</h1>
        <p className="text-muted-foreground text-lg mb-8">Simulated NBEO Part 3 Full Exam Experience</p>

        <div className="bg-muted/50 rounded-2xl p-6 text-left mb-10 space-y-4">
          <h3 className="font-bold text-lg border-b border-border/50 pb-2">Exam Format</h3>
          <ul className="space-y-3 text-muted-foreground font-medium">
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />Up to 12 cases presented in sequential order.</li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />Each case: <strong className="text-foreground">2-minute</strong> pre-case review + <strong className="text-foreground">15-minute</strong> timed encounter.</li>
            <li className="flex gap-3"><Coffee className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />A <strong className="text-foreground">4-minute break</strong> is provided between cases.</li>
            <li className="flex gap-3"><Trophy className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />Scores for each case are recorded and summarized at the end.</li>
            <li className="flex gap-3"><AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />If the 15-minute timer expires, the case auto-submits.</li>
          </ul>
        </div>

        <Button size="lg" className="w-full sm:w-auto px-12" onClick={onStart} disabled={isLoading}>
          {isLoading ? "Preparing Exam..." : "Begin Practice Exam"}
        </Button>
      </Card>
    </motion.div>
  );
}

// ─── Break Screen ─────────────────────────────────────────────────────────────
function BreakScreen({
  caseNumber,
  totalCases,
  score,
  onContinue,
  breakTimeLeft,
}: {
  caseNumber: number;
  totalCases: number;
  score: number | null;
  onContinue: () => void;
  breakTimeLeft: number;
}) {
  const isLast = caseNumber >= totalCases;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto py-20 px-4"
    >
      <Card className="text-center p-12 shadow-2xl border-amber-500/30">
        <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <Coffee className="w-10 h-10 text-amber-500" />
        </div>

        <div className="mb-4">
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Case {caseNumber} of {totalCases} Complete
          </span>
        </div>

        {score !== null && (
          <div className={cn(
            "text-6xl font-bold mb-2",
            score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-destructive"
          )}>
            {Math.round(score)}
          </div>
        )}
        {score !== null && <p className="text-muted-foreground mb-8">Score for this case</p>}

        {!isLast ? (
          <>
            <h2 className="text-2xl font-bold mb-2">Break Time</h2>
            <p className="text-muted-foreground mb-6">Next case begins automatically, or skip the break.</p>
            <div className={cn(
              "inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 mb-8 font-mono text-3xl font-bold",
              breakTimeLeft <= 30 ? "border-destructive text-destructive bg-destructive/10" : "border-amber-500/40 text-amber-600 bg-amber-500/10"
            )}>
              <Clock className="w-6 h-6" />
              {formatTime(breakTimeLeft)}
            </div>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={onContinue} className="gap-2 group">
                Skip Break & Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2">All Cases Complete!</h2>
            <p className="text-muted-foreground mb-8">View your full exam results below.</p>
            <Button size="lg" onClick={onContinue} className="gap-2">
              <Trophy className="w-5 h-5" /> View Results
            </Button>
          </>
        )}
      </Card>
    </motion.div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ExamResults({
  exam,
  caseScores,
}: {
  exam: Exam;
  caseScores: Array<{ caseId: number; score: number | null; title?: string }>;
}) {
  const [, setLocation] = useLocation();
  const scores = caseScores.map((c) => c.score).filter((s) => s !== null) as number[];
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const passed = scores.filter((s) => s >= 70).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-4 space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Trophy className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold">Exam Complete</h1>
        <p className="text-muted-foreground text-lg">Here's how you performed across all {exam.caseIds.length} cases.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center p-6">
          <div className={cn("text-5xl font-bold mb-1", avg !== null && avg >= 70 ? "text-green-500" : "text-amber-500")}>
            {avg !== null ? Math.round(avg) : "—"}
          </div>
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Average Score</div>
        </Card>
        <Card className="text-center p-6">
          <div className="text-5xl font-bold text-primary mb-1">{exam.caseIds.length}</div>
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cases Attempted</div>
        </Card>
        <Card className="text-center p-6">
          <div className="text-5xl font-bold text-green-500 mb-1">{passed}</div>
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cases ≥ 70%</div>
        </Card>
      </div>

      {/* Per-case breakdown */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle>Case-by-Case Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {caseScores.map((c, i) => {
            const s = c.score ?? 0;
            return (
              <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border/40 last:border-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground truncate">{c.title || `Case ${i + 1}`}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-32 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", s >= 80 ? "bg-green-500" : s >= 60 ? "bg-amber-500" : "bg-destructive")}
                      style={{ width: `${s}%` }}
                    />
                  </div>
                  <span className={cn("font-bold w-10 text-right", s >= 80 ? "text-green-500" : s >= 60 ? "text-amber-500" : "text-destructive")}>
                    {c.score !== null ? Math.round(s) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button variant="outline" size="lg" onClick={() => setLocation("/")}>
          Back to Home
        </Button>
        <Button size="lg" onClick={() => window.location.reload()}>
          Start New Exam
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Case Simulation (embedded, no navigation) ────────────────────────────────
function CaseSimulation({
  caseId,
  caseNumber,
  totalCases,
  onCaseComplete,
}: {
  caseId: number;
  caseNumber: number;
  totalCases: number;
  onCaseComplete: (sessionId: number, score: number) => void;
}) {
  const { data: caseData, isLoading } = useGetCase(caseId);
  const createSessionMutation = useCreateSession();
  const askMutation = useAskPatient();
  const requestTestsMutation = useRequestAncillaryTests();
  const submitMutation = useSubmitSession();

  type Phase = "pre_case" | "history" | "exam_findings" | "tests" | "assessment";

  const [phase, setPhase] = useState<Phase>("pre_case");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [requestedTests, setRequestedTests] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [assessmentPlan, setAssessmentPlan] = useState("");
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleTimeExpired = useCallback(async () => {
    if (!sessionId) return;
    mainTimer.stop();
    try {
      const res = await submitMutation.mutateAsync({
        id: sessionId,
        data: { historyLog, requestedTests, assessmentAndPlan: assessmentPlan, timeExpired: true },
      });
      onCaseComplete(sessionId, res.score ?? 0);
    } catch {
      onCaseComplete(sessionId, 0);
    }
  }, [sessionId, historyLog, requestedTests, assessmentPlan]);

  const preCaseTimer = useTimer(120, () => setPhase("history"));
  const mainTimer = useTimer(900, handleTimeExpired);

  // Start session once mounted
  useEffect(() => {
    if (!started && caseData && !createSessionMutation.isPending) {
      setStarted(true);
      createSessionMutation.mutateAsync({ data: { caseId } }).then((res) => {
        setSessionId(res.id);
        preCaseTimer.start();
      });
    }
  }, [caseData, started]);

  useEffect(() => {
    if (phase === "history" && !mainTimer.isRunning) {
      preCaseTimer.stop();
      mainTimer.start();
    }
  }, [phase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyLog, askMutation.isPending]);

  const handleAskQuestion = async () => {
    if (!questionInput.trim()) return;
    const newLog: HistoryEntry[] = [...historyLog, { role: "candidate", message: questionInput }];
    setHistoryLog(newLog);
    setQuestionInput("");
    try {
      const res = await askMutation.mutateAsync({ id: caseId, data: { question: questionInput, historyLog: newLog } });
      setHistoryLog((prev) => [...prev, { role: "patient", message: res.answer }]);
    } catch {
      setHistoryLog((prev) => [...prev, { role: "patient", message: "(No response.)" }]);
    }
  };

  const handleRequestTests = async () => {
    if (!requestedTests.trim()) { setPhase("assessment"); return; }
    try {
      const res = await requestTestsMutation.mutateAsync({ id: caseId, data: { requestedTests } });
      setTestResults(res.results);
    } catch {
      setTestResults([]);
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    mainTimer.stop();
    try {
      const res = await submitMutation.mutateAsync({
        id: sessionId,
        data: { historyLog, requestedTests, assessmentAndPlan: assessmentPlan, timeExpired: false },
      });
      onCaseComplete(sessionId, res.score ?? 0);
    } catch {
      onCaseComplete(sessionId ?? 0, 0);
    }
  };

  if (isLoading || !caseData || !sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading Case {caseNumber}…</p>
        </div>
      </div>
    );
  }

  const isMainPhase = phase !== "pre_case";
  const timer = phase === "pre_case" ? preCaseTimer : mainTimer;
  const isUrgent = isMainPhase && timer.timeLeft < 300;

  const DataRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex border-b border-border/40 last:border-0 py-2.5">
      <span className="w-1/3 text-muted-foreground font-semibold text-sm">{label}</span>
      <span className="w-2/3 font-medium text-foreground text-sm">{value || "—"}</span>
    </div>
  );

  const { examFindings: exam } = caseData;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/60 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Case {caseNumber} / {totalCases} — {phase.replace("_", " ")}
            </div>
            <h2 className="font-bold text-foreground truncate max-w-[180px] sm:max-w-sm text-sm sm:text-base">{caseData.title}</h2>
          </div>
        </div>

        {/* Case progress pills */}
        <div className="hidden sm:flex items-center gap-1 mr-4">
          {Array.from({ length: totalCases }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < caseNumber - 1 ? "bg-green-500" : i === caseNumber - 1 ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-mono text-xl font-bold transition-colors",
          isUrgent ? "bg-destructive/10 border-destructive text-destructive animate-pulse" : "bg-card border-border text-foreground"
        )}>
          <Clock className="w-5 h-5" />
          {formatTime(timer.timeLeft)}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* PRE-CASE */}
          {phase === "pre_case" && (
            <motion.div key="pre" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto py-8 px-4 space-y-6">
              <Card className="border-accent/30 shadow-xl overflow-hidden">
                <div className="bg-accent/10 px-6 py-4 border-b border-accent/20 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-bold">Pre-Encounter Review — Case {caseNumber}</h2>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Chief Complaint</h3>
                    <p className="text-xl font-medium bg-muted/50 p-4 rounded-xl border border-border/50">"{caseData.chiefComplaint}"</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">Patient Demographics</h3>
                      <dl className="space-y-2 bg-card p-4 rounded-xl border border-border/60">
                        <div className="flex justify-between"><dt className="text-muted-foreground">Age</dt><dd className="font-bold">{caseData.patientDemographics.age}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Sex</dt><dd className="font-bold">{caseData.patientDemographics.sex}</dd></div>
                        <div className="flex justify-between"><dt className="text-muted-foreground">Occupation</dt><dd className="font-bold">{caseData.patientDemographics.occupation}</dd></div>
                      </dl>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Review of Systems</h3>
                        <ul className="list-disc ml-4 space-y-1 text-foreground font-medium text-sm">
                          {caseData.reviewOfSystems.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Current Medications</h3>
                        <ul className="list-disc ml-4 space-y-1 text-foreground font-medium text-sm">
                          {caseData.currentMedications.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button size="lg" onClick={() => setPhase("history")} className="gap-2">
                  Enter Room <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {phase === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto py-6 px-4 flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
              <div className="flex-1 bg-card rounded-2xl border border-border/60 shadow-lg overflow-hidden flex flex-col mb-4">
                <div className="bg-muted/40 p-3 border-b border-border/60 text-sm font-semibold text-muted-foreground text-center">
                  History — Ask the patient questions
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {historyLog.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col text-muted-foreground opacity-60">
                      <FileText className="w-10 h-10 mb-3" />
                      <p className="font-medium">Type a question to begin the history.</p>
                    </div>
                  ) : (
                    historyLog.map((entry, idx) => (
                      <div key={idx} className={cn(
                        "max-w-[85%] rounded-2xl p-4 shadow-sm",
                        entry.role === "candidate"
                          ? "bg-primary text-primary-foreground ml-auto rounded-br-sm"
                          : "bg-muted text-foreground mr-auto border border-border/50 rounded-bl-sm"
                      )}>
                        <div className="text-xs font-bold opacity-70 mb-1 tracking-wider uppercase">
                          {entry.role === "candidate" ? "You" : "Patient"}
                        </div>
                        <div className="font-medium leading-relaxed">{entry.message}</div>
                      </div>
                    ))
                  )}
                  {askMutation.isPending && (
                    <div className="bg-muted mr-auto border border-border/50 rounded-2xl rounded-bl-sm p-4 w-24 flex justify-center shadow-sm">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-primary/80 rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 bg-background border-t border-border/60 flex gap-2">
                  <Input
                    placeholder="Ask a question…"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    disabled={askMutation.isPending}
                    className="flex-1"
                  />
                  <Button onClick={handleAskQuestion} disabled={askMutation.isPending || !questionInput.trim()} className="w-14">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end shrink-0">
                <Button size="lg" onClick={() => setPhase("exam_findings")} className="gap-2">
                  Exam Findings <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* EXAM FINDINGS */}
          {phase === "exam_findings" && (
            <motion.div key="exam" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto py-8 px-4 space-y-6">
              <h2 className="text-2xl font-bold border-b-2 border-primary/20 pb-3 inline-block">Exam Findings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="bg-muted/30 border-b border-border/50 pb-3 pt-4 px-5"><CardTitle className="text-base">Visual Acuity</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <DataRow label="OD Sc" value={exam.visualAcuity.odSc} />
                    <DataRow label="OS Sc" value={exam.visualAcuity.osSc} />
                    <DataRow label="OD Cc" value={exam.visualAcuity.odCc} />
                    <DataRow label="OS Cc" value={exam.visualAcuity.osCc} />
                    <DataRow label="Pinhole" value={exam.visualAcuity.pinhole} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="bg-muted/30 border-b border-border/50 pb-3 pt-4 px-5"><CardTitle className="text-base">Refraction</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <DataRow label="OD Rx" value={`${exam.refraction.odSphere}${exam.refraction.odCylinder ? ` x ${exam.refraction.odCylinder}` : ""}${exam.refraction.odAxis ? ` @ ${exam.refraction.odAxis}` : ""}`} />
                    <DataRow label="OD VA w/Rx" value={exam.refraction.odVaWithRx} />
                    <DataRow label="OS Rx" value={`${exam.refraction.osSphere}${exam.refraction.osCylinder ? ` x ${exam.refraction.osCylinder}` : ""}${exam.refraction.osAxis ? ` @ ${exam.refraction.osAxis}` : ""}`} />
                    <DataRow label="OS VA w/Rx" value={exam.refraction.osVaWithRx} />
                    <DataRow label="Add" value={exam.refraction.addPower} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="bg-muted/30 border-b border-border/50 pb-3 pt-4 px-5"><CardTitle className="text-base">Slit Lamp</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <DataRow label="Lids" value={exam.slitLamp.lids} />
                    <DataRow label="Conjunctiva" value={exam.slitLamp.conjunctiva} />
                    <DataRow label="Cornea" value={exam.slitLamp.cornea} />
                    <DataRow label="A/C" value={exam.slitLamp.anteriorChamber} />
                    <DataRow label="Iris" value={exam.slitLamp.iris} />
                    <DataRow label="Lens" value={exam.slitLamp.lens} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="bg-muted/30 border-b border-border/50 pb-3 pt-4 px-5"><CardTitle className="text-base">Dilated Fundus</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <DataRow label="IOP OD/OS" value={`${exam.dilatedFindings.iop.od} / ${exam.dilatedFindings.iop.os}`} />
                    <DataRow label="Pupils" value={exam.dilatedFindings.pupilResponse} />
                    <div className="grid grid-cols-3 gap-1 py-2 text-xs font-bold text-muted-foreground border-t border-border/40 mt-2">
                      <div>Structure</div><div>OD</div><div>OS</div>
                    </div>
                    {(["opticDisc", "macula", "vessels", "periphery"] as const).map((key) => (
                      <div key={key} className="grid grid-cols-3 gap-1 py-1.5 border-t border-border/20 text-sm">
                        <div className="text-muted-foreground capitalize">{key === "opticDisc" ? "Disc" : key}</div>
                        <div className="font-medium">{exam.dilatedFindings[key].od}</div>
                        <div className="font-medium">{exam.dilatedFindings[key].os}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={() => setPhase("tests")} className="gap-2">
                  Request Tests <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* TESTS */}
          {phase === "tests" && (
            <motion.div key="tests" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto py-8 px-4 space-y-6">
              <h2 className="text-2xl font-bold">Ancillary Tests</h2>
              <Card className="border-2 border-primary/20 shadow-md">
                <CardContent className="p-5 space-y-4">
                  <Textarea
                    placeholder="e.g., OCT Macula OU, Humphrey Visual Field 24-2…"
                    className="min-h-[120px] text-base bg-muted/20"
                    value={requestedTests}
                    onChange={(e) => setRequestedTests(e.target.value)}
                    disabled={testResults.length > 0 || requestTestsMutation.isPending}
                  />
                  {testResults.length === 0 && (
                    <div className="flex justify-end">
                      <Button onClick={handleRequestTests} disabled={requestTestsMutation.isPending || !requestedTests.trim()}>
                        {requestTestsMutation.isPending ? "Retrieving…" : "Submit Request"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              {testResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <h3 className="text-lg font-bold border-b border-border/60 pb-2">Results</h3>
                  {testResults.map((tr, i) => (
                    <Card key={i} className="bg-muted/30 border-l-4 border-l-accent shadow-sm">
                      <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                        <div className="sm:w-1/3 font-bold">{tr.testName}</div>
                        <div className="sm:w-2/3 space-y-1">
                          <div className="bg-background p-2 rounded-lg border border-border/50 font-medium text-sm">{tr.result}</div>
                          {tr.interpretation && <p className="text-xs text-muted-foreground italic">{tr.interpretation}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
              <div className="flex justify-end pt-4">
                <Button size="lg" onClick={() => setPhase("assessment")} className="gap-2">
                  Assessment & Plan <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ASSESSMENT */}
          {phase === "assessment" && (
            <motion.div key="assessment" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto py-8 px-4 flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
              <div className="shrink-0 mb-4">
                <h2 className="text-2xl font-bold">Assessment & Plan</h2>
                <p className="text-muted-foreground font-medium">Detail your diagnosis and management strategy.</p>
              </div>
              <div className="flex-1 flex flex-col shadow-xl rounded-2xl overflow-hidden border-2 border-primary/20 mb-4">
                <Textarea
                  placeholder={"Assessment:\n1. Primary diagnosis...\n\nPlan:\n1. Treatment..."}
                  className="flex-1 rounded-none border-0 focus-visible:ring-0 text-base leading-relaxed p-5 resize-none"
                  value={assessmentPlan}
                  onChange={(e) => setAssessmentPlan(e.target.value)}
                />
              </div>
              <div className="flex justify-end shrink-0">
                <Button
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending || !assessmentPlan.trim()}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit Case"}
                  <CheckCircle2 className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Exam Page ───────────────────────────────────────────────────────────
export default function ExamPage() {
  const [examId, setExamId] = useState<number | null>(null);
  const [examPhase, setExamPhase] = useState<ExamPhase>("lobby");
  const [caseScores, setCaseScores] = useState<Array<{ caseId: number; score: number | null; title?: string }>>([]);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const createExamMutation = useCreateExam();
  const completeExamCaseMutation = useCompleteExamCase();
  const { data: exam, refetch: refetchExam } = useGetExam(examId ?? 0, {
    query: {
      enabled: examId !== null,
      refetchOnWindowFocus: false,
    },
  });

  const breakTimer = useTimer(240, () => {
    // auto-advance after 4-minute break
    if (exam && exam.currentCaseIndex < exam.caseIds.length) {
      setExamPhase("pre_case");
    } else {
      setExamPhase("results");
    }
  });

  const handleStartExam = async () => {
    try {
      const res = await createExamMutation.mutateAsync(undefined);
      setExamId(res.id);
      setExamPhase("pre_case");
    } catch (e) {
      console.error("Failed to create exam", e);
    }
  };

  const handleCaseComplete = async (sessionId: number, score: number) => {
    if (!exam || examId === null) return;

    const caseId = exam.caseIds[exam.currentCaseIndex];
    setCaseScores((prev) => [...prev, { caseId, score, title: `Case ${exam.currentCaseIndex + 1}` }]);
    setLastScore(score);

    try {
      const updated = await completeExamCaseMutation.mutateAsync({
        id: examId,
        data: { sessionId, score },
      });

      if (updated.status === "completed" || updated.currentCaseIndex >= updated.caseIds.length) {
        setExamPhase("break"); // show break with "view results" button
      } else {
        setExamPhase("break");
        breakTimer.reset();
        breakTimer.start();
      }

      await refetchExam();
    } catch (e) {
      console.error("Failed to complete exam case", e);
    }
  };

  const handleBreakContinue = () => {
    breakTimer.stop();
    if (exam && exam.currentCaseIndex >= exam.caseIds.length) {
      setExamPhase("results");
    } else {
      setExamPhase("pre_case");
    }
  };

  if (examPhase === "lobby") {
    return <ExamLobby onStart={handleStartExam} isLoading={createExamMutation.isPending} />;
  }

  if (examPhase === "break" && exam) {
    const isLast = exam.currentCaseIndex >= exam.caseIds.length;
    return (
      <BreakScreen
        caseNumber={exam.currentCaseIndex} // already advanced
        totalCases={exam.caseIds.length}
        score={lastScore}
        onContinue={isLast ? () => setExamPhase("results") : handleBreakContinue}
        breakTimeLeft={breakTimer.timeLeft}
      />
    );
  }

  if (examPhase === "results" && exam) {
    return <ExamResults exam={exam} caseScores={caseScores} />;
  }

  if ((examPhase === "pre_case" || examPhase === "history" || examPhase === "exam_findings" || examPhase === "tests" || examPhase === "assessment") && exam) {
    const currentCaseId = exam.caseIds[exam.currentCaseIndex];
    if (!currentCaseId) {
      setExamPhase("results");
      return null;
    }
    return (
      <CaseSimulation
        key={`${exam.id}-${exam.currentCaseIndex}`}
        caseId={currentCaseId}
        caseNumber={exam.currentCaseIndex + 1}
        totalCases={exam.caseIds.length}
        onCaseComplete={handleCaseComplete}
      />
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
