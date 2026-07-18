'use client'

import React from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

interface SubjectRadarProps {
  data: Record<string, { total: number; mastered: number; accuracy: number }>
  height?: number
}

export default function SubjectRadar({ data, height = 300 }: SubjectRadarProps) {
  const subjects = Object.keys(data)

  if (subjects.length < 3) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        需要至少3个学科的数据才能显示雷达图
      </div>
    )
  }

  const chartData = subjects.map(subject => ({
    subject,
    total: data[subject].total,
    mastered: data[subject].mastered,
    accuracy: Math.round(data[subject].accuracy * 100),
    // Normalize for radar display (0-100 scale)
    masteryRate: data[subject].total > 0
      ? Math.round((data[subject].mastered / data[subject].total) * 100)
      : 0
  }))

  // Find max for scale
  const maxTotal = Math.max(...chartData.map(d => d.total), 10)

  const normalizedData = chartData.map(d => ({
    ...d,
    normalizedTotal: Math.round((d.total / maxTotal) * 100)
  }))

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={normalizedData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => {
              const safeValue = value ?? 0
              const safeName = name || '指标'
              if (safeName === '错题量') return [`${safeValue}%`, safeName]
              if (safeName === '掌握率') return [`${safeValue}%`, safeName]
              if (safeName === '正确率') return [`${safeValue}%`, safeName]
              return [safeValue, safeName]
            }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '12px'
            }}
          />
          <Radar
            name="错题量"
            dataKey="normalizedTotal"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.2}
          />
          <Radar
            name="掌握率"
            dataKey="masteryRate"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.2}
          />
          <Radar
            name="正确率"
            dataKey="accuracy"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <span className="text-xs text-slate-500">错题量</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="text-xs text-slate-500">掌握率</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500/60" />
          <span className="text-xs text-slate-500">正确率</span>
        </div>
      </div>
    </div>
  )
}
