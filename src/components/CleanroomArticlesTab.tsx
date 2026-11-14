import React, { useState } from 'react';
import { Article, ArticleQuiz } from '../types';
import { PRESET_ARTICLES } from '../data/presetArticles';
import { Sparkles, BookOpen, Clock, Calendar, Volume2, CheckCircle2, XCircle, ArrowRight, Bookmark, Check, RefreshCw, Zap, ShieldCheck, FileText, Play, Pause, X } from 'lucide-react';
import { speakEnglish, cancelSpeech } from '../utils/speech';
import { playClickSound, playSuccessChime } from '../utils/audioEffects';
import { convertPhoneticToZhuyin } from '../utils/zhuyinHelper';
import { getMandarinPhoneticFromSentence } from '../utils/lessonSentenceHelper';
import { getSentenceKKPhonetic, getWordKKPhonetic } from '../utils/wordDictionary';
import { sanitizeTextToPublicSafe } from '../utils/pipSanitizer';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { InteractiveSentenceViewer } from './InteractiveSentenceViewer';

interface CleanroomArticlesTabProps {
  speechSpeed: number;
  readArticleIds: string[];
  onMarkArticleRead: (id: string) => void;
  bookmarkedArticleIds: string[];
  onToggleBookmarkArticle: (id: string) => void;
  autoArticles?: Article[];
}

