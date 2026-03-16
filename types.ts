export enum QuestionType {
  MCQ = "Trắc nghiệm 4 lựa chọn",
  TRUE_FALSE_4 = "Trắc nghiệm Đúng/Sai (4 ý)",
  ESSAY = "Tự luận"
}

export interface QuizOption {
  key: string; // A, B, C, D
  text: string;
}

export interface TrueFalseSubQuestion {
  id: string;
  content: string;
  correct_answer: "Đúng" | "Sai";
}

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  question_content: string;
  level: string; // Nhận biết, Thông hiểu, etc.
  
  // For MCQ
  options?: QuizOption[];
  correct_answer?: string; // A, B, C, or D
  
  // For TRUE_FALSE_4
  sub_questions?: TrueFalseSubQuestion[];
  
  // For ESSAY
  suggested_answer?: string;
}

export enum BloomLevel {
  KNOWLEDGE = "Nhận biết",
  COMPREHENSION = "Thông hiểu",
  APPLICATION_LOW = "Vận dụng thấp",
  APPLICATION_HIGH = "Vận dụng cao"
}

export interface QuizConfig {
  subject: string;
  grade: string;
  questionCount: number;
  bloomLevels: BloomLevel[];
  questionTypes: QuestionType[];
  optionCount: number; // For MCQ
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  title: string;
  questions: QuizQuestion[];
}

export type GenerationStatus = 'idle' | 'processing_file' | 'generating' | 'success' | 'error';