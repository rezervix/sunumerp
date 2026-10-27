-- ═══════════════════════════════════════════════════════════════════════════════
-- AI Agent için Salt-Okunur PostgreSQL Rolü Kurulumu
-- Çalıştırmak: psql -U postgres -d crm_cicekana -f create-ai-readonly-role.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Rolü oluştur (şifreyi değiştirmeyi UNUTMAYIN!)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_readonly') THEN
    CREATE ROLE ai_readonly WITH LOGIN PASSWORD 'AiAgent_Secure_2024!';
    RAISE NOTICE 'ai_readonly rolü oluşturuldu.';
  ELSE
    RAISE NOTICE 'ai_readonly rolü zaten mevcut, atlanıyor.';
  END IF;
END
$$;

-- 2. Veritabanına bağlanma yetkisi
GRANT CONNECT ON DATABASE crm_cicekana TO ai_readonly;

-- 3. public schema'ya erişim
GRANT USAGE ON SCHEMA public TO ai_readonly;

-- 4. ERP tablolarına SADECE OKUMA yetkisi
-- AI agent bu tablolara asla yazamaz — sadece müşteri tanıma ve bağlam toplama için okur
GRANT SELECT ON "Customer"        TO ai_readonly;
GRANT SELECT ON "CustomerContact" TO ai_readonly;
GRANT SELECT ON "Order"           TO ai_readonly;
GRANT SELECT ON "Product"         TO ai_readonly;
GRANT SELECT ON "BranchPrice"     TO ai_readonly;
GRANT SELECT ON "StockRequest"    TO ai_readonly;
GRANT SELECT ON "Branch"          TO ai_readonly;

-- 5. AI tablolarına OKUMA + YAZMA yetkisi
-- (AI kendi hafıza ve log tablolarına yazar)
GRANT SELECT, INSERT ON "AiKnowledgeChunk"      TO ai_readonly;
GRANT SELECT, INSERT ON "AiConversationMemory"  TO ai_readonly;
GRANT SELECT, INSERT ON "AiAgentLog"            TO ai_readonly;

-- 6. CUID sequence'larına erişim (INSERT için gerekli değil — cuid() uygulama tarafında)
-- Eğer serial/sequence kullansaydı gerekecekti

-- 7. CustomerChat ve Message tablolarına erişim YOKTUR
-- Bu tablolara yazma, ERP'nin kendi /api/ai-agent/webhook endpoint'i üzerinden yapılır
-- (JWT service-account token ile, doğrudan DB yazısı değil)

-- Doğrulama: Rol yetkilerini kontrol et
-- \dp "Customer"
-- \dp "AiAgentLog"
