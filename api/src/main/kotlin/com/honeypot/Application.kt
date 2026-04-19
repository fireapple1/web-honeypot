package com.honeypot

import com.honeypot.plugins.configureCors
import com.honeypot.plugins.configureSerialization
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

fun main() {
    embeddedServer(CIO, port = 8081, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module() {
    val dbPath = System.getenv("DB_PATH") ?: "./data/honeypot.db"

    initDatabase(dbPath)
    configureSerialization()
    configureCors()
    configureRouting()

    // 5초마다 미분류 로그 공격 유형 업데이트
    launch {
        while (true) {
            try {
                AttackClassifier.classifyPending()
            } catch (e: Exception) {
                // DB 아직 없는 경우 등 무시
            }
            delay(5_000)
        }
    }
}
