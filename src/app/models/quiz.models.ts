export interface QuizQuestion {
    type: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    points: number;
    category: string[];
    difficulty: string;
  }
  
  export interface Quiz {
    quizID: string;
    subject: string;
    topic: string;
    difficulty: string;
    questions: QuizQuestion[];
  }