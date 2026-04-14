 
import * as THREE from "three";

export type ShapeType = "box" | "cylinder" | "sphere" | "cone" | "torus" | "tube" | "wedge" | "prism";
export type ViewMode  = "solid" | "wireframe" | "xray";
export type CameraView = "perspective" | "front" | "top" | "right" | "iso";
export type MatType   = "metal" | "plastic" | "wood" | "glass" | "rubber" | "custom";

export interface SceneObject {
  id: string; type: ShapeType; label: string;
  color: string; matType: MatType;
  mesh: THREE.Mesh;
  dims: { w: number; h: number; d: number };
  visible: boolean;
}

export interface SceneLight { ambient: number; directional: number; }

export const SHAPES: { id: ShapeType; icon: string; label: string }[] = [
  { id: "box",      icon: "Box",        label: "Параллелепипед" },
  { id: "cylinder", icon: "Database",   label: "Цилиндр"        },
  { id: "sphere",   icon: "Circle",     label: "Сфера"          },
  { id: "cone",     icon: "Triangle",   label: "Конус"          },
  { id: "torus",    icon: "Disc",       label: "Тор"            },
  { id: "tube",     icon: "GitCommit",  label: "Труба"          },
  { id: "wedge",    icon: "Play",       label: "Клин"           },
  { id: "prism",    icon: "Pentagon",   label: "Призма"         },
];

export const MATERIALS: { id: MatType; label: string; roughness: number; metalness: number; color: string }[] = [
  { id: "metal",   label: "Металл (Сталь)",  roughness: 0.3, metalness: 0.9, color: "#8899aa" },
  { id: "plastic", label: "Пластик",         roughness: 0.6, metalness: 0.0, color: "#3b82f6" },
  { id: "wood",    label: "Дерево",          roughness: 0.9, metalness: 0.0, color: "#a16207" },
  { id: "glass",   label: "Стекло",          roughness: 0.0, metalness: 0.0, color: "#bfdbfe" },
  { id: "rubber",  label: "Резина",          roughness: 1.0, metalness: 0.0, color: "#374151" },
  { id: "custom",  label: "Свой цвет",       roughness: 0.4, metalness: 0.1, color: "#22c55e" },
];

export const COLORS = ["#8899aa", "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];

export const CAMERA_VIEWS: { id: CameraView; label: string; icon: string; pos: [number, number, number]; target: [number, number, number] }[] = [
  { id: "perspective", label: "Перспектива",  icon: "Box",         pos: [4, 3, 5],   target: [0,0,0] },
  { id: "front",       label: "Спереди",      icon: "ArrowUp",     pos: [0, 0, 10],  target: [0,0,0] },
  { id: "top",         label: "Сверху",       icon: "ArrowDown",   pos: [0, 10, 0],  target: [0,0,0] },
  { id: "right",       label: "Справа",       icon: "ArrowRight",  pos: [10, 0, 0],  target: [0,0,0] },
  { id: "iso",         label: "Изометрия",    icon: "Layers",      pos: [5, 5, 5],   target: [0,0,0] },
];

export function makeGeometry(type: ShapeType, w = 1, h = 1, d = 1): THREE.BufferGeometry {
  switch (type) {
    case "box":      return new THREE.BoxGeometry(w, h, d);
    case "cylinder": return new THREE.CylinderGeometry(w/2, w/2, h, 32);
    case "sphere":   return new THREE.SphereGeometry(w/2, 32, 32);
    case "cone":     return new THREE.ConeGeometry(w/2, h, 32);
    case "torus":    return new THREE.TorusGeometry(w/2, w/6, 16, 64);
    case "tube":     return new THREE.CylinderGeometry(w/2, w/2, h, 32, 1, true);
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
    case "prism": {
      const shape = new THREE.Shape();
      shape.moveTo(0, w/2);
      for (let i = 1; i <= 6; i++) {
        shape.lineTo(Math.sin((i * Math.PI * 2) / 6) * w/2, Math.cos((i * Math.PI * 2) / 6) * w/2);
      }
      return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    }
    default: return new THREE.BoxGeometry(w, h, d);
  }
}

export function makeMaterial(matType: MatType, color: string): THREE.MeshStandardMaterial {
  const preset = MATERIALS.find((m) => m.id === matType) ?? MATERIALS[0];
  return new THREE.MeshStandardMaterial({
    color, roughness: preset.roughness, metalness: preset.metalness,
    transparent: matType === "glass", opacity: matType === "glass" ? 0.4 : 1,
    side: matType === "tube" ? THREE.DoubleSide : THREE.FrontSide,
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
