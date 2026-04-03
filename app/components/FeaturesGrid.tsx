'use client'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import {
  Database,
  History,
  MessageSquare,
  BookOpen,
  Brain,
  BarChart3,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    title: '知识库',
    desc: '上传学习资料，统一整理、检索与辅助讲解。',
    href: '/knowledge-base',
    icon: Database,
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-700'
  },
  {
    title: '学习历史',
    desc: '保留复盘记录、错题追踪和学习轨迹。',
    href: '/learning-history',
    icon: History,
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-700'
  },
  {
    title: '私教对话',
    desc: '围绕当前问题即时提问，快速获得讲解。',
    href: '/unified-chat',
    icon: MessageSquare,
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-700'
  },
  {
    title: '学习笔记',
    desc: '沉淀知识点、连接问题和个人理解。',
    href: '/notes',
    icon: BookOpen,
    bgColor: 'bg-sky-50',
    iconColor: 'text-sky-700'
  }
]

const stats = [
  { icon: Brain, label: '智能诊断', value: 'AI 精准定位薄弱点' },
  { icon: BarChart3, label: '学习分析', value: '可视化进度追踪' }
]

export default function FeaturesGrid() {
  return (
    <LazyMotion features={domAnimation}>
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="mb-4 inline-block rounded-full border border-sky-100 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700">
            功能模块
          </span>
          <h2 className="mb-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 md:text-4xl">
            把学习过程收进一个入口
          </h2>
          <p className="mx-auto max-w-xl text-lg leading-8 text-slate-500">
            从资料、对话、历史到笔记，所有环节都围绕同一个学习目标组织。
          </p>
        </m.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <m.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={feature.href}
                className="group block h-full rounded-[1.75rem] border border-sky-100/90 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_80px_-56px_rgba(59,130,246,0.34)]"
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bgColor} transition-transform group-hover:scale-105`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>

                <h3 className="mb-2 text-xl font-semibold tracking-[-0.04em] text-slate-950 transition-colors group-hover:text-slate-700">
                  {feature.title}
                </h3>
                <p className="mb-5 text-sm leading-7 text-slate-500">
                  {feature.desc}
                </p>

                <div className="flex items-center text-sm font-medium text-sky-700 opacity-0 transition-opacity group-hover:opacity-100">
                  <span>进入</span>
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </m.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,#eff8ff_0%,#e8f1ff_45%,#f8fbff_100%)] p-8 md:p-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="mb-4 text-2xl font-semibold tracking-[-0.05em] text-slate-950 md:text-3xl">
                AI 在这里不是噱头，而是学习结构
              </h3>
              <p className="leading-8 text-slate-600">
                基于先进的 AI 技术，学伴能够精准分析学习状态，
                提供个性化的学习建议和内容推荐。
              </p>
            </div>
            <div className="grid gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/82 p-4 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
                    <stat.icon className="h-6 w-6 text-sky-700" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{stat.label}</div>
                    <div className="text-sm text-slate-500">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </m.div>
      </div>
    </section>
    </LazyMotion>
  )
}
