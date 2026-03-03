import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function SignupChart({ data }) {
  if (!data?.length) return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(d) => d.slice(5)} // show MM-DD
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            formatter={(v) => [v, 'Signups']}
            labelFormatter={(l) => l}
          />
          <Bar dataKey="count" fill="#7c3aed" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
