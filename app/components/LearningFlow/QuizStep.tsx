'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, XCircle, RotateCcw, RefreshCw } from 'lucide-react'
import MarkdownRenderer from '../MarkdownRenderer'

interface Question {
  id: number
  question: string
  type: 'multiple_choice' | 'short_answer' | 'essay'
  options?: string[]
  correctAnswer?: string
  points: number
}

import { MOCK_QUESTIONS_DATABASE } from '../../data/mockQuestions';

const questionRequestCache = new Map<string, Promise<Question[]>>()
const LOADING_MESSAGES = [
  '提取核心概念',
  '生成两道选择题',
  '生成一道主动回忆题',
  '检查答案与题目格式',
] as const

// 纯API驱动的题目生成 - 不再使用固定模板
const generateQuestionsFromAPI = async (
  content: string, 
  topic?: string, 
  region?: string, 
  grade?: string, 
  subject?: string, 
  semester?: string, 
  topicId?: string,
  onProgress?: (chunk: string) => void,
  skipMock: boolean = false
): Promise<Question[]> => {
  console.log('=== 开始API驱动题目生成 ===')
  console.log('主题:', topic, '跳过Mock:', skipMock)
  
  // 1. 尝试从 Mock 数据库获取题目 (优先topicId，其次名称包含)
  if (!skipMock) {
    if (topicId) {
      const byId = MOCK_QUESTIONS_DATABASE.find(m => m.topicId === topicId)
      if (byId) {
        console.log('>>> 命中 Mock 题库（topicId），秒级返回 <<<')
        await new Promise(resolve => setTimeout(resolve, 300))
        return byId.questions
      }
    }
    if (topic) {
      const byName = MOCK_QUESTIONS_DATABASE.find(m => topic.includes(m.topicId))
      if (byName) {
        console.log('>>> 命中 Mock 题库（名称包含），秒级返回 <<<')
        await new Promise(resolve => setTimeout(resolve, 300))
        return byName.questions
      }
    }
  }

  if ((!content || content.trim().length === 0) && !topic) {
    throw new Error('学习内容和主题不能同时为空')
  }

  try {
      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 25000)
      
      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purpose: 'quiz',
          max_tokens: 900,
          temperature: 0.2,
          response_format: 'json_object',
          messages: [
            {
              role: 'system',
              content: `你是命题专家。只返回 JSON 对象，不要 Markdown。生成恰好 3 道题：2 道选择题、1 道简答题。题目紧扣主题且互不重复；选择题必须有 4 个短选项。每题解析不超过 80 个汉字，只说明考点、正确原因和一个易错点。字段固定为 id、question、type、options、correctAnswer、explanation、points；type 只能是 multiple_choice 或 short_answer。`
            },
            {
              role: 'user',
              content: `主题：${topic || '未指定'}\n领域：${subject || '通用'}\n水平：${grade || '未指定'}\n材料摘要：${content.slice(0, 2200)}\n\n输出格式：{"questions":[{"id":1,"question":"...","type":"multiple_choice","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"...","points":10}]}`
            }
          ]
        }),
        signal: controller.signal
      })

      // 清除超时定时器
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败: ${response.status} ${response.statusText}\n详细信息: ${errorText}`)
      }

      const data = await response.json()
      const fullContent = String(data.content || '')
      onProgress?.(fullContent)

    console.log('API完整响应长度:', fullContent.length)

    // 解析JSON响应
    let questionsData
    try {
      // 尝试直接解析
      questionsData = JSON.parse(fullContent)
    } catch (e) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error(`无法解析API返回的JSON格式\n原始响应: ${fullContent}`)
      }
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      throw new Error(`API返回的数据格式错误：缺少questions数组\n返回数据: ${JSON.stringify(questionsData)}`)
    }

    const questions = questionsData.questions

    // 验证题目格式
     for (let i = 0; i < questions.length; i++) {
       const q: any = questions[i]
       if (!q.id || !q.question || !q.type || !q.points) {
         throw new Error(`第${i+1}道题目格式错误：缺少必要字段\n题目数据: ${JSON.stringify(q)}`)
       }
       
       // 将fill_in_blank类型转换为short_answer类型
       if (q.type === 'fill_in_blank') {
         q.type = 'short_answer'
       }
       
       if (!['multiple_choice', 'short_answer', 'essay'].includes(q.type)) {
         throw new Error(`第${i+1}道题目类型错误：${q.type}，支持的类型：multiple_choice, short_answer, essay`)
       }

       if (q.type === 'multiple_choice' && (!q.options || !Array.isArray(q.options) || q.options.length !== 4)) {
         throw new Error(`第${i+1}道选择题缺少4个选项\n题目数据: ${JSON.stringify(q)}`)
       }
     }

     console.log('=== API题目生成成功 ===')
     return questions

  } catch (error) {
    console.error('=== API题目生成失败 ===')
    console.error('错误详情:', error)
    
    // 处理超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('题目生成超过 25 秒，请重试')
    }
    
    throw error
  }
}

interface QuizStepProps {
  knowledgeContent: string
  region?: string
  grade?: string
  semester?: string
  subject?: string
  topic?: string
  topicId?: string
  onComplete: (results: { answers: string[], questions: Question[], score: number }) => void
  onBack: () => void
}

export default function QuizStep({ knowledgeContent, region, grade, semester, subject, topic, topicId, onComplete, onBack }: QuizStepProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [generationElapsed, setGenerationElapsed] = useState(0)
  const [generationError, setGenerationError] = useState('')
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // 计时器
  useEffect(() => {
    if (!isLoading && !isCompleted) {
      const timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isLoading, isCompleted])

  // 生成题目
  const generateQuestions = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setGenerationElapsed(0)
      setGenerationError('')
      console.log('=== 开始生成题目 ===', { forceRefresh })
      
      // 优先命中缓存，命中则秒回（除非强制刷新）
      if (!forceRefresh) {
        try {
          const cacheKey = `diagnose:${grade || ''}|${semester || ''}|${subject || ''}|${topicId || ''}|${topic || ''}`
          if (typeof window !== 'undefined') {
            const cached = sessionStorage.getItem(cacheKey)
            if (cached) {
              const parsed = JSON.parse(cached) as Question[]
              if (Array.isArray(parsed) && parsed.length > 0) {
                setQuestions(parsed)
                setAnswers(new Array(parsed.length).fill(''))
                setIsLoading(false)
                console.log('命中题目缓存，直接使用')
                return
              }
            }
          }
        } catch {}
      }
      
      // 验证学习内容
      if ((!knowledgeContent || knowledgeContent.trim().length === 0) && !topic) {
        const errorMsg = '学习内容和主题不能同时为空'
        console.error(errorMsg)
        throw new Error(errorMsg)
      }
      
      const requestKey = [knowledgeContent.slice(0, 500), topic, region, grade, subject, semester, topicId].join('|')
      let request = forceRefresh ? undefined : questionRequestCache.get(requestKey)
      if (!request) {
        request = generateQuestionsFromAPI(
          knowledgeContent,
          topic,
          region,
          grade,
          subject,
          semester,
          topicId,
          undefined,
          forceRefresh,
        )
        questionRequestCache.set(requestKey, request)
        void request.then(
          () => questionRequestCache.delete(requestKey),
          () => questionRequestCache.delete(requestKey),
        )
      }
      const questions = await request
      
      console.log('=== 题目生成成功 ===')
      console.log('生成题目数量:', questions.length)
      
      setQuestions(questions)
      setAnswers(new Array(questions.length).fill(''))
      try {
        const cacheKey = `diagnose:${grade || ''}|${semester || ''}|${subject || ''}|${topicId || ''}|${topic || ''}`
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(cacheKey, JSON.stringify(questions))
        }
      } catch {}
    } catch (error) {
      console.error('=== 题目生成失败 ===')
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      setGenerationError(errorMessage)
      setQuestions([])
      setAnswers([])
    } finally {
      setIsLoading(false)
    }
  }, [grade, knowledgeContent, region, semester, subject, topic, topicId])

  useEffect(() => {
    void generateQuestions()
  }, [generateQuestions])

  useEffect(() => {
    if (!isLoading) return
    const timer = window.setInterval(() => setGenerationElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isLoading])

  // 处理提交单题
  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  }

  const handleComplete = () => {
    setIsCompleted(true);
    
    // 计算得分
    let totalScore = 0;
    let maxScore = 0;
    
    questions.forEach((q, index) => {
      maxScore += q.points;
      if (q.type === 'multiple_choice') {
        const userAnswer = answers[index]?.charAt(0).toUpperCase();
        const correctAnswer = q.correctAnswer?.charAt(0).toUpperCase();
        if (userAnswer === correctAnswer) {
          totalScore += q.points;
        }
      } else {
        if (answers[index]?.trim()) {
           totalScore += q.points * 0.5; 
        }
      }
    });

    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    onComplete({
      answers,
      questions,
      score: finalScore
    });
  }

  // Loading Steps State
  const [loadingStep, setLoadingStep] = useState(0)
  // Cycle through loading messages
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % LOADING_MESSAGES.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 max-w-2xl mx-auto">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-[1px] border-white/10 rounded-full animate-spin"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-[1px] border-[var(--accent)] rounded-full animate-spin border-t-transparent shadow-[0_0_15px_rgba(10,132,255,0.4)]"></div>
          <BookOpen className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[var(--accent)] w-8 h-8" />
        </div>
        
        <h3 className="text-xl font-medium text-highlight mb-2 tracking-tight">正在生成 3 道诊断题</h3>
        <p className="mb-4 text-xs text-text-secondary">已用时 {generationElapsed} 秒，通常 3—8 秒完成</p>
        
        <div className="h-8 overflow-hidden relative w-full text-center">
          <AnimatePresence mode='wait'>
            <motion.p
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-text-secondary font-light"
            >
              {LOADING_MESSAGES[loadingStep]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex gap-2">
          {[0, 1, 2, 3].map((step) => (
            <div 
              key={step}
              className={`h-[2px] rounded-full transition-all duration-500 ${
                step === loadingStep ? 'w-8 bg-[var(--accent)]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  // 安全检查：如果没有生成题目，显示重试界面，防止崩溃
  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-highlight mb-2">题目生成失败</h3>
        <p className="text-text-secondary mb-6 max-w-md text-center font-light">{generationError || 'AI 服务暂时不可用，请重试。'}</p>
        <button 
          onClick={() => generateQuestions(true)}
          className="apple-btn flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重新生成
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* 进度条 */}
      <div className="mb-8">
        <div className="flex justify-between items-center text-sm text-text-secondary mb-2">
          <div className="flex items-center gap-4 font-medium tracking-wide">
            <span>Step {currentQuestionIndex + 1}/{questions.length}</span>
            <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
          </div>
          <button 
            onClick={() => generateQuestions(true)}
            className="flex items-center gap-1.5 text-[var(--accent)] hover:text-white hover:bg-white/5 px-2.5 py-1.5 rounded-md transition-all duration-200 text-xs font-medium"
            title="Regenerate Quiz"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[var(--accent)] shadow-[0_0_10px_rgba(10,132,255,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* 题目卡片 - 采用 Apple Glass 风格 */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="apple-glass p-6 md:p-10 min-h-[400px] flex flex-col relative overflow-hidden"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[var(--accent)] rounded-full blur-[100px] opacity-10 pointer-events-none" />

          <div className="flex items-start gap-4 mb-8">
            <span className="flex-shrink-0 px-3 py-1 bg-white/5 border border-white/10 text-[var(--accent)] rounded-full text-xs font-semibold tracking-wider uppercase">
              {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 
               currentQuestion.type === 'short_answer' ? 'Short Answer' : 'Essay'}
            </span>
            <span className="text-sm text-text-secondary mt-1 font-medium">{currentQuestion.points} pts</span>
          </div>

          <div className="text-xl md:text-2xl font-medium text-highlight leading-relaxed mb-10 flex items-start gap-3">
            <span className="flex-shrink-0 text-text-secondary">{currentQuestionIndex + 1}.</span>
            <div className="flex-1 overflow-x-auto">
              <MarkdownRenderer
                content={currentQuestion.question}
                fontSize="lg"
                className="!text-xl md:!text-2xl !prose-p:my-2 !prose-h1:mt-4 !prose-h2:mt-4 !prose-h3:mt-3"
              />
            </div>
          </div>

          <div className="flex-1">
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestionIndex] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(option)}
                      className={`apple-list-item w-full text-left border-[0.5px] flex items-center gap-4 group ${
                        isSelected 
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_rgba(10,132,255,0.15)]' 
                          : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center border-[1px] text-sm font-medium transition-colors duration-200 ${
                        isSelected ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_0_10px_rgba(10,132,255,0.4)]' : 'border-white/20 text-text-secondary group-hover:border-white/40 group-hover:text-highlight'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div className="text-lg flex-1 text-highlight">
                        <MarkdownRenderer
                          content={option.replace(/^[A-D][\.\、\s]*/, '')}
                          fontSize="sm"
                          className="!text-lg !prose-p:my-0 !prose-p:leading-snug"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[currentQuestionIndex]}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                placeholder="Type your answer here..."
                className="apple-input w-full h-40 resize-none text-lg font-light leading-relaxed placeholder:text-white/20"
              />
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
             <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="apple-btn-secondary bg-transparent border-transparent hover:bg-white/5 px-6 py-2.5 text-text-secondary hover:text-highlight disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
            >
              Previous
            </button>
            
            <button
              onClick={handleNext}
              disabled={!answers[currentQuestionIndex]}
              className="apple-btn px-8 py-3 text-base"
            >
              {currentQuestionIndex === questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
