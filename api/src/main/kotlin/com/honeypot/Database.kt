package com.honeypot

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

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
    File(dbPath).parentFile?.mkdirs()
    Database.connect("jdbc:sqlite:$dbPath", "org.sqlite.JDBC")
    transaction {
        exec("PRAGMA journal_mode=WAL;")
        SchemaUtils.createMissingTablesAndColumns(AttackLogs)
    }
}
