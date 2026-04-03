'use client'

import { type ElementType, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Calendar, GraduationCap, Target, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

import type { CurriculumStandard } from '../types/curriculum'

export default function QuickStart() {
  const router = useRouter()
  const [grade, setGrade] = useState('')
  const [semester, setSemester] = useState('')
  const [subject, setSubject] = useState('')
  const [topicId, setTopicId] = useState('')
  const [curriculumDB, setCurriculumDB] = useState<CurriculumStandard[]>([])

  const grades = ['四年级', '五年级', '六年级', '七年级', '八年级', '九年级', '高一', '高二', '高三']
  const semesters = ['上册', '下册']
  const subjects = ['语文', '数学', '物理', '英语', '历史', '化学', '政治', '生物', '地理']

  useEffect(() => {
    if (!grade || !subject) {
      setCurriculumDB([])
      return
    }
    import('../data/curriculumDatabase').then((mod) => {
      setCurriculumDB(mod.CURRICULUM_DATABASE)
    })
  }, [grade, subject])

  const availableTopics = useMemo(() => {
    if (!grade || !subject || curriculumDB.length === 0) return []
    const standards = curriculumDB.filter(
      (item) =>
        item.grade.includes(grade) &&
        item.subject.includes(subject) &&
        (!semester || !item.semester || item.semester === semester)
    )
    const allTopics = standards.flatMap((item) => item.topics)
    return Array.from(new Map(allTopics.map((item) => [item.name, item])).values())
  }, [grade, subject, semester, curriculumDB])

  const handleStart = () => {
    if (!grade || !subject) {
      toast.error('请先选择年级和学科')
      return
    }

    const params = new URLSearchParams()
    params.set('grade', grade)
    params.set('subject', subject)
    if (semester) params.set('semester', semester)

    if (topicId) {
      const topic = availableTopics.find((item) => item.id === topicId)
      if (topic) {
        params.set('topic', topic.name)
        params.set('topicId', topic.id)
      }
    } else {
      params.set('topic', `${grade}${semester || ''}${subject}综合诊断`)
    }

    router.push(`/learning-interface?${params.toString()}`)
  }

  const canStart = Boolean(grade && subject)

  return (
    <section id="quick-start" className="zen-panel mx-4 px-6 py-8 md:mx-auto md:max-w-6xl md:px-10 md:py-10">
      <div className="mb-8 flex flex-col gap-1">
        <span className="zen-chip w-fit">首页核心入口</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950 md:text-4xl">开始一次学习会话</h2>
        <p className="max-w-2xl text-sm text-slate-600 md:text-base md:leading-7">
          只保留必要选择项，完成后立即进入学习流程。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <SelectField
          icon={GraduationCap}
          label="年级"
          value={grade}
          options={grades}
          placeholder="选择你的年级"
          onChange={(value) => {
            setGrade(value)
            setTopicId('')
          }}
        />

        <SelectField
          icon={Calendar}
          label="学期（可选）"
          value={semester}
          options={semesters}
          placeholder="选择学期"
          onChange={(value) => {
            setSemester(value)
            setTopicId('')
          }}
        />

        <SelectField
          icon={BookOpen}
          label="学科"
          value={subject}
          options={subjects}
          placeholder="选择学科"
          onChange={(value) => {
            setSubject(value)
            setTopicId('')
          }}
        />

        <SelectField
          icon={Target}
          label="知识点（可选）"
          value={topicId}
          options={availableTopics}
          placeholder={availableTopics.length > 0 ? '选择具体知识点' : '先选择年级和学科'}
          onChange={setTopicId}
          disabled={availableTopics.length === 0}
        />
      </div>

      <div className="mt-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500 md:text-sm">
          支持主流教材体系，进入后可继续调整学习路径。
        </p>
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="zen-button h-12 px-6 md:px-8 inline-flex items-center justify-center gap-2"
        >
          <Zap className="h-4 w-4" />
          开始学习
        </button>
      </div>
    </section>
  )
}

function SelectField({
  icon: Icon,
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  icon: ElementType
  label: string
  value: string
  options: Array<string | { id: string; name: string }>
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="block space-y-2.5">
      <span className="inline-flex items-center gap-2 text-sm font-medium tracking-[-0.02em] text-slate-700">
        <Icon className="w-4 h-4 text-slate-500" />
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="zen-select disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.id
          const optionLabel = typeof option === 'string' ? option : option.name
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
      </select>
    </label>
  )
}
