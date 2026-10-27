const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'storage', 'ajans-kutuphanesi', '.local-db.json');

console.log("==================================================================");
console.log("🔍 ÇİÇEKANA ERP DEMO VERİTABANI DOĞRULAMA VE TEST ARACI");
console.log("==================================================================");

if (!fs.existsSync(DB_PATH)) {
  console.error("❌ Veritabanı dosyası bulunamadı:", DB_PATH);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const stats = fs.statSync(DB_PATH);
console.log(`📁 Veritabanı Boyutu: ${(stats.size / 1024).toFixed(2)} KB`);

const requiredTables = [
  'branch',
  'user',
  'role',
  'userBranchRole',
  'module',
  'customer',
  'customerNote',
  'customerChat',
  'customerDocument',
  'customerTask',
  'customerContact',
  'order',
  'lead',
  'project',
  'finance',
  'product',
  'branchPrice',
  'stockRequest',
  'cargoTracking',
  'candidate',
  'candidateDocument',
  'candidateChat',
  'appointment',
  'reminder',
  'todo',
  'note',
  'announcement',
  'calculationHistory',
  'faq',
  'supportTicket',
  'internalTask',
  'internalTaskStatusLog',
  'activeTask',
  'eodReport',
  'niche',
  'contentStore',
  'contentItem',
  'productionShoot',
  'revisionRequest',
  'libraryFolder',
  'libraryFile',
  'chatConversation',
  'chatParticipant',
  'message',
  'messageReaction',
  'userPresence',
  'trashItem',
  'notification',
  'auditLog'
];

let allPassed = true;
let totalRecords = 0;

console.log("\n📊 Tablo Kayıt Sayıları ve Durum:");
console.log("------------------------------------------------------------------");
requiredTables.forEach(table => {
  const count = (db[table] && Array.isArray(db[table])) ? db[table].length : 0;
  totalRecords += count;
  const statusIcon = count > 0 ? "✅" : "⚠️";
  console.log(`${statusIcon} ${table.padEnd(25)} : ${count.toString().padStart(4)} kayıt`);
  if (count === 0 && table !== 'libraryFilePermission') {
    allPassed = false;
  }
});

console.log("------------------------------------------------------------------");
console.log(`📦 Toplam Koleksiyon Sayısı: ${requiredTables.length}`);
console.log(`📈 Toplam Kayıt Sayısı      : ${totalRecords}`);

// Test Relation Integrity
console.log("\n🔗 İlişkisel Bütünlük Testleri:");
let relationErrors = 0;

// Test Orders have matching Customers and Branches
db.order.forEach(order => {
  const cust = db.customer.find(c => c.id === order.customerId);
  const br = db.branch.find(b => b.id === order.branchId);
  if (!cust) {
    console.error(`❌ Sipariş #${order.orderNumber} müşterisi bulunamadı (customerId: ${order.customerId})`);
    relationErrors++;
  }
  if (!br) {
    console.error(`❌ Sipariş #${order.orderNumber} şubesi bulunamadı (branchId: ${order.branchId})`);
    relationErrors++;
  }
});

// Test Customers have valid Branch
db.customer.forEach(customer => {
  const br = db.branch.find(b => b.id === customer.branchId);
  if (!br) {
    console.error(`❌ Müşteri ${customer.company} şubesi bulunamadı (branchId: ${customer.branchId})`);
    relationErrors++;
  }
});

// Test Chat Conversations have participants
db.chatConversation.forEach(conv => {
  const participants = db.chatParticipant.filter(p => p.conversationId === conv.id);
  if (participants.length === 0) {
    console.error(`❌ Sohbet ID ${conv.id} için katılımcı bulunamadı.`);
    relationErrors++;
  }
});

if (relationErrors === 0) {
  console.log("✅ Tüm ilişkisel bağlantılar (Müşteri <-> Sipariş <-> Şube <-> Sohbet) hatasız bağlandı!");
} else {
  console.error(`❌ Toplam ${relationErrors} adet ilişkisel tutarsızlık tespit edildi.`);
  allPassed = false;
}

console.log("\n==================================================================");
if (allPassed && relationErrors === 0) {
  console.log("🎉 TÜM DOĞRULAMA TESTLERİ BAŞARIYLA TAMAMLANDI! SISTEM SUNUMA HAZIR.");
} else {
  console.log("⚠️ Bazı kontrollerde eksikler var.");
}
console.log("==================================================================\n");
