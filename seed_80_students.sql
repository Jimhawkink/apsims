-- ============================================================
-- SEED: 80 Students — Run this in Supabase SQL Editor
-- STEP 1: First run this query to get your form and stream IDs:
--
--   SELECT id, form_name, form_level FROM school_forms ORDER BY form_level;
--   SELECT id, stream_name FROM school_streams ORDER BY stream_name;
--
-- STEP 2: Replace the values below with your actual IDs
-- ============================================================

-- ⚠️ EDIT THESE 5 VALUES to match your database:
DO $$
DECLARE
    f1 INT; f2 INT; f3 INT; f4 INT;
    s1 INT; s2 INT;
    t_id INT;
BEGIN
    -- Auto-detect form IDs by level
    SELECT id INTO f1 FROM school_forms WHERE form_level = 1 LIMIT 1;
    SELECT id INTO f2 FROM school_forms WHERE form_level = 2 LIMIT 1;
    SELECT id INTO f3 FROM school_forms WHERE form_level = 3 LIMIT 1;
    SELECT id INTO f4 FROM school_forms WHERE form_level = 4 LIMIT 1;

    -- Auto-detect stream IDs (first two streams alphabetically)
    SELECT id INTO s1 FROM school_streams ORDER BY stream_name LIMIT 1;
    SELECT id INTO s2 FROM school_streams ORDER BY stream_name LIMIT 1 OFFSET 1;
    IF s2 IS NULL THEN s2 := s1; END IF;

    -- Auto-detect tenant
    SELECT id INTO t_id FROM school_tenants LIMIT 1;

    RAISE NOTICE 'Using: F1=%, F2=%, F3=%, F4=%, Stream1=%, Stream2=%, Tenant=%',
        f1, f2, f3, f4, s1, s2, t_id;

    -- ============================================================
    -- FORM 1 STREAM 1 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2025/001','BRIAN','OTIENO','Male',f1,s1,'Active','2010-03-12','JOHN OTIENO','0712345001',CURRENT_DATE,t_id),
        ('ADM/2025/002','KEVIN','MWANGI','Male',f1,s1,'Active','2010-07-22','PETER MWANGI','0712345002',CURRENT_DATE,t_id),
        ('ADM/2025/003','ENOCK','KIPNGETICH','Male',f1,s1,'Active','2010-01-15','SAMUEL KIPNGETICH','0712345003',CURRENT_DATE,t_id),
        ('ADM/2025/004','DANIEL','KAMAU','Male',f1,s1,'Active','2010-09-08','JAMES KAMAU','0712345004',CURRENT_DATE,t_id),
        ('ADM/2025/005','VICTOR','OCHIENG','Male',f1,s1,'Active','2010-11-30','PAUL OCHIENG','0712345005',CURRENT_DATE,t_id),
        ('ADM/2025/006','GRACE','WANJIKU','Female',f1,s1,'Active','2010-04-18','MARY WANJIKU','0712345006',CURRENT_DATE,t_id),
        ('ADM/2025/007','FAITH','AKINYI','Female',f1,s1,'Active','2010-06-25','ROSE AKINYI','0712345007',CURRENT_DATE,t_id),
        ('ADM/2025/008','MERCY','NJERI','Female',f1,s1,'Active','2010-02-14','ANN NJERI','0712345008',CURRENT_DATE,t_id),
        ('ADM/2025/009','SHARON','CHEBET','Female',f1,s1,'Active','2010-08-03','JANE CHEBET','0712345009',CURRENT_DATE,t_id),
        ('ADM/2025/010','DIANA','MUTUA','Female',f1,s1,'Active','2010-12-20','LUCY MUTUA','0712345010',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 1 STREAM 2 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2025/011','ALEX','NJOROGE','Male',f1,s2,'Active','2010-05-10','DAVID NJOROGE','0712345011',CURRENT_DATE,t_id),
        ('ADM/2025/012','IAN','WEKESA','Male',f1,s2,'Active','2010-10-17','MOSES WEKESA','0712345012',CURRENT_DATE,t_id),
        ('ADM/2025/013','JOEL','KORIR','Male',f1,s2,'Active','2010-03-28','ELIJAH KORIR','0712345013',CURRENT_DATE,t_id),
        ('ADM/2025/014','MARK','GITONGA','Male',f1,s2,'Active','2010-07-05','STEPHEN GITONGA','0712345014',CURRENT_DATE,t_id),
        ('ADM/2025/015','PAUL','NDUNGU','Male',f1,s2,'Active','2010-01-22','JOSEPH NDUNGU','0712345015',CURRENT_DATE,t_id),
        ('ADM/2025/016','ESTHER','WAMBUI','Female',f1,s2,'Active','2010-09-14','HANNAH WAMBUI','0712345016',CURRENT_DATE,t_id),
        ('ADM/2025/017','LYDIA','ATIENO','Female',f1,s2,'Active','2010-11-07','RUTH ATIENO','0712345017',CURRENT_DATE,t_id),
        ('ADM/2025/018','NAOMI','KARIMI','Female',f1,s2,'Active','2010-04-30','SARAH KARIMI','0712345018',CURRENT_DATE,t_id),
        ('ADM/2025/019','RUTH','CHEPKOECH','Female',f1,s2,'Active','2010-06-12','MIRIAM CHEPKOECH','0712345019',CURRENT_DATE,t_id),
        ('ADM/2025/020','SARAH','MUTHONI','Female',f1,s2,'Active','2010-02-08','ESTHER MUTHONI','0712345020',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 2 STREAM 1 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2024/001','CLINTON','OMONDI','Male',f2,s1,'Active','2009-04-15','GEORGE OMONDI','0712345021',CURRENT_DATE,t_id),
        ('ADM/2024/002','DENNIS','KIPROTICH','Male',f2,s1,'Active','2009-08-22','HENRY KIPROTICH','0712345022',CURRENT_DATE,t_id),
        ('ADM/2024/003','ERIC','MURIUKI','Male',f2,s1,'Active','2009-12-05','CHARLES MURIUKI','0712345023',CURRENT_DATE,t_id),
        ('ADM/2024/004','FRANK','SIMIYU','Male',f2,s1,'Active','2009-03-18','RICHARD SIMIYU','0712345024',CURRENT_DATE,t_id),
        ('ADM/2024/005','GEORGE','NJENGA','Male',f2,s1,'Active','2009-07-29','THOMAS NJENGA','0712345025',CURRENT_DATE,t_id),
        ('ADM/2024/006','ALICE','WAIRIMU','Female',f2,s1,'Active','2009-01-11','BETTY WAIRIMU','0712345026',CURRENT_DATE,t_id),
        ('ADM/2024/007','BRENDA','ADHIAMBO','Female',f2,s1,'Active','2009-05-24','CAROL ADHIAMBO','0712345027',CURRENT_DATE,t_id),
        ('ADM/2024/008','CYNTHIA','WANGARI','Female',f2,s1,'Active','2009-09-16','DOROTHY WANGARI','0712345028',CURRENT_DATE,t_id),
        ('ADM/2024/009','DORIS','JEPKOECH','Female',f2,s1,'Active','2009-11-03','EDITH JEPKOECH','0712345029',CURRENT_DATE,t_id),
        ('ADM/2024/010','EUNICE','NYAMBURA','Female',f2,s1,'Active','2009-02-27','FLORENCE NYAMBURA','0712345030',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 2 STREAM 2 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2024/011','HENRY','MUTUKU','Male',f2,s2,'Active','2009-06-14','ISAAC MUTUKU','0712345031',CURRENT_DATE,t_id),
        ('ADM/2024/012','IAN','CHERUIYOT','Male',f2,s2,'Active','2009-10-08','JACOB CHERUIYOT','0712345032',CURRENT_DATE,t_id),
        ('ADM/2024/013','JAMES','NGUGI','Male',f2,s2,'Active','2009-04-21','KENNETH NGUGI','0712345033',CURRENT_DATE,t_id),
        ('ADM/2024/014','JOHN','BARASA','Male',f2,s2,'Active','2009-08-13','LEONARD BARASA','0712345034',CURRENT_DATE,t_id),
        ('ADM/2024/015','JOSEPH','KIMANI','Male',f2,s2,'Active','2009-12-26','MICHAEL KIMANI','0712345035',CURRENT_DATE,t_id),
        ('ADM/2024/016','GLORIA','NEKESA','Female',f2,s2,'Active','2009-03-09','HELEN NEKESA','0712345036',CURRENT_DATE,t_id),
        ('ADM/2024/017','HELLEN','WANJIRU','Female',f2,s2,'Active','2009-07-02','IRENE WANJIRU','0712345037',CURRENT_DATE,t_id),
        ('ADM/2024/018','IRENE','CHEPKEMOI','Female',f2,s2,'Active','2009-11-15','JUDITH CHEPKEMOI','0712345038',CURRENT_DATE,t_id),
        ('ADM/2024/019','JANET','AUMA','Female',f2,s2,'Active','2009-05-28','KAREN AUMA','0712345039',CURRENT_DATE,t_id),
        ('ADM/2024/020','JOYCE','NJOKI','Female',f2,s2,'Active','2009-09-20','LILIAN NJOKI','0712345040',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 3 STREAM 1 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2023/001','KENNETH','ROTICH','Male',f3,s1,'Active','2008-02-17','NATHAN ROTICH','0712345041',CURRENT_DATE,t_id),
        ('ADM/2023/002','LABAN','ODHIAMBO','Male',f3,s1,'Active','2008-06-30','OLIVER ODHIAMBO','0712345042',CURRENT_DATE,t_id),
        ('ADM/2023/003','MARTIN','GICHUKI','Male',f3,s1,'Active','2008-10-12','PATRICK GICHUKI','0712345043',CURRENT_DATE,t_id),
        ('ADM/2023/004','NELSON','SANG','Male',f3,s1,'Active','2008-01-25','QUENTIN SANG','0712345044',CURRENT_DATE,t_id),
        ('ADM/2023/005','OSCAR','MAINA','Male',f3,s1,'Active','2008-05-08','ROBERT MAINA','0712345045',CURRENT_DATE,t_id),
        ('ADM/2023/006','LINDA','AWINO','Female',f3,s1,'Active','2008-03-21','MARGARET AWINO','0712345046',CURRENT_DATE,t_id),
        ('ADM/2023/007','MARY','WACHIRA','Female',f3,s1,'Active','2008-07-14','NANCY WACHIRA','0712345047',CURRENT_DATE,t_id),
        ('ADM/2023/008','NANCY','JELIMO','Female',f3,s1,'Active','2008-11-27','OLIVIA JELIMO','0712345048',CURRENT_DATE,t_id),
        ('ADM/2023/009','PATRICIA','NDUTA','Female',f3,s1,'Active','2008-04-09','PRISCILLA NDUTA','0712345049',CURRENT_DATE,t_id),
        ('ADM/2023/010','RACHEL','CHEPNGENO','Female',f3,s1,'Active','2008-08-22','QUEEN CHEPNGENO','0712345050',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 3 STREAM 2 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2023/011','PETER','NJUGUNA','Male',f3,s2,'Active','2008-01-04','SAMUEL NJUGUNA','0712345051',CURRENT_DATE,t_id),
        ('ADM/2023/012','PHILIP','KIPTOO','Male',f3,s2,'Active','2008-05-17','TIMOTHY KIPTOO','0712345052',CURRENT_DATE,t_id),
        ('ADM/2023/013','RICHARD','ONYANGO','Male',f3,s2,'Active','2008-09-29','URIAH ONYANGO','0712345053',CURRENT_DATE,t_id),
        ('ADM/2023/014','ROBERT','KARIUKI','Male',f3,s2,'Active','2008-02-11','VICTOR KARIUKI','0712345054',CURRENT_DATE,t_id),
        ('ADM/2023/015','SAMUEL','BETT','Male',f3,s2,'Active','2008-06-24','WALTER BETT','0712345055',CURRENT_DATE,t_id),
        ('ADM/2023/016','SUSAN','MORAA','Female',f3,s2,'Active','2008-04-06','REBECCA MORAA','0712345056',CURRENT_DATE,t_id),
        ('ADM/2023/017','TABITHA','WANJIKU','Female',f3,s2,'Active','2008-08-19','SOPHIA WANJIKU','0712345057',CURRENT_DATE,t_id),
        ('ADM/2023/018','TERESIA','ACHIENG','Female',f3,s2,'Active','2008-12-01','TINA ACHIENG','0712345058',CURRENT_DATE,t_id),
        ('ADM/2023/019','VERONICA','WAMBUA','Female',f3,s2,'Active','2008-03-14','UNA WAMBUA','0712345059',CURRENT_DATE,t_id),
        ('ADM/2023/020','WINNIE','CHEPKURUI','Female',f3,s2,'Active','2008-07-27','VIOLET CHEPKURUI','0712345060',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 4 STREAM 1 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2022/001','STEPHEN','MUTAI','Male',f4,s1,'Active','2007-03-06','WILLIAM MUTAI','0712345061',CURRENT_DATE,t_id),
        ('ADM/2022/002','THOMAS','OUMA','Male',f4,s1,'Active','2007-07-19','XAVIER OUMA','0712345062',CURRENT_DATE,t_id),
        ('ADM/2022/003','TIMOTHY','WAWERU','Male',f4,s1,'Active','2007-11-01','YUSUF WAWERU','0712345063',CURRENT_DATE,t_id),
        ('ADM/2022/004','VICTOR','KIPLAGAT','Male',f4,s1,'Active','2007-04-14','ZACHARY KIPLAGAT','0712345064',CURRENT_DATE,t_id),
        ('ADM/2022/005','WALTER','OCHIENG','Male',f4,s1,'Active','2007-08-27','AARON OCHIENG','0712345065',CURRENT_DATE,t_id),
        ('ADM/2022/006','YVONNE','NJAMBI','Female',f4,s1,'Active','2007-02-09','WAMBUI NJAMBI','0712345066',CURRENT_DATE,t_id),
        ('ADM/2022/007','ZIPPORAH','ATIENO','Female',f4,s1,'Active','2007-06-22','XENIA ATIENO','0712345067',CURRENT_DATE,t_id),
        ('ADM/2022/008','AGNES','WANGUI','Female',f4,s1,'Active','2007-10-05','WENDY WANGUI','0712345068',CURRENT_DATE,t_id),
        ('ADM/2022/009','BEATRICE','CHEPKWONY','Female',f4,s1,'Active','2007-01-18','VIVIAN CHEPKWONY','0712345069',CURRENT_DATE,t_id),
        ('ADM/2022/010','CAROLINE','MWENDE','Female',f4,s1,'Active','2007-05-31','URSULA MWENDE','0712345070',CURRENT_DATE,t_id);

    -- ============================================================
    -- FORM 4 STREAM 2 — 10 students (5M 5F)
    -- ============================================================
    INSERT INTO school_students
        (admission_number,first_name,last_name,gender,form_id,stream_id,status,date_of_birth,guardian_name,guardian_phone,admission_date,tenant_id)
    VALUES
        ('ADM/2022/011','WILLIAM','KIGEN','Male',f4,s2,'Active','2007-04-03','BENEDICT KIGEN','0712345071',CURRENT_DATE,t_id),
        ('ADM/2022/012','XAVIER','MWANGI','Male',f4,s2,'Active','2007-08-16','CORNELIUS MWANGI','0712345072',CURRENT_DATE,t_id),
        ('ADM/2022/013','YUSUF','OTIENO','Male',f4,s2,'Active','2007-12-29','DOMINIC OTIENO','0712345073',CURRENT_DATE,t_id),
        ('ADM/2022/014','ZACHARY','NDIRANGU','Male',f4,s2,'Active','2007-03-11','EDWARD NDIRANGU','0712345074',CURRENT_DATE,t_id),
        ('ADM/2022/015','AARON','KOECH','Male',f4,s2,'Active','2007-07-24','FELIX KOECH','0712345075',CURRENT_DATE,t_id),
        ('ADM/2022/016','DEBORAH','WANJIKU','Female',f4,s2,'Active','2007-05-06','TINA WANJIKU','0712345076',CURRENT_DATE,t_id),
        ('ADM/2022/017','ELIZABETH','AKINYI','Female',f4,s2,'Active','2007-09-19','STELLA AKINYI','0712345077',CURRENT_DATE,t_id),
        ('ADM/2022/018','FELICITY','NJERI','Female',f4,s2,'Active','2007-01-01','ROSE NJERI','0712345078',CURRENT_DATE,t_id),
        ('ADM/2022/019','GEORGINA','CHEBET','Female',f4,s2,'Active','2007-06-14','PRISCAH CHEBET','0712345079',CURRENT_DATE,t_id),
        ('ADM/2022/020','HARRIET','MUTUA','Female',f4,s2,'Active','2007-10-27','OLIVE MUTUA','0712345080',CURRENT_DATE,t_id);

    RAISE NOTICE '✅ 80 students inserted: 4 forms x 2 streams x 10 students. 40 Male, 40 Female.';
END $$;

-- Verify
SELECT sf.form_name, ss.stream_name,
    COUNT(*) AS total,
    SUM(CASE WHEN s.gender='Male' THEN 1 ELSE 0 END) AS males,
    SUM(CASE WHEN s.gender='Female' THEN 1 ELSE 0 END) AS females
FROM school_students s
JOIN school_forms sf ON s.form_id = sf.id
LEFT JOIN school_streams ss ON s.stream_id = ss.id
WHERE s.admission_number LIKE 'ADM/202%'
GROUP BY sf.form_name, sf.form_level, ss.stream_name
ORDER BY sf.form_level, ss.stream_name;
