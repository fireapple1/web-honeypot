const TYPE_COLORS = {
  SQLi:       "#ef4444",
  XSS:        "#f97316",
  브루트포스: "#eab308",
  스캔:       "#3b82f6",
  기타:       "#6b7280",
  전체:       "#8b5cf6",
};

export default function StatCard({ label, value }) {
  const color = TYPE_COLORS[label] ?? "#8b5cf6";
  return (
    <div style={{
      background: "#1e1e2e",
      border: `1px solid ${color}44`,
      borderRadius: 8,
      padding: "16px 20px",
      minWidth: 120,
      flex: 1,
    }}>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value?.toLocaleString() ?? 0}</div>
    </div>
  );
}
