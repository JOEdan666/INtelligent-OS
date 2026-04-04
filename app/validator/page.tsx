'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BrainCircuit, Activity, Target, Network, ArrowRight, ExternalLink, ShieldAlert, Zap, Send, Users, AlertTriangle, Lightbulb, Wallet } from 'lucide-react'
import MarkdownRenderer from '../components/MarkdownRenderer'

interface Persona {
  persona: string
  scenario: string
  painPoint: string
}

interface Competitor {
  name: string
  url: string
  advantage: string
  blindSpot: string
}

interface VoiceOfCustomer {
  quote: string
  source: string
}

interface Monetization {
  strategy: string
  reasoning: string
}

interface First10UserChannel {
  channel: string
  tactic: string
}

interface Report {
  score: number
  verdict: string
  targetPersonas: Persona[]
  competitors: Competitor[]
  voiceOfCustomer: VoiceOfCustomer[]
  monetization: Monetization
  actionableAdvice: string[]
  first10Users: First10UserChannel[]
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function ValidatorPage() {
  const [idea, setIdea] = useState('')
  const [phase, setPhase] = useState<'input' | 'clarify' | 'analyzing' | 'report'>('input')
  const [report, setReport] = useState<Report | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)

  // Clarification Chat State
  const [clarifyMessages, setClarifyMessages] = useState<ChatMessage[]>([])
  const [clarifyInput, setClarifyInput] = useState('')
  const [isClarifying, setIsClarifying] = useState(false)
  const clarifyEndRef = useRef<HTMLDivElement>(null)

