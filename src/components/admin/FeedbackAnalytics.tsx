import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Star, 
  ThumbsUp, 
  MessageSquare, 
  TrendingUp,
  Users,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface FeedbackEntry {
  id: string;
  rating: number;
  would_recommend: string | null;
  feedback: string | null;
  email: string | null;
  application_count: number | null;
  company: string | null;
  job_title: string | null;
  created_at: string;
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: { rating: number; count: number }[];
  recommendDistribution: { name: string; value: number }[];
  recentFeedback: FeedbackEntry[];
  commonWords: { word: string; count: number }[];
}

interface FeedbackAnalyticsProps {
  refreshTrigger?: number;
}

const COLORS = ["#22c55e", "#f59e0b", "#ef4444"];

const FeedbackAnalytics = ({ refreshTrigger }: FeedbackAnalyticsProps) => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackStats();
  }, [refreshTrigger]);

  const fetchFeedbackStats = async () => {
    setLoading(true);
    try {
      const { data: feedbackData, error } = await supabase
        .from("demo_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const feedback = feedbackData || [];

      // Calculate stats
      const totalFeedback = feedback.length;
      const ratingsWithValue = feedback.filter(f => f.rating != null);
      const averageRating = ratingsWithValue.length > 0
        ? ratingsWithValue.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValue.length
        : 0;

      // Rating distribution
      const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingsWithValue.forEach(f => {
        if (f.rating) ratingCounts[f.rating]++;
      });
      const ratingDistribution = Object.entries(ratingCounts).map(([rating, count]) => ({
        rating: parseInt(rating),
        count,
      }));

      // Recommend distribution
      const recommendCounts: Record<string, number> = { yes: 0, maybe: 0, no: 0 };
      feedback.forEach(f => {
        if (f.would_recommend) recommendCounts[f.would_recommend]++;
      });
      const recommendDistribution = [
        { name: "Yes", value: recommendCounts.yes },
        { name: "Maybe", value: recommendCounts.maybe },
        { name: "No", value: recommendCounts.no },
      ].filter(d => d.value > 0);

      // Extract common words from feedback text
      const allText = feedback
        .filter(f => f.feedback)
        .map(f => f.feedback!)
        .join(" ")
        .toLowerCase();
      
      const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
        "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "this", "that", "these",
        "those", "i", "you", "he", "she", "it", "we", "they", "what", "which",
        "who", "when", "where", "why", "how", "all", "each", "every", "both",
        "few", "more", "most", "other", "some", "such", "no", "nor", "not",
        "only", "own", "same", "so", "than", "too", "very", "just", "also",
        "like", "get", "got", "really", "would", "also", "think", "about", "just"
      ]);

      const wordCounts: Record<string, number> = {};
      allText.split(/\s+/).forEach(word => {
        const cleanWord = word.replace(/[^a-z]/g, "");
        if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
          wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
        }
      });

      const commonWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      setStats({
        totalFeedback,
        averageRating,
        ratingDistribution,
        recommendDistribution,
        recentFeedback: feedback.slice(0, 10) as FeedbackEntry[],
        commonWords,
      });
    } catch (error) {
      console.error("Error fetching feedback stats:", error);
      toast.error("Failed to load feedback analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalFeedback === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No feedback yet</p>
            <p className="text-sm">Feedback will appear here when users submit it</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <MessageSquare className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.totalFeedback}
                </div>
                <div className="text-sm text-muted-foreground">Total Feedback</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <ThumbsUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.recommendDistribution.find(d => d.name === "Yes")?.value || 0}
                </div>
                <div className="text-sm text-muted-foreground">Would Recommend</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.averageRating >= 4 ? "Positive" : stats.averageRating >= 3 ? "Neutral" : "Needs Work"}
                </div>
                <div className="text-sm text-muted-foreground">Sentiment</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Rating Distribution
            </CardTitle>
            <CardDescription>How users rated their experience</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--accent))" 
                  radius={[4, 4, 0, 0]}
                  name="Responses"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recommendation Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Would Recommend
            </CardTitle>
            <CardDescription>Net promoter indication</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recommendDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.recommendDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.recommendDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No recommendation data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Common Words / Themes */}
      {stats.commonWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Themes in Feedback</CardTitle>
            <CardDescription>Most frequently mentioned words</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.commonWords.map(({ word, count }) => (
                <Badge 
                  key={word} 
                  variant="secondary"
                  className="text-sm py-1.5 px-3"
                >
                  {word}
                  <span className="ml-2 text-muted-foreground">({count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>Latest feedback from users</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {stats.recentFeedback.map((entry) => (
                <div 
                  key={entry.id} 
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= (entry.rating || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      {entry.would_recommend && (
                        <Badge 
                          variant={
                            entry.would_recommend === "yes" ? "default" :
                            entry.would_recommend === "maybe" ? "secondary" : "destructive"
                          }
                          className="text-xs"
                        >
                          {entry.would_recommend === "yes" ? "Would recommend" :
                           entry.would_recommend === "maybe" ? "Maybe" : "Wouldn't recommend"}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {entry.feedback && (
                    <p className="text-sm text-foreground">{entry.feedback}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {entry.email && <span>{entry.email}</span>}
                    {entry.company && <span>• {entry.company}</span>}
                    {entry.application_count && (
                      <span>• {entry.application_count} apps completed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackAnalytics;