-- =====================================================================
-- Migration: whatsapp_chat_v2
-- Tarih: 2026-07-10
-- Açıklama: WhatsApp benzeri tam chat sistemi için veritabanı şeması
-- =====================================================================

-- 1. ChatConversation — Ana konuşma tablosu (DM, Grup, Şube Kanalı, Broadcast)
CREATE TABLE "ChatConversation" (
    "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "type"                  TEXT NOT NULL DEFAULT 'dm',
    "name"                  TEXT,
    "description"           TEXT,
    "avatarUrl"             TEXT,
    "branchId"              TEXT,
    "createdById"           TEXT NOT NULL,
    "isArchived"            BOOLEAN NOT NULL DEFAULT false,
    "isBroadcast"           BOOLEAN NOT NULL DEFAULT false,
    "lastMessageId"         TEXT,
    "lastActivityAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxParticipants"       INTEGER NOT NULL DEFAULT 1024,
    "onlyAdminCanMessage"   BOOLEAN NOT NULL DEFAULT false,
    "onlyAdminCanEditInfo"  BOOLEAN NOT NULL DEFAULT false,
    "disappearingMessages"  BOOLEAN NOT NULL DEFAULT false,
    "disappearingDuration"  INTEGER,
    "inviteLink"            TEXT,
    "inviteLinkActive"      BOOLEAN NOT NULL DEFAULT true,
    "customEmoji"           TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- 2. ChatParticipant — Konuşma katılımcıları
CREATE TABLE "ChatParticipant" (
    "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId"      TEXT NOT NULL,
    "userId"              TEXT NOT NULL,
    "role"                TEXT NOT NULL DEFAULT 'member',
    "joinedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt"              TIMESTAMP(3),
    "removedById"         TEXT,
    "isRemoved"           BOOLEAN NOT NULL DEFAULT false,
    "lastReadAt"          TIMESTAMP(3),
    "lastReadMessageId"   TEXT,
    "notificationSound"   TEXT,
    "nickname"            TEXT,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- 3. Message — Genişletilmiş mesaj tablosu (mevcut tablo değiştirilir)
-- Önce eski Message tablosunu yeniden adlandır (geriye uyumluluk için sakla)
ALTER TABLE "Message" RENAME TO "Message_legacy";

-- Yeni kapsamlı Message tablosu
CREATE TABLE "Message" (
    "id"                          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId"              TEXT NOT NULL,
    "fromUserId"                  TEXT NOT NULL,
    "content"                     TEXT NOT NULL DEFAULT '',
    "contentType"                 TEXT NOT NULL DEFAULT 'text',
    -- Dosya/Medya
    "fileUrl"                     TEXT,
    "fileType"                    TEXT,
    "fileName"                    TEXT,
    "fileSize"                    BIGINT,
    "fileDuration"                INTEGER,
    "thumbnailUrl"                TEXT,
    "waveformData"                TEXT,
    -- Konum
    "locationLat"                 DOUBLE PRECISION,
    "locationLng"                 DOUBLE PRECISION,
    "locationAddress"             TEXT,
    "locationName"                TEXT,
    -- Yanıt (Reply)
    "replyToMessageId"            TEXT,
    "replyPreviewText"            TEXT,
    "replyPreviewType"            TEXT,
    "replyFromUserId"             TEXT,
    -- İletme (Forward)
    "isForwarded"                 BOOLEAN NOT NULL DEFAULT false,
    "forwardedFromConversationId" TEXT,
    "forwardCount"                INTEGER NOT NULL DEFAULT 0,
    -- Düzenleme/Silme
    "isEdited"                    BOOLEAN NOT NULL DEFAULT false,
    "editedAt"                    TIMESTAMP(3),
    "isDeleted"                   BOOLEAN NOT NULL DEFAULT false,
    "deletedAt"                   TIMESTAMP(3),
    "deletedForAll"               BOOLEAN NOT NULL DEFAULT false,
    -- Kaybolan mesajlar
    "isSelfDestruct"              BOOLEAN NOT NULL DEFAULT false,
    "selfDestructAt"              TIMESTAMP(3),
    -- Yıldız/Sabitleme
    "isStarred"                   BOOLEAN NOT NULL DEFAULT false,
    "isPinned"                    BOOLEAN NOT NULL DEFAULT false,
    -- Sistem mesajları
    "isSystemMessage"             BOOLEAN NOT NULL DEFAULT false,
    "systemAction"                TEXT,
    -- Poll/Anket
    "pollData"                    TEXT,
    -- Zamanlama
    "scheduledAt"                 TIMESTAMP(3),
    -- Geriye uyumluluk (deprecated)
    "toUserId"                    TEXT,
    "branchId"                    TEXT,
    "isRead"                      BOOLEAN NOT NULL DEFAULT false,
    -- Zaman damgaları
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- 4. MessageReaction — Emoji reaksiyonları
CREATE TABLE "MessageReaction" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "messageId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "emoji"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- 5. MessageReadReceipt — Çoklu okundu bilgisi
CREATE TABLE "MessageReadReceipt" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "messageId"   TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "readAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id")
);

-- 6. MessageMention — @mention kayıtları
CREATE TABLE "MessageMention" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "messageId"       TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,

    CONSTRAINT "MessageMention_pkey" PRIMARY KEY ("id")
);

