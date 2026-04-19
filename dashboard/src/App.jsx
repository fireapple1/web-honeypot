import { useState, useEffect, useCallback } from "react";
import { fetchLogs, fetchStats, fetchTopIps } from "./api";
import StatCard   from "./components/StatCard";
import StatsChart from "./components/StatsChart";
import TopIps     from "./components/TopIps";
import LogTable   from "./components/LogTable";

const REFRESH_MS = 10_000;
const PAGE_SIZE  = 20;

export default function App() {
  const [stats,   setStats]   = useState(null);
  const [topIps,  setTopIps]  = useState([]);
  const [logsRes, setLogsRes] = useState({ total: 0, logs: [] });
  const [query,   setQuery]   = useState({ type: undefined, offset: 0 });
  const [lastAt,  setLastAt]  = useState(null);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (q = query) => {
    try {
      const [s, ips, lr] = await Promise.all([
        fetchStats(),
        fetchTopIps(10),
        fetchLogs({ limit: PAGE_SIZE, ...q }),
      ]);
      setStats(s);
      setTopIps(ips);
      setLogsRes(lr);
      setLastAt(new Date().toLocaleTimeString());
      setError(null);
    } catch {
      setError("API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.");
    }
  }, [query]);

  // 최초 로드
  useEffect(() => { load(); }, []);

  // 자동 갱신
  useEffect(() => {
    const id = setInterval(() => load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const handleFilterChange = (next) => {
    const q = { ...query, ...next };
    setQuery(q);
    load(q);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#13131f", color: "#e2e2e2", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ borderBottom: "1px solid #2a2a3e", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff" }}>
            Web Honeypot
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#666" }}>공격 트래픽 모니터링 대시보드</p>
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>
          {lastAt ? `마지막 갱신: ${lastAt}` : "로딩 중..."}
        </div>
      </header>

      <main style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {error && (
          <div style={{ background: "#ef444422", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* 요약 카드 */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatCard label="전체"       value={stats?.total} />
          <StatCard label="SQLi"       value={stats?.byType?.["SQLi"]} />
          <StatCard label="XSS"        value={stats?.byType?.["XSS"]} />
          <StatCard label="스캔"       value={stats?.byType?.["스캔"]} />
          <StatCard label="브루트포스" value={stats?.byType?.["브루트포스"]} />
          <StatCard label="기타"       value={stats?.byType?.["기타"]} />
        </div>

        {/* 차트 */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StatsChart byType={stats?.byType} />
          <TopIps     data={topIps} />
        </div>

        {/* 로그 테이블 */}
        <LogTable
          logs={logsRes.logs}
          total={logsRes.total}
          onFilterChange={handleFilterChange}
        />
      </main>
    </div>
  );
}
