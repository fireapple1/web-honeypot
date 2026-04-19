package com.honeypot

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.configureRouting() {
    routing {
        route("/api") {
            getLogs()
            getStats()
            getTopIps()
        }
    }
}

// GET /api/logs?limit=100&offset=0&type=SQLi
private fun Route.getLogs() {
    get("/logs") {
        val limit      = (call.request.queryParameters["limit"]?.toIntOrNull() ?: 100).coerceIn(1, 500)
        val pageOffset = call.request.queryParameters["offset"]?.toLongOrNull() ?: 0L
        val type       = call.request.queryParameters["type"]

        val result: Pair<Int, List<LogEntry>> = transaction {
            val query = if (type != null) {
                AttackLogs.selectAll().where { AttackLogs.attackType eq type }
            } else {
                AttackLogs.selectAll()
            }

            val total = query.count().toInt()
            val logs  = query
                .orderBy(AttackLogs.id, SortOrder.DESC)
                .limit(limit, pageOffset)
                .map { row ->
                    LogEntry(
                        id         = row[AttackLogs.id],
                        timestamp  = row[AttackLogs.timestamp],
                        ip         = row[AttackLogs.ip],
                        method     = row[AttackLogs.method],
                        path       = row[AttackLogs.path],
                        userAgent  = row[AttackLogs.userAgent],
                        body       = row[AttackLogs.body],
                        attackType = row[AttackLogs.attackType]
                    )
                }
            Pair(total, logs)
        }

        call.respond(LogsResponse(total = result.first, logs = result.second))
    }
}

// GET /api/stats
private fun Route.getStats() {
    get("/stats") {
        val response = transaction {
            val total = AttackLogs.selectAll().count().toInt()

            val countExpr = AttackLogs.id.count()
            val byType = AttackLogs
                .select(AttackLogs.attackType, countExpr)
                .where { AttackLogs.attackType.isNotNull() }
                .groupBy(AttackLogs.attackType)
                .associate { row ->
                    (row[AttackLogs.attackType] ?: "기타") to row[countExpr].toInt()
                }

            StatsResponse(total = total, byType = byType)
        }

        call.respond(response)
    }
}

// GET /api/top-ips?limit=10
private fun Route.getTopIps() {
    get("/top-ips") {
        val limit = (call.request.queryParameters["limit"]?.toIntOrNull() ?: 10).coerceIn(1, 100)

        val result = transaction {
            val countExpr = AttackLogs.id.count()
            AttackLogs
                .select(AttackLogs.ip, countExpr)
                .groupBy(AttackLogs.ip)
                .orderBy(countExpr, SortOrder.DESC)
                .limit(limit)
                .map { row ->
                    IpCount(
                        ip    = row[AttackLogs.ip],
                        count = row[countExpr].toInt()
                    )
                }
        }

        call.respond(result)
    }
}