-- 7. PinnedMessage — Sabitlenmiş mesajlar
CREATE TABLE "PinnedMessage" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "messageId"      TEXT NOT NULL,
    "pinnedById"     TEXT NOT NULL,
    "pinnedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedMessage_pkey" PRIMARY KEY ("id")
);

-- 8. VoiceMessage — Sesli mesaj detayları
CREATE TABLE "VoiceMessage" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "messageId"  TEXT NOT NULL,
    "duration"   INTEGER NOT NULL,
    "waveform"   TEXT,
    "isListened" BOOLEAN NOT NULL DEFAULT false,
    "fileSize"   BIGINT,

    CONSTRAINT "VoiceMessage_pkey" PRIMARY KEY ("id")
);

-- 9. MessageForward — Mesaj iletme geçmişi
CREATE TABLE "MessageForward" (
    "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "originalMessageId"  TEXT NOT NULL,
    "forwardedMessageId" TEXT NOT NULL,
    "forwardedByUserId"  TEXT NOT NULL,
    "forwardedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageForward_pkey" PRIMARY KEY ("id")
);

-- 10. MessageStar — Yıldızlanan mesajlar
CREATE TABLE "MessageStar" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "messageId" TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "starredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageStar_pkey" PRIMARY KEY ("id")
);

-- 11. ChatMuteSettings — Sessizleştirme ayarları
CREATE TABLE "ChatMuteSettings" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "mutedUntil"     TIMESTAMP(3),
    "showPreview"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMuteSettings_pkey" PRIMARY KEY ("id")
);

