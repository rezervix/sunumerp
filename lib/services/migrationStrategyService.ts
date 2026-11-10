import fs from "fs"
import path from "path"

export const URETIM_TABLE_PREFIX = "Uretim"
export const URETIM_JSON_KEY_PREFIX = "uretim"

export interface MigrationValidationResult {
  valid: boolean
  migrationName: string
  addedTables: string[]
  alteredTables: string[]
  rollbackTables: string[]
  errors: string[]
}

const FORBIDDEN_UP_PATTERNS: Array<{ regex: RegExp; reason: string }> = [
  { regex: /\bDROP\s+TABLE\b/i, reason: "Additive migration içinde DROP TABLE yasaktır." },
  { regex: /\bDROP\s+COLUMN\b/i, reason: "Additive migration içinde mevcut kolonu silmek (DROP COLUMN) yasaktır." },
  { regex: /\bRENAME\s+COLUMN\b/i, reason: "Mevcut kolonu yeniden adlandırmak (RENAME COLUMN) yasaktır." },
  { regex: /\bRENAME\s+TO\b/i, reason: "Tablo veya kolon yeniden adlandırma (RENAME TO) yasaktır." },
  { regex: /\bALTER\s+COLUMN\b[\s\S]*?\bTYPE\b/i, reason: "Mevcut kolonun veri tipini değiştirmek (ALTER COLUMN TYPE) yasaktır." },
  { regex: /\bTRUNCATE\b/i, reason: "TRUNCATE işlemi yasaktır." },
  { regex: /\bDELETE\s+FROM\b/i, reason: "Migration içinde DELETE FROM ile veri silmek yasaktır." },
]

/**
 * Üretim modülleri için yazılan bir SQL migration (up) ve rollback (down) çiftinin:
 * 1) Sadece ekleme (additive) yaptığını,
 * 2) Yeni tabloların "Uretim" önekine sahip olduğunu,
 * 3) Her eklenen tablo için rollback (down) karşılığı bulunduğunu doğrular.
 */
export function validateAdditiveMigrationSql(
  migrationName: string,
  upSql: string,
  downSql: string
): MigrationValidationResult {
  const errors: string[] = []

  // Yorum satırlarını temizleyerek analiz et
  const stripComments = (sql: string) =>
    sql
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n")

  const cleanUp = stripComments(upSql)
  const cleanDown = stripComments(downSql)

  if (!cleanUp.trim()) {
    errors.push("migration.sql (UP) içeriği boş olamaz.")
  }

  if (!cleanDown.trim()) {
    errors.push("rollback.sql (DOWN) içeriği boş olamaz.")
  }

  // 1. Yasaklı yıkıcı (destructive) ifadeleri kontrol et
  for (const rule of FORBIDDEN_UP_PATTERNS) {
    if (rule.regex.test(cleanUp)) {
      errors.push(rule.reason)
    }
  }

  // 2. CREATE TABLE ifadelerini bul ve "Uretim" önekini doğrula
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi
  const addedTables: string[] = []
  let match: RegExpExecArray | null
  while ((match = createTableRegex.exec(cleanUp)) !== null) {
    const tableName = match[1]
    addedTables.push(tableName)
    if (!tableName.startsWith(URETIM_TABLE_PREFIX)) {
      errors.push(
        `Yeni tablo '${tableName}' zorunlu '${URETIM_TABLE_PREFIX}' önekine uymuyor (Örn: "${URETIM_TABLE_PREFIX}${tableName}").`
      )
    }
  }

  // IF NOT EXISTS zorunluluğu kontrolü
  const unsafeCreateRegex = /CREATE\s+TABLE\s+"([^"]+)"/gi
  if (unsafeCreateRegex.test(cleanUp)) {
    errors.push("CREATE TABLE ifadelerinde 'IF NOT EXISTS' kullanımı zorunludur.")
  }

  // 3. ALTER TABLE ifadelerini bul
  const alterTableRegex = /ALTER\s+TABLE\s+"([^"]+)"/gi
  const alteredTablesSet = new Set<string>()
  while ((match = alterTableRegex.exec(cleanUp)) !== null) {
    alteredTablesSet.add(match[1])
  }
  const alteredTables = Array.from(alteredTablesSet)

  // 4. Rollback (downSql) içinde yeni eklenen her tablo için DROP TABLE IF EXISTS var mı?
  const dropTableRegex = /DROP\s+TABLE\s+IF\s+EXISTS\s+"([^"]+)"/gi
  const rollbackTables: string[] = []
  while ((match = dropTableRegex.exec(cleanDown)) !== null) {
    rollbackTables.push(match[1])
  }

  for (const tbl of addedTables) {
    if (!rollbackTables.includes(tbl)) {
      errors.push(
        `Yeni eklenen '${tbl}' tablosu için rollback.sql içinde 'DROP TABLE IF EXISTS "${tbl}"' ifadesi bulunamadı.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    migrationName,
    addedTables,
    alteredTables,
    rollbackTables,
    errors,
  }
}

/**
 * prisma/migrations dizini altındaki tüm *_uretim_* migration klasörlerini tarar ve doğrular.
 */
export function validateAllUretimMigrations(): MigrationValidationResult[] {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations")
  if (!fs.existsSync(migrationsDir)) return []

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
  const results: MigrationValidationResult[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.includes("uretim")) continue
    const folderPath = path.join(migrationsDir, entry.name)
    const upPath = path.join(folderPath, "migration.sql")
    const downPath = path.join(folderPath, "rollback.sql")

    const upSql = fs.existsSync(upPath) ? fs.readFileSync(upPath, "utf8") : ""
    const downSql = fs.existsSync(downPath) ? fs.readFileSync(downPath, "utf8") : ""

    results.push(validateAdditiveMigrationSql(entry.name, upSql, downSql))
  }

  return results
}
