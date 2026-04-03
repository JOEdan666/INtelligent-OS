'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Activity, Clock, PlayCircle } from 'lucide-react'
import { ConversationService } from '../../services/conversationService'
import { ConversationHistory } from '../../types/conversation'
import { STEP_METADATA } from '../../types/learning'

export default function CurrentLearningCard() {
  const router = useRouter()
  const [latestSession, setLatestSession] = useState<ConversationHistory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取最近的学习会话
    const fetchLatestSession = async () => {
      try {
        // 使用实例方法获取对话列表
        const result = await ConversationService.getInstance().getConversations({ type: 'learning', limit: 10 })
        const conversations = result.conversations
        
        // 筛选出有学习会话且未归档的，按最后活动时间排序
        const learningSessions = conversations
          .filter((c: ConversationHistory) => !c.isArchived && c.learningSession)
          .sort((a: ConversationHistory, b: ConversationHistory) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        
        if (learningSessions.length > 0) {
          setLatestSession(learningSessions[0])
        }
      } catch (error) {
        console.error('Failed to fetch learning session:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestSession()
  }, [])

  const handleContinue = () => {
    if (!latestSession) return
    router.push(`/learning-interface?subject=${encodeURIComponent(latestSession.subject || '')}&topic=${encodeURIComponent(latestSession.topic || '')}`)
  }

  if (loading || !latestSession) return null

  // 计算当前状态描述
  const currentState = latestSession.learningSession?.state || 'DIAGNOSE'
  const stateMeta = STEP_METADATA[currentState] || { label: '进行中', desc: '正在学习中' }
  
  // 计算最后活动时间描述
  const getLastActiveText = (date: Date) => {
    const diff = new Date().getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="apple-card overflow-hidden transition-transform duration-300 hover:-translate-y-1">
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* 左侧信息 */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold tracking-wide uppercase border border-[var(--accent)]/20">
                <Activity className="w-3.5 h-3.5" />
                正在进行
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                上次活跃：{getLastActiveText(latestSession.lastActivity)}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[var(--highlight)] mb-2 flex items-center gap-3">
                {latestSession.subject} · {latestSession.topic}
              </h2>
              <p className="text-[var(--text-secondary)] text-base">
                当前阶段：<span className="font-semibold text-[var(--text-primary)]">{stateMeta.label}</span> - {stateMeta.desc}
              </p>
            </div>

            {/* 简易进度指示条 */}
            <div className="w-full max-w-md h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-[var(--accent)] rounded-full" 
                style={{ width: '60%' }} // 这里暂时写死，后续可以根据 state 计算进度
              />
            </div>
          </div>

          {/* 右侧行动按钮 */}
          <button
            onClick={handleContinue}
            className="group relative inline-flex items-center gap-3 px-7 py-3.5 bg-[var(--accent)] text-white rounded-xl font-semibold shadow-md hover:brightness-110 transition-all duration-200 whitespace-nowrap"
          >
            <PlayCircle className="w-5 h-5 fill-current" />
            <span>继续学习</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}
