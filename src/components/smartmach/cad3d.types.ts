import * as THREE from "three";

export type ShapeType =
  | "box" | "cylinder" | "sphere" | "cone" | "torus" | "tube"
  | "wedge" | "prism" | "pyramid" | "ring" | "spring" | "lprofile" | "tprofile" | "pipe";

export type ViewMode  = "solid" | "wireframe" | "xray" | "flat";
export type CameraView = "perspective" | "front" | "back" | "top" | "bottom" | "right" | "left" | "iso";
export type MatType   = "metal" | "aluminum" | "steel" | "plastic" | "wood" | "glass" | "rubber" | "concrete" | "custom";
export type TransformMode = "translate" | "rotate" | "scale";

export interface SceneObject {
  id: string;
  type: ShapeType;
  label: string;
  color: string;
  matType: MatType;
  mesh: THREE.Mesh;
  dims: { w: number; h: number; d: number };
  visible: boolean;
  locked?: boolean;
}

export interface SceneLight { ambient: number; directional: number; }

export const SHAPES: { id: ShapeType; icon: string; label: string; group: string }[] = [
  // Основные
  { id: "box",      icon: "Box",          label: "Параллелепипед", group: "Основные" },
  { id: "cylinder", icon: "Database",     label: "Цилиндр",        group: "Основные" },
  { id: "sphere",   icon: "Circle",       label: "Сфера",          group: "Основные" },
  { id: "cone",     icon: "Triangle",     label: "Конус",          group: "Основные" },
  { id: "torus",    icon: "Disc3",        label: "Тор",            group: "Основные" },
  { id: "prism",    icon: "Hexagon",      label: "Призма (6-уг.)", group: "Основные" },
  // Профили и трубы
  { id: "tube",     icon: "CircleDashed", label: "Труба",          group: "Профили" },
  { id: "pipe",     icon: "GitCommit",    label: "Патрубок",       group: "Профили" },
  { id: "lprofile", icon: "CornerUpRight", label: "L-профиль",    group: "Профили" },
  { id: "tprofile", icon: "Minus",        label: "Т-профиль",      group: "Профили" },
  // Специальные
  { id: "wedge",    icon: "Play",         label: "Клин",           group: "Специальные" },
  { id: "pyramid",  icon: "Mountain",     label: "Пирамида",       group: "Специальные" },
  { id: "ring",     icon: "Disc",         label: "Кольцо/Шайба",  group: "Специальные" },
  { id: "spring",   icon: "Waves",        label: "Пружина",        group: "Специальные" },
];

export const SHAPE_GROUPS = [...new Set(SHAPES.map((s) => s.group))];

export const MATERIALS: { id: MatType; label: string; roughness: number; metalness: number; color: string }[] = [
  { id: "steel",    label: "Сталь",         roughness: 0.25, metalness: 0.95, color: "#a0a8b8" },
  { id: "metal",    label: "Металл",        roughness: 0.35, metalness: 0.85, color: "#8899aa" },
  { id: "aluminum", label: "Алюминий",      roughness: 0.20, metalness: 0.90, color: "#c0c8d0" },
  { id: "plastic",  label: "Пластик (АБС)", roughness: 0.65, metalness: 0.00, color: "#3b82f6" },
  { id: "wood",     label: "Дерево",        roughness: 0.90, metalness: 0.00, color: "#a16207" },
  { id: "glass",    label: "Стекло",        roughness: 0.00, metalness: 0.00, color: "#bfdbfe" },
  { id: "rubber",   label: "Резина",        roughness: 1.00, metalness: 0.00, color: "#374151" },
  { id: "concrete", label: "Бетон",         roughness: 0.95, metalness: 0.00, color: "#9ca3af" },
  { id: "custom",   label: "Свой цвет",     roughness: 0.40, metalness: 0.10, color: "#22c55e" },
];

export const COLORS = [
  "#a0a8b8", "#3b82f6", "#ef4444", "#22c55e",
  "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff",
  "#0ea5e9", "#14b8a6", "#f97316", "#64748b",
];

export const CAMERA_VIEWS: { id: CameraView; label: string; icon: string; pos: [number, number, number]; target: [number, number, number] }[] = [
  { id: "perspective", label: "Перспектива", icon: "Box",          pos: [4, 3, 5],    target: [0,0,0] },
  { id: "front",       label: "Спереди",     icon: "ArrowUp",      pos: [0, 0, 10],   target: [0,0,0] },
  { id: "back",        label: "Сзади",       icon: "ArrowDown",    pos: [0, 0, -10],  target: [0,0,0] },
  { id: "top",         label: "Сверху",      icon: "ChevronUp",    pos: [0, 10, 0],   target: [0,0,0] },
  { id: "bottom",      label: "Снизу",       icon: "ChevronDown",  pos: [0, -10, 0],  target: [0,0,0] },
  { id: "right",       label: "Справа",      icon: "ArrowRight",   pos: [10, 0, 0],   target: [0,0,0] },
  { id: "left",        label: "Слева",       icon: "ArrowLeft",    pos: [-10, 0, 0],  target: [0,0,0] },
  { id: "iso",         label: "Изометрия",   icon: "Layers",       pos: [5, 5, 5],    target: [0,0,0] },
];

