-- ============================================================================
-- Çiçekana Kurumsal Kaynak Planlama Sistemi (Çiçekana ERP)
-- Tanıtım ve Müşteri Sunumu İçin Zenginleştirilmiş Demo Veritabanı Scripti
-- ============================================================================

-- 1. Demo Kullanıcılar (Users)
INSERT INTO users (id, email, password_hash, full_name, phone, is_active) VALUES
('10000000-0000-0000-0000-000000000001', 'murat.cicek@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Murat Çiçek', '+90 532 100 0001', true),
('10000000-0000-0000-0000-000000000002', 'melis.sen@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Melis Şen', '+90 532 100 0002', true),
('10000000-0000-0000-0000-000000000003', 'cem.aslan@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Cem Aslan', '+90 532 100 0003', true),
('10000000-0000-0000-0000-000000000004', 'emre.yildirim@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Emre Yıldırım', '+90 532 100 0004', true),
('10000000-0000-0000-0000-000000000005', 'kemal.ozturk@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Kemal Öztürk', '+90 532 100 0005', true),
('10000000-0000-0000-0000-000000000006', 'zeynep.demir@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Zeynep Demir', '+90 532 100 0006', true),
('10000000-0000-0000-0000-000000000007', 'burak.celik@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Burak Çelik', '+90 532 100 0007', true),
('10000000-0000-0000-0000-000000000008', 'selin.koc@cicekana.com', '$2a$10$rXqHqHqHqHqHqHqHqHqHqOGmv7QgX.y4vKt3fC0/E4Y8Y8Y8Y8Y8Y', 'Selin Koç', '+90 532 100 0008', true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

-- 2. Demo Şubeler (Branches)
INSERT INTO branches (id, name, code, address, phone, email, manager_id, is_active, theme_color) VALUES
('20000000-0000-0000-0000-000000000001', 'Merkez Ofis (Genel Müdürlük)', 'HQ-001', 'Büyükdere Cad. No:199 Levent / Beşiktaş / İstanbul', '+90 212 355 0000', 'merkez@cicekana.com', '10000000-0000-0000-0000-000000000001', true, '#4F46E5'),
('20000000-0000-0000-0000-000000000002', 'Ankara Şubesi', 'ANK-001', 'Kızılay Mah. Atatürk Bulvarı No:142 Çankaya / Ankara', '+90 312 419 0000', 'ankara@cicekana.com', '10000000-0000-0000-0000-000000000003', true, '#0EA5E9'),
('20000000-0000-0000-0000-000000000003', 'İzmir Şubesi', 'IZM-001', 'Şair Eşref Bulvarı No:68 Alsancak / Konak / İzmir', '+90 232 464 0000', 'izmir@cicekana.com', '10000000-0000-0000-0000-000000000004', true, '#10B981'),
('20000000-0000-0000-0000-000000000004', 'Bursa Şubesi', 'BUR-001', 'FSM Bulvarı No:84 Nilüfer / Bursa', '+90 224 245 0000', 'bursa@cicekana.com', '10000000-0000-0000-0000-000000000007', true, '#F59E0B')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 3. Kullanıcı Şube ve Rol Eşleştirmeleri (User Branch Roles)
INSERT INTO user_branch_roles (user_id, branch_id, role_id) VALUES
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005'),
('10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
('10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002'),
('10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (user_id, branch_id, role_id) DO NOTHING;

-- 4. Kurumsal Müşteriler (Customers)
INSERT INTO customers (id, branch_id, name, email, phone, company, address, status, notes) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ziraat Finans Grubu Genel Müdürlüğü', 'kurumsal@ziraatbank.com.tr', '+90 216 555 1000', 'T.C. Ziraat Bankası A.Ş.', 'Finanskent Mah. Finans Cad. No:42 Ümraniye / İstanbul', 'active', 'Yıllık kurumsal etkinlik ve medya hizmet sözleşmesi aktif. VIP Statüde.'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Çiçek Sepeti Dijital Pazarlama', 'b2b-destek@ciceksepeti.com', '+90 212 393 4000', 'ÇiçekSepeti İnternet Hizmetleri A.Ş.', 'Esentepe Mah. Kore Şehitleri Cad. No:16 Şişli / İstanbul', 'active', 'E-ticaret sezonluk kampanya yönetimi ve görsel içerik üretimi.'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'Vodafone Türkiye Kurumsal İletişim', 'enterprise@vodafone.com.tr', '+90 212 367 0000', 'Vodafone Telekomünikasyon A.Ş.', 'Maslak Mah. Sümer Sok. No:1 Sarıyer / İstanbul', 'active', 'Gençlik segmenti sosyal medya stratejisi ve video prodüksiyonu.'),
('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Garanti BBVA Marka Yönetimi', 'pazarlama@garantibbva.com.tr', '+90 212 318 1818', 'Türkiye Garanti Bankası A.Ş.', 'Nispetiye Mah. Aytar Cad. No:2 Beşiktaş / İstanbul', 'active', 'Sürdürülebilirlik raporu lansmanı ve içerik takvimi.'),
('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Koç Sistem Bilgi İletişim A.Ş.', 'bilgi@kocsistem.com.tr', '+90 216 556 1000', 'KoçSistem Bilgi ve İletişim Hizmetleri', 'Altunizade Mah. Mahir İz Cad. No:26 Üsküdar / İstanbul', 'active', 'Bulut çözümleri B2B broşür ve dijital katalog tasarımı.'),
('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'Teknosa İç ve Dış Ticaret A.Ş.', 'tedarik@teknosa.com', '+90 216 468 3000', 'Teknosa İç ve Dış Ticaret A.Ş.', 'Carrefoursa Plaza Cevizli Mah. Tugay Yolu Maltepe / İstanbul', 'active', 'Okula dönüş kampanyası mağaza içi görsel materyaller ve video çekimleri.'),
('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'D-Market Elektronik Hizmetler (Hepsiburada)', 'merchant@hepsiburada.com', '+90 212 304 2000', 'Hepsiburada A.Ş.', 'Kuştepe Mah. Mecidiyeköy Yolu Cad. Trump Towers No:12 Şişli / İstanbul', 'active', 'Efsane Cuma hazırlık sprinti ve influencer işbirlikleri.'),
('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'Pegasus Hava Taşımacılığı A.Ş.', 'corporate@flypgs.com', '+90 216 560 7000', 'Pegasus Hava Taşımacılığı A.Ş.', 'Aeropark Yenişehir Mah. Osmanlı Bulv. No:11/A Pendik / İstanbul', 'active', 'Yurt dışı rotalar tanıtım reels serisi ve uçak içi dergi içerikleri.'),
('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002', 'DeFacto Perakende Ticaret A.Ş.', 'pazarlama@defacto.com.tr', '+90 212 705 1212', 'DeFacto Perakende Ticaret A.Ş.', 'DeFacto Plaza Basın Ekspres Yolu Halkalı Küçükçekmece / İstanbul', 'active', 'Sonbahar-Kış koleksiyon lansmanı ve stüdyo fotoğraf çekimleri.'),
('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', 'Şölen Çikolata Gıda San. A.Ş.', 'info@solen.com.tr', '+90 342 211 8000', 'Şölen Çikolata Gıda Sanayi A.Ş.', '4. Organize Sanayi Bölgesi 83414 Nolu Cad. No:1 Şehitkamil / Gaziantep', 'active', 'Yeni ürün lansman ambalaj tasarımı ve animasyon reklam filmi.'),
('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003', 'Vestel Elektronik Sanayi A.Ş.', 'kurumsal@vestel.com.tr', '+90 236 226 3000', 'Vestel Elektronik Ticaret A.Ş.', 'Organize Sanayi Bölgesi 45030 Manisa', 'active', 'Beyaz eşya akıllı ev sistemleri UI/UX danışmanlığı.'),
('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', 'Anadolu Efes Biracılık San. A.Ş.', 'iletisim@anadoluefes.com', '+90 216 573 8000', 'Anadolu Efes Biracılık ve Malt Sanayii A.Ş.', 'Fatih Sultan Mehmet Mah. Balkan Cad. No:58 Buyaka Ümraniye / İstanbul', 'active', 'Festival sponsorlukları ve saha aktivasyon materyalleri.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company;

-- 5. CRM Fırsatları ve Potansiyel Müşteriler (Leads)
INSERT INTO leads (id, branch_id, name, email, phone, company, source, status, priority, score, estimated_value, notes, created_by) VALUES
('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Migros Ticaret A.Ş.', 'iletisim@migros.com.tr', '+90 216 579 3000', 'Migros Ticaret A.Ş.', 'Referans', 'proposal', 'hot', 95, 240000.00, 'Tüm mağazalar içi dijital ekran içerik yönetimi teklif aşamasında.', '10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'LC Waikiki Mağazacılık', 'kurumsal@lcwaikiki.com', '+90 212 657 5555', 'LC Waikiki Mağazacılık Hizmetleri', 'Doğrudan Başvuru', 'negotiation', 'hot', 90, 185000.00, 'Global sosyal medya hesapları içerik prodüksiyonu sözleşme revizyonunda.', '10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Eczacıbaşı Tüketim Ürünleri', 'pazarlama@eczacibasi.com.tr', '+90 216 585 8000', 'Eczacıbaşı Holding', 'LinkedIn B2B', 'contacted', 'warm', 75, 120000.00, 'Kişisel bakım markaları lansman prodüksiyonu toplantısı gerçekleştirildi.', '10000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Beko Global Pazarlama', 'b2b@beko.com', '+90 212 314 3434', 'Arçelik / Beko', 'Etkinlik / Fuar', 'qualified', 'hot', 88, 310000.00, 'IFA Berlin fuarı stant tanıtım filmleri ve 3D animasyonlar için teklif istendi.', '10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Getir Perakende Lojistik', 'growth@getir.com', '+90 212 285 0000', 'Getir Perakende Lojistik A.Ş.', 'Web Formu', 'new', 'warm', 65, 95000.00, 'Kullanıcı kazanımı reklam kreatifleri ve banner setleri talebi alındı.', '10000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003', 'Sütaş Süt Ürünleri A.Ş.', 'iletisim@sutas.com.tr', '+90 224 275 0000', 'Sütaş A.Ş.', 'Referans', 'proposal', 'hot', 85, 150000.00, 'Çiftlikten Sofraya belgesel içerik serisi ve YouTube prodüksiyonu.', '10000000-0000-0000-0000-000000000004'),
('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004', 'Tofaş Türk Otomobil Fabrikası', 'kurumsal@tofas.com.tr', '+90 224 261 0350', 'Tofaş A.Ş.', 'Doğrudan Başvuru', 'negotiation', 'hot', 92, 450000.00, 'Yeni elektrikli model lansman etkinliği ve VR showroom deneyimi.', '10000000-0000-0000-0000-000000000007'),
('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'Trendyol Grup', 'seller-marketing@trendyol.com', '+90 212 331 0200', 'DSM Grup Danışmanlık A.Ş.', 'LinkedIn B2B', 'contacted', 'warm', 70, 160000.00, 'Satıcı akademisi video eğitim serisi için ilk görüşme olumlu geçti.', '10000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, estimated_value = EXCLUDED.estimated_value;

-- 6. Finansal İşlemler (Financial Transactions)
INSERT INTO financial_transactions (branch_id, type, category, amount, description, transaction_date, created_by) VALUES
('20000000-0000-0000-0000-000000000001', 'income', 'Proje Geliri', 185000.00, 'Ziraat Bankası Yıllık Medya Hizmet Hakediş 1. Taksit', CURRENT_DATE - INTERVAL '2 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'income', 'Prodüksiyon Geliri', 92000.00, 'Çiçek Sepeti 3D Ürün Render ve Video Teslimi Tahsilatı', CURRENT_DATE - INTERVAL '4 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'income', 'Danışmanlık Geliri', 140000.00, 'Vodafone Gençlik Kampanyası Danışmanlık ve Strateji Bedeli', CURRENT_DATE - INTERVAL '7 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'income', 'Proje Geliri', 78000.00, 'Garanti BBVA Sürdürülebilirlik Raporu Tasarım Bedeli', CURRENT_DATE - INTERVAL '9 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000002', 'income', 'Hizmet Geliri', 115000.00, 'Teknosa Okula Dönüş Kampanyası Görsel Prodüksiyon Hakedişi', CURRENT_DATE - INTERVAL '3 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000003', 'income', 'Prodüksiyon Geliri', 125000.00, 'Şölen Çikolata Lansman Filmi Prodüksiyon Bedeli', CURRENT_DATE - INTERVAL '5 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000004', 'income', 'Hizmet Geliri', 165000.00, 'Anadolu Efes Festival Tanıtım Materyalleri ve Tasarım', CURRENT_DATE - INTERVAL '8 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'expense', 'Stüdyo ve Ekipman Kiralama', 24000.00, 'Kamera, optik set ve ışık ekipmanı kiralama faturası', CURRENT_DATE - INTERVAL '1 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'expense', 'Yazılım ve Bulut Altyapısı', 18500.00, 'AWS Cloud, Adobe Creative Cloud ve Render Farm lisansları', CURRENT_DATE - INTERVAL '6 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000001', 'expense', 'Ofis ve Tesis Giderleri', 42000.00, 'Levent Merkez Ofis aidat, enerji ve fiber internet giderleri', CURRENT_DATE - INTERVAL '10 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000002', 'expense', 'Lojistik ve Kargo', 7800.00, 'Ankara Şube basılı prova gönderileri ve kurye masrafları', CURRENT_DATE - INTERVAL '4 days', '10000000-0000-0000-0000-000000000005'),
('20000000-0000-0000-0000-000000000003', 'expense', 'Telif ve Seslendirme', 14500.00, 'Reklam filmi dublaj sanatçıları ve telif hakları ödemesi', CURRENT_DATE - INTERVAL '7 days', '10000000-0000-0000-0000-000000000005');
