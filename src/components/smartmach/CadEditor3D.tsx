/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "@/components/ui/icon";

/* ─── типы ───────────────────────────────────────────────────── */
type ShapeType = "box" | "cylinder" | "sphere" | "cone" | "torus" | "tube" | "wedge" | "prism";
type ViewMode  = "solid" | "wireframe" | "xray";
type CameraView = "perspective" | "front" | "top" | "right" | "iso";
type MatType   = "metal" | "plastic" | "wood" | "glass" | "rubber" | "custom";

interface SceneObject {
  id: string; type: ShapeType; label: string;
  color: string; matType: MatType;
  mesh: THREE.Mesh;
  dims: { w: number; h: number; d: number };
  visible: boolean;
}

interface SceneLight { ambient: number; directional: number; }

/* ─── константы ─────────────────────────────────────────────── */
const SHAPES: { id: ShapeType; icon: string; label: string }[] = [
  { id: "box",      icon: "Box",        label: "Параллелепипед" },
  { id: "cylinder", icon: "Database",   label: "Цилиндр"        },
  { id: "sphere",   icon: "Circle",     label: "Сфера"          },
  { id: "cone",     icon: "Triangle",   label: "Конус"          },
  { id: "torus",    icon: "Disc",       label: "Тор"            },
  { id: "tube",     icon: "GitCommit",  label: "Труба"          },
  { id: "wedge",    icon: "Play",       label: "Клин"           },
  { id: "prism",    icon: "Pentagon",   label: "Призма"         },
];

const MATERIALS: { id: MatType; label: string; roughness: number; metalness: number; color: string }[] = [
  { id: "metal",   label: "Металл (Сталь)",  roughness: 0.3, metalness: 0.9, color: "#8899aa" },
  { id: "plastic", label: "Пластик",         roughness: 0.6, metalness: 0.0, color: "#3b82f6" },
  { id: "wood",    label: "Дерево",          roughness: 0.9, metalness: 0.0, color: "#a16207" },
  { id: "glass",   label: "Стекло",          roughness: 0.0, metalness: 0.0, color: "#bfdbfe" },
  { id: "rubber",  label: "Резина",          roughness: 1.0, metalness: 0.0, color: "#374151" },
  { id: "custom",  label: "Свой цвет",       roughness: 0.4, metalness: 0.1, color: "#22c55e" },
];