export function makeGeometry(type: ShapeType, w = 1, h = 1, d = 1): THREE.BufferGeometry {
  switch (type) {
    case "box":      return new THREE.BoxGeometry(w, h, d);
    case "cylinder": return new THREE.CylinderGeometry(w/2, w/2, h, 48);
    case "sphere":   return new THREE.SphereGeometry(w/2, 48, 32);
    case "cone":     return new THREE.ConeGeometry(w/2, h, 48);
    case "torus":    return new THREE.TorusGeometry(w/2, w/8, 24, 80);
    case "ring":     return new THREE.TorusGeometry(w/2, w/16, 16, 64);

    case "tube": {
      const outer = w / 2;
      const inner = outer * 0.7;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    }

    case "pipe": {
      const outer = w / 2;
      const inner = outer * 0.8;
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const extruded = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      extruded.rotateX(Math.PI / 2);
      return extruded;
    }

    case "wedge": {
      const geo = new THREE.BufferGeometry();
      const hw = w/2, hh = h/2, hd = d/2;
      const verts = new Float32Array([
        -hw,-hh,-hd,  hw,-hh,-hd,  hw,hh,-hd,
        -hw,-hh,-hd,  hw,hh,-hd,  -hw,hh,-hd,
        -hw,-hh, hd,  hw,-hh, hd,  hw,-hh,-hd,
        -hw,-hh, hd,  hw,-hh,-hd,  -hw,-hh,-hd,
        -hw,-hh, hd,  -hw,-hh,-hd,  -hw,hh,-hd,
        hw,-hh,-hd,   hw,-hh, hd,   hw,hh,-hd,
        -hw,-hh, hd,  hw,-hh, hd,  -hw,hh,-hd,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      return geo;
    }

    case "pyramid": {
      const geo = new THREE.BufferGeometry();
      const hw = w/2, hd = d/2;
      const verts = new Float32Array([
        -hw, 0, -hd,  hw, 0, -hd,  hw, 0,  hd,
        -hw, 0, -hd,  hw, 0,  hd, -hw, 0,  hd,
        -hw, 0, -hd,  hw, 0, -hd,  0,  h,   0,
         hw, 0, -hd,  hw, 0,  hd,  0,  h,   0,
         hw, 0,  hd, -hw, 0,  hd,  0,  h,   0,
        -hw, 0,  hd, -hw, 0, -hd,  0,  h,   0,
      ]);
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      return geo;
    }

    case "prism": {
      const shape = new THREE.Shape();
      const r = w / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
        if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else         shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    }

    case "lprofile": {
      const t = Math.min(w, d) * 0.2;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, t);
      shape.lineTo(t, t);
      shape.lineTo(t, h);
      shape.lineTo(0, h);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      geo.translate(-w/2, -h/2, -d/2);
      return geo;
    }

    case "tprofile": {
      const fw = w, fh = h * 0.2, tw = w * 0.15, th = h;
      const shape = new THREE.Shape();
      shape.moveTo(-fw/2, th - fh);
      shape.lineTo( fw/2, th - fh);
      shape.lineTo( fw/2, th);
      shape.lineTo(-fw/2, th);
      shape.lineTo(-fw/2, th - fh);
      shape.moveTo(-tw/2, 0);
      shape.lineTo( tw/2, 0);
      shape.lineTo( tw/2, th - fh);
      shape.lineTo(-tw/2, th - fh);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
      geo.translate(0, -th/2, -d/2);
      return geo;
    }

    case "spring": {
      const turns = 8;
      const points: THREE.Vector3[] = [];
      const R = w / 2, r2 = w / 8;
      for (let i = 0; i <= turns * 64; i++) {
        const t2 = (i / 64) * Math.PI * 2;
        const y = (i / (turns * 64)) * h - h / 2;
        points.push(new THREE.Vector3(Math.cos(t2) * R, y, Math.sin(t2) * R));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.TubeGeometry(curve, turns * 64, r2, 12, false);
    }

    default: return new THREE.BoxGeometry(w, h, d);
  }
}

export function makeMaterial(matType: MatType, color: string): THREE.MeshStandardMaterial {
  const preset = MATERIALS.find((m) => m.id === matType) ?? MATERIALS[0];
  return new THREE.MeshStandardMaterial({
    color,
    roughness: preset.roughness,
    metalness: preset.metalness,
    transparent: matType === "glass",
    opacity: matType === "glass" ? 0.4 : 1,
    side: ["tube", "pipe"].includes(matType) ? THREE.DoubleSide : THREE.FrontSide,
  });
}

export function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, 256, 64);
  ctx.font = "bold 28px Inter, sans-serif";
  ctx.fillStyle = "#60a5fa";
  ctx.textAlign = "center";
  ctx.fillText(text, 128, 40);
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.8, 0.2, 1);
  return sprite;
}
