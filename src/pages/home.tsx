import { useState } from "react";
import { Link } from "wouter";
import { format, differenceInDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Calendar, Clock, Activity, Target, Award, CheckCircle2, BarChart2, Coffee, BookOpen, Eye, Microscope, Brain, Users, Glasses, ZoomIn, HeartPulse, Layers, Scan } from "lucide-react";
import {
  useListCases,
  useGetMetrics,
  useGetTestDate,
  useSetTestDate,
} from "@/api/mock-api";import { Card, CardContent, Button, Badge, Input } from "@/components/ui-elements";
const NBEO_CATEGORIES = [
  {
    topic: "Glaucoma",
    description:
      "Primary and secondary glaucomas, IOP management, optic nerve evaluation, visual field interpretation, and glaucoma medications.",
    Icon: Scan,
    color: "bg-blue-500/15 text-blue-400",
  },
  {
    topic: "Refractive Error and Optics",
    description:
      "Myopia, hyperopia, astigmatism, presbyopia; spectacle and contact lens prescribing, refractive surgery co-management, and optics principles.",
    Icon: Glasses,
    color: "bg-violet-500/15 text-violet-400",
  },
  {
    topic: "Cornea and External Disease",
    description:
      "Corneal dystrophies, infectious keratitis, herpes zoster ophthalmicus, dry eye disease, pterygium, and other external ocular conditions.",
    Icon: Eye,
    color: "bg-cyan-500/15 text-cyan-400",
  },
  {
    topic: "Anterior Segment Disease",
    description:
      "Anterior uveitis, cataract assessment and co-management, iris disorders, lens anomalies, and anterior chamber pathology.",
    Icon: Microscope,
    color: "bg-amber-500/15 text-amber-400",
  },
  {
    topic: "Posterior Segment Disease",
    description:
      "Age-related macular degeneration, diabetic retinopathy, retinal vascular occlusions, retinal detachment, vitreous disorders, and choroidal disease.",
    Icon: Layers,
    color: "bg-orange-500/15 text-orange-400",
  },
  {
    topic: "Neuro-Ophthalmology",
    description:
      "Optic neuritis, papilledema, cranial nerve palsies, visual field defects, pupillary abnormalities, and other neuro-ophthalmic conditions.",
    Icon: Brain,
    color: "bg-rose-500/15 text-rose-400",
  },
  {
    topic: "Pediatrics and Binocular Vision",
    description:
      "Strabismus, amblyopia, convergence insufficiency, pediatric eye disease, and binocular vision disorders across all ages.",
    Icon: Users,
    color: "bg-green-500/15 text-green-400",
  },
  {
    topic: "Contact Lenses",
    description:
      "Soft and rigid lens fitting, specialty lenses, contact lens complications, scleral lenses, and orthokeratology.",
    Icon: Activity,
    color: "bg-teal-500/15 text-teal-400",
  },
  {
    topic: "Low Vision and Rehabilitation",
    description:
      "Functional visual assessment, magnification devices, optical and non-optical aids, eccentric viewing, and vision rehabilitation planning.",
    Icon: ZoomIn,
    color: "bg-indigo-500/15 text-indigo-400",
  },
  {
    topic: "Systemic Disease",
    description:
      "Diabetes, hypertension, autoimmune conditions, and neurological disorders with significant ocular manifestations requiring co-management.",
    Icon: HeartPulse,
    color: "bg-red-500/15 text-red-400",
  },
];