-- 12. UserPresence — Anlık durum takibi
CREATE TABLE "UserPresence" (
    "id"                         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"                     TEXT NOT NULL,
    "isOnline"                   BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenHidden"             BOOLEAN NOT NULL DEFAULT false,
    "typingInConversationId"     TEXT,
    "recordingInConversationId"  TEXT,
    "updatedAt"                  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- 13. UserBlock — Kullanıcı engelleme listesi
CREATE TABLE "UserBlock" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- 14. BroadcastList — Yayın listeleri
CREATE TABLE "BroadcastList" (
    "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name"        TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "branchId"    TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BroadcastList_pkey" PRIMARY KEY ("id")
);

-- 15. BroadcastListMember — Yayın listesi üyeleri
CREATE TABLE "BroadcastListMember" (
    "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "broadcastListId" TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    "addedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastListMember_pkey" PRIMARY KEY ("id")
);

-- 16. ChatWallpaper — Sohbet duvar kağıdı ayarları
CREATE TABLE "ChatWallpaper" (
    "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "wallpaperType"  TEXT NOT NULL DEFAULT 'default',
    "colorValue"     TEXT,
    "imageUrl"       TEXT,
    "opacity"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatWallpaper_pkey" PRIMARY KEY ("id")
);

-- =====================================================================
-- UNIQUE Kısıtlamaları
-- =====================================================================
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_lastMessageId_key" UNIQUE ("lastMessageId");
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_inviteLink_key" UNIQUE ("inviteLink");
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_userId_key" UNIQUE ("conversationId", "userId");
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_userId_emoji_key" UNIQUE ("messageId", "userId", "emoji");
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_userId_key" UNIQUE ("messageId", "userId");
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_messageId_mentionedUserId_key" UNIQUE ("messageId", "mentionedUserId");
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_conversationId_messageId_key" UNIQUE ("conversationId", "messageId");
ALTER TABLE "VoiceMessage" ADD CONSTRAINT "VoiceMessage_messageId_key" UNIQUE ("messageId");
ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_messageId_userId_key" UNIQUE ("messageId", "userId");
ALTER TABLE "ChatMuteSettings" ADD CONSTRAINT "ChatMuteSettings_conversationId_userId_key" UNIQUE ("conversationId", "userId");
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_key" UNIQUE ("userId");
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_blockedId_key" UNIQUE ("blockerId", "blockedId");
ALTER TABLE "BroadcastListMember" ADD CONSTRAINT "BroadcastListMember_broadcastListId_userId_key" UNIQUE ("broadcastListId", "userId");
ALTER TABLE "ChatWallpaper" ADD CONSTRAINT "ChatWallpaper_conversationId_userId_key" UNIQUE ("conversationId", "userId");

-- =====================================================================
-- INDEX'ler
-- =====================================================================
CREATE INDEX "ChatConversation_branchId_idx" ON "ChatConversation"("branchId");
CREATE INDEX "ChatConversation_lastActivityAt_idx" ON "ChatConversation"("lastActivityAt");
CREATE INDEX "ChatConversation_type_idx" ON "ChatConversation"("type");

CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");
CREATE INDEX "ChatParticipant_conversationId_idx" ON "ChatParticipant"("conversationId");

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_fromUserId_idx" ON "Message"("fromUserId");
CREATE INDEX "Message_isDeleted_idx" ON "Message"("isDeleted");
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");
CREATE INDEX "Message_selfDestructAt_idx" ON "Message"("selfDestructAt");

CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");
CREATE INDEX "MessageReaction_userId_idx" ON "MessageReaction"("userId");

CREATE INDEX "MessageReadReceipt_messageId_idx" ON "MessageReadReceipt"("messageId");
CREATE INDEX "MessageReadReceipt_userId_idx" ON "MessageReadReceipt"("userId");

CREATE INDEX "MessageMention_mentionedUserId_idx" ON "MessageMention"("mentionedUserId");

CREATE INDEX "PinnedMessage_conversationId_idx" ON "PinnedMessage"("conversationId");

CREATE INDEX "MessageForward_originalMessageId_idx" ON "MessageForward"("originalMessageId");

CREATE INDEX "MessageStar_userId_idx" ON "MessageStar"("userId");

CREATE INDEX "ChatMuteSettings_userId_idx" ON "ChatMuteSettings"("userId");

CREATE INDEX "UserPresence_isOnline_idx" ON "UserPresence"("isOnline");

CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");
CREATE INDEX "UserBlock_blockedId_idx" ON "UserBlock"("blockedId");

CREATE INDEX "BroadcastList_createdById_idx" ON "BroadcastList"("createdById");
CREATE INDEX "BroadcastListMember_broadcastListId_idx" ON "BroadcastListMember"("broadcastListId");

-- =====================================================================
-- FOREIGN KEY İlişkileri
-- =====================================================================

-- ChatParticipant
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToMessageId_fkey"
    FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MessageReaction
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MessageReadReceipt
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MessageMention
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageMention" ADD CONSTRAINT "MessageMention_mentionedUserId_fkey"
    FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PinnedMessage
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_pinnedById_fkey"
    FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- VoiceMessage
ALTER TABLE "VoiceMessage" ADD CONSTRAINT "VoiceMessage_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MessageForward
ALTER TABLE "MessageForward" ADD CONSTRAINT "MessageForward_originalMessageId_fkey"
    FOREIGN KEY ("originalMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageForward" ADD CONSTRAINT "MessageForward_forwardedByUserId_fkey"
    FOREIGN KEY ("forwardedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MessageStar
ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatMuteSettings
ALTER TABLE "ChatMuteSettings" ADD CONSTRAINT "ChatMuteSettings_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMuteSettings" ADD CONSTRAINT "ChatMuteSettings_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPresence
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserBlock
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BroadcastList
ALTER TABLE "BroadcastList" ADD CONSTRAINT "BroadcastList_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BroadcastListMember
ALTER TABLE "BroadcastListMember" ADD CONSTRAINT "BroadcastListMember_broadcastListId_fkey"
    FOREIGN KEY ("broadcastListId") REFERENCES "BroadcastList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastListMember" ADD CONSTRAINT "BroadcastListMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ChatWallpaper
ALTER TABLE "ChatWallpaper" ADD CONSTRAINT "ChatWallpaper_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatWallpaper" ADD CONSTRAINT "ChatWallpaper_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Eski mesajları yeni sisteme migrate et (geriye uyumluluk)
-- Mevcut Message_legacy kayıtları için bir "default" DM konuşması oluştur
-- ve bu mesajları yeni sisteme aktar
-- =====================================================================
-- NOT: Bu migration canlı veritabanında çalıştırılırken aşağıdaki bloğu
-- aktif edin. Geliştirme ortamında taze başlangıç için yorumda bırakın.

-- INSERT INTO "ChatConversation" ("id", "type", "createdById", "updatedAt")
-- SELECT gen_random_uuid()::text, 'dm',
--        (SELECT id FROM "User" LIMIT 1),
--        CURRENT_TIMESTAMP
-- WHERE EXISTS (SELECT 1 FROM "Message_legacy");
