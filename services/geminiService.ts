import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizConfig, QuizQuestion, BloomLevel, QuestionType } from "../types";
import { extractTextFromDocx } from "../utils/fileProcessor";

// Schema definition for Structured Output is now generated dynamically

const SYSTEM_INSTRUCTION = `
Bạn là một giáo viên chuyên gia của Việt Nam, am hiểu sâu sắc Chương trình Giáo dục Phổ thông 2018 (GDPT 2018).
Nhiệm vụ của bạn là tạo ra các câu hỏi trắc nghiệm và tự luận từ tài liệu được cung cấp.

CÁC LOẠI CÂU HỎI CẦN HỖ TRỢ:
1. Trắc nghiệm 4 lựa chọn (MCQ): Câu hỏi truyền thống với các lựa chọn A, B, C, D.
2. Trắc nghiệm Đúng/Sai (4 ý) (TRUE_FALSE_4): Một câu hỏi gốc kèm theo 4 ý (mệnh đề). Với mỗi ý, học sinh phải chọn Đúng hoặc Sai.
3. Tự luận (ESSAY): Câu hỏi yêu cầu học sinh trình bày lời giải hoặc câu trả lời.

YÊU CẦU BẮT BUỘC:
1. Nội dung câu hỏi phải chính xác về mặt kiến thức, phù hợp với Lớp và Môn học được yêu cầu.
2. Phân loại mức độ nhận thức (Bloom) đúng theo cấu hình.
3. Sử dụng định dạng LaTeX cho TẤT CẢ các công thức toán học, đặt trong dấu $ đơn (ví dụ: $x^2$). TUYỆT ĐỐI KHÔNG dùng $$ (hai dấu $).
4. Ngôn ngữ: Tiếng Việt chuẩn mực sư phạm.
`;

/**
 * Helper function to normalize LaTeX delimiters.
 */
const normalizeMathDelimiters = (text: string | undefined): string => {
  if (!text) return "";
  
  let cleaned = text;
  cleaned = cleaned.replace(/\$\$/g, '$');
  cleaned = cleaned.replace(/\\\[/g, '$').replace(/\\\]/g, '$');
  cleaned = cleaned.replace(/\\\(/g, '$').replace(/\\\)/g, '$');

  return cleaned;
};

