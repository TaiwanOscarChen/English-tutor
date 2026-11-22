import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bot, User, Send, Volume2, Sparkles, RefreshCw, Copy, Check, Wrench, FileText, Cpu, Wand2 } from 'lucide-react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
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
  onDecomposePhrase?: (sentence: string) => void;
}

const CHAT_STORAGE_KEY = 'fse_ai_tutor_messages';
const MAX_STORED_MESSAGES = 40;

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

function createWelcomeMessage(): Message {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      '你好！我是你的 1-on-1 FSE 晶圓級英文教練。\n\n無論你在無塵室遇到機台異常排除、PM 保養交接，或是想把英文句子用「國小拆解 ✕ 台味諧音」輕鬆學會，隨時點擊上方快捷選題或直接提問！',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

function loadPersistedMessages(): Message[] {
  if (typeof window === 'undefined') return [createWelcomeMessage()];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [createWelcomeMessage()];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_STORED_MESSAGES)
        .map((m) => ({
          id: String(m.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
          role: m.role as 'user' | 'assistant',
          content: sanitizeTextToPublicSafe(m.content).text || m.content,
          timestamp: typeof m.timestamp === 'string' ? m.timestamp : undefined
        }));
      if (valid.length > 0) return valid;
    }
  } catch {}
  return [createWelcomeMessage()];
}

function extractEnglishSentences(content: string): string[] {
  const candidates = new Set<string>();
  const quotePattern = /[「"']([A-Za-z][A-Za-z0-9\s,'\-]{4,70}[.!?]?)[」"']/g;
  let match: RegExpExecArray | null;
  while ((match = quotePattern.exec(content)) !== null) {
    const phrase = match[1].trim();
    if (phrase.split(/\s+/).length >= 3) {
      candidates.add(phrase.replace(/[.,!?]+$/, '') + '.');
    }
  }

  const linePattern = /(?:^|\n)\s*(?:\d+\.|[-*•])\s*([A-Z][A-Za-z0-9\s,'\-]{5,70}[.!?])/g;
  while ((match = linePattern.exec(content)) !== null) {
    const phrase = match[1].trim();
    if (phrase.split(/\s+/).length >= 3) {
      candidates.add(phrase);
    }
  }

  return Array.from(candidates).slice(0, 4);
}

function renderFormattedInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-black text-amber-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-800/90 text-cyan-300 font-mono text-[0.9em]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderStructuredContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  return (
    <div className="space-y-1.5 break-words">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trimEnd();
        if (!line.trim()) {
          return <div key={idx} className="h-1" />;
        }
        if (line.startsWith('### ') || line.startsWith('## ')) {
          const title = line.replace(/^#{2,3}\s+/, '');
          return (
            <div key={idx} className="font-black text-cyan-300 text-xs sm:text-sm pt-1">
              {renderFormattedInline(title)}
            </div>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <div
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100/95"
            >
              {renderFormattedInline(line.slice(2))}
            </div>
          );
        }
        if (/^\s*[-*•]\s+/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-cyan-400 font-bold select-none">•</span>
              <span className="flex-1">{renderFormattedInline(line.replace(/^\s*[-*•]\s+/, ''))}</span>
            </div>
          );
        }
        if (/^\s*\d+\.\s+/.test(line)) {
          const numMatch = line.match(/^\s*(\d+\.)\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-amber-300 font-mono font-bold shrink-0 tabular-nums">{numMatch[1]}</span>
                <span className="flex-1">{renderFormattedInline(numMatch[2])}</span>
              </div>
            );
          }
        }
        return <div key={idx}>{renderFormattedInline(line)}</div>;
      })}
    </div>
  );
}

