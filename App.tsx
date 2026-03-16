import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { QuizConfig, QuizQuestion, BloomLevel, HistoryItem, QuestionType } from './types';
import ConfigPanel from '@/components/ConfigPanel';
import QuizCard from '@/components/QuizCard';
import HistoryModal from '@/components/HistoryModal';
import { generateQuizFromContent } from './services/geminiService';
import { Download, History, BrainCircuit, FileDown, Check } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<QuizConfig>({
    subject: "Toán",
    grade: "12",
    questionCount: 10,
    bloomLevels: [BloomLevel.KNOWLEDGE, BloomLevel.COMPREHENSION],
    questionTypes: [QuestionType.MCQ],
    optionCount: 4,
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isExportingWord, setIsExportingWord] = useState(false);
  
  // New state for modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem('quizHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // --- Handlers ---
  const handleGenerate = async () => {
    if (files.length === 0) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedQuiz(null);

    try {
      const questions = await generateQuizFromContent(files, config);
      
      // Ensure unique IDs for React keys and deletion logic
      const questionsWithUniqueIds = questions.map((q, index) => ({
        ...q,
        id: Date.now() + index
      }));
      
      setGeneratedQuiz(questionsWithUniqueIds);
      
      // Save to history
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        title: `${config.subject} - Lớp ${config.grade}`,
        questions: questionsWithUniqueIds
      };
      
      const newHistory = [newHistoryItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('quizHistory', JSON.stringify(newHistory));

    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (id: number) => {
    if (!generatedQuiz) return;
    
    const updatedQuiz = generatedQuiz.filter(q => q.id !== id);
    setGeneratedQuiz(updatedQuiz);
  };

  const handleUpdateQuestion = (updatedQuestion: QuizQuestion) => {
    if (!generatedQuiz) return;
    const updatedQuiz = generatedQuiz.map(q => q.id === updatedQuestion.id ? updatedQuestion : q);
    setGeneratedQuiz(updatedQuiz);
  };

  const handleExportExcel = () => {
    if (!generatedQuiz) return;

    const exportData = generatedQuiz.map(q => {
      const row: any = {
        "ID": q.id,
        "Loại câu hỏi": q.type,
        "Mức độ": q.level,
        "Nội dung câu hỏi": q.question_content,
      };
      
      if (q.type === QuestionType.MCQ && q.options) {
        q.options.forEach(o => {
          row[`Đáp án ${o.key}`] = o.text;
        });
        row["Đáp án đúng"] = q.correct_answer;
      } else if (q.type === QuestionType.TRUE_FALSE_4 && q.sub_questions) {
        q.sub_questions.forEach((sub, idx) => {
          row[`Ý ${String.fromCharCode(97 + idx)})`] = sub.content;
          row[`Đáp án ý ${String.fromCharCode(97 + idx)})`] = sub.correct_answer;
        });
      } else if (q.type === QuestionType.ESSAY) {
        row["Đáp án gợi ý"] = q.suggested_answer;
      }
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    XLSX.writeFile(wb, `Quiz_${config.subject}_${Date.now()}.xlsx`);
  };

  const handleExportWord = async () => {
    if (!generatedQuiz) return;
    setIsExportingWord(true);

    try {
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "ĐỀ KIỂM TRA",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: `Môn: ${config.subject} - Lớp: ${config.grade}`,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
              }),
              ...generatedQuiz.flatMap((q, index) => {
                const elements = [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Câu ${index + 1}: `, bold: true }),
                      new TextRun({ text: q.question_content }),
                    ],
                    spacing: { before: 200, after: 100 },
                  }),
                ];

                if (q.type === QuestionType.MCQ && q.options) {
                  q.options.forEach(opt => {
                    elements.push(
                      new Paragraph({
                        text: `${opt.key}. ${opt.text}`,
                        indent: { left: 720 },
                      })
                    );
                  });
                  elements.push(
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Đáp án đúng: ", bold: true }),
                        new TextRun({ text: q.correct_answer || "" }),
                      ],
                      spacing: { before: 100 },
                    })
                  );
                } else if (q.type === QuestionType.TRUE_FALSE_4 && q.sub_questions) {
                  q.sub_questions.forEach((sub, subIdx) => {
                    elements.push(
                      new Paragraph({
                        children: [
                          new TextRun({ text: `${String.fromCharCode(97 + subIdx)}). `, bold: true }),
                          new TextRun({ text: sub.content }),
                          new TextRun({ text: ` [${sub.correct_answer}]`, bold: true }),
                        ],
                        indent: { left: 720 },
                      })
                    );
                  });
                } else if (q.type === QuestionType.ESSAY) {
                  elements.push(
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Gợi ý đáp án: ", bold: true }),
                        new TextRun({ text: q.suggested_answer || "" }),
                      ],
                      spacing: { before: 100 },
                    })
                  );
                }

                return elements;
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `De_Thi_${config.subject}_Lop${config.grade}_${Date.now()}.docx`);
    } catch (err) {
      console.error("Failed to export Word", err);
    } finally {
      setIsExportingWord(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    // Ensure unique IDs even for history items
    const sanitizedQuestions = item.questions.map((q, index) => ({
        ...q,
        id: Date.now() + index
    }));
    setGeneratedQuiz(sanitizedQuestions);
    setIsHistoryModalOpen(false);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('quizHistory', JSON.stringify(newHistory));
  };

  // --- Render ---
  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      
      {/* Header - Increased Opacity */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/40 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <img 
                  src="https://yt3.googleusercontent.com/yTvPnt3EB5SSM279ukBxEeNlaf6_tCsOUljpHjfnlyks0HqMyHTNwv-vlddX9BifKLyFs7u_hw=s160-c-k-c0x00ffffff-no-rj"
                  alt="Giaoviendoimoi Logo"
                  className="w-10 h-10 rounded-xl shadow-lg shadow-blue-500/20"
                />
                <div>
                    <h1 className="font-bold text-xl text-slate-800 leading-tight drop-shadow-sm uppercase">SOẠN ĐỀ BẰNG AI</h1>
                </div>
            </div>

            <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/70 hover:bg-white/90 text-slate-800 font-semibold transition-colors border border-white/50 shadow-sm active:scale-95 backdrop-blur-sm"
            >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Lịch sử</span>
                {history.length > 0 && (
                    <span className="bg-slate-200/80 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold shadow-inner">
                        {history.length}
                    </span>
                )}
            </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col md:flex-row max-w-[1600px] mx-auto w-full p-4 gap-6 h-[calc(100vh-64px)] overflow-hidden">
            
            {/* Left Panel: Config */}
            <div className="w-full md:w-[400px] flex-shrink-0 h-full overflow-hidden flex flex-col">
                <ConfigPanel 
                    config={config} 
                    setConfig={setConfig} 
                    files={files} 
                    setFiles={setFiles}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                />
            </div>

            {/* Right Panel: Results - Increased Opacity */}
            <div className="flex-1 h-full flex flex-col bg-white/85 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 overflow-hidden relative">
                
                {/* Result Header */}
                <div className="px-6 py-4 border-b border-slate-200/50 flex justify-between items-center bg-white/95 sticky top-0 z-10 backdrop-blur-md">
                    <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 drop-shadow-sm">
                        {generatedQuiz ? (
                            <>Kết quả: <span className="text-blue-700">{generatedQuiz.length} câu hỏi</span></>
                        ) : (
                            'Khu vực hiển thị'
                        )}
                    </h2>
                    {generatedQuiz && (
                        <div className="flex gap-2">
                             <button 
                                onClick={handleExportWord}
                                disabled={isExportingWord}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 font-medium text-sm"
                            >
                                {isExportingWord ? <span className="animate-spin">⏳</span> : <FileDown className="w-4 h-4" />}
                                {isExportingWord ? "Đang xuất..." : "Xuất file Word"}
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-500/30 font-medium text-sm"
                            >
                                <Download className="w-4 h-4" /> Xuất Excel
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl shadow-lg animate-in slide-in-from-top-2">
                            <h3 className="font-bold text-lg mb-2">Đã xảy ra lỗi</h3>
                            <p>{error}</p>
                        </div>
                    )}

                    {!generatedQuiz && !isGenerating && !error && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/60">
                                <BrainCircuit className="w-10 h-10 opacity-60 text-slate-600" />
                            </div>
                            <p className="text-lg font-bold text-slate-700 drop-shadow-sm">Sẵn sàng tạo câu hỏi</p>
                            <p className="text-sm mt-2 max-w-md text-center text-slate-600 font-medium">Tải lên tài liệu ở bảng bên trái và nhấn "Tạo Quiz Ngay" để bắt đầu.</p>
                        </div>
                    )}

                    {isGenerating && (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="relative mb-8">
                                <div className="w-20 h-20 border-4 border-white/50 rounded-full"></div>
                                <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-lg"></div>
                            </div>
                            <p className="text-lg font-bold text-slate-800 mb-2 drop-shadow-sm">Đang phân tích tài liệu...</p>
                            <p className="text-slate-600 text-sm font-medium">AI đang soạn thảo câu hỏi theo chuẩn GDPT 2018</p>
                        </div>
                    )}

                    {generatedQuiz && (
                        <div className="max-w-4xl mx-auto pb-10 space-y-6">
                            {generatedQuiz.map((q, idx) => (
                                <QuizCard 
                                    key={q.id} // Use ID instead of index for safer deletion rendering
                                    question={q} 
                                    index={idx} 
                                    onDelete={handleDeleteQuestion}
                                    onUpdate={handleUpdateQuestion}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
      </main>
      
      <HistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onSelect={loadHistoryItem}
        onDelete={deleteHistoryItem}
      />
    </div>
  );
};

export default App;