import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts'

const COLORS = ['#3dd6d0', '#67c3ff', '#88a5ff', '#6ef0c2', '#f3b774', '#ff8a5c', '#f080c4', '#d6d98b']

export default function CampusPieChart({ data, highlightedId }) {
  return (
    <div className="h-[320px] rounded-2xl border border-white/10 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="nome"
            innerRadius={70}
            outerRadius={120}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.campusId}`}
                fill={COLORS[index % COLORS.length]}
                opacity={highlightedId && entry.campusId !== highlightedId ? 0.4 : 1}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Total']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}