# 구현 로드맵

---

## 팀원 담당 — `core/` (C 모듈)

### 목표
raw socket으로 HTTP 요청을 수신하고, 가짜 응답을 돌려주면서 SQLite에 로그를 기록한다.

---

### STEP 1 — `honeypot.h` 헤더 확정

모든 모듈이 공유하는 구조체와 함수 선언을 먼저 확정한다.

```c
// honeypot.h
#ifndef HONEYPOT_H
#define HONEYPOT_H

#define DB_PATH "/data/honeypot.db"
#define PORT    8080
#define BUF_SIZE 8192

typedef struct {
    char timestamp[32];   // "2024-01-01T12:00:00Z"
    char ip[46];          // IPv4/IPv6
    char method[8];       // "GET", "POST" 등
    char path[1024];
    char user_agent[512];
    char body[4096];
} HttpRequest;

void server_start(int port);
void http_parse(const char *raw, HttpRequest *req);
void logger_init(const char *db_path);
void log_request(const HttpRequest *req);
void send_fake_response(int client_fd, const char *path);

#endif
```

> **주의**: timestamp는 ISO 8601 형식(`2024-01-01T12:00:00Z`)으로 맞춰야 Kotlin 파싱이 편하다.

---

### STEP 2 — `server.c` (소켓 서버)

```
구현 순서:
1. socket() → SO_REUSEADDR 설정
2. bind() → 포트 8080
3. listen() → backlog 10
4. accept() 루프
   └─ 각 연결마다 pthread_create()로 핸들러 스레드 생성
5. 핸들러 스레드:
   └─ recv() → http_parse() → log_request() → send_fake_response() → close()
```

멀티스레드 필요 이유: 스캐너는 동시에 수십 개 연결을 맺으므로 단일 스레드면 큐잉됨.

---

### STEP 3 — `http_parser.c`

```
파싱 대상 raw HTTP 예시:
  POST /login HTTP/1.1\r\n
  Host: 192.168.0.1\r\n
  User-Agent: sqlmap/1.7\r\n
  \r\n
  username=admin'--

파싱 방법:
1. 첫 줄에서 method, path 추출 (strtok or sscanf)
2. 헤더 루프: "User-Agent:" 줄 찾아서 값 복사
3. \r\n\r\n 이후가 body
```

edge case: body가 없는 GET 요청, 헤더가 잘린 요청(BUF_SIZE 초과) 처리 필요.

---

### STEP 4 — `logger.c` (SQLite 기록)

```c
// 초기화 (프로그램 시작 시 1회)
void logger_init(const char *db_path) {
    sqlite3_open(db_path, &db);
    // schema.sql의 CREATE TABLE 실행
}

// 요청마다 호출
void log_request(const HttpRequest *req) {
    // attack_type은 NULL로 INSERT (Kotlin이 나중에 채움)
    INSERT INTO attack_logs
        (timestamp, ip, method, path, user_agent, body)
    VALUES (?, ?, ?, ?, ?, ?);
}
```

> WAL 모드는 `PRAGMA journal_mode=WAL;`을 logger_init에서 실행.
> 멀티스레드 환경이므로 `sqlite3_config(SQLITE_CONFIG_SERIALIZED)` 또는 mutex로 보호.

---

### STEP 5 — `response.c` (가짜 응답)

공격자가 진짜 취약한 서버라고 믿게 만드는 것이 목적.

| 경로 패턴 | 가짜 응답 |
|---|---|
| `/admin`, `/admin/login` | 200 OK + HTML 로그인 폼 |
| `/.env` | 200 OK + `DB_PASSWORD=supersecret` 텍스트 |
| `/wp-login.php` | 200 OK + WordPress 로그인 HTML |
| `/login`, `/signin` | 200 OK + 일반 로그인 폼 |
| 그 외 | 404 Not Found |

```c
void send_fake_response(int fd, const char *path) {
    if (strstr(path, "admin") || strstr(path, "login")) {
        write(fd, HTTP_200_LOGIN_FORM, ...);
    } else if (strcmp(path, "/.env") == 0) {
        write(fd, HTTP_200_ENV_LEAK, ...);
    } else {
        write(fd, HTTP_404, ...);
    }
}
```

---

### STEP 6 — `main.c`

```c
int main() {
    logger_init(DB_PATH);
    server_start(PORT);  // 블로킹
    return 0;
}
```

---

### 팀원 체크리스트

