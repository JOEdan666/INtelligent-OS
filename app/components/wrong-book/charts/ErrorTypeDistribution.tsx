'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, type PieLabelRenderProps } from 'recharts'
import { ERROR_TYPE_LABELS, ERROR_TYPE_COLORS, ErrorType } from '@/app/types/wrongQuestion'

interface ErrorTypeDistributionProps {
  data: Record<ErrorType, number>
  height?: number
}

export default function ErrorTypeDistribution({ data, height = 280 }: ErrorTypeDistributionProps) {
  const chartData = Object.entries(data)
    .filter(([, value]) => value > 0)
    .map(([type, value]) => ({
      name: ERROR_TYPE_LABELS[type as ErrorType],
      value,
      type: type as ErrorType
    }))

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
        暂无错题数据
      </div>
    )
  }

  const COLORS = chartData.map(item => ERROR_TYPE_COLORS[item.type])

  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const cx = Number(props.cx || 0)
    const cy = Number(props.cy || 0)
    const midAngle = Number(props.midAngle || 0)
    const innerRadius = Number(props.innerRadius || 0)
    const outerRadius = Number(props.outerRadius || 0)
    const percent = Number(props.percent || 0)
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={90}
            innerRadius={50}
            fill="#8884d8"
            dataKey="value"
            animationDuration={500}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} 题`, name || '数量']}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