export default function Home() {
  const { data: cases, isLoading: casesLoading } = useListCases();
  const { data: metrics, isLoading: metricsLoading } = useGetMetrics();
  const { data: testDate } = useGetTestDate();
  const setTestDateMutation = useSetTestDate();
  
  const [dateInput, setDateInput] = useState("");
  const [isEditingDate, setIsEditingDate] = useState(false);

  const handleSaveDate = () => {
    if (dateInput) {
      setTestDateMutation.mutate({ data: { date: dateInput } });
      setIsEditingDate(false);
    }
  };

  const daysRemaining = testDate?.date 
    ? differenceInDays(parseISO(testDate.date), new Date()) 
    : null;

  // Group cases by topic locally
  const groupedCases = cases?.reduce<Record<string, typeof cases>>((acc, c: any) => {
    if (!acc[c.topic]) acc[c.topic] = [];
    acc[c.topic].push(c);
    return acc;
  }, {} as Record<string, typeof cases>) || {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 pb-12"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-card border border-border shadow-2xl">
        {/* Subtle blue glow in top-left */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
        <img 
          src={`${import.meta.env.BASE_URL}images/clinical-hero-bg.png`}
          alt="Clinical background"
          className="absolute inset-0 w-full h-full object-cover opacity-5"
        />
        <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-primary/15 text-primary border-primary/30">
              Clinical Skills Preparation
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-4 text-foreground">
              Master the NBEO Part 3 Exam
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              Simulate real patient encounters, practice your history taking, 
              and hone your clinical decision making under timed conditions.
            </p>
          </div>
          
          <Card className="w-full md:w-80 bg-secondary/60 border-border/60 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground font-medium uppercase tracking-wider text-sm">
                <Calendar className="w-4 h-4" />
                <span>Test Date</span>
              </div>
              
              {isEditingDate || !testDate?.date ? (
                <div className="space-y-3">
                  <Input 
                    type="date"
                    className="bg-background/60 border-border text-foreground"
                    value={dateInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateInput(e.target.value)}
                  />
                  <Button 
                    className="w-full"
                    onClick={handleSaveDate}
                    disabled={setTestDateMutation.isPending}
                  >
                    Save Date
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 cursor-pointer" onClick={() => setIsEditingDate(true)}>
                  <div className="text-6xl font-display font-bold tabular-nums text-primary">
                    {daysRemaining !== null && daysRemaining >= 0 ? daysRemaining : 0}
                  </div>
                  <div className="text-muted-foreground font-medium">Days Remaining</div>
                  <div className="text-sm text-muted-foreground bg-background/50 py-1.5 px-3 rounded-full inline-block hover:bg-background/80 transition-colors">
                    {format(parseISO(testDate.date), "MMMM d, yyyy")} • Edit
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-xl transition-shadow bg-gradient-to-b from-card to-secondary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cases Completed</p>
              <h3 className="text-3xl font-bold font-display text-foreground">
                {metricsLoading ? "-" : metrics?.totalCasesCompleted || 0}
              </h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-xl transition-shadow bg-gradient-to-b from-card to-success/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-success/10 text-success flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Score</p>
              <h3 className="text-3xl font-bold font-display text-foreground">
                {metricsLoading ? "-" : metrics?.averageScore ? `${Math.round(metrics.averageScore)}%` : "N/A"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-shadow bg-gradient-to-b from-card to-accent/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Time Practiced</p>
              <h3 className="text-3xl font-bold font-display text-foreground">
                {metricsLoading ? "-" : Math.round((metrics?.totalTimePracticed || 0) / 60)} <span className="text-lg text-muted-foreground font-sans font-medium">hrs</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Practice Exam CTA */}
      <section>
        <Link href="/exam" className="block group">
          <Card className="overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-primary/20 hover:border-primary/50">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-10 h-10 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <Badge className="mb-2 bg-primary/10 text-primary border-primary/20">Full Exam Mode</Badge>
                  <h2 className="text-2xl font-display font-bold text-foreground">Practice Exam</h2>
                  <p className="text-muted-foreground font-medium mt-1">
                    Simulate the full NBEO Part 3 experience — up to 12 sequential cases with 4-minute breaks between each.
                  </p>
                </div>
                <div className="flex gap-6 shrink-0 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary">12</div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Cases</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">15<span className="text-lg">min</span></div>
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Per Case</div>
                  </div>
                  <div>
                    <Coffee className="w-8 h-8 text-amber-500 mx-auto mb-0.5" />
                    <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Breaks</div>
                  </div>
                </div>
                <Button size="lg" className="gap-2 shrink-0">
                  Start Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      {/* Case Library */}
      <section className="space-y-10">
        <div className="flex items-end justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-3xl font-display font-bold text-foreground">Case Library</h2>
            <p className="text-muted-foreground mt-1 font-medium">
              Organized by official NBEO Part 3 content areas. Select any case to begin a timed simulation.
            </p>
          </div>
          <Badge variant="secondary" className="text-sm px-3 py-1.5 shrink-0">
            {cases?.length || 0} Cases Available
          </Badge>
        </div>

        {casesLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-12">
            {NBEO_CATEGORIES.map(({ topic, description, Icon, color }) => {
              const topicCases = groupedCases[topic] || [];
              return (
                <div key={topic} className="space-y-5">
                  {/* Category header */}
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-foreground">{topic}</h3>
                        {topicCases.length > 0 ? (
                          <Badge variant="secondary">{topicCases.length} {topicCases.length === 1 ? 'Case' : 'Cases'}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-border/50">Coming Soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{description}</p>
                    </div>
                  </div>

                  {topicCases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pl-14">
                      {topicCases.map((c: any, idx: number) => (
                        <Link key={c.id} href={`/case/${c.id}`} className="block group">
                          <Card className="h-full hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                            <CardContent className="p-6 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                <Badge variant={c.difficulty === 'hard' ? 'destructive' : c.difficulty === 'medium' ? 'default' : 'secondary'}>
                                  {c.difficulty.toUpperCase()}
                                </Badge>
                                {c.completed && (
                                  <div className="flex items-center gap-1.5 text-success font-semibold text-sm bg-success/10 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {c.bestScore}%
                                  </div>
                                )}
                              </div>
                              <h4 className="text-base font-bold font-display text-foreground mb-2 group-hover:text-primary transition-colors">
                                Case {idx + 1}
                              </h4>
                              <p className="text-sm text-muted-foreground font-medium mb-5 flex-grow">
                                {c.difficulty === 'hard' ? 'Challenging clinical scenario' : c.difficulty === 'medium' ? 'Intermediate clinical scenario' : 'Foundational clinical scenario'}
                              </p>
                              <Button variant={c.completed ? "outline" : "default"} className="w-full mt-auto" size="sm">
                                {c.completed ? "Re-attempt Case" : "Start Case"}
                              </Button>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-14">
                      <div className="border border-dashed border-border/40 rounded-2xl p-8 text-center text-muted-foreground">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium text-sm">Cases for this content area are being developed.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