- [ ] `honeypot.h` 구조체/상수 확정 후 나한테 공유 (DB_PATH, timestamp 포맷)
- [ ] `logger_init()` 호출 시 DB 파일 + 테이블 자동 생성
- [ ] INSERT 시 `attack_type` 컬럼은 NULL
- [ ] 멀티스레드 SQLite 접근 보호
- [ ] Makefile에 `-lsqlite3 -lpthread` 링크 추가

---
---

## 나 담당 — `api/` + `dashboard/`

---

## Phase 1 — Kotlin API 서버 (`api/`)

### STEP 1 — Database.kt

Exposed ORM으로 테이블 정의 + SQLite 연결.

**파일**: `api/src/main/kotlin/com/honeypot/Database.kt`

```kotlin
// 구현 내용
object AttackLogs : Table("attack_logs") {
    val id         = integer("id").autoIncrement()
    val timestamp  = text("timestamp")
    val ip         = text("ip")
    val method     = text("method")
    val path       = text("path")
    val userAgent  = text("user_agent").nullable()
    val body       = text("body").nullable()
    val attackType = text("attack_type").nullable()
    override val primaryKey = PrimaryKey(id)
}

fun initDatabase(dbPath: String) {
    Database.connect("jdbc:sqlite:$dbPath", "org.sqlite.JDBC")
    transaction {
        exec("PRAGMA journal_mode=WAL;")
        SchemaUtils.createMissingTablesAndColumns(AttackLogs)
    }
}
```

DB 경로: 환경변수 `DB_PATH`로 받고 기본값은 `./data/honeypot.db`

---

### STEP 2 — AttackClassifier.kt

`attack_type`이 NULL인 행을 읽어 분류 후 UPDATE.

**파일**: `api/src/main/kotlin/com/honeypot/AttackClassifier.kt`

```
분류 규칙:

SQLi    — path 또는 body에 다음 포함:
          SELECT, UNION, INSERT, DROP, --, ', 1=1, OR 1

XSS     — path 또는 body에 다음 포함:
          <script, onerror=, onload=, javascript:, alert(

브루트포스 — 동일 IP가 60초 이내 /login, /admin 경로에 10회 이상 요청

스캔    — path가 다음 중 하나:
          /.env, /wp-login.php, /phpmyadmin, /admin,
          /.git, /config, /backup, /shell, /.ssh

기타    — 위 어디도 해당 안 됨
```

**실행 방식**: 코루틴으로 5초마다 반복

```kotlin
// Application.kt에서 launch
launch {
    while (true) {
        AttackClassifier.classifyPending()
        delay(5_000)
    }
}
```

분류 시 대소문자 무시 (`lowercase()` 후 비교).

---

### STEP 3 — Routing.kt

3개 엔드포인트 구현.

**파일**: `api/src/main/kotlin/com/honeypot/Routing.kt`

**GET /api/logs**
```
쿼리 파라미터:
  limit  (기본 100, 최대 500)
  offset (기본 0)
  type   (선택, attack_type 필터)

응답:
  {
    "total": 1234,
    "logs": [
      {
        "id": 1,
        "timestamp": "2024-01-01T12:00:00Z",
        "ip": "1.2.3.4",
        "method": "POST",
        "path": "/login",
        "userAgent": "sqlmap/1.7",
        "body": "id=1'",
        "attackType": "SQLi"
      }, ...
    ]
  }
```

**GET /api/stats**
```
응답:
  {
    "total": 1234,
    "byType": {
      "SQLi": 400,
      "XSS": 200,
      "브루트포스": 150,
      "스캔": 300,
      "기타": 184
    }
  }
```

**GET /api/top-ips**
```
쿼리 파라미터:
  limit (기본 10)

응답:
  [
    { "ip": "1.2.3.4", "count": 300 },
    { "ip": "5.6.7.8", "count": 150 },
    ...
  ]
```

---

### STEP 4 — Plugin 설정 파일들

**Serialization.kt** — JSON 직렬화 설정
```kotlin
install(ContentNegotiation) {
    json(Json { ignoreUnknownKeys = true })
}
```

**CORS.kt** — 대시보드(localhost:5173)에서 API 호출 허용
```kotlin
install(CORS) {
    anyHost()  // 개발 환경
    allowHeader(HttpHeaders.ContentType)
}
```

---

### Phase 1 체크리스트