const COLORS = ["#8899aa", "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];

const CAMERA_VIEWS: { id: CameraView; label: string; icon: string; pos: [number, number, number]; target: [number, number, number] }[] = [
  { id: "perspective", label: "Перспектива",  icon: "Box",         pos: [4, 3, 5],   target: [0,0,0] },
  { id: "front",       label: "Спереди",      icon: "ArrowUp",     pos: [0, 0, 10],  target: [0,0,0] },
  { id: "top",         label: "Сверху",       icon: "ArrowDown",   pos: [0, 10, 0],  target: [0,0,0] },
  { id: "right",       label: "Справа",       icon: "ArrowRight",  pos: [10, 0, 0],  target: [0,0,0] },
  { id: "iso",         label: "Изометрия",    icon: "Layers",      pos: [5, 5, 5],   target: [0,0,0] },
];

function makeGeometry(type: ShapeType, w = 1, h = 1, d = 1): THREE.BufferGeometry {
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

function makeMaterial(matType: MatType, color: string): THREE.MeshStandardMaterial {
  const preset = MATERIALS.find((m) => m.id === matType) ?? MATERIALS[0];
  return new THREE.MeshStandardMaterial({
    color, roughness: preset.roughness, metalness: preset.metalness,
    transparent: matType === "glass", opacity: matType === "glass" ? 0.4 : 1,
    side: matType === "tube" ? THREE.DoubleSide : THREE.FrontSide,
  });
}

/* ─── компонент ──────────────────────────────────────────────── */
export default function CadEditor3D() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const rendRef   = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef  = useRef<THREE.Scene | null>(null);
  const camRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const ctrlRef   = useRef<OrbitControls | null>(null);
  const rafRef    = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse     = useRef(new THREE.Vector2());
  const objectsRef = useRef<SceneObject[]>([]);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  const [objects,    setObjects]    = useState<SceneObject[]>([]);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [viewMode,   setViewMode]   = useState<ViewMode>("solid");
  const [shapeType,  setShapeType]  = useState<ShapeType>("box");
  const [matType,    setMatType]    = useState<MatType>("metal");
  const [color,      setColor]      = useState(COLORS[0]);
  const [showAxes,   setShowAxes]   = useState(true);
  const [showGrid,   setShowGrid]   = useState(true);
  const [cameraView, setCameraView] = useState<CameraView>("perspective");
  const [lights,     setLights]     = useState<SceneLight>({ ambient: 0.5, directional: 1.2 });
  const [dims,       setDims]       = useState({ w: 1, h: 1, d: 1 });
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts,  setMeasurePts]  = useState<THREE.Vector3[]>([]);
  const [measureDist, setMeasureDist] = useState<number | null>(null);
  const axesRef   = useRef<THREE.AxesHelper | null>(null);
  const gridRef   = useRef<THREE.GridHelper | null>(null);

  /* ── инициализация Three.js ── */
  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth || 800;
    const h = 560;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
    camera.position.set(4, 3, 5);
    camRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 0.5; controls.maxDistance = 100;
    ctrlRef.current = controls;

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    ambLightRef.current = ambient;

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(6, 10, 6);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.far = 50;
    scene.add(dir);
    dirLightRef.current = dir;

    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-5, 0, -5);
    scene.add(fill);

    const hemi = new THREE.HemisphereLight(0xffeeff, 0x334455, 0.4);
    scene.add(hemi);

    // Сетка
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(grid);
    gridRef.current = grid;

    // Оси
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);
    axesRef.current = axes;

    // Пол
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    (floor as any).__floor = true;
    scene.add(floor);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  /* ── синхронизация осей/сетки ── */
  useEffect(() => { if (axesRef.current) axesRef.current.visible = showAxes; }, [showAxes]);
  useEffect(() => { if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);

  /* ── освещение ── */
  useEffect(() => {
    if (ambLightRef.current) ambLightRef.current.intensity = lights.ambient;
    if (dirLightRef.current) dirLightRef.current.intensity = lights.directional;
  }, [lights]);

  /* ── viewMode ── */
  useEffect(() => {
    objectsRef.current.forEach((obj) => {
      const mat = obj.mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe  = viewMode === "wireframe";
      mat.opacity    = viewMode === "xray" ? 0.35 : (obj.matType === "glass" ? 0.4 : 1);
      mat.transparent = viewMode === "xray" || obj.matType === "glass";
    });
  }, [viewMode]);

  /* ── камера ── */
  const setCam = useCallback((view: CameraView) => {
    const cam = camRef.current; const ctrl = ctrlRef.current; if (!cam || !ctrl) return;
    const v = CAMERA_VIEWS.find((c) => c.id === view)!;
    cam.position.set(...v.pos);
    ctrl.target.set(...v.target);
    ctrl.update(); setCameraView(view);
  }, []);

  const addObject = useCallback(() => {
    const scene = sceneRef.current; if (!scene) return;
    const geo  = makeGeometry(shapeType, dims.w, dims.h, dims.d);
    const mat  = makeMaterial(matType, color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set((Math.random() - 0.5) * 4, dims.h / 2, (Math.random() - 0.5) * 4);
    scene.add(mesh);
    const id = `${shapeType}-${Date.now()}`;
    const obj: SceneObject = {
      id, type: shapeType, label: `${SHAPES.find((s) => s.id === shapeType)?.label} ${objectsRef.current.length + 1}`,
      color, matType, mesh, dims: { ...dims }, visible: true,
    };
    (mesh as any).__id = id;
    objectsRef.current = [...objectsRef.current, obj];
    setObjects([...objectsRef.current]);
  }, [shapeType, matType, color, dims]);

  const removeObject = useCallback((id: string) => {
    const scene = sceneRef.current; if (!scene) return;
    const obj = objectsRef.current.find((o) => o.id === id);
    if (obj) { scene.remove(obj.mesh); obj.mesh.geometry.dispose(); (obj.mesh.material as THREE.Material).dispose(); }
    objectsRef.current = objectsRef.current.filter((o) => o.id !== id);
    setObjects([...objectsRef.current]);
    if (selected === id) setSelected(null);
  }, [selected]);

  const toggleVisibility = useCallback((id: string) => {
    const obj = objectsRef.current.find((o) => o.id === id); if (!obj) return;
    obj.mesh.visible = !obj.mesh.visible;
    obj.visible = obj.mesh.visible;
    setObjects([...objectsRef.current]);
  }, []);

  const duplicateObject = useCallback((id: string) => {
    const scene = sceneRef.current; if (!scene) return;
    const src = objectsRef.current.find((o) => o.id === id); if (!src) return;
    const geo = makeGeometry(src.type, src.dims.w, src.dims.h, src.dims.d);
    const mat = makeMaterial(src.matType, src.color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.copy(src.mesh.position).add(new THREE.Vector3(0.5, 0, 0.5));
    mesh.rotation.copy(src.mesh.rotation);
    mesh.scale.copy(src.mesh.scale);
    scene.add(mesh);
    const newId = `${src.type}-${Date.now()}`;
    const obj: SceneObject = { ...src, id: newId, label: src.label + " (копия)", mesh };
    (mesh as any).__id = newId;
    objectsRef.current = [...objectsRef.current, obj];
    setObjects([...objectsRef.current]);
  }, []);

  /* ── изменение цвета/материала выбранного ── */
  const updateSelectedMaterial = useCallback((newColor: string, newMat: MatType) => {
    const obj = objectsRef.current.find((o) => o.id === selected); if (!obj) return;
    const mat = makeMaterial(newMat, newColor);
    if (viewMode === "wireframe") mat.wireframe = true;
    if (viewMode === "xray") { mat.transparent = true; mat.opacity = 0.35; }
    obj.mesh.material = mat;
    obj.color = newColor; obj.matType = newMat;
    setObjects([...objectsRef.current]);
  }, [selected, viewMode]);

  /* ── трансформ выбранного ── */
  const transform = useCallback((axis: "x"|"y"|"z", delta: number, mode: "pos"|"rot"|"scale") => {
    const obj = objectsRef.current.find((o) => o.id === selected); if (!obj) return;
    if (mode === "pos")   obj.mesh.position[axis] += delta;
    if (mode === "rot")   obj.mesh.rotation[axis] += delta;
    if (mode === "scale") obj.mesh.scale[axis] = Math.max(0.05, obj.mesh.scale[axis] + delta);
  }, [selected]);

  /* ── клик — выбор / измерение ── */
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const renderer = rendRef.current; const camera = camRef.current; const scene = sceneRef.current;
    if (!renderer || !camera || !scene) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    if (measureMode) {
      // Измерение: выбираем точки на объектах
      const meshes = objectsRef.current.map((o) => o.mesh);
      const hits = raycaster.current.intersectObjects(meshes);
      if (hits.length > 0) {
        const pt = hits[0].point.clone();
        const newPts = [...measurePts, pt];
        setMeasurePts(newPts);
        if (newPts.length === 2) {
          setMeasureDist(newPts[0].distanceTo(newPts[1]));
          setMeasurePts([]);
        }
      }
      return;
    }

    const meshes = objectsRef.current.map((o) => o.mesh);
    const hits = raycaster.current.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = (hits[0].object as any).__id as string;
      setSelected((prev) => prev === id ? null : id);
      objectsRef.current.forEach((o) => {
        (o.mesh.material as THREE.MeshStandardMaterial).emissive?.set(o.id === id ? 0x223366 : 0x000000);
      });
    } else {
      setSelected(null);
      objectsRef.current.forEach((o) => { (o.mesh.material as THREE.MeshStandardMaterial).emissive?.set(0x000000); });
    }
  }, [measureMode, measurePts]);

  /* ── экспорт OBJ ── */
  const exportOBJ = useCallback(() => {
    let obj = "# SmartMach 3D Export\n";
    let vOffset = 1;
    objectsRef.current.forEach((o) => {
      const geo = o.mesh.geometry.clone();
      geo.applyMatrix4(o.mesh.matrixWorld);
      const pos = geo.attributes.position;
      obj += `o ${o.label}\n`;
      for (let i = 0; i < pos.count; i++) {
        obj += `v ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
      }
      if (geo.index) {
        for (let i = 0; i < geo.index.count; i += 3) {
          const a = geo.index.getX(i) + vOffset;
          const b = geo.index.getX(i+1) + vOffset;
          const c = geo.index.getX(i+2) + vOffset;
          obj += `f ${a} ${b} ${c}\n`;
        }
        vOffset += pos.count;
      }
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([obj], { type: "text/plain" }));
    a.download = "model.obj"; a.click();
  }, []);

  const exportPNG = () => {
    const renderer = rendRef.current; if (!renderer) return;
    renderer.render(sceneRef.current!, camRef.current!);
    const a = document.createElement("a");
    a.href = renderer.domElement.toDataURL("image/png");
    a.download = "model3d.png"; a.click();
  };

  const clearAll = () => {
    const scene = sceneRef.current; if (!scene) return;
    objectsRef.current.forEach((o) => { scene.remove(o.mesh); o.mesh.geometry.dispose(); });
    objectsRef.current = []; setObjects([]); setSelected(null);
  };

  const selectedObj = objects.find((o) => o.id === selected);

  return (
    <div className="flex h-full bg-[#1a1a2e] rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: 600 }}>

      {/* ── Левая панель ── */}
      <div className="w-52 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col overflow-y-auto">

        {/* Примитивы */}
        <div className="p-3 border-b border-gray-700">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Примитив</p>
          <div className="grid grid-cols-2 gap-1">
            {SHAPES.map((s) => (
              <button key={s.id} onClick={() => setShapeType(s.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${shapeType === s.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={12} />
                <span className="truncate">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Размеры */}
        <div className="p-3 border-b border-gray-700">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Размеры (м)</p>
          <div className="space-y-1.5">
            {(["w", "h", "d"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4">{k === "w" ? "Ш" : k === "h" ? "В" : "Г"}</span>
                <input type="number" step="0.1" min="0.1" value={dims[k]} onChange={(e) => setDims((p) => ({ ...p, [k]: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Материал */}
        <div className="p-3 border-b border-gray-700">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Материал</p>
          <div className="space-y-1">
            {MATERIALS.map((m) => (
              <button key={m.id} onClick={() => setMatType(m.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${matType === m.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Цвет */}
        <div className="p-3 border-b border-gray-700">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Цвет</p>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded-full border-2 border-gray-600 cursor-pointer bg-transparent" title="Свой цвет" />
          </div>
        </div>

        {/* Добавить */}
        <div className="p-3 border-b border-gray-700">
          <button onClick={addObject}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
            <Icon name="Plus" size={13} />Добавить объект
          </button>
        </div>

        {/* Список объектов */}
        <div className="p-3 flex-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Сцена ({objects.length})</p>
          {objects.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-3">Сцена пуста</p>
          ) : (
            <div className="space-y-0.5">
              {objects.map((o) => (
                <div key={o.id}
                  onClick={() => {
                    setSelected((prev) => prev === o.id ? null : o.id);
                    objectsRef.current.forEach((obj) => {
                      (obj.mesh.material as THREE.MeshStandardMaterial).emissive?.set(obj.id === o.id ? 0x223366 : 0x000000);
                    });
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${selected === o.id ? "bg-blue-900/60 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: o.color }} />
                  <span className="flex-1 truncate">{o.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); toggleVisibility(o.id); }}
                    className={o.visible ? "text-gray-500 hover:text-white" : "text-gray-700"}>
                    <Icon name={o.visible ? "Eye" : "EyeOff"} size={11} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeObject(o.id); }}
                    className="text-gray-600 hover:text-red-400">
                    <Icon name="X" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-700">
          <button onClick={clearAll} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg">
            <Icon name="Trash2" size={12} />Очистить сцену
          </button>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div className="flex-1 flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700 flex-wrap">

          {/* Вид */}
          <div className="flex gap-1">
            {CAMERA_VIEWS.map((v) => (
              <button key={v.id} onClick={() => setCam(v.id)} title={v.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${cameraView === v.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <Icon name={v.icon as Parameters<typeof Icon>[0]["name"]} size={12} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          {/* Режим отображения */}
          {(["solid", "wireframe", "xray"] as ViewMode[]).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === v ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
              {v === "solid" ? "Тело" : v === "wireframe" ? "Каркас" : "X-Ray"}
            </button>
          ))}

          <div className="h-4 w-px bg-gray-700 mx-1" />

          <button onClick={() => setShowAxes((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showAxes ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
            <Icon name="Axis3d" size={12} />Оси
          </button>
          <button onClick={() => setShowGrid((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${showGrid ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
            <Icon name="Grid3x3" size={12} />Сетка
          </button>

          {/* Измерение */}
          <button onClick={() => { setMeasureMode((v) => !v); setMeasurePts([]); setMeasureDist(null); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${measureMode ? "bg-yellow-600 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
            <Icon name="Ruler" size={12} />Измерить
          </button>
          {measureDist != null && (
            <span className="text-xs text-yellow-300 bg-yellow-900/40 px-2 py-1 rounded">
              Расстояние: {measureDist.toFixed(3)} м
            </span>
          )}

          <div className="flex gap-1 ml-auto">
            <button onClick={exportOBJ}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600">
              <Icon name="Download" size={12} />OBJ
            </button>
            <button onClick={exportPNG}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              <Icon name="Image" size={12} />PNG
            </button>
          </div>
        </div>

        {/* Canvas + правая панель */}
        <div className="flex flex-1 overflow-hidden">
          <div ref={mountRef} className={`flex-1 ${measureMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
            onClick={handleCanvasClick} />

          {/* Правая панель — свойства */}
          {selectedObj && (
            <div className="w-52 shrink-0 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3 space-y-4 text-xs text-gray-300">
              <p className="font-semibold text-white">{selectedObj.label}</p>
              <p className="text-gray-500">{selectedObj.type} · {selectedObj.matType}</p>

              {/* Цвет и материал */}
              <div>
                <p className="text-gray-400 mb-1">Материал</p>
                <select value={selectedObj.matType}
                  onChange={(e) => updateSelectedMaterial(selectedObj.color, e.target.value as MatType)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none mb-1">
                  {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <div className="flex gap-1 flex-wrap mt-1">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => updateSelectedMaterial(c, selectedObj.matType)}
                      className={`w-5 h-5 rounded-full border-2 ${selectedObj.color === c ? "border-white" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>

              {/* Позиция */}
              <TransformPanel label="Позиция" obj={selectedObj.mesh} mode="position" step={0.25} onTransform={transform} />
              <TransformPanel label="Поворот (рад)" obj={selectedObj.mesh} mode="rotation" step={0.157} onTransform={transform} />
              <TransformPanel label="Масштаб" obj={selectedObj.mesh} mode="scale"    step={0.1}  onTransform={transform} />

              {/* Действия */}
              <div className="space-y-1 pt-1 border-t border-gray-700">
                <button onClick={() => duplicateObject(selectedObj.id)}
                  className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center gap-1">
                  <Icon name="Copy" size={12} />Дублировать
                </button>
                <button onClick={() => removeObject(selectedObj.id)}
                  className="w-full py-1.5 text-xs text-red-400 hover:bg-gray-800 rounded flex items-center justify-center gap-1 border border-gray-700">
                  <Icon name="Trash2" size={12} />Удалить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Освещение */}
        <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-700 flex items-center gap-4 text-[11px] text-gray-400 flex-wrap">
          <span>{objects.length} объектов</span>
          <span className="text-gray-600">·</span>
          <div className="flex items-center gap-2">
            <Icon name="Sun" size={11} />
            <span>Ambient</span>
            <input type="range" min="0" max="2" step="0.1" value={lights.ambient}
              onChange={(e) => setLights((p) => ({ ...p, ambient: Number(e.target.value) }))}
              className="w-20 h-1" />
            <span>{lights.ambient.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Zap" size={11} />
            <span>Direct</span>
            <input type="range" min="0" max="3" step="0.1" value={lights.directional}
              onChange={(e) => setLights((p) => ({ ...p, directional: Number(e.target.value) }))}
              className="w-20 h-1" />
            <span>{lights.directional.toFixed(1)}</span>
          </div>
          <span className="ml-auto text-gray-600">ЛКМ — выбрать · ПКМ/колесо — камера</span>
          {measureMode && <span className="text-yellow-300">Режим измерения: кликни 2 точки</span>}
        </div>
      </div>
    </div>
  );
}

/* ── мини-компонент трансформа ── */
function TransformPanel({ label, obj, mode, step, onTransform }: {
  label: string; obj: THREE.Mesh; mode: "position"|"rotation"|"scale"; step: number;
  onTransform: (axis: "x"|"y"|"z", delta: number, mode: "pos"|"rot"|"scale") => void;
}) {
  const modeMap = { position: "pos", rotation: "rot", scale: "scale" } as const;
  return (
    <div>
      <p className="text-gray-400 mb-1">{label}</p>
      {(["x","y","z"] as const).map((a) => (
        <div key={a} className="flex items-center gap-1 mb-1">
          <span className="text-gray-400 uppercase w-3 text-[10px]">{a}</span>
          <span className="text-gray-300 font-mono w-12 text-right text-[10px]">
            {(obj[mode][a] as number).toFixed(2)}
          </span>
          <button onClick={() => onTransform(a, -step, modeMap[mode])}
            className="w-6 h-5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-[10px]">−</button>
          <button onClick={() => onTransform(a, step, modeMap[mode])}
            className="w-6 h-5 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 text-[10px]">+</button>
        </div>
      ))}
    </div>
  );
}
