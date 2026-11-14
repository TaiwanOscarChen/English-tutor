import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Volume2, Sparkles, RefreshCw, Copy, Check, Wrench, FileText, Cpu } from 'lucide-react';
import { speakEnglish } from '../utils/speech';
import { sanitizeTextToPublicSafe } from '../utils/pipSanitizer';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface AiTutorChatProps {
  speechSpeed: number;
}


const COACH_MODES = [
  { id: 'all', name: '全能解答', icon: Sparkles, promptPrefix: '' },
  { id: 'troubleshoot', name: '機台排錯', icon: Wrench, promptPrefix: '【機台排錯情境】請協助解答以下問題：' },
  { id: 'handover', name: '交接報告', icon: FileText, promptPrefix: '【無塵室交接報告】請提供英文說法與拆解：' },
  { id: 'pronounce', name: '語序拆解', icon: Cpu, promptPrefix: '【國小拆解 ✕ 台味諧音】請幫我拆解這句英文：' },
];

const CATEGORIZED_QUESTIONS = [
  { category: '排錯', text: '感測器訊號異常如何用 4 字英文向組長匯報？' },
  { category: '光學', text: '如何用 4 字短句說明「We tune the light」？' },
  { category: '拆解', text: '用國小拆解法說明「I check the substrate」' },
  { category: '諧音', text: '無塵室最常用的 5 個維修動詞與台味諧音記憶法' },
  { category: '報工', text: 'PM 保養完工交接實用 4 字超短句型' },
];

export const AiTutorChat: React.FC<AiTutorChatProps> = ({ speechSpeed }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是你的 1-on-1 FSE 晶圓級英文教練 🤖\n\n無論你在無塵室遇到機台異常排除、PM 保養交接，或是想把英文句子用「國小拆解 ✕ 台味諧音」輕鬆學會，隨時點擊下方快捷鍵或直接提問！',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customQuestion?: string) => {
    const rawInput = customQuestion || input.trim();
    if (!rawInput || isLoading) return;

    const safeQuestion = sanitizeTextToPublicSafe(rawInput).text || rawInput;
    const currentModeObj = COACH_MODES.find(m => m.id === activeMode);
    const questionText = currentModeObj?.promptPrefix && !customQuestion
      ? `${currentModeObj.promptPrefix}${safeQuestion}`
      : safeQuestion;

    const userMsg: Message = { 
      id: 'u-' + Date.now(), 
      role: 'user', 
      content: safeQuestion,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setInput('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          userQuestion: questionText
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      const cleanReply = sanitizeTextToPublicSafe(
        data.reply || '建議使用極簡 4 字 SVO 句型：「I test the sensor.」（我測試感應器）或「We tune the light.」（我們調整光源）。'
      ).text;
      const replyMsg: Message = {
        id: 'a-' + Date.now(),
        role: 'assistant',
        content: cleanReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'e-' + Date.now(),
          role: 'assistant',
          content: '【離線極簡教學應援】\n1. I test the sensor. (我測試感應器)\n   諧音：【愛 ｜ 泰斯特 ｜ 德 ｜ 山瑟】\n2. We tune the light. (我們調整光源)\n   諧音：【威 ｜ 吞 ｜ 德 ｜ 賴特】\n3. Check the C4 bump. (檢查覆晶錫球)\n   諧音：【卻克 ｜ 德 ｜ C4 ｜ 棒普】',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto flex flex-col h-[520px] backdrop-blur-md overflow-hidden text-slate-100 w-full shrink-strict litho-scanner-overlay litho-laser-line relative">
      
      {/* Compact Header */}
      <div className="px-3 py-2 sm:px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0">
            <Bot className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black text-slate-100 font-mono">
                AI 晶圓極速教練
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                線上中
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              專精無塵室維修對話、Error Code 報告與「國小拆解法」文法指導
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([{ id: 'welcome', role: 'assistant', content: '對話紀錄已重置！請問今天想練習什麼無塵室情境？', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])}
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all border border-slate-700/80 cursor-pointer"
          title="清空歷史紀錄"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
          <span>重置</span>
        </button>
      </div>

      {/* Mode Selector Tags */}
      <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-0.5">模式：</span>
        {COACH_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{mode.name}</span>
            </button>
          );
        })}
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-3 py-1 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] shrink-0">
        <span className="text-amber-400 font-extrabold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          快捷選題：
        </span>
        {CATEGORIZED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.text)}
            className="px-2.5 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-all border border-slate-700/70 hover:border-amber-400/50 cursor-pointer text-[11px]"
          >
            <span className="font-bold text-cyan-300 mr-1">{q.category}</span>
            <span>{q.text}</span>
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-start gap-2.5 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs shadow-md relative ${
                  msg.role === 'user'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/40'
                    : 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white ring-2 ring-cyan-400/40'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4 text-slate-950" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              <div
                className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed space-y-1.5 shadow-md break-words min-w-0 ${
                  msg.role === 'user'
                    ? 'bg-amber-400 text-slate-950 font-extrabold rounded-tr-none'
                    : 'bg-slate-950/90 border border-slate-800 text-slate-100 font-medium rounded-tl-none backdrop-blur-sm'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                <div className={`pt-1 flex items-center justify-between text-[10px] ${
                  msg.role === 'user' ? 'text-slate-800/80 border-t border-slate-900/20' : 'text-slate-500 border-t border-slate-800/80'
                }`}>
                  <span>{msg.timestamp}</span>

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                        title="複製回答內容"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? '已複製' : '複製'}</span>
                      </button>

                      <button
                        onClick={() => speakEnglish(msg.content.replace(/[\u4e00-\u9fa5]/g, ''), speechSpeed)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                        title="朗讀英文部分"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>朗讀</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md relative">
              <Bot className="w-4 h-4 animate-spin" />
              <span className="absolute -inset-1 rounded-lg border border-cyan-400/50 animate-ping pointer-events-none" />
            </div>
            <div className="bg-slate-950/90 border border-cyan-500/40 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-mono font-bold flex items-center gap-2 shadow-lg backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>AI 晶圓教練正在分析情境並撰寫解答中...</span>
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Compact Input Bar */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/95 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeMode === 'troubleshoot'
                ? '請輸入 Error Code 或異常現象 (例: Pump Overheat)...'
                : activeMode === 'handover'
                ? '請輸入欲交接內容 (例: 更換感應器並完成校正)...'
                : '詢問無塵室英文句子、文法拆解、台味諧音或情境問答...'
            }
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0 flex items-center gap-1 text-xs"
          >
            <span>發送</span>
            <Send className="w-3.5 h-3.5 text-slate-950" />
          </button>
        </form>
      </div>

    </div>
  );
};
