import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = {
  SQLi:       "#ef4444",
  XSS:        "#f97316",
  브루트포스: "#eab308",
  스캔:       "#3b82f6",
  기타:       "#6b7280",
};

export default function StatsChart({ byType }) {
  const data = Object.entries(byType ?? {}).map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        데이터 없음
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>공격 유형 분포</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? "#6b7280"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 6 }}
            formatter={(value) => [value.toLocaleString() + "건", ""]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const cardStyle = {
  background: "#1e1e2e",
  border: "1px solid #333",
  borderRadius: 8,
  padding: 20,
  flex: 1,
  minHeight: 320,
};

const titleStyle = {
  margin: "0 0 12px",
  fontSize: 14,
  color: "#ccc",
  fontWeight: 600,
};
