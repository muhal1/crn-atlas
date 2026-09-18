-- Kaynak: veri/akademisyenler.json ve İTÜ Kontrol akademik kadro sayfası (2026-09-18).
-- İdempotent katalog güncellemesi; doğrulanan alanları da yeniler.
insert into public.academics (id, name, title, department, topics, source_url, topic_source_url, verified_on)
values
  ('yilmazabdurrah', 'Abdurrahman Yılmaz', 'Dr. Öğr. Üyesi', 'kontrol', ARRAY['Robotik', 'Otonom Sistem Tasarımı', 'Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/yilmazabdurrah', 'https://akademi.itu.edu.tr/yilmazabdurrah', '2026-09-18'),
  ('ahmetonat', 'Ahmet Onat', 'Doç. Dr.', 'kontrol', ARRAY[]::text[], 'https://akademi.itu.edu.tr/ahmetonat', null, '2026-09-18'),
  ('ergenca', 'Ali Fuat Ergenç', 'Doç. Dr.', 'kontrol', ARRAY['Mekatronik', 'Kontrol Teorisi ve Uygulamaları', 'Ölçme Tekniği', 'Sensörler', 'Otomasyon', 'Biyomedikal', 'Nesnelerin Interneti']::text[], 'https://akademi.itu.edu.tr/ergenca', 'https://akademi.itu.edu.tr/ergenca', '2026-09-18'),
  ('fhashemzadeh', 'Farzad Hashemzadeh', 'Doç. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/fhashemzadeh', 'https://akademi.itu.edu.tr/fhashemzadeh', '2026-09-18'),
  ('caliskanf', 'Fikret Çalışkan', 'Prof. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları', 'Devreler ve Sistemler Teorisi', 'Mekatronik', 'Arıza Toleranslı Kontrol', 'Uçuş Kontrol', 'Estimasyon']::text[], 'https://akademi.itu.edu.tr/caliskanf', 'https://akademi.itu.edu.tr/caliskanf', '2026-09-18'),
  ('gulayoke', 'Gülay Öke Günel', 'Prof. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/gulayoke', 'https://akademi.itu.edu.tr/gulayoke', '2026-09-18'),
  ('temeltash', 'Hakan Temeltaş', 'Prof. Dr.', 'kontrol', ARRAY['Robotik', 'Pekiştirmeli öğrenme', 'Robot kontrolü']::text[], 'https://akademi.itu.edu.tr/temeltash', 'https://research.itu.edu.tr/en/persons/hakan-temelta%C5%9F/', '2026-09-18'),
  ('sirmatel', 'Işık İlber Sırmatel', 'Dr. Öğr. Üyesi', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/sirmatel', 'https://akademi.itu.edu.tr/sirmatel', '2026-09-18'),
  ('kocaarslani', 'İlhan Kocaarslan', 'Prof. Dr.', 'kontrol', ARRAY[]::text[], 'https://akademi.itu.edu.tr/kocaarslani', null, '2026-09-18'),
  ('ustoglui', 'İlker Üstoğlu', 'Doç. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları', 'Mekatronik', 'Otonom Sistemler']::text[], 'https://akademi.itu.edu.tr/ustoglui', 'https://akademi.itu.edu.tr/ustoglui', '2026-09-18'),
  ('ucakk', 'Kemal Uçak', 'Doç. Dr.', 'kontrol', ARRAY['Makine Öğrenmesi', 'Kontrol Teorisi ve Uygulamaları', 'Yapay Zeka']::text[], 'https://akademi.itu.edu.tr/ucakk', 'https://akademi.itu.edu.tr/ucakk', '2026-09-18'),
  ('baradarannia', 'Mahdi Baradarannia', 'Doç. Dr.', 'kontrol', ARRAY[]::text[], 'https://akademi.itu.edu.tr/baradarannia', null, '2026-09-18'),
  ('soylemezm', 'Mehmet Turan Söylemez', 'Prof. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları', 'Otonom Sistemler', 'Devreler ve Sistemler Teorisi']::text[], 'https://akademi.itu.edu.tr/soylemezm', 'https://akademi.itu.edu.tr/soylemezm', '2026-09-18'),
  ('mustafadogan', 'Mustafa Doğan', 'Prof. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları', 'Nanoteknoloji', 'Biyomedikal']::text[], 'https://akademi.itu.edu.tr/mustafadogan', 'https://akademi.itu.edu.tr/mustafadogan', '2026-09-18'),
  ('guzelkaya', 'Müjde Güzelkaya', 'Prof. Dr.', 'kontrol', ARRAY['Bulanık Mantık', 'Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/guzelkaya', 'https://akademi.itu.edu.tr/guzelkaya', '2026-09-18'),
  ('oakbati', 'Onur Akbatı', 'Dr. Öğr. Üyesi', 'kontrol', ARRAY['Otomasyon', 'Otonom Sistemler', 'Kontrol Teorisi ve Uygulamaları', 'Robotik']::text[], 'https://akademi.itu.edu.tr/oakbati', 'https://akademi.itu.edu.tr/oakbati', '2026-09-18'),
  ('okerol', 'Osman Kaan Erol', 'Doç. Dr.', 'kontrol', ARRAY[]::text[], 'https://akademi.itu.edu.tr/okerol', null, '2026-09-18'),
  ('yesiloglu', 'Sıddık Murat Yeşiloğlu', 'Dr. Öğr. Üyesi', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları', 'Robotik']::text[], 'https://akademi.itu.edu.tr/yesiloglu', 'https://akademi.itu.edu.tr/yesiloglu', '2026-09-18'),
  ('nengin', 'Şeref Naci Engin', 'Prof. Dr.', 'kontrol', ARRAY['Mekatronik Sistem Tasarımı', 'Kontrol Teorisi ve Uygulamaları', 'Robotik']::text[], 'https://akademi.itu.edu.tr/nengin', 'https://akademi.itu.edu.tr/nengin', '2026-09-18'),
  ('kumbasart', 'Tufan Kumbasar', 'Prof. Dr.', 'kontrol', ARRAY['Bulanık Mantık', 'Yapay Zeka', 'Makine Öğrenmesi', 'Yapay Öğrenme', 'Yapay Zeka (Artificial Intelligence)', 'Kontrol Teorisi ve Uygulamaları', 'Optimizasyon']::text[], 'https://akademi.itu.edu.tr/kumbasart', 'https://akademi.itu.edu.tr/kumbasart', '2026-09-18'),
  ('sezerv', 'Volkan Sezer', 'Prof. Dr.', 'kontrol', ARRAY['Yapay Zeka', 'Otonom Taşıtlar', 'Hibrit ve Elektrikli Araçlar', 'Robotik']::text[], 'https://akademi.itu.edu.tr/sezerv', 'https://akademi.itu.edu.tr/sezerv', '2026-09-18'),
  ('yalciny', 'Yaprak Yalçın', 'Prof. Dr.', 'kontrol', ARRAY['Kontrol Teorisi ve Uygulamaları']::text[], 'https://akademi.itu.edu.tr/yalciny', 'https://akademi.itu.edu.tr/yalciny', '2026-09-18')
on conflict (id) do update set
  name = excluded.name, title = excluded.title, department = excluded.department,
  topics = excluded.topics, source_url = excluded.source_url,
  topic_source_url = excluded.topic_source_url, verified_on = excluded.verified_on;