export const AiTutorChat: React.FC<AiTutorChatProps> = ({ speechSpeed, onDecomposePhrase }) => {
  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fallbackAbortRef = useRef<AbortController | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (fallbackTimeoutRef.current !== null) {
        window.clearTimeout(fallbackTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
      fallbackAbortRef.current?.abort();
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customQuestion?: string) => {
    const rawInput = customQuestion || input.trim();
    if (!rawInput || isLoading) return;

    const safeQuestion = sanitizeTextToPublicSafe(rawInput).text || rawInput;
    const currentModeObj = COACH_MODES.find((m) => m.id === activeMode);
    const questionText =
      currentModeObj?.promptPrefix && !customQuestion
        ? `${currentModeObj.promptPrefix}${safeQuestion}`
        : safeQuestion;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: safeQuestion,
      timestamp: nowTime
    };

    const assistantMsgId = 'a-' + (Date.now() + 1);
    const historyPayload = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantMsgId, role: 'assistant', content: '', timestamp: nowTime }
    ]);
    setStreamingMsgId(assistantMsgId);
    if (!customQuestion) setInput('');
    setIsLoading(true);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 16000);

    try {
      const streamRes = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          userQuestion: questionText
        }),
        signal: controller.signal
      });

      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Stream unavailable (${streamRes.status})`);
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let sseBuffer = '';
      let accumulated = '';
      let finalized = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });

        const blocks = sseBuffer.split('\n\n');
        sseBuffer = blocks.pop() || '';

        for (const block of blocks) {
          const lines = block.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;
            try {
              const evt = JSON.parse(jsonStr);
              if (typeof evt.delta === 'string' && evt.delta.length > 0) {
                accumulated += evt.delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
                );
              }
              if (evt.done) {
                finalized = true;
                const cleanFinal = sanitizeTextToPublicSafe(
                  evt.sanitizedFull || accumulated || '建議使用極簡 4 字 SVO 句型：「I test the sensor.」（我測試感應器）。'
                ).text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: cleanFinal } : m))
                );
              }
            } catch {}
          }
        }
      }

      if (!finalized && accumulated.trim().length > 0) {
        const cleanFinal = sanitizeTextToPublicSafe(accumulated).text;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: cleanFinal } : m))
        );
      } else if (!finalized && !accumulated.trim()) {
        throw new Error('Empty stream response');
      }
    } catch {
      if (!isMountedRef.current || controller.signal.aborted) return;
      try {
        fallbackAbortRef.current?.abort();
        const fallbackCtrl = new AbortController();
        fallbackAbortRef.current = fallbackCtrl;
        if (fallbackTimeoutRef.current !== null) {
          window.clearTimeout(fallbackTimeoutRef.current);
        }
        fallbackTimeoutRef.current = window.setTimeout(() => fallbackCtrl.abort(), 9000);
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyPayload,
            userQuestion: questionText
          }),
          signal: fallbackCtrl.signal
        });
        if (fallbackTimeoutRef.current !== null) {
          window.clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        const data = await res.json();
        if (!isMountedRef.current || fallbackCtrl.signal.aborted) return;
        const cleanReply = sanitizeTextToPublicSafe(
          data.reply || '建議使用極簡 4 字 SVO 句型：「I test the sensor.」（我測試感應器）或「We tune the light.」（我們調整光源）。'
        ).text;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: cleanReply } : m))
        );
      } catch {
        if (!isMountedRef.current || fallbackAbortRef.current?.signal.aborted) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    '【離線極簡教學應援】\n1. "I test the sensor." (我測試感應器)\n   諧音：【愛 ｜ 泰斯特 ｜ 德 ｜ 山瑟】\n2. "We tune the light." (我們調整光源)\n   諧音：【威 ｜ 吞 ｜ 德 ｜ 賴特】\n3. "Check the C4 bump." (檢查覆晶錫球)\n   諧音：【卻克 ｜ 德 ｜ C4 ｜ 棒普】'
                }
              : m
          )
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setIsLoading(false);
        setStreamingMsgId(null);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      setCopiedId(id);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {}
  };

  const handleResetChat = () => {
    abortControllerRef.current?.abort();
    fallbackAbortRef.current?.abort();
    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setIsLoading(false);
    setStreamingMsgId(null);
    const resetMsg: Message = {
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: '對話紀錄已重置！請問今天想練習什麼無塵室情境？',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([resetMsg]);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([resetMsg]));
    } catch {}
  };

  const modeCountLabel = useMemo(
    () => `已對話 ${Math.max(0, messages.filter((m) => m.role === 'user').length)} 輪`,
    [messages]
  );

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl max-w-4xl mx-auto flex flex-col h-[540px] backdrop-blur-md overflow-hidden text-slate-100 w-full shrink-strict litho-scanner-overlay litho-laser-line relative">
      {/* Compact Header */}
      <div className="px-3 py-2 sm:px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-400 rounded-xl text-slate-950 font-black shadow-sm shrink-0">
            <Bot className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-slate-100 font-mono">
                AI 晶圓極速教練
              </h2>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                · {streamingMsgId ? '即時串流輸出中' : modeCountLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              即時串流解析無塵室維修對話、Error Code 報告與「國小拆解法」
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all border border-slate-700/80 cursor-pointer"
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
              type="button"
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
      <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] shrink-0">
        <span className="text-amber-400 font-extrabold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          快捷選題：
        </span>
        {CATEGORIZED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q.text)}
            disabled={isLoading}
            className="px-2.5 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-all border border-slate-700/70 hover:border-amber-400/50 cursor-pointer text-[11px] disabled:opacity-50"
          >
            <span className="font-bold text-cyan-300 mr-1">{q.category}</span>
            <span>{q.text}</span>
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isCurrentlyStreaming = streamingMsgId === msg.id;
            const extractedPhrases =
              msg.role === 'assistant' && !isCurrentlyStreaming && msg.content
                ? extractEnglishSentences(msg.content)
                : [];

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
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
                  className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed space-y-2 shadow-md break-words min-w-0 ${
                    msg.role === 'user'
                      ? 'bg-amber-400 text-slate-950 font-extrabold rounded-tr-none'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-100 font-medium rounded-tl-none backdrop-blur-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  ) : msg.content ? (
                    <div>
                      {renderStructuredContent(msg.content)}
                      {isCurrentlyStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 align-middle bg-cyan-400" />
                      )}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-cyan-300">
                      正在連線晶圓教練並即時生成回覆...
                    </div>
                  )}

                  {/* Extracted English Phrase Practice Chips */}
                  {extractedPhrases.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-800/70 flex flex-wrap items-center gap-1.5">
                      {extractedPhrases.map((phrase, pIdx) => (
                        <div
                          key={pIdx}
                          className="inline-flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] max-w-full"
                        >
                          <span className="font-mono font-bold text-cyan-200 truncate max-w-[180px] sm:max-w-[240px]">
                            {phrase}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakEnglish(phrase, speechSpeed)}
                            className="p-0.5 text-cyan-400 hover:text-cyan-200 cursor-pointer shrink-0"
                            title={`原速朗讀「${phrase}」`}
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => speakEnglish(phrase, 0.7)}
                            className="px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-[10px] cursor-pointer shrink-0 tabular-nums"
                            title={`0.7x 慢速朗讀「${phrase}」`}
                          >
                            0.7x
                          </button>
                          {onDecomposePhrase && (
                            <button
                              type="button"
                              onClick={() => onDecomposePhrase(phrase)}
                              className="px-1.5 py-0.5 rounded bg-amber-400/15 hover:bg-amber-400/30 text-amber-300 font-bold flex items-center gap-0.5 cursor-pointer shrink-0"
                              title={`將「${phrase}」送入 SVO 拆解器`}
                            >
                              <Wand2 className="w-2.5 h-2.5" />
                              <span>拆解</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`pt-1 flex items-center justify-between text-[10px] tabular-nums ${
                      msg.role === 'user'
                        ? 'text-slate-800/80 border-t border-slate-900/20'
                        : 'text-slate-500 border-t border-slate-800/80'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {msg.role === 'assistant' && msg.content && !isCurrentlyStreaming && (
                      <div className="flex items-center gap-2.5">
                        {msg.id === messages[messages.length - 1]?.id &&
                          messages.some((m) => m.role === 'user') && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                              if (lastUser?.content) handleSend(lastUser.content);
                            }}
                            className="text-amber-300 hover:text-amber-200 flex items-center gap-0.5 font-bold cursor-pointer transition-colors disabled:opacity-50"
                            title="重新生成上一題回覆"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>重試</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="text-slate-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer transition-colors"
                          title="複製回答內容"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === msg.id ? '已複製' : '複製'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            speakEnglish(msg.content.replace(/[\u4e00-\u9fa5]/g, ''), speechSpeed)
                          }
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
            );
          })}
        </AnimatePresence>

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
