// src/modules/dashboard/components/Sparkline.jsx
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export default function Sparkline({ data, color = '#7C6EFA', height = 36 }) {
  if (!data || data.length < 2) return null
  const points = data.map((v, i) => ({ v }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points}>
        <Line
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          dot={false} isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
