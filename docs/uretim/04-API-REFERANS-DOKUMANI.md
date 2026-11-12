# Sunum ERP — Üretim Yönetim Sistemi API Referans Dokümanı (v1.0.0)

Bu doküman, Sunum ERP Üretim Suite'i bünyesindeki 7 RESTful API uç noktasının istek/yanıt sözleşmelerini, parametrelerini, yetki gereksinimlerini ve hata kodlarını açıklar.

---

## 1. Genel Standartlar ve Güvenlik

- **Temel Yol:** `/api/production/`
- **İçerik Türü:** `application/json; charset=utf-8`
- **Kimlik Doğrulama:** JWT Bearer Token veya oturum çerezleri.
- **Özellik Bayrağı Kontrolü:** İlgili özellik bayrağı kapalı ise tüm uç noktalar aşağıdaki gövde ile `403 Forbidden` döner:
  ```json
  {
    "success": false,
    "error": "Bu üretim özelliği henüz aktif edilmemiştir.",
    "code": "FEATURE_DISABLED",
    "featureFlag": "uretim_..."
  }
  ```
- **Yetkisiz Erişim (401/403):** Geçersiz oturumda `401 Unauthorized`, yetersiz rolde `403 Forbidden` döner.

---

## 2. API Uç Noktaları

### 2.1 BOM & Rotalar (`/api/production/bom-rota`)

#### GET — Reçete ve Rota Listesi
- **Sorgu Parametreleri:**
  - `branchId` *(string, opsiyonel)*: Şube filtresi.
  - `status` *(string, opsiyonel)*: `DRAFT` | `IN_REVIEW` | `ACTIVE` | `OBSOLETE`
  - `itemId` *(string, opsiyonel)*: Üst mamul stok ID.
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "bom-001",
        "bomNumber": "BOM-MASA-01",
        "itemId": "item-masa",
        "status": "ACTIVE",
        "baseQuantity": 1,
        "items": [
          {
            "id": "bi-01",
            "componentItemId": "item-ahsap-ayak",
            "quantity": 4,
            "scrapPercent": 2,
            "isPhantom": false
          }
        ],
        "routing": {
          "id": "rt-01",
          "operations": [
            { "operationNumber": 10, "name": "Kesim", "workCenterId": "wc-kesim", "setupMinutes": 15, "runMinutes": 5 }
          ]
        }
      }
    ]
  }
  ```

#### POST — Reçete Yönetimi
- **İstek Gövdesi (`action` bazlı):**
  - `action: "CREATE_BOM"`: Yeni reçete oluşturur.
  - `action: "APPROVE_BOM"`: Reçeteyi `ACTIVE` statüsüne geçirir.
  - `action: "CLONE_REVISION"`: Yeni revizyon kopyalar.

---

### 2.2 MPS & MRP Planlama (`/api/production/mrp-mps`)

#### GET — Planlama Verileri
- **Sorgu Parametreleri:**
  - `view` *(string)*: `PLANS` | `ACTION_MESSAGES` | `RUN_HISTORY`
  - `planId` *(string, opsiyonel)*: MPS plan ID.
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "activePlan": { "id": "mps-2026-q4", "name": "2026 Q4 Ana Plan", "status": "APPROVED" },
      "actionMessages": [
        { "id": "act-01", "itemId": "item-vida", "actionType": "EXPEDITE", "severity": "WARNING", "message": "Tedarik 3 gün öne çekilmeli" }
      ]
    }
  }
  ```

#### POST — MRP Motorunu Çalıştırma
- **İstek Gövdesi:**
  ```json
  {
    "action": "RUN_MRP_EXPLOSION",
    "runType": "FULL_REGENERATION",
    "planId": "mps-2026-q4",
    "options": { "respectSafetyStock": true }
  }
  ```

---

### 2.3 Üretim İş Emirleri (`/api/production/work-orders`)

