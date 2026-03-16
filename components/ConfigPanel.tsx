import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QuizConfig, BloomLevel, QuestionType } from '../types';
import { Settings, Book, GraduationCap, Layers, Loader2, Upload, Clipboard, CheckSquare } from 'lucide-react';
import { isSupportedFile } from '../utils/fileProcessor';

interface ConfigPanelProps {
  config: QuizConfig;
  setConfig: React.Dispatch<React.SetStateAction<QuizConfig>>;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isGenerating: boolean;
  onGenerate: () => void;
}

// Data structure for GDPT 2018 Subjects based on specific user requirements
const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  // Tiểu học (1-5)
  "1": ["Tiếng Việt", "Toán", "Đạo đức", "Tự nhiên và Xã hội", "Giáo dục thể chất", "Nghệ thuật (Âm nhạc, Mĩ thuật)", "Hoạt động trải nghiệm"],
  "2": ["Tiếng Việt", "Toán", "Đạo đức", "Tự nhiên và Xã hội", "Giáo dục thể chất", "Nghệ thuật (Âm nhạc, Mĩ thuật)", "Hoạt động trải nghiệm"],
  "3": ["Tiếng Việt", "Toán", "Đạo đức", "Ngoại ngữ 1", "Tự nhiên và Xã hội", "Tin học và Công nghệ", "Giáo dục thể chất", "Nghệ thuật (Âm nhạc, Mĩ thuật)", "Hoạt động trải nghiệm"],
  "4": ["Tiếng Việt", "Toán", "Đạo đức", "Ngoại ngữ 1", "Lịch sử và Địa lí", "Khoa học", "Tin học và Công nghệ", "Giáo dục thể chất", "Nghệ thuật (Âm nhạc, Mĩ thuật)", "Hoạt động trải nghiệm"],
  "5": ["Tiếng Việt", "Toán", "Đạo đức", "Ngoại ngữ 1", "Lịch sử và Địa lí", "Khoa học", "Tin học và Công nghệ", "Giáo dục thể chất", "Nghệ thuật (Âm nhạc, Mĩ thuật)", "Hoạt động trải nghiệm"],
  
  // THCS (6-9)
  "6": ["Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục công dân", "Khoa học tự nhiên", "Lịch sử và Địa lí", "Tin học", "Công nghệ và Hướng nghiệp", "Giáo dục thể chất", "Nghệ thuật", "Hoạt động trải nghiệm"],
  "7": ["Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục công dân", "Khoa học tự nhiên", "Lịch sử và Địa lí", "Tin học", "Công nghệ và Hướng nghiệp", "Giáo dục thể chất", "Nghệ thuật", "Hoạt động trải nghiệm"],
  "8": ["Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục công dân", "Khoa học tự nhiên", "Lịch sử và Địa lí", "Tin học", "Công nghệ và Hướng nghiệp", "Giáo dục thể chất", "Nghệ thuật", "Hoạt động trải nghiệm"],
  "9": ["Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục công dân", "Khoa học tự nhiên", "Lịch sử và Địa lí", "Tin học", "Công nghệ và Hướng nghiệp", "Giáo dục thể chất", "Nghệ thuật", "Hoạt động trải nghiệm"],
  
  // THPT (10-12)
  // Bao gồm môn bắt buộc và các môn lựa chọn phổ biến
  "10": [
    "Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục thể chất", "Giáo dục QP&AN", "Hoạt động trải nghiệm, hướng nghiệp", "Nội dung giáo dục địa phương",
    "Lịch sử", "Địa lí", "Giáo dục kinh tế và pháp luật", "Vật lí", "Hóa học", "Sinh học", "Công nghệ", "Tin học", "Nghệ thuật"
  ],
  "11": [
    "Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục thể chất", "Giáo dục QP&AN", "Hoạt động trải nghiệm, hướng nghiệp", "Nội dung giáo dục địa phương",
    "Lịch sử", "Địa lí", "Giáo dục kinh tế và pháp luật", "Vật lí", "Hóa học", "Sinh học", "Công nghệ", "Tin học", "Nghệ thuật"
  ],
  "12": [
    "Ngữ văn", "Toán", "Ngoại ngữ 1", "Giáo dục thể chất", "Giáo dục QP&AN", "Hoạt động trải nghiệm, hướng nghiệp", "Nội dung giáo dục địa phương",
    "Lịch sử", "Địa lí", "Giáo dục kinh tế và pháp luật", "Vật lí", "Hóa học", "Sinh học", "Công nghệ", "Tin học", "Nghệ thuật"
  ]
};