export const CleanroomArticlesTab: React.FC<CleanroomArticlesTabProps> = ({
  speechSpeed,
  readArticleIds,
  onMarkArticleRead,
  bookmarkedArticleIds,
  onToggleBookmarkArticle,
  autoArticles
}) => {
  const mergedArticles = React.useMemo(() => {
    if (autoArticles && autoArticles.length > 0) {
      const newItems = autoArticles.filter(a => !PRESET_ARTICLES.some(p => p.id === a.id));
      return [...newItems, ...PRESET_ARTICLES];
    }
    return PRESET_ARTICLES;
  }, [autoArticles]);

  const [articles, setArticles] = useState<Article[]>(mergedArticles);

  React.useEffect(() => {
    setArticles(mergedArticles);
  }, [mergedArticles]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<Record<string, boolean>>({});
  const [hideRead, setHideRead] = useState<boolean>(false);
  const [isNarratingAll, setIsNarratingAll] = useState<boolean>(false);
  const [currentNarratingIdx, setCurrentNarratingIdx] = useState<number | null>(null);
  const [expandedSectionIdx, setExpandedSectionIdx] = useState<number | null>(null);
  const { showBookmarkToast } = useToast();

  const handleToggleNarrateAll = () => {
    if (isNarratingAll) {
      cancelSpeech();
      setIsNarratingAll(false);
      setCurrentNarratingIdx(null);
      return;
    }

    if (!activeArticle || !activeArticle.contentSections || activeArticle.contentSections.length === 0) return;

    setIsNarratingAll(true);
    let sectionIdx = 0;

    const playNext = () => {
      if (sectionIdx >= activeArticle.contentSections.length) {
        setIsNarratingAll(false);
        setCurrentNarratingIdx(null);
        return;
      }
      setCurrentNarratingIdx(sectionIdx);
      const text = activeArticle.contentSections[sectionIdx].englishText;
      speakEnglish(text, speechSpeed, () => {
        sectionIdx++;
        setTimeout(playNext, 600);
      });
    };

    playNext();
  };

  const categories = ['all', '週報導讀', '機台排除', '無塵室心法', '高頻交接', '晶圓趨勢'];

  const handleGenerateNewArticle = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          topicPrompt: '最新半導體無塵室設備工程實戰故障與極速對答案例'
        })
      });
      const data = await res.json();
      if (data && data.title) {
        const sanitizedArticle: Article = {
          ...data,
          title: sanitizeTextToPublicSafe(data.title, { stripEnglishParens: true }).text,
          summary: sanitizeTextToPublicSafe(data.summary || '', { stripEnglishParens: true }).text,
          contentSections: Array.isArray(data.contentSections)
            ? data.contentSections.map((sec: any) => ({
                ...sec,
                englishText: sanitizeTextToPublicSafe(sec.englishText || '').text,
                chineseTranslation: sanitizeTextToPublicSafe(sec.chineseTranslation || '', { stripEnglishParens: true }).text,
                svoBreakdown: sanitizeTextToPublicSafe(sec.svoBreakdown || '').text
              }))
            : [],
          keyVocab: Array.isArray(data.keyVocab)
            ? data.keyVocab.map((kv: any) => ({
                ...kv,
                word: sanitizeTextToPublicSafe(kv.word || '').text,
                translation: sanitizeTextToPublicSafe(kv.translation || '', { stripEnglishParens: true }).text
              }))
            : [],
          quizQuestions: Array.isArray(data.quizQuestions)
            ? data.quizQuestions.map((q: any) => ({
                ...q,
                question: sanitizeTextToPublicSafe(q.question || '', { stripEnglishParens: true }).text,
                explanation: sanitizeTextToPublicSafe(q.explanation || '', { stripEnglishParens: true }).text
              }))
            : []
        };
        setArticles((prev) => [sanitizedArticle, ...prev]);
        setActiveArticle(sanitizedArticle);
        onMarkArticleRead(sanitizedArticle.id);
      }
    } catch (err) {
      console.info("Notice generating article:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredArticles = articles.filter((art) => {
    const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
    const isRead = readArticleIds.includes(art.id);
    if (hideRead && isRead) return false;
    return matchesCat;
  });

  const handleAnswerQuiz = (quizId: string, optionIndex: number, correctIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [quizId]: optionIndex }));
    setQuizFeedback((prev) => ({ ...prev, [quizId]: optionIndex === correctIndex }));
  };

  return (
    <div className="space-y-2.5 max-w-6xl mx-auto animate-fade-in w-full min-w-0 pb-1.5">
      {/* Category Pills & Action Toolbar */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 shadow-md space-y-2 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = cat === 'all'
                ? articles.length
                : articles.filter((a) => a.category === cat).length;

              return (
                <button
                  key={cat}
                  onClick={() => {
                    playClickSound();
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-1 ring-amber-300'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat === 'all' ? '全部專題' : cat}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action buttons: AI Generate & Hide read */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => {
                playClickSound();
                handleGenerateNewArticle();
              }}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-60"
              title="即時生成最新半導體無塵室實戰專題長文"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'AI 撰寫中...' : 'AI 生成專題'}</span>
            </button>

            <button
              onClick={() => {
                playClickSound();
                setHideRead(!hideRead);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                hideRead
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{hideRead ? '✓ 已隱藏已讀' : '隱藏已讀'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Article List / Detail View Split or Modal */}
      {filteredArticles.length === 0 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-center space-y-2 shadow-sm backdrop-blur-sm">
          <BookOpen className="w-6 h-6 text-slate-500 mx-auto" />
          <h3 className="text-xs font-bold text-slate-200">此分類目前沒有未讀文章</h3>
          <p className="text-[11px] text-slate-400">可切換上方分類或取消「隱藏已讀」以瀏覽專題文章。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          <AnimatePresence>
            {filteredArticles.map((art) => {
              const isRead = readArticleIds.includes(art.id);
              const isBookmarked = bookmarkedArticleIds.includes(art.id);
              const isActive = activeArticle?.id === art.id;

              const getCategoryBadgeClass = (category: string) => {
                switch (category) {
                  case '機台排除':
                    return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
                  case '高頻交接':
                    return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
                  case '無塵室心法':
                    return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
                  case '週報導讀':
                    return 'bg-sky-950/80 text-sky-300 border-sky-700/60';
                  case '晶圓趨勢':
                    return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
                  default:
                    return 'bg-slate-800 text-cyan-300 border-slate-700';
                }
              };

              const formattedDate = (() => {
                if (!art.publishDate) return '2026 年最新晶圓指南';
                if (art.publishDate.includes('年') || art.publishDate.includes('週')) return art.publishDate;
                if (/^\d{4}-\d{2}-\d{2}/.test(art.publishDate)) return '2026 年最新晶圓指南';
                return art.publishDate;
              })();

              return (
                <motion.div
                  layout
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  key={art.id}
                  onClick={() => {
                    setActiveArticle(art);
                    onMarkArticleRead(art.id);
                  }}
                  className={`p-3 pb-0 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 relative overflow-hidden group shadow-sm ${
                    isActive
                      ? 'bg-slate-900 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                      : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/95 hover:shadow-cyan-950/20'
                  }`}
                >
                  {isRead && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700 text-[9px] font-black flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>已讀</span>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap pr-12">
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold ${getCategoryBadgeClass(art.category)}`}>
                        {art.category}
                      </span>
                      {art.id.startsWith('art-cycle-') && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black">
                          ⚡新更迭
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {art.readTime}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-black text-slate-100 leading-snug group-hover:text-cyan-300 transition-colors break-words">
                      {art.title}
                    </h3>

                    <p className="text-[11px] text-slate-300 leading-relaxed break-words">
                      {art.summary}
                    </p>
                  </div>

                  {/* Docked Card Footer (完全貼緊底邊) */}
                  <div className="-mx-3 -mb-0 mt-auto px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/80 rounded-b-xl flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="text-slate-400 break-words">{formattedDate}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform text-[10px]">閱讀全文 →</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          onToggleBookmarkArticle(art.id);
                          showBookmarkToast(!isBookmarked, art.title);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                        title={isBookmarked ? "取消收藏" : "加入收藏"}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Active Article Full View Modal Dialog */}
      <AnimatePresence>
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 pb-6 sm:pb-6 shadow-2xl space-y-4 max-w-3xl w-full max-h-[88vh] overflow-y-auto relative no-scrollbar"
            >
              {/* Modal Close Button */}
              <button
                onClick={() => {
                  cancelSpeech();
                  setIsNarratingAll(false);
                  setCurrentNarratingIdx(null);
                  setActiveArticle(null);
                }}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors z-10"
                title="關閉"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Article Header */}
              <div className="border-b border-slate-800 pb-3 space-y-2 pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-xs">
                    {activeArticle.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {activeArticle.publishDate}
                  </span>
                  <button
                    onClick={() => {
                      playClickSound();
                      const isCurrentlyBookmarked = bookmarkedArticleIds.includes(activeArticle.id);
                      onToggleBookmarkArticle(activeArticle.id);
                      showBookmarkToast(!isCurrentlyBookmarked, activeArticle.title);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Bookmark className={`w-3 h-3 ${bookmarkedArticleIds.includes(activeArticle.id) ? 'fill-amber-400' : ''}`} />
                    <span>{bookmarkedArticleIds.includes(activeArticle.id) ? '已收藏' : '收藏'}</span>
                  </button>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug break-words">
                  {activeArticle.title}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800 break-words">
                  {activeArticle.summary}
                </p>
              </div>

              {/* Content Sections with SVO & 台味雙軌諧音 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    實戰段落與 SVO 拆解
                  </h3>

                  {/* Continuous Audio Narration Button */}
                  <button
                    onClick={handleToggleNarrateAll}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all shadow-xs cursor-pointer border ${
                      isNarratingAll
                        ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/20'
                    }`}
                  >
                    {isNarratingAll ? (
                      <>
                        <Pause className="w-3 h-3" />
                        <span>停止朗讀</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>全文連播</span>
                      </>
                    )}
                  </button>
                </div>

                {activeArticle.contentSections.map((sec, idx) => {
                  const isBeingNarrated = currentNarratingIdx === idx;
                  const isSectionExpanded = expandedSectionIdx === idx;
                  const fallbackHomophone = getMandarinPhoneticFromSentence(sec.englishText).replace(/^【\s*|\s*】$/g, '').trim();
                  const cleanPhonetic = (sec.phonetic ? sec.phonetic.trim().replace(/^【\s*|\s*】$/g, '').trim() : '') || fallbackHomophone;
                  const zhuyinSec = cleanPhonetic ? convertPhoneticToZhuyin(cleanPhonetic).trim().replace(/^【\s*|\s*】$/g, '').trim() : '';
                  const kkSec = getSentenceKKPhonetic(sec.englishText);

                  return (
                    <div
                      key={sec.id || idx}
                      className={`border rounded-xl p-3 space-y-2 transition-all ${
                        isBeingNarrated
                          ? 'bg-indigo-950/70 border-cyan-400 ring-1 ring-cyan-400/40 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className={`text-xs sm:text-sm font-black font-mono transition-colors leading-relaxed break-words ${
                            isBeingNarrated ? 'text-cyan-300' : 'text-slate-100'
                          }`}>
                            {sec.englishText}
                          </div>
                          <div className="text-xs font-bold text-amber-300 break-words">
                            {sec.chineseTranslation}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setExpandedSectionIdx(isSectionExpanded ? null : idx)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer border ${
                              isSectionExpanded
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
                            }`}
                            title="展開零基礎逐字中文、KK音標、注音與諧音拆解"
                          >
                            {isSectionExpanded ? '收合拆解' : '🔍 逐字拆解'}
                          </button>
                          <button
                            onClick={() => speakEnglish(sec.englishText, 0.68)}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                            title="0.68x 慢速清晰朗讀"
                          >
                            🐢 慢讀
                          </button>
                          <button
                            onClick={() => speakEnglish(sec.englishText, speechSpeed)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer shrink-0 border border-slate-700 shadow-xs"
                            title="正常語速朗讀"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {cleanPhonetic && (
                        <div className="bg-slate-900/90 rounded-lg border border-slate-800 p-2 space-y-1 text-[11px]">
                          {kkSec && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-bold shrink-0">KK音標</span>
                              <span className="font-mono font-bold text-cyan-200 tracking-wider break-words flex-1">{kkSec}</span>
                            </div>
                          )}
                          {zhuyinSec && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-mono font-bold shrink-0">注音</span>
                              <span className="font-mono font-black text-amber-300 tracking-wider break-words flex-1">【 {zhuyinSec} 】</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold shrink-0">諧音</span>
                            <span className="font-sans font-bold text-emerald-300 tracking-wider break-words flex-1">【 {cleanPhonetic} 】</span>
                          </div>
                        </div>
                      )}

                      {sec.svoBreakdown && (
                        <div className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/50 break-words">
                          {sec.svoBreakdown}
                        </div>
                      )}

                      {isSectionExpanded && (
                        <div className="pt-1">
                          <InteractiveSentenceViewer
                            sentence={sec.englishText}
                            chinese={sec.chineseTranslation}
                            speechSpeed={speechSpeed}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Key Vocab Extraction */}
              {activeArticle.keyVocab && activeArticle.keyVocab.length > 0 && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                  <h4 className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    🔑 核心單字
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {activeArticle.keyVocab.map((v, i) => {
                      const rawHomophone = v.phonetic || getMandarinPhoneticFromSentence(v.word);
                      const vHomophone = rawHomophone.replace(/^【\s*|\s*】$/g, '').trim();
                      const vZhuyin = convertPhoneticToZhuyin(vHomophone).replace(/^【\s*|\s*】$/g, '').trim();
                      const vKK = getWordKKPhonetic(v.word);
                      return (
                        <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex-1 min-w-0 break-words">
                              <span className="font-black text-amber-300 font-mono text-xs">{v.word}</span>
                              <span className="text-slate-100 font-bold font-sans ml-1.5">{v.translation}</span>
                            </div>
                            <button
                              onClick={() => speakEnglish(v.word, speechSpeed)}
                              className="p-1 rounded bg-slate-800 text-cyan-400 hover:text-white cursor-pointer shrink-0"
                              title="聽單字發音"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono">
                            <span className="text-cyan-300">KK音標：{vKK}</span>
                            <span className="text-emerald-300">注音：【 {vZhuyin} 】</span>
                            <span className="text-amber-300">諧音：【 {vHomophone} 】</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Interactive Quiz Questions */}
              {activeArticle.quizQuestions && activeArticle.quizQuestions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    隨堂小試
                  </h4>

                  {activeArticle.quizQuestions.map((quiz) => {
                    const userAns = quizAnswers[quiz.id];
                    const isCorrect = quizFeedback[quiz.id];

                    return (
                      <div key={quiz.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                        <p className="text-xs font-bold text-slate-100">
                          {quiz.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {quiz.options.map((opt, oIdx) => {
                            const isSelected = userAns === oIdx;
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleAnswerQuiz(quiz.id, oIdx, quiz.correctAnswerIndex)}
                                className={`p-1.5 rounded-md text-xs font-bold text-left transition-all cursor-pointer border ${
                                  isSelected
                                    ? isCorrect
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                                      : 'bg-rose-950 border-rose-500 text-rose-200'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {userAns !== undefined && (
                          <div className={`p-1.5 rounded-md text-[10px] font-bold ${
                            isCorrect ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                          }`}>
                            {isCorrect ? '🎉 正確！' : '❌ 再試試～'} {quiz.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