export const generateQuizFromContent = async (
  files: File[],
  config: QuizConfig
): Promise<QuizQuestion[]> => {
  const getApiKey = () => {
    // Try various common environment variable names
    return (
      process.env.API_KEY || 
      process.env.GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_GEMINI_API_KEY || 
      (import.meta as any).env?.VITE_API_KEY || 
      ""
    );
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Lỗi: Không tìm thấy API Key. Vui lòng cấu hình GEMINI_API_KEY trong Environment Variables trên Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const optionCount = config.optionCount || 4;
  const optionKeys = Array.from({ length: optionCount }, (_, i) => String.fromCharCode(65 + i));

  const dynamicQuizSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.INTEGER },
        type: { type: Type.STRING, enum: Object.values(QuestionType) },
        question_content: { type: Type.STRING },
        level: { type: Type.STRING },
        // MCQ fields
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              text: { type: Type.STRING }
            },
            required: ["key", "text"]
          }
        },
        correct_answer: { type: Type.STRING },
        // TRUE_FALSE_4 fields
        sub_questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              content: { type: Type.STRING },
              correct_answer: { type: Type.STRING, enum: ["Đúng", "Sai"] }
            },
            required: ["id", "content", "correct_answer"]
          }
        },
        // ESSAY fields
        suggested_answer: { type: Type.STRING }
      },
      required: ["id", "type", "question_content", "level"]
    }
  };

  const fileParts = await Promise.all(
    files.map(async (file) => {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const textContent = await extractTextFromDocx(file);
        return {
          text: `--- NỘI DUNG TỪ FILE WORD: ${file.name} ---\n${textContent}\n--- HẾT FILE WORD ---`
        };
      } 
      return new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve({
            inlineData: {
              data: base64String,
              mimeType: file.type
            }
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    })
  );

  const levels = config.bloomLevels.length > 0 ? config.bloomLevels.join(", ") : "Tổng hợp";
  const types = config.questionTypes.join(", ");

  const promptText = `
    Hãy tạo TỔNG CỘNG ${config.questionCount} câu hỏi.
    Môn học: ${config.subject}.
    Lớp: ${config.grade}.
    Mức độ: ${levels}.
    Các loại câu hỏi cần tạo: ${types}.
    
    YÊU CẦU CHI TIẾT CHO TỪNG LOẠI:
    1. Với "Trắc nghiệm 4 lựa chọn": Tạo ${optionCount} lựa chọn (A, B, C, D...).
    2. Với "Trắc nghiệm Đúng/Sai (4 ý)":
       - question_content là phần dẫn chung.
       - sub_questions phải có ĐÚNG 4 ý (mệnh đề).
       - Mỗi ý trong sub_questions phải có content là mệnh đề và correct_answer là "Đúng" hoặc "Sai".
    3. Với "Tự luận": Cung cấp câu hỏi và suggested_answer (hướng dẫn chấm hoặc đáp án mẫu).

    Hãy phân bổ số lượng câu hỏi cho các loại một cách hợp lý để tổng là ${config.questionCount} câu.
    Hãy phân tích nội dung từ các hình ảnh/tài liệu đính kèm để tạo câu hỏi.
    Trả về kết quả dưới dạng JSON thuần túy.
  `;

  const primaryModel = 'gemini-3-pro-preview';
  const fallbackModel = 'gemini-3-flash-preview';

  const processResponse = (responseText: string | undefined): QuizQuestion[] => {
    if (!responseText) throw new Error("Empty response");
    
    try {
        const questions = JSON.parse(responseText) as QuizQuestion[];
        
        return questions.map(q => {
            const processedQuestion = {
                ...q,
                question_content: normalizeMathDelimiters(q.question_content),
                suggested_answer: normalizeMathDelimiters(q.suggested_answer)
            };

            if (q.type === QuestionType.MCQ && q.options) {
                let processedOptions = q.options.map(opt => ({
                    ...opt,
                    text: normalizeMathDelimiters(opt.text)
                }));

                let correctAnswerKey = q.correct_answer || "A";

                // Shuffle options for MCQ
                const optionsWithFlag = processedOptions.map(opt => ({
                    ...opt,
                    isCorrect: opt.key === q.correct_answer
                }));

                for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
                }

                processedOptions = optionsWithFlag.map((opt, index) => {
                    const newKey = String.fromCharCode(65 + index);
                    if (opt.isCorrect) {
                        correctAnswerKey = newKey;
                    }
                    return { key: newKey, text: opt.text };
                });

                processedQuestion.options = processedOptions;
                processedQuestion.correct_answer = correctAnswerKey;
            }

            if (q.type === QuestionType.TRUE_FALSE_4 && q.sub_questions) {
                processedQuestion.sub_questions = q.sub_questions.map(sub => ({
                    ...sub,
                    content: normalizeMathDelimiters(sub.content)
                }));
            }

            return processedQuestion;
        });
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("AI trả về định dạng không hợp lệ. Vui lòng thử lại.");
    }
  };

  const callModel = async (modelName: string) => {
    return await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [...fileParts, { text: promptText }]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: dynamicQuizSchema,
        temperature: 0.4,
      }
    });
  };

  try {
    try {
      const response = await callModel(primaryModel);
      return processResponse(response.text);
    } catch (primaryError) {
      console.warn(`Primary model (${primaryModel}) failed, retrying with fallback...`, primaryError);
      const fallbackResponse = await callModel(fallbackModel);
      return processResponse(fallbackResponse.text);
    }
  } catch (finalError) {
    console.error("Gemini Generation Failed:", finalError);
    throw new Error("Không thể tạo câu hỏi. Vui lòng kiểm tra lại tài liệu nguồn.");
  }
};
