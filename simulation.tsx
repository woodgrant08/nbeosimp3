import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, Activity, AlertCircle, Send, CheckCircle2, ChevronRight, Stethoscope, FileText
} from "lucide-react";
import { 
  useGetCase, 
  useCreateSession, 
  useAskPatient, 
  useRequestAncillaryTests, 
  useSubmitSession 
} from "@workspace/api-client-react";
import type { HistoryEntry, TestResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Textarea } from "@/components/ui-elements";
import { cn, formatTime } from "@/lib/utils";
import { useTimer } from "@/hooks/use-timer";

type Phase = 'start' | 'pre_case' | 'history' | 'exam' | 'tests' | 'assessment';

export default function Simulation() {
  const [, params] = useRoute("/case/:id");
  const [, setLocation] = useLocation();
  const caseId = parseInt(params?.id || "0");

  const { data: caseData, isLoading } = useGetCase(caseId);
  const createSessionMutation = useCreateSession();
  const askMutation = useAskPatient();
  const requestTestsMutation = useRequestAncillaryTests();
  const submitMutation = useSubmitSession();

  const [phase, setPhase] = useState<Phase>('start');
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // State for session data
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [requestedTests, setRequestedTests] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [assessmentPlan, setAssessmentPlan] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timers
  const preCaseTimer = useTimer(120, () => advancePhase('history'));
  const mainTimer = useTimer(900, () => handleFinalSubmit(true)); // 15 mins

  useEffect(() => {
    if (phase === 'pre_case' && !preCaseTimer.isRunning) preCaseTimer.start();
    if (phase === 'history' && !mainTimer.isRunning) mainTimer.start();
  }, [phase]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [historyLog, askMutation.isPending]);

  const handleStartSession = async () => {
    try {
      const res = await createSessionMutation.mutateAsync({ data: { caseId } });
      setSessionId(res.id);
      setPhase('pre_case');
    } catch (e) {
      console.error("Failed to start session", e);
    }
  };

  const advancePhase = (nextPhase: Phase) => {
    if (phase === 'pre_case') preCaseTimer.stop();
    setPhase(nextPhase);
  };

  const handleAskQuestion = async () => {
    if (!questionInput.trim()) return;
    const newLog: HistoryEntry[] = [...historyLog, { role: 'candidate', message: questionInput }];
    setHistoryLog(newLog);
    setQuestionInput("");
    
    try {
      const res = await askMutation.mutateAsync({ 
        id: caseId, 
        data: { question: questionInput, historyLog: newLog } 
      });
      setHistoryLog(prev => [...prev, { role: 'patient', message: res.answer }]);
    } catch (e) {
      console.error("Failed to ask patient", e);
      setHistoryLog(prev => [...prev, { role: 'patient', message: "(Patient did not respond or there was an error.)" }]);
    }
  };

  const handleRequestTests = async () => {
    if (!requestedTests.trim()) return advancePhase('assessment');
    try {
      const res = await requestTestsMutation.mutateAsync({
        id: caseId,
        data: { requestedTests }
      });
      setTestResults(res.results);
    } catch (e) {
      console.error("Failed to request tests", e);
    }
  };

  const handleFinalSubmit = async (timeExpired = false) => {
    if (!sessionId) return;
    mainTimer.stop();
    try {
      const res = await submitMutation.mutateAsync({
        id: sessionId,
        data: {
          historyLog,
          requestedTests,
          assessmentAndPlan: assessmentPlan,
          timeExpired
        }
      });
      sessionStorage.setItem(`results_${sessionId}`, JSON.stringify(res));
      setLocation(`/results/${sessionId}`);
    } catch (e) {
      console.error("Failed to submit", e);
    }
  };

  if (isLoading || !caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xl font-medium text-muted-foreground animate-pulse">Loading Patient Data...</p>
        </div>
      </div>
    );
  }

  // Common Header for active simulation phases
  const renderHeader = () => {
    const isMainPhase = ['history', 'exam', 'tests', 'assessment'].includes(phase);
    const timer = phase === 'pre_case' ? preCaseTimer : mainTimer;
    const isUrgent = isMainPhase && timer.timeLeft < 300; // Under 5 mins

    return (
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/60 p-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground truncate max-w-[200px] sm:max-w-md">{caseData.title}</h2>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-0.5">
              <span>Phase: </span>
              <span className="text-primary">{phase.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-colors",
          isUrgent ? "bg-destructive/10 border-destructive text-destructive animate-pulse" : "bg-card border-border text-foreground"
        )}>
          <Clock className="w-5 h-5" />
          <span className="font-mono text-xl font-bold tracking-tight">
            {formatTime(timer.timeLeft)}
          </span>
        </div>
      </header>
    );
  };

  // -----------------------------------------------------
  // RENDERERS FOR EACH PHASE
  // -----------------------------------------------------

  const renderStart = () => (
    <div className="max-w-3xl mx-auto py-20 px-4">
      <Card className="text-center p-12 border-primary/20 shadow-2xl">
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Stethoscope className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4">{caseData.title}</h1>
        <div className="flex justify-center gap-2 mb-8">
          <Badge variant="secondary" className="text-sm px-3 py-1">{caseData.topic}</Badge>
          <Badge variant={caseData.difficulty === 'hard' ? 'destructive' : 'default'} className="text-sm px-3 py-1">
            {caseData.difficulty.toUpperCase()}
          </Badge>
        </div>
        
        <div className="bg-muted/50 rounded-2xl p-6 text-left mb-10 space-y-4">
          <h3 className="font-bold text-lg border-b border-border/50 pb-2">Exam Instructions</h3>
          <ul className="space-y-3 text-muted-foreground font-medium">
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> You will have 2 minutes to review preliminary data.</li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> The main exam timer is 15 minutes.</li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> You must navigate through History, Exam Findings, Tests, and Assessment.</li>
            <li className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-destructive shrink-0" /> If time expires, the case will auto-submit.</li>
          </ul>
        </div>
        
        <Button size="lg" className="w-full sm:w-auto px-12" onClick={handleStartSession} disabled={createSessionMutation.isPending}>
          {createSessionMutation.isPending ? "Preparing..." : "Begin Case Simulation"}
        </Button>
      </Card>
    </div>
  );

  const renderPreCase = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <Card className="border-accent/30 shadow-xl overflow-hidden">
        <div className="bg-accent/10 px-6 py-4 border-b border-accent/20 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-accent" />
          <h2 className="text-xl font-display font-bold text-foreground">Pre-Encounter Review</h2>
        </div>
        <CardContent className="p-8 space-y-8">
          <div>
            <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-2">Chief Complaint</h3>
            <p className="text-2xl font-medium text-foreground bg-muted/50 p-4 rounded-xl border border-border/50">
              "{caseData.chiefComplaint}"
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-4">Patient Demographics</h3>
              <dl className="space-y-3 bg-card p-5 rounded-xl border border-border/60 shadow-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Age</dt><dd className="font-bold">{caseData.patientDemographics.age}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Sex</dt><dd className="font-bold">{caseData.patientDemographics.sex}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground font-medium">Occupation</dt><dd className="font-bold">{caseData.patientDemographics.occupation}</dd></div>
              </dl>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-2">Review of Systems</h3>
                <ul className="list-disc list-inside space-y-1 text-foreground font-medium ml-4">
                  {caseData.reviewOfSystems.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground font-bold mb-2">Current Meds</h3>
                <ul className="list-disc list-inside space-y-1 text-foreground font-medium ml-4">
                  {caseData.currentMedications.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button size="lg" onClick={() => advancePhase('history')} className="gap-2 group">
          Enter Room & Begin History <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex-1 bg-card rounded-2xl border border-border/60 shadow-lg overflow-hidden flex flex-col mb-6">
        <div className="bg-muted/40 p-4 border-b border-border/60 text-sm font-semibold text-muted-foreground text-center">
          Patient Encounter Started
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {historyLog.length === 0 ? (
            <div className="h-full flex items-center justify-center flex-col text-muted-foreground opacity-60">
              <FileText className="w-12 h-12 mb-4" />
              <p className="font-medium">Type a question below to start the history.</p>
              <p className="text-sm mt-2">Example: "When did the blurry vision start?"</p>
            </div>
          ) : (
            historyLog.map((entry, idx) => (
              <div key={idx} className={cn(
                "max-w-[85%] rounded-2xl p-4 shadow-sm",
                entry.role === 'candidate' 
                  ? "bg-primary text-primary-foreground ml-auto rounded-br-sm" 
                  : "bg-muted text-foreground mr-auto border border-border/50 rounded-bl-sm"
              )}>
                <div className="text-xs font-bold opacity-70 mb-1 tracking-wider uppercase">
                  {entry.role === 'candidate' ? 'You' : 'Patient'}
                </div>
                <div className="text-base font-medium leading-relaxed">{entry.message}</div>
              </div>
            ))
          )}
          {askMutation.isPending && (
            <div className="bg-muted text-foreground mr-auto border border-border/50 rounded-2xl rounded-bl-sm p-4 w-24 flex justify-center shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-primary/80 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        
        <div className="p-4 bg-background border-t border-border/60 flex gap-3">
          <Input 
            placeholder="Type your question..." 
            value={questionInput}
            onChange={e => setQuestionInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
            disabled={askMutation.isPending}
            className="flex-1"
          />
          <Button onClick={handleAskQuestion} disabled={askMutation.isPending || !questionInput.trim()} className="w-16">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex justify-end shrink-0">
        <Button size="lg" onClick={() => advancePhase('exam')} className="gap-2 group shadow-xl">
          Proceed to Exam Findings <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );

  const renderExam = () => {
    const { examFindings: exam } = caseData;
    
    const DataRow = ({ label, value }: { label: string, value: string | undefined | null }) => (
      <div className="flex border-b border-border/40 last:border-0 py-2.5">
        <span className="w-1/3 text-muted-foreground font-semibold">{label}</span>
        <span className="w-2/3 font-medium text-foreground">{value || '-'}</span>
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
        <h2 className="text-3xl font-display font-bold border-b-2 border-primary/20 pb-4 inline-block">Exam Findings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Visual Acuity</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <DataRow label="OD Sc" value={exam.visualAcuity.odSc} />
              <DataRow label="OS Sc" value={exam.visualAcuity.osSc} />
              <DataRow label="OD Cc" value={exam.visualAcuity.odCc} />
              <DataRow label="OS Cc" value={exam.visualAcuity.osCc} />
              <DataRow label="Pinhole" value={exam.visualAcuity.pinhole} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Refraction</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <DataRow label="OD Rx" value={`${exam.refraction.odSphere} ${exam.refraction.odCylinder ? `x ${exam.refraction.odCylinder}` : ''} ${exam.refraction.odAxis ? `@ ${exam.refraction.odAxis}` : ''}`} />
              <DataRow label="OD VA w/Rx" value={exam.refraction.odVaWithRx} />
              <div className="my-2 border-t border-border/40" />
              <DataRow label="OS Rx" value={`${exam.refraction.osSphere} ${exam.refraction.osCylinder ? `x ${exam.refraction.osCylinder}` : ''} ${exam.refraction.osAxis ? `@ ${exam.refraction.osAxis}` : ''}`} />
              <DataRow label="OS VA w/Rx" value={exam.refraction.osVaWithRx} />
              <div className="my-2 border-t border-border/40" />
              <DataRow label="Add Power" value={exam.refraction.addPower} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Slit Lamp</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <DataRow label="Lids/Lashes" value={exam.slitLamp.lids} />
              <DataRow label="Conjunctiva" value={exam.slitLamp.conjunctiva} />
              <DataRow label="Cornea" value={exam.slitLamp.cornea} />
              <DataRow label="Ant. Chamber" value={exam.slitLamp.anteriorChamber} />
              <DataRow label="Iris" value={exam.slitLamp.iris} />
              <DataRow label="Lens" value={exam.slitLamp.lens} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Dilated Fundus</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <DataRow label="IOP (OD/OS)" value={`${exam.dilatedFindings.iop.od} / ${exam.dilatedFindings.iop.os}`} />
              <DataRow label="Pupils" value={exam.dilatedFindings.pupilResponse} />
              <div className="my-2 border-t border-border/40" />
              <div className="grid grid-cols-3 gap-2 py-2 font-semibold text-muted-foreground border-b border-border/40 text-sm">
                <div>Structure</div><div>OD</div><div>OS</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/40 font-medium">
                <div className="text-muted-foreground">Optic Disc</div><div>{exam.dilatedFindings.opticDisc.od}</div><div>{exam.dilatedFindings.opticDisc.os}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/40 font-medium">
                <div className="text-muted-foreground">Macula</div><div>{exam.dilatedFindings.macula.od}</div><div>{exam.dilatedFindings.macula.os}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/40 font-medium">
                <div className="text-muted-foreground">Vessels</div><div>{exam.dilatedFindings.vessels.od}</div><div>{exam.dilatedFindings.vessels.os}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 py-2 font-medium">
                <div className="text-muted-foreground">Periphery</div><div>{exam.dilatedFindings.periphery.od}</div><div>{exam.dilatedFindings.periphery.os}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end pt-6">
          <Button size="lg" onClick={() => advancePhase('tests')} className="gap-2 group shadow-xl">
            Request Tests <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  };

  const renderTests = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-display font-bold">Ancillary Tests</h2>
        <p className="text-muted-foreground font-medium text-lg">Request any additional testing needed based on your findings.</p>
      </div>

      <Card className="border-2 border-primary/20 shadow-lg">
        <CardContent className="p-6 space-y-4">
          <Textarea 
            placeholder="e.g. OCT Macula OD/OS, Humphrey Visual Field 24-2..." 
            className="min-h-[150px] text-lg leading-relaxed bg-muted/20"
            value={requestedTests}
            onChange={e => setRequestedTests(e.target.value)}
            disabled={testResults.length > 0 || requestTestsMutation.isPending}
          />
          {testResults.length === 0 && (
            <div className="flex justify-end">
              <Button onClick={handleRequestTests} disabled={requestTestsMutation.isPending || !requestedTests.trim()}>
                {requestTestsMutation.isPending ? "Retrieving Results..." : "Submit Request"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-xl font-bold font-display text-foreground border-b border-border/60 pb-2">Results</h3>
          <div className="grid gap-4">
            {testResults.map((tr, i) => (
              <Card key={i} className="bg-muted/30 border-l-4 border-l-accent shadow-sm">
                <CardContent className="p-5 flex flex-col sm:flex-row gap-4">
                  <div className="sm:w-1/3">
                    <h4 className="font-bold text-lg text-foreground">{tr.testName}</h4>
                  </div>
                  <div className="sm:w-2/3 space-y-2">
                    <div className="bg-background p-3 rounded-lg border border-border/50 text-foreground font-medium">
                      {tr.result}
                    </div>
                    {tr.interpretation && (
                      <p className="text-sm text-muted-foreground italic flex items-start gap-2">
                        <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                        {tr.interpretation}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex justify-end pt-8">
        <Button size="lg" onClick={() => advancePhase('assessment')} className="gap-2 group shadow-xl bg-success hover:bg-success/90">
          Write Assessment & Plan <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );

  const renderAssessment = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 flex flex-col h-[calc(100vh-100px)]">
      <div className="space-y-2 shrink-0">
        <h2 className="text-3xl font-display font-bold">Assessment & Plan</h2>
        <p className="text-muted-foreground font-medium text-lg">Detail your diagnosis and management strategy.</p>
      </div>

      <div className="flex-1 flex flex-col shadow-xl rounded-2xl overflow-hidden border-2 border-primary/20">
        <Textarea 
          placeholder="Assessment:&#10;1. Primary diagnosis...&#10;&#10;Plan:&#10;1. Treatment...&#10;2. Follow-up..." 
          className="flex-1 rounded-none border-0 focus-visible:ring-0 text-lg leading-relaxed p-6 resize-none"
          value={assessmentPlan}
          onChange={e => setAssessmentPlan(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center shrink-0">
        <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Final step. Submitting ends the case.
        </div>
        <Button size="lg" onClick={() => handleFinalSubmit(false)} disabled={submitMutation.isPending || !assessmentPlan.trim()} className="px-10 text-lg">
          {submitMutation.isPending ? "Grading..." : "Submit Exam"}
        </Button>
      </div>
    </div>
  );

  const renderReview = () => {
    if (!reviewData) return null;
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-block p-1 rounded-3xl bg-gradient-to-tr from-primary to-accent shadow-2xl">
            <div className="bg-card rounded-[1.4rem] px-12 py-10 flex flex-col items-center justify-center">
              <span className="text-sm uppercase tracking-widest font-bold text-muted-foreground mb-2">Final Score</span>
              <div className="text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {Math.round(reviewData.score)}%
              </div>
            </div>
          </div>
          <p className="text-xl font-medium max-w-2xl mx-auto text-foreground leading-relaxed">
            {reviewData.feedback}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-success/30 bg-success/5 shadow-md">
            <CardHeader className="border-b border-success/10 pb-4">
              <CardTitle className="text-success flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" /> Key Points Covered
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {reviewData.keyPoints.map((p, i) => (
                  <li key={i} className="flex gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-success mt-2 shrink-0" /> {p}
                  </li>
                ))}
                {reviewData.keyPoints.length === 0 && <li className="text-muted-foreground italic">None identified.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5 shadow-md">
            <CardHeader className="border-b border-destructive/10 pb-4">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="w-6 h-6" /> Missed Points
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {reviewData.missedPoints.map((p, i) => (
                  <li key={i} className="flex gap-3 text-foreground font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" /> {p}
                  </li>
                ))}
                {reviewData.missedPoints.length === 0 && <li className="text-muted-foreground italic">Perfect, none missed!</li>}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-primary/10 overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-primary/10">
            <h3 className="text-xl font-bold font-display text-primary">Model Answer</h3>
          </div>
          <CardContent className="p-6 grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-sm mb-3">Assessment</h4>
              <div className="whitespace-pre-wrap text-foreground font-medium bg-muted/30 p-4 rounded-xl">
                {reviewData.modelAssessment}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-muted-foreground uppercase tracking-wider text-sm mb-3">Plan</h4>
              <div className="whitespace-pre-wrap text-foreground font-medium bg-muted/30 p-4 rounded-xl">
                {reviewData.modelPlan}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-8">
          <Button size="lg" onClick={() => setLocation('/')} className="px-12">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {phase !== 'start' && renderHeader()}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full absolute inset-0 overflow-y-auto pb-20"
          >
            {phase === 'start' && renderStart()}
            {phase === 'pre_case' && renderPreCase()}
            {phase === 'history' && renderHistory()}
            {phase === 'exam' && renderExam()}
            {phase === 'tests' && renderTests()}
            {phase === 'assessment' && renderAssessment()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