const GRADES = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

const ConfigPanel: React.FC<ConfigPanelProps> = ({ 
  config, 
  setConfig, 
  files, 
  setFiles, 
  isGenerating,
  onGenerate 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Automatically update subject when grade changes if current subject is invalid
  useEffect(() => {
    const validSubjects = SUBJECTS_BY_GRADE[config.grade] || [];
    if (!validSubjects.includes(config.subject)) {
      setConfig(prev => ({ ...prev, subject: validSubjects[0] || "Toán" }));
    }
  }, [config.grade]);

  const currentSubjects = useMemo(() => SUBJECTS_BY_GRADE[config.grade] || [], [config.grade]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).filter(isSupportedFile);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const newFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Rename pasted file to avoid generic "image.png" conflicts
          const timestamp = Date.now();
          const extension = file.type.split('/')[1] || 'png';
          const newName = `pasted_image_${timestamp}_${i}.${extension}`;
          
          const renamedFile = new File([file], newName, { type: file.type });
          
          if (isSupportedFile(renamedFile)) {
            newFiles.push(renamedFile);
          }
        }
      }
    }

    if (newFiles.length > 0) {
      e.preventDefault(); // Prevent default paste behavior (if any)
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(isSupportedFile);
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset value to allow selecting the same file again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleBloom = (level: BloomLevel) => {
    setConfig(prev => {
      const exists = prev.bloomLevels.includes(level);
      return {
        ...prev,
        bloomLevels: exists 
          ? prev.bloomLevels.filter(l => l !== level)
          : [...prev.bloomLevels, level]
      };
    });
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling to container which might handle focus
    fileInputRef.current?.click();
  };

  const handleContainerClick = () => {
    // Just focus the container to enable paste, do NOT open file dialog
    containerRef.current?.focus();
  };

  return (
    // Increased opacity from bg-white/40 to bg-white/80
    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/60 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6 text-slate-800">
        <Settings className="w-6 h-6 text-primary drop-shadow-sm" />
        <h2 className="text-xl font-bold">Cấu hình Quiz</h2>
      </div>

      <div className="space-y-6">
        
        {/* Subject & Grade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1 shadow-sm">Lớp</label>
            <div className="relative">
                <GraduationCap className="absolute top-2.5 left-3 w-4 h-4 text-slate-500" />
                <select
                    value={config.grade}
                    onChange={(e) => setConfig({...config, grade: e.target.value})}
                    // Increased input opacity to bg-white/90
                    className="pl-9 w-full rounded-lg border border-slate-200 bg-white/90 p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none backdrop-blur-sm transition-all hover:bg-white"
                >
                  {GRADES.map(g => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1 shadow-sm">Môn học</label>
            <div className="relative">
                <Book className="absolute top-2.5 left-3 w-4 h-4 text-slate-500" />
                <select
                    value={config.subject}
                    onChange={(e) => setConfig({...config, subject: e.target.value})}
                    // Increased input opacity to bg-white/90
                    className="pl-9 w-full rounded-lg border border-slate-200 bg-white/90 p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none appearance-none backdrop-blur-sm transition-all hover:bg-white"
                >
                   {currentSubjects.map(sub => (
                     <option key={sub} value={sub}>{sub}</option>
                   ))}
                   <option value="Khác">Khác</option>
                </select>
            </div>
          </div>
        </div>

        {/* Count & Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
             <label className="block text-sm font-medium text-slate-800 mb-1 shadow-sm">Số lượng câu hỏi</label>
             <select 
               value={config.questionCount}
               onChange={(e) => setConfig({...config, questionCount: Number(e.target.value)})}
               className="w-full rounded-lg border border-slate-200 bg-white/90 p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none backdrop-blur-sm transition-all hover:bg-white"
             >
               {[5, 10, 15, 20, 25, 30].map(n => (
                 <option key={n} value={n}>{n} câu</option>
               ))}
             </select>
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-800 mb-1 shadow-sm">Số đáp án (MCQ)</label>
             <select 
               value={config.optionCount || 4}
               onChange={(e) => setConfig({...config, optionCount: Number(e.target.value)})}
               className="w-full rounded-lg border border-slate-200 bg-white/90 p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none backdrop-blur-sm transition-all hover:bg-white"
             >
               {[2, 3, 4, 5].map(n => (
                 <option key={n} value={n}>{n} đáp án</option>
               ))}
             </select>
          </div>
        </div>

        {/* Question Types */}
        <div>
            <label className="block text-sm font-medium text-slate-800 mb-2 flex items-center gap-2 shadow-sm">
                <CheckSquare className="w-4 h-4" />
                Loại câu hỏi
            </label>
            <div className="space-y-2 bg-white/60 p-3 rounded-lg border border-white/60">
                {Object.values(QuestionType).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1.5 rounded-md transition-colors">
                        <input
                            type="checkbox"
                            checked={config.questionTypes.includes(type)}
                            onChange={() => {
                                setConfig(prev => {
                                    const exists = prev.questionTypes.includes(type);
                                    const newTypes = exists 
                                        ? prev.questionTypes.filter(t => t !== type)
                                        : [...prev.questionTypes, type];
                                    // Ensure at least one type is selected
                                    return { ...prev, questionTypes: newTypes.length > 0 ? newTypes : [type] };
                                });
                            }}
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700 font-medium">{type}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* Bloom Taxonomy */}
        <div>
            <label className="block text-sm font-medium text-slate-800 mb-2 flex items-center gap-2 shadow-sm">
                <Layers className="w-4 h-4" />
                Mức độ nhận thức (Bloom)
            </label>
            {/* Increased container opacity */}
            <div className="space-y-2 bg-white/60 p-3 rounded-lg border border-white/60">
                {Object.values(BloomLevel).map((level) => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer hover:bg-white/80 p-1.5 rounded-md transition-colors">
                        <input
                            type="checkbox"
                            checked={config.bloomLevels.includes(level)}
                            onChange={() => toggleBloom(level)}
                            className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700 font-medium">{level}</span>
                    </label>
                ))}
            </div>
        </div>

        {/* File Upload */}
        <div>
            <label className="block text-sm font-medium text-slate-800 mb-2 shadow-sm">Tài liệu nguồn</label>
            <div 
                ref={containerRef}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-text ${
                    dragActive 
                      ? 'border-primary bg-blue-50/80' 
                      : 'border-slate-300/60 bg-white/50 hover:border-primary/50 hover:bg-white/70'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onPaste={handlePaste}
                onClick={handleContainerClick}
                tabIndex={0}
                title="Bấm vào đây để active vùng này (sau đó nhấn Ctrl+V để dán ảnh)"
            >
                <input 
                    ref={fileInputRef}
                    type="file" 
                    id="file-upload"
                    multiple 
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                />
                
                <div className="flex flex-col items-center justify-center gap-3 py-2 pointer-events-none">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-1">
                        <Upload className="w-6 h-6" />
                    </div>
                    
                    <div>
                        <p className="text-sm text-slate-800 font-bold">Kéo thả file vào đây</p>
                        <p className="text-xs text-slate-500 my-1">HOẶC</p>
                        <p className="text-sm text-slate-800 font-bold flex items-center justify-center gap-1">
                             Click vùng trống để <span className="text-primary bg-primary/10 px-1 rounded flex items-center gap-1"><Clipboard className="w-3 h-3"/> Dán (Ctrl+V)</span>
                        </p>
                    </div>

                    <button 
                        type="button"
                        onClick={handleUploadClick}
                        className="mt-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary pointer-events-auto transition-colors"
                    >
                        Chọn file từ máy
                    </button>
                    
                    <p className="text-[10px] text-slate-400">PDF, Word (DOCX), Ảnh (JPG, PNG)</p>
                </div>
            </div>
            
            {/* File List */}
            {files.length > 0 && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {files.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/90 backdrop-blur-sm p-2 rounded text-xs border border-slate-200 shadow-sm">
                            <span className="truncate max-w-[180px] font-medium text-slate-800">{f.name}</span>
                            <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 px-1 font-bold">×</button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Action Button */}
        <button
            onClick={onGenerate}
            disabled={isGenerating || files.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 border border-white/20
                ${isGenerating || files.length === 0
                    ? 'bg-slate-400/80 cursor-not-allowed shadow-none backdrop-blur-sm' 
                    : 'bg-gradient-to-r from-primary to-blue-700 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md'
                }
            `}
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý...
                </>
            ) : (
                'Tạo Quiz Ngay'
            )}
        </button>

      </div>
    </div>
  );
};

export default ConfigPanel;