#### GET — İş Emri Listesi & Detayı
- **Sorgu Parametreleri:**
  - `status` *(string, opsiyonel)*: `DRAFT` | `RELEASED` | `IN_PROGRESS` | `COMPLETED`
  - `workOrderId` *(string, opsiyonel)*: Tekil iş emri detayı.
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "wo-001",
        "workOrderNumber": "WO-2026-0001",
        "itemId": "item-masa",
        "plannedQuantity": 100,
        "producedQuantity": 45,
        "scrapQuantity": 2,
        "status": "IN_PROGRESS",
        "dueDate": "2026-11-20T00:00:00.000Z"
      }
    ]
  }
  ```

#### POST — İş Emri Operasyon Hareketleri
- **İstek Gövdesi:**
  - `action: "RELEASE_ORDER"`: İş emrini serbest bırakır, malzemeleri rezerve eder.
  - `action: "START_OPERATION"`: İstasyonda operasyon başlatır.
  - `action: "COMPLETE_OPERATION"`: Sağlam ve hurda miktarını bildirir.

---

### 2.4 Kapasite Planlama & Çizelgeleme (`/api/production/capacity`)

#### GET — Kapasite Doluluk & Gantt
- **Sorgu Parametreleri:**
  - `mode` *(string)*: `FINITE` | `INFINITE`
  - `startDate` *(string, YYYY-MM-DD)*
  - `endDate` *(string, YYYY-MM-DD)*
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "workCenters": [
        { "workCenterId": "wc-cnc-01", "name": "CNC Tezgahı 1", "utilizationPercent": 84.5, "isBottleneck": false }
      ],
      "ganttTasks": [
        { "taskId": "op-101", "workOrderId": "wo-001", "start": "2026-11-15T08:00:00Z", "end": "2026-11-15T12:30:00Z", "isLocked": true }
      ]
    }
  }
  ```

#### POST — Çizelgeleme ve CTP
- **İstek Gövdesi:**
  - `action: "RUN_SCHEDULING"`: Sonlu kapasite çizelgelemeyi çalıştırır.
  - `action: "SIMULATE_CTP"`: Sipariş için en erken teslim tarihi hesaplar.
  - `action: "PIN_TASK"`: Gantt üzerinde operasyonun saatini kilitler.

---

### 2.5 Kalite Kontrol (`/api/production/quality`)

#### GET — Kalite Muayeneleri & DÖF
- **Sorgu Parametreleri:**
  - `inspectionType` *(string)*: `INCOMING` | `IN_PROCESS` | `FINAL`
  - `status` *(string)*: `PENDING` | `IN_PROGRESS` | `COMPLETED`
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "insp-01",
        "lotNumber": "LOT-202611-01",
        "sampleSize": 32,
        "defectiveCount": 1,
        "decision": "PASSED",
        "aqlStandard": "ISO 2859-1 Level II"
      }
    ]
  }
  ```

#### POST — Numune Kaydı ve Muayene Kararı
- **İstek Gövdesi:**
  ```json
  {
    "action": "SUBMIT_DECISION",
    "inspectionId": "insp-01",
    "decision": "REJECTED",
    "quarantineWarehouseId": "wh-quarantine-01",
    "openCapa": true
  }
  ```

---

### 2.6 Ekipman & Bakım (`/api/production/maintenance`)

#### GET — Varlıklar & Bakım İş Emirleri
- **Sorgu Parametreleri:**
  - `assetId` *(string, opsiyonel)*
  - `status` *(string, opsiyonel)*: `PLANNED` | `BREAKDOWN` | `IN_PROGRESS` | `COMPLETED`
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "assets": [
        { "id": "m-01", "assetCode": "CNC-01", "status": "OPERATIONAL", "mtbfHours": 184.2, "mttrHours": 2.4, "oeePercent": 82.1 }
      ]
    }
  }
  ```

#### POST — Bakım Emri & Telemetri Kaydı
- **İstek Gövdesi:**
  - `action: "RECORD_TELEMETRY"`: Sensör ölçüm verisi kaydeder (sıcaklık, titreşim vb.).
  - `action: "COMPLETE_MAINTENANCE"`: Sarf edilen yedek parçaları ve harcanan süreyi kaydeder.

---

### 2.7 Konsolide Entegrasyon & Dashboard (`/api/production/integration`)

#### GET — Konsolide Üretim Dashboard KPI
- **Sorgu Parametreleri:**
  - `role` *(string)*: `FABRIKA_MUDURU` | `PLANLAMA_SEFI` | `VARDIYA_AMIRI`
- **Başarılı Yanıt (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "kpiSummary": {
        "onTimeDeliveryPercent": 94.2,
        "averageOeePercent": 81.5,
        "scrapRatePercent": 1.8,
        "activeWorkOrdersCount": 18,
        "criticalAlertsCount": 2
      },
      "alerts": [
        { "id": "al-01", "severity": "WARNING", "title": "CNC-01 Aşırı Yük", "message": "Doluluk %96 eşiğini aştı." }
      ]
    }
  }
  ```
