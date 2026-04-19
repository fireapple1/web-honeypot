import { useState } from "react";

const TYPE_COLORS = {
  SQLi:       { bg: "#ef444422", color: "#ef4444" },
  XSS:        { bg: "#f9731622", color: "#f97316" },
  브루트포스: { bg: "#eab30822", color: "#eab308" },
  스캔:       { bg: "#3b82f622", color: "#3b82f6" },
  기타:       { bg: "#6b728022", color: "#9ca3af" },
};

const TYPES = ["전체", "SQLi", "XSS", "브루트포스", "스캔", "기타"];
const PAGE_SIZE = 20;

export default function LogTable({ logs, total, onFilterChange }) {
  const [filter, setFilter] = useState("전체");
  const [page, setPage]     = useState(0);

  const handleFilter = (type) => {
    const next = type === "전체" ? undefined : type;
    setFilter(type);
    setPage(0);
    onFilterChange({ type: next, offset: 0 });
  };

  const handlePage = (next) => {
    setPage(next);
    onFilterChange({ type: filter === "전체" ? undefined : filter, offset: next * PAGE_SIZE });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={titleStyle}>요청 로그</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => handleFilter(t)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                background: filter === t ? (TYPE_COLORS[t]?.bg ?? "#8b5cf622") : "#2a2a3e",
                color:      filter === t ? (TYPE_COLORS[t]?.color ?? "#a78bfa") : "#888",
                fontWeight: filter === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#666", borderBottom: "1px solid #333" }}>
              {["시각", "IP", "메서드", "경로", "공격 유형", "User-Agent"].map((h) => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#555" }}>
                  데이터 없음
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #2a2a3e" }}>
                  <td style={cellStyle}>{log.timestamp?.slice(0, 19).replace("T", " ")}</td>
                  <td style={{ ...cellStyle, fontFamily: "monospace" }}>{log.ip}</td>
                  <td style={{ ...cellStyle }}>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: log.method === "POST" ? "#ef444422" : "#3b82f622",
                      color: log.method === "POST" ? "#ef4444" : "#3b82f6",
                      fontSize: 11,
                      fontWeight: 600,
                    }}>{log.method}</span>
                  </td>
                  <td style={{ ...cellStyle, fontFamily: "monospace", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.path}
                  </td>
                  <td style={cellStyle}>
                    {log.attackType ? (
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: TYPE_COLORS[log.attackType]?.bg ?? "#6b728022",
                        color: TYPE_COLORS[log.attackType]?.color ?? "#9ca3af",
                        fontSize: 11,
                        fontWeight: 600,
                      }}>{log.attackType}</span>
                    ) : (
                      <span style={{ color: "#555" }}>분류 중...</span>
                    )}
                  </td>
                  <td style={{ ...cellStyle, color: "#666", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.userAgent ?? "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14 }}>
          <button onClick={() => handlePage(page - 1)} disabled={page === 0} style={pageBtn}>이전</button>
          <span style={{ color: "#888", fontSize: 12, alignSelf: "center" }}>{page + 1} / {totalPages}</span>
          <button onClick={() => handlePage(page + 1)} disabled={page >= totalPages - 1} style={pageBtn}>다음</button>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#1e1e2e",
  border: "1px solid #333",
  borderRadius: 8,
  padding: 20,
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
  color: "#ccc",
  fontWeight: 600,
};

const cellStyle = {
  padding: "8px 10px",
  color: "#ccc",
  verticalAlign: "middle",
};

const pageBtn = {
  padding: "4px 12px",
  background: "#2a2a3e",
  border: "1px solid #444",
  borderRadius: 4,
  color: "#ccc",
  cursor: "pointer",
  fontSize: 12,
};
