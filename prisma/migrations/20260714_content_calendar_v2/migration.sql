-- ============================================================
-- İçerik Takvimi Yönetim Sistemi — Migration
-- Yeni tablolar: ContentItem, ProductionShoot, ContentMedia,
--               ContentStatusHistory, ContentChatLink
-- ============================================================

-- CreateTable: Ana içerik kaydı
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "description" TEXT,
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "contentType" TEXT NOT NULL DEFAULT 'static_post',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "shooterId" TEXT,
    "editorId" TEXT,
    "managerId" TEXT,
    "shootId" TEXT,
    "clientApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "clientApprovalStatus" TEXT,
    "publishedUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Çekim günü kaydı
CREATE TABLE "ProductionShoot" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "shootDate" TIMESTAMP(3) NOT NULL,
    "shootTime" TEXT,
    "location" TEXT,
    "videographerIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "equipmentNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionShoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Medya dosyaları (versiyon geçmişi destekli)
CREATE TABLE "ContentMedia" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileName" TEXT,
    "fileSize" BIGINT,
    "thumbnailUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "versionNote" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Durum değişikliği geçmişi (polymorphic)
CREATE TABLE "ContentStatusHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ContentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Chat entegrasyon kaydı
CREATE TABLE "ContentChatLink" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT,
    "shootId" TEXT,
    "sentToUserId" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "chatConversationId" TEXT,
    "sentById" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentChatLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ContentItem
CREATE INDEX "ContentItem_branchId_scheduledDate_idx" ON "ContentItem"("branchId", "scheduledDate");
CREATE INDEX "ContentItem_branchId_status_idx" ON "ContentItem"("branchId", "status");
CREATE INDEX "ContentItem_shooterId_idx" ON "ContentItem"("shooterId");
CREATE INDEX "ContentItem_editorId_idx" ON "ContentItem"("editorId");
CREATE INDEX "ContentItem_managerId_idx" ON "ContentItem"("managerId");

-- CreateIndex: ProductionShoot
CREATE INDEX "ProductionShoot_branchId_shootDate_idx" ON "ProductionShoot"("branchId", "shootDate");
CREATE INDEX "ProductionShoot_branchId_status_idx" ON "ProductionShoot"("branchId", "status");

-- CreateIndex: ContentMedia
CREATE INDEX "ContentMedia_contentItemId_idx" ON "ContentMedia"("contentItemId");
CREATE INDEX "ContentMedia_contentItemId_version_idx" ON "ContentMedia"("contentItemId", "version");

-- CreateIndex: ContentStatusHistory
CREATE INDEX "ContentStatusHistory_entityType_entityId_idx" ON "ContentStatusHistory"("entityType", "entityId");
CREATE INDEX "ContentStatusHistory_changedById_idx" ON "ContentStatusHistory"("changedById");
CREATE INDEX "ContentStatusHistory_changedAt_idx" ON "ContentStatusHistory"("changedAt");

-- CreateIndex: ContentChatLink
CREATE INDEX "ContentChatLink_contentItemId_idx" ON "ContentChatLink"("contentItemId");
CREATE INDEX "ContentChatLink_shootId_idx" ON "ContentChatLink"("shootId");
CREATE INDEX "ContentChatLink_sentToUserId_idx" ON "ContentChatLink"("sentToUserId");

-- AddForeignKey: ContentItem
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_shootId_fkey"
    FOREIGN KEY ("shootId") REFERENCES "ProductionShoot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ProductionShoot
ALTER TABLE "ProductionShoot" ADD CONSTRAINT "ProductionShoot_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ContentMedia
ALTER TABLE "ContentMedia" ADD CONSTRAINT "ContentMedia_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ContentStatusHistory (polymorphic — her iki modele de bağlı)
ALTER TABLE "ContentStatusHistory" ADD CONSTRAINT "csh_content_item_fk"
    FOREIGN KEY ("entityId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- NOT: ProductionShoot FK aynı sütun üzerinden — uygulama katmanında entityType ile ayrıştırılır
-- İki ayrı FK aynı sütuna eklenemez; entityType + entityId birlikte kullanılır

-- AddForeignKey: ContentChatLink
ALTER TABLE "ContentChatLink" ADD CONSTRAINT "ContentChatLink_contentItemId_fkey"
    FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentChatLink" ADD CONSTRAINT "ContentChatLink_shootId_fkey"
    FOREIGN KEY ("shootId") REFERENCES "ProductionShoot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
