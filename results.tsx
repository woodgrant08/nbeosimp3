import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  MessageSquare,
  FlaskConical,
  Stethoscope,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Target,
  TrendingUp,
} from "lucide-react";
import { useGetSession, useGetCase } from "@workspace/api-client-react";
import type { SubmissionResult } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/components/ui-elements";
import { cn } from "@/lib/utils";

export default function Results() {
  const [, params] = useRoute("/results/:id");
  const [, setLocation] = useLocation();
  const sessionId = parseInt(params?.id || "0");

  const [cached, setCached] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`results_${sessionId}`);
    if (raw) {
      try {
        setCached(JSON.parse(raw));
      } catch {
        // ignore parse errors
      }
    }
  }, [sessionId]);

  const { data: session } = useGetSession(sessionId, {
    query: { enabled: !cached && !!sessionId },
  });
  const caseId = cached?.session?.caseId ?? session?.caseId;
  const { data: caseData } = useGetCase(caseId ?? 0, {
    query: { enabled: !!caseId },
  });

  const score = cached?.score ?? null;
  const feedback = cached?.feedback ?? null;
  const keyPoints: string[] = cached?.keyPoints ?? caseData?.keyPoints ?? [];
  const missedPoints: string[] = cached?.missedPoints ?? [];
  const coveredPoints = keyPoints.filter((p) => !missedPoints.includes(p));
  const modelAssessment = cached?.modelAssessment ?? caseData?.modelAssessment ?? "";
  const modelPlan = cached?.modelPlan ?? caseData?.modelPlan ?? "";
  const candidateAP = cached?.session?.assessmentAndPlan ?? session?.assessmentAndPlan ?? "";
  const historyLog = cached?.session?.historyLog ?? session?.historyLog ?? [];
  const requestedTests = cached?.session?.requestedTests ?? session?.requestedTests ?? "";

  const isLoading = !cached && !session;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-xl font-medium text-muted-foreground animate-pulse">Loading Results...</p>
        </div>
      </div>
    );
  }

  const scoreColor =
    score === null
      ? "from-muted to-muted/60"
      : score >= 85
      ? "from-green-500 to-emerald-400"
      : score >= 70
      ? "from-primary to-blue-400"
      : score >= 55
      ? "from-amber-500 to-yellow-400"
      : "from-destructive to-red-400";

  const scoreLetter =
    score === null ? "—" : score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D";

  const tabs = [
    { id: "performance", label: "Performance", icon: Trophy },
    { id: "answers", label: "Model Answers", icon: BookOpen },
    { id: "history", label: "History Taken", icon: MessageSquare },
    { id: "tests", label: "Tests Ordered", icon: FlaskConical },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];

  const [activeTab, setActiveTab] = useState<TabId>("performance");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </div>
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Case Review
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(`/case/${caseId}`)}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Retry Case
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "w-36 h-36 rounded-full bg-gradient-to-br flex flex-col items-center justify-center shadow-2xl",
                scoreColor
              )}
            >
              <span className="text-4xl font-black text-white font-display">
                {score !== null ? `${Math.round(score)}%` : "—"}
              </span>
              <span className="text-white/80 text-sm font-bold tracking-wider mt-0.5">
                {scoreLetter}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-display font-black text-foreground">Case Complete</h1>
              <p className="text-muted-foreground font-medium mt-1">
                {caseData?.topic ?? "Optometry"}
              </p>
            </div>
          </div>

          {feedback && (
            <div className="max-w-2xl mx-auto bg-card border border-border/60 rounded-2xl p-6 text-foreground font-medium leading-relaxed text-left">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p>{feedback}</p>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-success">{coveredPoints.length}</div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                Points Hit
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{missedPoints.length}</div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                Points Missed
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {historyLog.filter((h) => h.role === "candidate").length}
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                Qs Asked
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="border-b border-border/60">
          <div className="flex gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors",
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-success/30 bg-success/5">
                  <CardHeader className="border-b border-success/10 pb-4">
                    <CardTitle className="text-success flex items-center gap-2 text-lg">
                      <CheckCircle2 className="w-5 h-5" /> Points Covered
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {coveredPoints.length > 0 ? (
                      <ul className="space-y-3">
                        {coveredPoints.map((p, i) => (
                          <li key={i} className="flex gap-3 text-foreground font-medium">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">
                        No key points were identified in your submission.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="border-b border-destructive/10 pb-4">
                    <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                      <XCircle className="w-5 h-5" /> Points Missed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {missedPoints.length > 0 ? (
                      <ul className="space-y-3">
                        {missedPoints.map((p, i) => (
                          <li key={i} className="flex gap-3 text-foreground font-medium">
                            <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic">
                        You covered all key points. Excellent work!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Your submission vs model */}
              {candidateAP && (
                <Card className="border-border/60">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Stethoscope className="w-5 h-5 text-primary" />
                      Your Assessment & Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="whitespace-pre-wrap text-foreground font-medium bg-muted/30 p-4 rounded-xl leading-relaxed">
                      {candidateAP}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Model Answers Tab */}
          {activeTab === "answers" && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground font-medium">
                  These are the model answers representing the expected clinical reasoning for this
                  case. Use them to identify gaps in your approach.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-primary/20">
                  <CardHeader className="border-b border-primary/10 pb-4 bg-primary/5">
                    <CardTitle className="text-primary text-lg">Model Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="whitespace-pre-wrap text-foreground font-medium leading-relaxed">
                      {modelAssessment || (
                        <span className="text-muted-foreground italic">Not available</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader className="border-b border-primary/10 pb-4 bg-primary/5">
                    <CardTitle className="text-primary text-lg">Model Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="whitespace-pre-wrap text-foreground font-medium leading-relaxed">
                      {modelPlan || (
                        <span className="text-muted-foreground italic">Not available</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {keyPoints.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="text-lg">All Key Points for This Case</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {keyPoints.map((p, i) => {
                        const covered = !missedPoints.includes(p);
                        return (
                          <li key={i} className="flex gap-3 text-foreground font-medium">
                            {covered ? (
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            )}
                            <span className={covered ? "" : "text-muted-foreground"}>{p}</span>
                            {covered && (
                              <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                                Covered
                              </Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {historyLog.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground font-medium">
                  No history questions were asked during this case.
                </div>
              ) : (
                historyLog.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "flex",
                      entry.role === "candidate" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-5 py-3 text-sm font-medium",
                        entry.role === "candidate"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/60 text-foreground rounded-bl-sm"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-bold uppercase tracking-wider mb-1 opacity-70",
                          entry.role === "candidate" ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      >
                        {entry.role === "candidate" ? "You" : "Patient"}
                      </div>
                      {entry.message}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === "tests" && (
            <div className="space-y-4">
              {!requestedTests ? (
                <div className="text-center py-16 text-muted-foreground font-medium">
                  No ancillary tests were ordered during this case.
                </div>
              ) : (
                <Card>
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FlaskConical className="w-5 h-5 text-primary" />
                      Tests You Ordered
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="whitespace-pre-wrap text-foreground font-medium bg-muted/30 p-4 rounded-xl leading-relaxed">
                      {requestedTests}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer actions */}
        <div className="flex justify-center gap-4 pt-4 pb-10">
          <Button variant="outline" size="lg" onClick={() => setLocation("/")} className="gap-2 px-8">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <Button size="lg" onClick={() => setLocation(`/case/${caseId}`)} className="gap-2 px-8">
            <RotateCcw className="w-4 h-4" /> Retry This Case
          </Button>
        </div>
      </main>
    </div>
  );
}
