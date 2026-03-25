# Web Honeypot

공격자를 유인하여 실제 공격 트래픽을 수집·분류·시각화하는 저상호작용 웹 허니팟 시스템.

---

## 개요

이 프로젝트는 취약한 서버처럼 위장한 가짜 엔드포인트를 노출하고, 유입되는 HTTP 요청을 자동으로 분석하여 공격 패턴을 파악하는 것을 목적으로 한다. SQL 인젝션, XSS, 브루트포스, 디렉터리 스캔 등 다양한 공격 유형을 실시간으로 수집하고 대시보드에서 확인할 수 있다.

---

## 기술 스택

- **C** — raw socket 기반 HTTP 서버, 패킷 수신 및 로그 기록
- **Kotlin / Ktor** — 공격 분류 엔진, REST API 서버
- **SQLite** — 로그 저장소 (WAL 모드)
- **React + Vite** — 실시간 통계 대시보드
- **Docker** — 격리 환경 구성

---

## 시스템 구조

```
공격자 HTTP 요청
      ↓
  C 서버 (포트 8080)
  - 요청 수신 및 파싱
  - 가짜 응답 반환
  - SQLite에 로그 기록
      ↓
  SQLite DB
      ↓
  Kotlin/Ktor API 서버
  - 공격 유형 자동 분류
  - REST API 제공
      ↓
  React 대시보드
  - 차트 및 로그 시각화
```

---

## 디렉터리 구조

```
honeypot/
├── core/               # C 모듈 (팀원)
│   ├── main.c
│   ├── server.c
│   ├── http_parser.c
│   ├── logger.c
│   ├── response.c
│   └── honeypot.h
├── api/                # Kotlin/Ktor 서버 (나)
│   ├── src/
│   └── build.gradle.kts
├── dashboard/          # React 프론트엔드 (나)
│   ├── src/
│   └── package.json
├── db/
│   └── schema.sql
├── docker-compose.yml
└── README.md
```

---

## DB 스키마

```sql
CREATE TABLE attack_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    ip          TEXT    NOT NULL,
    method      TEXT    NOT NULL,
    path        TEXT    NOT NULL,
    user_agent  TEXT,
    body        TEXT,
    attack_type TEXT
);

PRAGMA journal_mode=WAL;
```

C 모듈이 `attack_type`을 제외하고 INSERT하면, Kotlin 서버가 주기적으로 읽어 분류 후 UPDATE한다.

---

## 수집 항목

각 HTTP 요청에 대해 다음 정보를 기록한다.

- 수신 시각
- 공격자 IP 주소
- HTTP 메서드 (GET, POST 등)
- 요청 경로 (`/admin`, `/.env` 등)
- User-Agent
- 요청 바디 (페이로드)
- 공격 유형 (SQLi / XSS / 브루트포스 / 스캔 / 기타)

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/logs` | 최근 로그 목록 |
| GET | `/api/stats` | 공격 유형별 통계 |
| GET | `/api/top-ips` | 상위 공격자 IP 목록 |

---

## 실행 방법

```bash
# 전체 실행
docker-compose up

# C 모듈만 빌드
cd core && make

# Kotlin API 서버
cd api && ./gradlew run

# React 대시보드
cd dashboard && npm install && npm run dev
```

---

## 주의사항

이 프로젝트는 학습 목적으로 제작되었다. 반드시 Docker로 격리된 환경 또는 사설 네트워크에서만 운영해야 한다. 공인 IP 환경에 직접 노출할 경우 실제 공격 트래픽이 유입되며, 이에 따른 법적·윤리적 책임은 운영자에게 있다.