  // Report Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadingMessages = [
    "提取核心关键词，构建商业分析模型...",
    "扫描 ProductHunt、GitHub 与主流聚合站...",
    "分析目标用户画像与真实吐槽原话...",
    "生成冷启动 10 人获客方案...",
    "正在生成残酷真相与 Pivot 建议..."
  ]

  useEffect(() => {
    if (phase === 'analyzing') {
      const interval = setInterval(() => {
        setLoadingStep((prev) => Math.min(prev + 1, loadingMessages.length - 1))
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [phase])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    clarifyEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [clarifyMessages])

  const handleStartClarification = async () => {
    if (!idea.trim()) return
    setPhase('clarify')
    
    const initialMessage: ChatMessage = { role: 'user', content: idea }
    setClarifyMessages([initialMessage])
    setIsClarifying(true)

    try {
      const response = await fetch('/api/validator/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [initialMessage] }),
      })

      if (!response.ok) throw new Error('Clarify API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ''
      setClarifyMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage += chunk
          
          setClarifyMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1].content = assistantMessage
            return updated
          })
        }
      }
    } catch (error) {
      console.error(error)
      setPhase('input')
      alert("网络错误，请重试。")
    } finally {
      setIsClarifying(false)
    }
  }

  const handleClarifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clarifyInput.trim() || isClarifying) return

    const userMessage: ChatMessage = { role: 'user', content: clarifyInput }
    const newMessages = [...clarifyMessages, userMessage]
    setClarifyMessages(newMessages)
    setClarifyInput('')
    setIsClarifying(true)

    try {
      const response = await fetch('/api/validator/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) throw new Error('Clarify API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ''
      setClarifyMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage += chunk
          
          setClarifyMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1].content = assistantMessage
            return updated
          })
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsClarifying(false)
    }
  }

  const handleAnalyze = async () => {
    // Combine the entire clarification chat history into a single detailed idea string
    const refinedIdeaContext = clarifyMessages.map(m => `${m.role === 'user' ? '用户' : '顾问'}: ${m.content}`).join('\n\n')
    const finalIdeaToAnalyze = refinedIdeaContext || idea

    setPhase('analyzing')
    setReport(null)
    setLoadingStep(0)
    setMessages([])

    try {
      const res = await fetch('/api/validator/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: finalIdeaToAnalyze })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze')
      }
      
      setReport(data)
      setPhase('report')
      
      setMessages([
        {
          role: 'system',
          content: `你是一位极其专业、客观且具有同理心的硅谷资深产品战略顾问。你刚刚给用户生成了一份产品Idea的商业可行性报告。
用户的原始Idea是: ${idea}
生成的报告数据如下: ${JSON.stringify(data)}

接下来的对话中，请基于上述报告和你的专业知识回答用户的问题。
**核心沟通原则：**
1. **不要嘲讽，不要毒舌。** 创业者都很脆弱且充满热情，你要做的是“温柔但坚定地指出客观事实”。
2. **提供建设性方案。** 如果用户的想法在当前市场走不通，请务必给出 1-2 个具体的、稍微转个弯（Pivot）就能做的小众场景或细分市场。
3. **数据支撑逻辑。** 分析时尽量用客观规律（如获客成本、开发周期、竞争壁垒）来解释，而不是简单地说“你不行”。
4. **全中文回复，排版清晰（适当使用加粗和列表）。**`
        },
        {
          role: 'assistant',
          content: '报告已生成。作为你的商业顾问，我必须客观地告诉你：任何市场都有机会，关键在于切入点的选择。关于这份报告中的竞品分析、商业化路径或转型建议，你有什么想和我深入探讨的吗？'
        }
      ])
    } catch (error) {
      console.error(error)
      alert("分析失败，请重试或检查 API 配置。")
      setPhase('input')
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentInput.trim() || isChatting) return

    const userMessage: ChatMessage = { role: 'user', content: currentInput }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setCurrentInput('')
    setIsChatting(true)

    try {
      const response = await fetch('/api/validator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!response.ok) throw new Error('Chat API error')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ''
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage += chunk
          
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1].content = assistantMessage
            return updated
          })
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsChatting(false)
    }
  }

  // --- Score Color logic ---
  const getScoreColor = (score: number) => {
    if (score < 4) return 'text-red-500 bg-red-500/10 border-red-500/20'
    if (score < 7) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  }
  const getScoreLabel = (score: number) => {
    if (score < 4) return '极度红海 (红灯)'
    if (score < 7) return '竞争激烈 (黄灯)'
    return '蓝海市场 (绿灯)'
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans pb-32">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-main)]/70 border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[var(--highlight)]">
            <Target className="w-6 h-6 text-[var(--accent)]" />
            学伴 <span className="font-light text-[var(--text-secondary)]">| Idea 验证器</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16">
        
        {/* Phase 1: Initial Input */}
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div
              key="input-large"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, height: 0, overflow: 'hidden' }}
              className="py-20 text-center"
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[var(--highlight)] mb-6">
                电梯演讲粉碎机<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">3分钟生存挑战。</span>
              </h1>
              <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto font-light">
                你以为你的 Idea 能改变世界？在这里，你将面对极其刻薄的硅谷风投拷问。挺过 3 分钟，或者拿到一份“你为什么会死”的尸检报告。
              </p>
              
              <div className="relative max-w-3xl mx-auto group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                <div className="relative bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 shadow-2xl flex flex-col">
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="描述你的‘伟大’想法... 哪怕只有几个字也可以，比如：我想做一个给独立开发者的记账工具。"
                    className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] p-4 text-lg outline-none resize-none min-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleStartClarification()
                      }
                    }}
                  />
                  <div className="flex justify-between items-center px-4 pb-2">
                    <span className="text-xs text-[var(--text-secondary)]">按 Cmd + Enter 快速提交</span>
                    <button
                      onClick={handleStartClarification}
                      disabled={!idea.trim()}
                      className="apple-btn px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white border-none"
                    >
                      <BrainCircuit className="w-4 h-4" />
                      开始接受拷问
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2: Clarification Chat */}
        <AnimatePresence>
          {phase === 'clarify' && (
            <motion.div
              key="clarify"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="apple-glass flex flex-col h-[600px] shadow-2xl border border-[var(--border-color)] mb-10"
            >
              <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-md rounded-t-xl flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-red-500 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-red-500" />
                    风险投资人在线拷问中...
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-light">说服我，或者马上放弃。</p>
                </div>
                <button
                  onClick={handleAnalyze}
                  className="apple-btn flex items-center gap-2 text-sm px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                >
                  <Target className="w-4 h-4" />
                  我投降，给我尸检报告
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-main)]/30">
                {clarifyMessages.filter(m => m.role !== 'system').map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--accent)] text-white rounded-tr-sm' 
                        : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-sm'
                    }`}>
                      <MarkdownRenderer 
                        content={msg.content} 
                        fontSize="sm" 
                        className={msg.role === 'user' ? '!text-white !prose-p:text-white !prose-strong:text-white' : ''} 
                      />
                    </div>
                  </div>
                ))}
                {isClarifying && clarifyMessages[clarifyMessages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 h-12 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={clarifyEndRef} />
              </div>

              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-md rounded-b-xl">
                <form onSubmit={handleClarifySubmit} className="relative flex items-center group">
                  <div className="absolute inset-0 bg-[var(--accent)]/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="text"
                    value={clarifyInput}
                    onChange={(e) => setClarifyInput(e.target.value)}
                    placeholder="回答我的问题，或者直接输入新想法..."
                    className="apple-input w-full pr-14 bg-[var(--bg-card)] relative z-10 py-3.5 text-[var(--text-primary)]"
                    disabled={isClarifying}
                  />
                  <button
                    type="submit"
                    disabled={!clarifyInput.trim() || isClarifying}
                    className="absolute right-2 p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50 hover:brightness-110 transition-all z-20 shadow-md shadow-blue-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3: Loading Vibe */}
        <AnimatePresence>
          {phase === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="apple-glass p-10 flex flex-col items-center justify-center min-h-[400px] text-center mb-10"
            >
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-2 border-blue-500/20 rounded-full animate-ping" />
                <div className="absolute inset-2 border-2 border-cyan-400/40 rounded-full animate-spin-slow" />
                <div className="absolute inset-4 border-2 border-blue-500/60 rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
                <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--accent)] w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-[var(--highlight)] mb-6">正在全网抓取并生成残酷真相报告</h3>
              
              <div className="space-y-3 w-full max-w-md text-left">
                {loadingMessages.map((msg, idx) => (
                  <div key={idx} className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                    idx < loadingStep ? 'text-emerald-400' : idx === loadingStep ? 'text-[var(--highlight)] font-medium' : 'text-[var(--text-secondary)] opacity-40'
                  }`}>
                    {idx < loadingStep ? (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    ) : idx === loadingStep ? (
                      <div className="w-4 h-4 shrink-0 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                    ) : (
                      <div className="w-4 h-4 shrink-0 rounded-full border-2 border-current" />
                    )}
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4: Report Section */}
        {phase === 'report' && report && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header & Score */}
            <div className="apple-glass p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Target className="w-48 h-48" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-[var(--highlight)] mb-2">残酷真相报告</h2>
                  <p className="text-[var(--text-secondary)] mb-4">基于全网数据的客观分析，报告已自动保存至您的点子库。</p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="inline-block p-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                      <span className="font-bold text-[var(--highlight)]">核心判决：</span> {report.verdict}
                    </div>
                    <button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="apple-btn px-4 py-2 text-sm flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--highlight)]"
                    >
                      去点子库查看
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border min-w-[120px] ${getScoreColor(report.score)}`}>
                  <div className="text-4xl font-black mb-1">{report.score}<span className="text-xl opacity-50">/10</span></div>
                  <div className="text-xs font-bold uppercase tracking-wider">{getScoreLabel(report.score)}</div>
                </div>
              </div>
            </div>

            {/* Actionable Advice (Replaces Pivot Suggestion) */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-400/10 border border-blue-500/20 rounded-2xl p-8 relative">
              <div className="absolute -top-3 -left-3 p-2 bg-[var(--accent)] rounded-xl shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-blue-400 mb-4 ml-4">破局与行动建议 (Actionable Advice)</h3>
              <ul className="space-y-3">
                {report.actionableAdvice.map((advice: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-lg leading-relaxed text-[var(--highlight)] font-medium">
                    <span className="text-[var(--accent)] mt-1"><Lightbulb className="w-5 h-5" /></span>
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Competitors */}
              <div className="apple-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border-color)]">
                  <Network className="w-5 h-5 text-[var(--accent)]" />
                  <h3 className="text-lg font-bold text-[var(--highlight)]">竞品与机会空白</h3>
                </div>
                {report.competitors.length > 0 ? (
                  <div className="space-y-4 flex-1">
                    {report.competitors.map((comp: Competitor, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-[var(--highlight)]">{comp.name}</h4>
                          <a href={comp.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline flex items-center gap-1 text-xs">
                            访问 <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-2"><span className="text-emerald-400 font-semibold">长处：</span>{comp.advantage}</p>
                        <div className="text-xs p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">
                          <span className="font-bold mr-1">盲区/机会:</span> {comp.blindSpot}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] text-sm">暂未发现完全重合的直接竞品，这可能是个绝佳的蓝海，也可能是个伪需求陷阱。</p>
                )}
              </div>

              {/* Voice of Customer & First 10 Users */}
              <div className="space-y-8">
                {/* Voice of Customer */}
                <div className="apple-card p-6">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border-color)]">
                    <Users className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-[var(--highlight)]">真实用户吐槽原话</h3>
                  </div>
                  <div className="space-y-4">
                    {report.voiceOfCustomer.map((voc: VoiceOfCustomer, i: number) => (
                      <div key={i} className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                        <p className="text-sm text-[var(--highlight)] italic font-light mb-2">"{voc.quote}"</p>
                        <div className="text-xs font-bold text-purple-400 uppercase tracking-wider text-right">
                          — 来自 {voc.source}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* First 10 Users Tactic */}
                <div className="apple-card p-6 border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-blue-500/20">
                    <Network className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-bold text-blue-400">冷启动：前 10 个种子用户</h3>
                  </div>
                  <ul className="space-y-4">
                    {report.first10Users.map((tactic: First10UserChannel, i: number) => (
                      <li key={i} className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{tactic.channel}</span>
                        <span className="text-sm text-[var(--text-primary)] leading-relaxed">{tactic.tactic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Follow-up Chat */}
            <div className="mt-12 apple-glass flex flex-col h-[550px] shadow-2xl border border-[var(--border-color)]">
              <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-md rounded-t-xl">
                <h3 className="font-bold text-red-500 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-red-500" />
                  投资人最后的刁难...
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-light">如果你对报告不服，可以继续狡辩。</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg-main)]/30">
                {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[var(--accent)] text-white rounded-tr-sm' 
                        : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-sm'
                    }`}>
                      <MarkdownRenderer 
                        content={msg.content} 
                        fontSize="sm" 
                        className={msg.role === 'user' ? '!text-white !prose-p:text-white !prose-strong:text-white' : ''} 
                      />
                    </div>
                  </div>
                ))}
                {isChatting && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl rounded-tl-sm p-4 flex items-center gap-2 h-12 shadow-sm">
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-[var(--text-secondary)] animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-card)]/50 backdrop-blur-md rounded-b-xl">
                <form onSubmit={handleChatSubmit} className="relative flex items-center group">
                  <div className="absolute inset-0 bg-[var(--accent)]/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="text"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder="例如：如果我把目标用户缩小到大学生群体，这个逻辑还成立吗？"
                    className="apple-input w-full pr-14 bg-[var(--bg-card)] relative z-10 py-3.5 text-[var(--text-primary)]"
                    disabled={isChatting}
                  />
                  <button
                    type="submit"
                    disabled={!currentInput.trim() || isChatting}
                    className="absolute right-2 p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50 hover:brightness-110 transition-all z-20 shadow-md shadow-blue-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
            
          </motion.div>
        )}
      </main>
    </div>
  )
}
