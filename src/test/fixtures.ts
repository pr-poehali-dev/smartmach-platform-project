import type { TechProcess, TechOperation, TechStep } from "@/lib/techcard";

export function step(p: Partial<TechStep> = {}): TechStep {
  return {
    id: 1, operation_id: 10, step_no: 1, description: "Точить ∅45 на L=60",
    tool: "Резец PCLNR", measuring_tool: "Скоба 45k6", diameter: 45, length: 60, overrun: 2,
    depth: 1, passes: 1, feed: 0.2, speed: 180, spindle: 1273.2, t_main: 0.243, manual_time: false,
    ...p,
  };
}

export function operation(p: Partial<TechOperation> = {}): TechOperation {
  return {
    id: 10, process_id: 1, op_no: "010", name: "Токарная с ЧПУ", workshop: "01", area: "02",
    equipment_id: 5, equipment_name: "16А20Ф3", eq_name: "Токарный станок с ЧПУ", eq_model: "16А20Ф3",
    cam_program_id: 7, cam_name: "Черновое точение", cam_code: "O1001", cam_est: "6 мин",
    fixture: "Патрон 3-кулачковый", profession: "Оператор станков с ПУ", worker_rank: 4, workers: 1,
    t_aux: 1.8, k_service_pct: 8, t_pz: 18, t_main: 0.243, t_sht: 2.206, t_sht_k: 2.566,
    notes: null, steps: [step()], ...p,
  };
}

export function process(p: Partial<TechProcess> = {}): TechProcess {
  const ops = p.operations ?? [operation()];
  return {
    id: 1, part_id: 3, code: "ТП-Ц2-100.01.001", name: "Техпроцесс вала", material: "Сталь 45",
    blank_type: "Прокат", blank_size: "∅50×325", blank_mass: 5.01, part_mass: 3.85,
    batch_size: 50, status: "draft", developer: "Иванов", checker: "Петров", approver: null,
    notes: null, part_code: "Ц2-100.01.001", part_name: "Вал тихоходный",
    total_t_sht: ops.reduce((s, o) => s + Number(o.t_sht), 0),
    total_t_sht_k: ops.reduce((s, o) => s + Number(o.t_sht_k), 0),
    total_t_pz: ops.reduce((s, o) => s + Number(o.t_pz), 0),
    ...p, operations: ops,
  };
}
