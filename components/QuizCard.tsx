import React, { useState } from 'react';
import { QuizQuestion, BloomLevel, QuestionType } from '../types';
import MathRenderer from './MathRenderer';
import { CheckCircle, Trash2, Edit2, Save, X, Check, AlertCircle } from 'lucide-react';

interface QuizCardProps {
  question: QuizQuestion;
  index: number;
  onDelete: (id: number) => void;
  onUpdate?: (question: QuizQuestion) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, index, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<QuizQuestion>(question);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedQuestion);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setIsEditing(false);
  };

  const renderMCQ = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {question.options?.map((opt) => {
        const isCorrect = opt.key === question.correct_answer;
        return (
          <div 
            key={opt.key}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              isCorrect 
                ? 'border-green-500/50 bg-green-50/80' 
                : 'border-slate-200 hover:border-blue-400/50 bg-white/60 hover:bg-white/90'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`
                  flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm
                  ${isCorrect ? 'bg-green-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}
              `}>
                {opt.key}
              </span>
              <div className="flex-grow pt-1">
                  <MathRenderer text={opt.text} className="text-slate-800 font-medium" />
              </div>
              {isCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 drop-shadow-sm" />}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTrueFalse4 = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {question.sub_questions?.map((sub, idx) => (
          <div key={sub.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-slate-200 hover:bg-white/90 transition-colors">
            <div className="flex gap-3 items-start">
                <span className="font-bold text-slate-500 mt-0.5">{String.fromCharCode(97 + idx)})</span>
                <MathRenderer text={sub.content} className="text-slate-800" />
            </div>
            <div className="flex gap-2 ml-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${sub.correct_answer === "Đúng" ? "bg-green-100 text-green-700 border border-green-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
                    {sub.correct_answer}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEssay = () => (
    <div className="mt-4">
      <button 
        onClick={() => setShowAnswer(!showAnswer)}
        className="text-sm font-bold text-primary hover:underline flex items-center gap-1 mb-2"
      >
        {showAnswer ? "Ẩn đáp án gợi ý" : "Xem đáp án gợi ý"}
      </button>
      {showAnswer && (
        <div className="p-4 bg-blue-50/80 rounded-lg border border-blue-200 text-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
            <Check className="w-4 h-4" />
            Đáp án gợi ý:
          </div>
          <MathRenderer text={question.suggested_answer || "Chưa có đáp án gợi ý."} />
        </div>
      )}
    </div>
  );

  if (isEditing) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-primary/50 p-6 mb-4 transition-all">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-sm font-bold px-2 py-1 rounded-md shadow-sm">
                Sửa Câu {index + 1}
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{question.type}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-all"><Save className="w-5 h-5" /></button>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung câu hỏi</label>
          <textarea 
            value={editedQuestion.question_content}
            onChange={(e) => setEditedQuestion({...editedQuestion, question_content: e.target.value})}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
          />
        </div>

        {/* Edit fields based on type */}
        {question.type === QuestionType.MCQ && editedQuestion.options && (
            <div className="space-y-3">
                {editedQuestion.options.map((opt, optIndex) => (
                    <div key={opt.key} className="flex items-start gap-3">
                        <input 
                            type="radio" 
                            checked={editedQuestion.correct_answer === opt.key}
                            onChange={() => setEditedQuestion({...editedQuestion, correct_answer: opt.key})}
                            className="mt-3"
                        />
                        <textarea 
                            value={opt.text}
                            onChange={(e) => {
                                const newOptions = [...editedQuestion.options!];
                                newOptions[optIndex].text = e.target.value;
                                setEditedQuestion({...editedQuestion, options: newOptions});
                            }}
                            className="flex-grow p-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                ))}
            </div>
        )}

        {question.type === QuestionType.ESSAY && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đáp án gợi ý</label>
                <textarea 
                    value={editedQuestion.suggested_answer}
                    onChange={(e) => setEditedQuestion({...editedQuestion, suggested_answer: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
                />
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/60 p-6 mb-4 transition-all hover:bg-white hover:shadow-xl group relative">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
            <span className="bg-primary text-white text-sm font-bold px-2 py-1 rounded-md shadow-sm">
                Câu {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                {question.level}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">
                {question.type}
            </span>
        </div>
        
        <div className="flex gap-1">
          <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-all"><Edit2 className="w-5 h-5" /></button>
          <button onClick={() => onDelete(question.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="mb-6 text-lg font-medium text-slate-900 leading-relaxed drop-shadow-sm">
        <MathRenderer text={question.question_content} />
      </div>

      {question.type === QuestionType.MCQ && renderMCQ()}
      {question.type === QuestionType.TRUE_FALSE_4 && renderTrueFalse4()}
      {question.type === QuestionType.ESSAY && renderEssay()}
    </div>
  );
};

export default QuizCard;
