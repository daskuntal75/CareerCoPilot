import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Timer, 
  Mic, 
  MicOff,
  Save,
  Eye,
  EyeOff,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StarAnswer {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface PracticeQuestion {
  question: string;
  category: string;
  difficulty: string;
  starAnswer: StarAnswer;
  tips: string[];
}

interface InterviewPracticeProps {
  questions: PracticeQuestion[];
  onClose: () => void;
  onSaveResponse?: (questionIndex: number, response: string, timeSpent: number) => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const difficultyColors: Record<string, string> = {
  easy: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const InterviewPractice = ({ questions, onClose, onSaveResponse }: InterviewPracticeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [response, setResponse] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [savedResponses, setSavedResponses] = useState<Record<number, { response: string; time: number }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const resetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const goToQuestion = (index: number) => {
    // Save current response before switching
    if (response.trim()) {
      setSavedResponses((prev) => ({
        ...prev,
        [currentIndex]: { response, time: elapsedTime },
      }));
    }

    setCurrentIndex(index);
    setShowAnswer(false);
    resetTimer();

    // Load saved response for the new question
    const saved = savedResponses[index];
    if (saved) {
      setResponse(saved.response);
      setElapsedTime(saved.time);
    } else {
      setResponse("");
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  };

  const saveCurrentResponse = () => {
    if (!response.trim()) {
      toast.error("Please write a response first");
      return;
    }

    setSavedResponses((prev) => ({
      ...prev,
      [currentIndex]: { response, time: elapsedTime },
    }));

    if (onSaveResponse) {
      onSaveResponse(currentIndex, response, elapsedTime);
    }

    toast.success("Response saved!");
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        toast.success("Recording saved! (Audio playback not implemented)");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsTimerRunning(true);
      toast.success("Recording started...");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTimerRunning(false);
    }
  }, [isRecording]);

  const getTimerColor = () => {
    if (elapsedTime < 60) return "text-success";
    if (elapsedTime < 120) return "text-warning";
    return "text-destructive";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto"
    >
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Practice Mode</h2>
            <p className="text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all",
                index === currentIndex
                  ? "bg-accent scale-125"
                  : savedResponses[index]
                  ? "bg-success"
                  : "bg-muted hover:bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Timer and controls */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("text-4xl font-mono font-bold", getTimerColor())}>
                {formatTime(elapsedTime)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTimer}
                  className="h-10 w-10"
                >
                  {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={resetTimer}
                  className="h-10 w-10"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Record Answer
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <Timer className="w-3 h-3" />
            <span>
              Aim for 1-2 minutes per answer. {elapsedTime > 120 && "Consider wrapping up!"}
            </span>
          </div>
        </div>

        {/* Question */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card border border-border rounded-xl p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium border",
                difficultyColors[currentQuestion.difficulty] || difficultyColors.medium
              )}
            >
              {currentQuestion.difficulty}
            </span>
            <span className="px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
              {currentQuestion.category}
            </span>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-4">
            {currentQuestion.question}
          </h3>

          {/* Tips */}
          {currentQuestion.tips && currentQuestion.tips.length > 0 && (
            <div className="bg-secondary/30 rounded-lg p-3 mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick tips:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {currentQuestion.tips.slice(0, 2).map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Response area */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">Your Response</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAnswer ? "Hide" : "Show"} Sample Answer
              </Button>
              <Button variant="outline" size="sm" onClick={saveCurrentResponse}>
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
          </div>

          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your answer here using the STAR method (Situation, Task, Action, Result)..."
            className="min-h-[200px] resize-y"
          />

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{response.split(/\s+/).filter(Boolean).length} words</span>
            {savedResponses[currentIndex] && (
              <span className="text-success">✓ Saved ({formatTime(savedResponses[currentIndex].time)})</span>
            )}
          </div>
        </div>

        {/* Sample answer */}
        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-xl p-6 mb-6 overflow-hidden"
            >
              <h4 className="font-medium text-foreground mb-4">Sample STAR Answer</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                    Situation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.starAnswer.situation}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                    Task
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.starAnswer.task}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                    Action
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.starAnswer.action}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
                    Result
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentQuestion.starAnswer.result}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={goToNext}
            disabled={currentIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default InterviewPractice;
