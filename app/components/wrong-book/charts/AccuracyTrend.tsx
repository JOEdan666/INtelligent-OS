'use client'

import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import type { DailyStats } from '@/app/types/wrongQuestion'

interface AccuracyTrendProps {
  data: DailyStats[]
  height?: number
  showTarget?: boolean
  targetAccuracy?: number
}

export default function AccuracyTrend({
  data,
  height = 280,
  showTarget = true,
  targetAccuracy = 80
}: AccuracyTrendProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        暂无复习数据
      </div>
    )
  }

  const chartData = data.map(d => ({
    ...d,
    date: d.date.slice(5), // MM-DD format
    accuracy: Math.round(d.accuracy * 100)
  }))

  const avgAccuracy = Math.round(
    chartData.reduce((sum, d) => sum + d.accuracy, 0) / chartData.length
  )

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value: number | undefined) => [`${value ?? 0}%`, '正确率']}
            labelFormatter={(label) => `日期: ${label}`}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '12px'
            }}
          />
          {showTarget && (
            <ReferenceLine
              y={targetAccuracy}
              stroke="#22c55e"
              strokeDasharray="5 5"
              label={{
                value: `目标 ${targetAccuracy}%`,
                position: 'right',
                fill: '#22c55e',
                fontSize: 11
              }}
            />
          )}
          <ReferenceLine
            y={avgAccuracy}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{
              value: `平均 ${avgAccuracy}%`,
              position: 'left',
              fill: '#94a3b8',
              fontSize: 11
            }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
