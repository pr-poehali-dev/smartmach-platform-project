
-- node_type: assembly|part|standard|material|purchased|fastener
-- status: draft|in_design|checking|approved|production|issue
-- code: NOT NULL — для std_part и material тоже нужен код

-- ═══ Корневые узлы РЦ-250 (assembly_id=7) ═══
INSERT INTO t_p45794133_smartmach_platform_p.assembly_nodes
  (assembly_id,parent_id,path,position_no,sort_order,node_type,code,name,revision,qty,unit,weight_kg,total_weight_kg,status,notes)
VALUES
(7,NULL,'1', 1, 10,'assembly', 'РЦ-250-100','Корпус редуктора',         'A',1,'сб.ед.',28.50,28.50,'in_design','Сборочная единица корпуса'),
(7,NULL,'2', 2, 20,'assembly', 'РЦ-250-200','Передача быстроходная',    'A',1,'сб.ед.',12.30,12.30,'in_design','Первая ступень i₁=3.5'),
(7,NULL,'3', 3, 30,'assembly', 'РЦ-250-300','Передача тихоходная',      'A',1,'сб.ед.',18.70,18.70,'in_design','Вторая ступень i₂=3.57'),
(7,NULL,'4', 4, 40,'assembly', 'РЦ-250-400','Система смазки',           'A',1,'сб.ед.',3.20, 3.20, 'draft',   NULL),
(7,NULL,'5', 5, 50,'assembly', 'РЦ-250-500','Уплотнения и крышки',      'A',1,'сб.ед.',4.10, 4.10, 'draft',   NULL),
(7,NULL,'6', 6, 60,'fastener', 'БМ12-40',   'Болт М12×40 ГОСТ 7798',   'A',24,'шт',   0.042,1.008,'approved','ГОСТ 7798-70'),
(7,NULL,'7', 7, 70,'fastener', 'БМ10-30',   'Болт М10×30 ГОСТ 7798',   'A',16,'шт',   0.026,0.416,'approved','ГОСТ 7798-70'),
(7,NULL,'8', 8, 80,'fastener', 'Ш12',       'Шайба 12 ГОСТ 11371',      'A',24,'шт',   0.006,0.144,'approved','ГОСТ 11371-78'),
(7,NULL,'9', 9, 90,'material', 'МАСЛО-ИГА', 'Масло И-Г-А-46',           'A',2.5,'л',  NULL, NULL, 'approved','ГОСТ 17479.4');
