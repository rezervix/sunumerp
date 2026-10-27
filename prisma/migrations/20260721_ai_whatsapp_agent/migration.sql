-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: 20260721_ai_whatsapp_agent
-- WhatsApp AI Agent Sistemi — Veritabanı Genişletmeleri
-- ═══════════════════════════════════════════════════════════════════════════════

-- pgvector extension (pgvector paketi sunucuda yüklü olmalı)
-- Ubuntu/Debian: sudo apt install postgresql-17-pgvector
-- Eğer yüklü değilse bu satırı yoruma alın
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 1. Customer Tablosu Genişletme ─────────────────────────────────────────
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "whatsappConsent"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatsappNormalizedPhone"  TEXT,
  ADD COLUMN IF NOT EXISTS "aiAutoReplyEnabled"       BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_whatsappNormalizedPhone_key"
  ON "Customer"("whatsappNormalizedPhone")
  WHERE "whatsappNormalizedPhone" IS NOT NULL;

-- ─── 2. AiKnowledgeChunk ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiKnowledgeChunk" (
  "id"            TEXT        NOT NULL,
  "source"        TEXT        NOT NULL,
  "sourceRef"     TEXT,
  "content"       TEXT        NOT NULL,
  "embeddingJson" TEXT,
  "contentHash"   TEXT        NOT NULL,
  "metadata"      JSONB,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_source_idx"      ON "AiKnowledgeChunk"("source");
CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_sourceRef_idx"   ON "AiKnowledgeChunk"("sourceRef");
CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_contentHash_idx" ON "AiKnowledgeChunk"("contentHash");

-- ─── 3. AiConversationMemory ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiConversationMemory" (
  "id"         TEXT         NOT NULL,
  "customerId" TEXT         NOT NULL,
  "role"       TEXT         NOT NULL,
  "content"    TEXT         NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiConversationMemory_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "AiConversationMemory_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AiConversationMemory_customerId_createdAt_idx"
  ON "AiConversationMemory"("customerId", "createdAt");

-- ─── 4. AiAgentLog ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiAgentLog" (
  "id"                TEXT         NOT NULL,
  "customerId"        TEXT,
  "incomingMessage"   TEXT         NOT NULL,
  "retrievedContext"  JSONB        NOT NULL,
  "toolCalls"         JSONB,
  "generatedResponse" TEXT         NOT NULL,
  "wasAutoSent"       BOOLEAN      NOT NULL DEFAULT false,
  "escalatedToHuman"  BOOLEAN      NOT NULL DEFAULT false,
  "escalationReason"  TEXT,
  "latencyMs"         INTEGER      NOT NULL,
  "llmProvider"       TEXT         NOT NULL,
  "shadowMode"        BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAgentLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiAgentLog_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "AiAgentLog_customerId_createdAt_idx"  ON "AiAgentLog"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiAgentLog_wasAutoSent_idx"           ON "AiAgentLog"("wasAutoSent");
CREATE INDEX IF NOT EXISTS "AiAgentLog_escalatedToHuman_idx"      ON "AiAgentLog"("escalatedToHuman");
CREATE INDEX IF NOT EXISTS "AiAgentLog_createdAt_idx"             ON "AiAgentLog"("createdAt");
