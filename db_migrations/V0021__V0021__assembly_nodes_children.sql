
-- Дочерние узлы: Корпус (parent_id=1)
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,material,weight_kg,total_weight_kg,dimensions,heat_treatment,status,notes)
VALUES
(7,1,'1.1',1,10,'part','РЦ-250-101','Корпус нижний',     'A',1,'шт','СЧ25',   18.20,18.20,'380×240×190','Иск. старение',  'in_design','Литьё ГОСТ 1412'),
(7,1,'1.2',2,20,'part','РЦ-250-102','Крышка корпуса',    'A',1,'шт','СЧ25',   9.80, 9.80, '380×240×80', NULL,             'in_design','Литьё'),
(7,1,'1.3',3,30,'part','РЦ-250-103','Пробка сливная',    'A',1,'шт','Ст3',    0.12, 0.12, 'М16×1.5',    NULL,             'approved', NULL),
(7,1,'1.4',4,40,'part','РЦ-250-104','Маслоуказатель',    'A',1,'шт','Сталь 45',0.38,0.38, NULL,         NULL,             'approved', NULL),
(7,1,'1.5',5,50,'part','РЦ-250-105','Штифт конический',  'A',2,'шт','Ст5',    0.05, 0.10, 'Ø10×60',     NULL,             'approved', NULL);

-- Дочерние: Передача быстроходная (parent_id=2)
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,material,weight_kg,total_weight_kg,dimensions,heat_treatment,surface_finish,standard_ref,status,notes)
VALUES
(7,2,'2.1',1,10,'part',    'РЦ-250-201',    'Вал быстроходный',           'A',1,'шт','40Х',  3.20,3.20,'Ø65×380',  'ТВЧ HRC 50-55','Ra 0.8',NULL,           'in_design','Закалка шеек под подшипники'),
(7,2,'2.2',2,20,'part',    'РЦ-250-202',    'Шестерня быстроходная',      'A',1,'шт','20ХН', 4.70,4.70,'Ø180×85',  'ЦМК+закалка',  'Ra 1.6',NULL,           'in_design','z=18, m=4, β=12°'),
(7,2,'2.3',3,30,'standard','П-7308',         'Подшипник 7308 ГОСТ 831',    'A',2,'шт',NULL,   0.52,1.04,NULL,       NULL,           NULL,    'ГОСТ 831-75',  'approved', 'Роликовый конический'),
(7,2,'2.4',4,40,'standard','ШП-10x8x56',     'Шпонка 10×8×56 ГОСТ 23360', 'A',2,'шт','Ст5',  0.03,0.06,'10×8×56',  NULL,           NULL,    'ГОСТ 23360-78','approved', NULL),
(7,2,'2.5',5,50,'part',    'РЦ-250-203',    'Втулка распорная',           'A',2,'шт','Ст45', 0.18,0.36,'Ø48×25',   NULL,           NULL,    NULL,           'draft',    NULL);

-- Дочерние: Передача тихоходная (parent_id=3)
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,material,weight_kg,total_weight_kg,dimensions,heat_treatment,surface_finish,standard_ref,status,notes)
VALUES
(7,3,'3.1',1,10,'part',    'РЦ-250-301',    'Вал тихоходный',              'A',1,'шт','40Х',  7.40,7.40,'Ø95×480',  'ТВЧ HRC 48-52','Ra 0.8',NULL,           'in_design',NULL),
(7,3,'3.2',2,20,'part',    'РЦ-250-302',    'Колесо зубчатое тихоходное',  'A',1,'шт','20ХН', 9.20,9.20,'Ø420×110', 'ЦМК+закалка',  'Ra 1.6',NULL,           'in_design','z=64, m=4, β=12°'),
(7,3,'3.3',3,30,'standard','П-7316',         'Подшипник 7316 ГОСТ 831',     'A',2,'шт',NULL,   1.25,2.50,NULL,       NULL,           NULL,    'ГОСТ 831-75',  'approved', 'Роликовый конический'),
(7,3,'3.4',4,40,'standard','ШП-18x11x90',    'Шпонка 18×11×90 ГОСТ 23360', 'A',1,'шт','Ст5',  0.12,0.12,'18×11×90', NULL,           NULL,    'ГОСТ 23360-78','approved', NULL),
(7,3,'3.5',5,50,'part',    'РЦ-250-303',    'Втулка распорная тихоходная', 'A',2,'шт','Ст45', 0.42,0.84,'Ø68×35',   NULL,           NULL,    NULL,           'draft',    NULL);

-- Дочерние: Система смазки (parent_id=4)
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,material,weight_kg,total_weight_kg,dimensions,status,notes)
VALUES
(7,4,'4.1',1,10,'part',    'РЦ-250-401','Крышка смотровая',  'A',1,'шт', 'Ст3',     0.28,0.28,'160×140×6','approved',NULL),
(7,4,'4.2',2,20,'part',    'РЦ-250-402','Прокладка крышки',  'A',1,'шт', 'Паронит', 0.02,0.02,NULL,        'approved','ГОСТ 481-80'),
(7,4,'4.3',3,30,'part',    'РЦ-250-403','Сапун',             'A',1,'шт', 'Ст3',     0.08,0.08,NULL,        'approved',NULL),
(7,4,'4.4',4,40,'material','ГЕРМ-111',   'Герметик Анатерм-111','A',0.05,'кг',NULL,  NULL,NULL,NULL,        'approved','Для уплотнения разъёма корпуса');

-- Дочерние: Уплотнения (parent_id=5)
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,material,weight_kg,total_weight_kg,standard_ref,status,notes)
VALUES
(7,5,'5.1',1,10,'standard','МС-50',  'Манжета 50×70×10 ГОСТ 8752', 'A',2,'шт','Резина',0.025,0.050,'ГОСТ 8752-79','approved','Входной и выходной валы'),
(7,5,'5.2',2,20,'part',    'РЦ-250-501','Крышка подшипника глухая вх.','A',1,'шт','СЧ15',0.42,0.42,NULL,         'in_design',NULL),
(7,5,'5.3',3,30,'part',    'РЦ-250-502','Крышка подшипника сквозная вх.','A',1,'шт','СЧ15',0.38,0.38,NULL,       'in_design',NULL),
(7,5,'5.4',4,40,'part',    'РЦ-250-503','Крышка подшипника глухая вых.','A',2,'шт','СЧ15',0.68,1.36,NULL,        'in_design',NULL),
(7,5,'5.5',5,50,'part',    'РЦ-250-504','Крышка подшипника сквозная вых.','A',1,'шт','СЧ15',0.62,0.62,NULL,      'in_design',NULL);
