import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useGetMetrics } from "@/api/mock-api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Target, Award, Clock, History, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui-elements";

export default function Metrics() {
  const { data: metrics, isLoading } = useGetMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics) return <div className="p-8 text-center text-muted-foreground">No metrics available yet. complete a case first!</div>;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border/60 p-3 rounded-lg shadow-xl">
          <p className="font-bold text-foreground mb-1">{label}</p>
          <p className="text-primary font-medium">Avg Score: {payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-12"
    >
      <div>
        <h1 className="text-4xl font-display font-bold text-foreground">Performance Metrics</h1>
        <p className="text-lg text-muted-foreground mt-2 font-medium">Track your clinical readiness and identify weak spots.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-xl">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <Target className="w-8 h-8 opacity-70 mb-4" />
            <div>
              <p className="text-primary-foreground/80 font-medium mb-1">Total Cases</p>
              <h3 className="text-5xl font-bold font-display">{metrics.totalCasesCompleted}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card border border-border/60 shadow-lg">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <Award className="w-8 h-8 text-success mb-4" />
            <div>
              <p className="text-muted-foreground font-medium mb-1">Overall Average</p>
              <h3 className="text-5xl font-bold font-display text-foreground">
                {metrics.averageScore ? `${Math.round(metrics.averageScore)}%` : "N/A"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card border border-border/60 shadow-lg">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <Clock className="w-8 h-8 text-accent mb-4" />
            <div>
              <p className="text-muted-foreground font-medium mb-1">Total Practice Time</p>
              <h3 className="text-5xl font-bold font-display text-foreground flex items-baseline gap-2">
                {Math.round(metrics.totalTimePracticed / 60)} 
                <span className="text-xl text-muted-foreground font-sans font-medium">hours</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Performance by Topic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.casesByTopic} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="topic" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    domain={[0, 100]}
                  />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.5)' }} content={<CustomTooltip />} />
                  <Bar dataKey="averageScore" radius={[4, 4, 0, 0]}>
                    {metrics.casesByTopic.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.averageScore && entry.averageScore > 75 ? 'hsl(var(--success))' : 'hsl(var(--primary))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {metrics.recentSessions.slice(0, 5).map((session) => (
                <div key={session.sessionId} className="p-5 hover:bg-muted/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-foreground text-sm line-clamp-1 pr-4">{session.caseTitle}</h4>
                    <div className="font-display font-bold text-primary">
                      {session.score ? `${Math.round(session.score)}%` : '-'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{session.topic}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {session.completedAt ? format(parseISO(session.completedAt), "MMM d") : 'Incomplete'}
                    </span>
                  </div>
                </div>
              ))}
              {metrics.recentSessions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                  No history available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
