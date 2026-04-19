package com.honeypot

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

object AttackClassifier {

    private val sqliPatterns = listOf(
        "select", "union", "insert", "update", "delete", "drop", "create", "alter",
        "1=1", "1 =1", "' or", "' and", "--", "/*", "*/", "xp_", "exec(",
        "sleep(", "benchmark(", "waitfor"
    )

    private val xssPatterns = listOf(
        "<script", "</script>", "onerror=", "onload=", "onclick=", "onmouseover=",
        "javascript:", "alert(", "document.cookie", "eval(", "<img", "<iframe",
        "<svg", "expression("
    )

    private val scanPaths = listOf(
        "/.env", "/.git", "/.ssh", "/wp-login.php", "/wp-admin", "/phpmyadmin",
        "/admin", "/config", "/backup", "/shell", "/.htaccess", "/etc/passwd",
        "/proc/self", "/actuator", "/.aws", "/xmlrpc.php", "/console",
        "/.DS_Store", "/web.config"
    )

    fun classifyPending() {
        transaction {
            val pending = AttackLogs
                .selectAll().where { AttackLogs.attackType.isNull() }
                .map {
                    mapOf(
                        "id"        to it[AttackLogs.id],
                        "ip"        to it[AttackLogs.ip],
                        "path"      to it[AttackLogs.path],
                        "body"      to (it[AttackLogs.body] ?: ""),
                        "timestamp" to it[AttackLogs.timestamp]
                    )
                }

            for (row in pending) {
                val id        = row["id"] as Int
                val ip        = row["ip"] as String
                val path      = row["path"] as String
                val body      = row["body"] as String
                val timestamp = row["timestamp"] as String

                val attackType = classify(ip, path, body, timestamp)

                AttackLogs.update({ AttackLogs.id eq id }) {
                    it[AttackLogs.attackType] = attackType
                }
            }
        }
    }

    private fun classify(ip: String, path: String, body: String, timestamp: String): String {
        val pathLower = path.lowercase()
        val bodyLower = body.lowercase()
        val combined  = "$pathLower $bodyLower"

        // SQLi 체크
        if (sqliPatterns.any { combined.contains(it) }) return "SQLi"

        // XSS 체크
        if (xssPatterns.any { combined.contains(it) }) return "XSS"

        // 스캔 체크 (경로 패턴)
        if (scanPaths.any { pathLower.startsWith(it) || pathLower == it }) return "스캔"

        // 브루트포스 체크 (같은 IP가 로그인 경로에 반복 요청)
        if (isBruteForce(ip, timestamp)) return "브루트포스"

        return "기타"
    }

    private fun isBruteForce(ip: String, timestamp: String): Boolean {
        // timestamp 기준 60초 이전 시각을 계산
        // ISO 8601 형식 가정: "2024-01-01T12:00:00Z"
        return try {
            val instant = java.time.Instant.parse(timestamp)
            val windowStart = instant.minusSeconds(60).toString()

            val loginPaths = listOf("%login%", "%admin%", "%signin%", "%password%")

            val count = loginPaths.sumOf { pattern ->
                AttackLogs
                    .selectAll().where {
                        (AttackLogs.ip eq ip) and
                        (AttackLogs.timestamp greaterEq windowStart) and
                        (AttackLogs.path like pattern)
                    }
                    .count()
                    .toInt()
            }
            count >= 10
        } catch (e: Exception) {
            false
        }
    }
}