- [ ] `Database.kt` — 연결 + 테이블 정의
- [ ] `AttackClassifier.kt` — 분류 로직 + 5초 주기 실행
- [ ] `Routing.kt` — `/api/logs`, `/api/stats`, `/api/top-ips`
- [ ] `Application.kt` — 플러그인 등록 + DB 초기화 + 분류기 시작
- [ ] `./gradlew run`으로 로컬 실행 확인
- [ ] curl로 각 엔드포인트 응답 확인

---

## Phase 2 — React 대시보드 (`dashboard/`)

### STEP 1 — 프로젝트 구조 정리

```
dashboard/src/
├── api/
│   └── index.js          # API 호출 함수 모음
├── components/
│   ├── LogTable.jsx       # 로그 테이블
│   ├── StatsChart.jsx     # 공격 유형 파이차트
│   ├── TopIps.jsx         # 상위 IP 목록
│   └── StatCard.jsx       # 숫자 요약 카드
└── App.jsx
```

기존 Vite 기본 파일(`App.css`, `assets/` 등)은 정리해도 됨.

---

### STEP 2 — api/index.js

```js
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

export const fetchLogs   = (params) => axios.get(`${BASE}/api/logs`, { params });
export const fetchStats  = ()       => axios.get(`${BASE}/api/stats`);
export const fetchTopIps = (limit)  => axios.get(`${BASE}/api/top-ips`, { params: { limit } });
```

API URL은 `.env` 파일로 관리 (`VITE_API_URL=http://localhost:8081`).

---

### STEP 3 — StatCard.jsx

총 요청 수, 공격 유형별 건수를 숫자 카드로 표시.

```
[ 총 요청 1,234 ]  [ SQLi 400 ]  [ XSS 200 ]  [ 스캔 300 ]  [ 브루트포스 150 ]
```

---

### STEP 4 — StatsChart.jsx

recharts `PieChart`로 공격 유형 비율 시각화.

```jsx
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = {
  SQLi: "#ef4444",
  XSS: "#f97316",
  브루트포스: "#eab308",
  스캔: "#3b82f6",
  기타: "#6b7280",
};
```

---

### STEP 5 — LogTable.jsx

| 시각 | IP | 메서드 | 경로 | 공격 유형 | User-Agent |
|---|---|---|---|---|---|

기능:
- 공격 유형별 필터 드롭다운
- 페이지네이션 (limit/offset)
- 공격 유형에 색상 배지

---

### STEP 6 — TopIps.jsx

상위 10개 IP와 요청 수를 `BarChart`로 표시.

---

### STEP 7 — App.jsx 자동 갱신

```jsx
// 10초마다 전체 데이터 갱신
useEffect(() => {
  const load = () => { fetchStats(); fetchLogs(); fetchTopIps(); };
  load();
  const id = setInterval(load, 10_000);
  return () => clearInterval(id);
}, []);
```

---

### Phase 2 체크리스트

- [ ] `api/index.js` — 3개 함수 구현
- [ ] `StatCard.jsx` — 요약 숫자 카드
- [ ] `StatsChart.jsx` — 파이차트
- [ ] `LogTable.jsx` — 필터 + 페이지네이션 테이블
- [ ] `TopIps.jsx` — 바차트
- [ ] `App.jsx` — 조합 + 10초 자동 갱신
- [ ] `npm run dev`로 로컬 확인

---

## 통합 순서 (전체 타임라인)

```
[팀원] core/ 구현
  └─ STEP 1~6 완료 → DB에 실제 데이터 INSERT 확인

[나] api/ 구현 (Phase 1)
  └─ 팀원 DB 스키마 확정 후 시작 가능
  └─ 테스트용 더미 데이터로 먼저 개발 가능

[나] dashboard/ 구현 (Phase 2)
  └─ api/ /api/stats 응답만 있으면 시작 가능

[합치기] docker-compose up --build
  └─ 볼륨 경로(/data/honeypot.db) 맞추기
  └─ CORS, 포트 확인
```

---

## 팀원과 맞춰야 할 것 (협업 인터페이스)

| 항목 | 값 |
|---|---|
| SQLite 파일 경로 | `/data/honeypot.db` (Docker 볼륨) |
| timestamp 포맷 | `2024-01-01T12:00:00Z` (ISO 8601) |
| INSERT 시 attack_type | NULL로 비워둠 |
| C 서버 포트 | 8080 |
| Kotlin API 포트 | 8081 |
| React 포트 | 5173 (dev) / 3000 (Docker) |
