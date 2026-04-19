import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function TopIps({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>
        데이터 없음
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>상위 공격자 IP</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tick={{ fill: "#888", fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="ip"
            width={110}
            tick={{ fill: "#ccc", fontSize: 11, fontFamily: "monospace" }}
          />
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #333", borderRadius: 6 }}
            formatter={(value) => [value.toLocaleString() + "건", "요청 수"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
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
