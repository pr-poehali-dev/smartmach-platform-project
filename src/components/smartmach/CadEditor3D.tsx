/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "@/components/ui/icon";

type ShapeType = "box" | "cylinder" | "sphere" | "cone" | "torus";
type ViewMode  = "solid" | "wireframe" | "both";

interface SceneObject {
  id: string;
  type: ShapeType;
  label: string;
  color: string;
  mesh: THREE.Mesh;
}

const SHAPES: { id: ShapeType; icon: string; label: string }[] = [
  { id: "box",      icon: "Box",       label: "Параллелепипед" },
  { id: "cylinder", icon: "Database",  label: "Цилиндр"        },
  { id: "sphere",   icon: "Circle",    label: "Сфера"          },
  { id: "cone",     icon: "Triangle",  label: "Конус"          },
  { id: "torus",    icon: "Disc",      label: "Тор"            },
];

const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"];

function makeGeometry(type: ShapeType): THREE.BufferGeometry {
  switch (type) {
    case "box":      return new THREE.BoxGeometry(1, 1, 1);
    case "cylinder": return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
    case "sphere":   return new THREE.SphereGeometry(0.6, 32, 32);
    case "cone":     return new THREE.ConeGeometry(0.5, 1, 32);
    case "torus":    return new THREE.TorusGeometry(0.5, 0.2, 16, 64);
    default:         return new THREE.BoxGeometry(1, 1, 1);
  }
}

export default function CadEditor3D() {
  const mountRef   = useRef<HTMLDivElement>(null);
  const rendRef    = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef   = useRef<THREE.Scene | null>(null);
  const camRef     = useRef<THREE.PerspectiveCamera | null>(null);
  const ctrlRef    = useRef<OrbitControls | null>(null);
  const rafRef     = useRef<number>(0);
  const raycaster  = useRef(new THREE.Raycaster());
  const mouse      = useRef(new THREE.Vector2());

  const [objects,   setObjects]   = useState<SceneObject[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [viewMode,  setViewMode]  = useState<ViewMode>("solid");
  const [shapeType, setShapeType] = useState<ShapeType>("box");
  const [color,     setColor]     = useState(COLORS[0]);
  const [showAxes,  setShowAxes]  = useState(true);
  const axesRef    = useRef<THREE.AxesHelper | null>(null);
  const gridRef    = useRef<THREE.GridHelper | null>(null);
  const objectsRef = useRef<SceneObject[]>([]);

  /* инициализация Three.js */
  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight || 560;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x1a1a2e);
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    // scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(4, 3, 5);
    camRef.current = camera;

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    ctrlRef.current = controls;

    // lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    dir.castShadow = true;
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-5, 0, -5);
    scene.add(fill);

    // grid
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(grid);
    gridRef.current = grid;

    // axes
    const axes = new THREE.AxesHelper(3);
    scene.add(axes);
    axesRef.current = axes;

    // animate
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // resize
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

  /* axes toggle */
  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = showAxes;
  }, [showAxes]);

  /* viewMode */
  useEffect(() => {
    objectsRef.current.forEach((obj) => {
      const mat = obj.mesh.material as THREE.MeshStandardMaterial;
      mat.wireframe = viewMode === "wireframe";
      mat.opacity = viewMode === "both" ? 0.4 : 1;
      mat.transparent = viewMode === "both";
    });
  }, [viewMode]);

  const addObject = () => {
    const scene = sceneRef.current; if (!scene) return;
    const geo  = makeGeometry(shapeType);
    const mat  = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // разброс по сцене
    mesh.position.set((Math.random() - 0.5) * 4, 0.5, (Math.random() - 0.5) * 4);
    scene.add(mesh);

    const id  = `${shapeType}-${Date.now()}`;
    const obj: SceneObject = { id, type: shapeType, label: `${SHAPES.find((s) => s.id === shapeType)?.label} ${objectsRef.current.length + 1}`, color, mesh };
    (mesh as any).__id = id;
    objectsRef.current = [...objectsRef.current, obj];
    setObjects([...objectsRef.current]);
  };

  const removeObject = (id: string) => {
    const scene = sceneRef.current; if (!scene) return;
    const obj = objectsRef.current.find((o) => o.id === id);
    if (obj) { scene.remove(obj.mesh); obj.mesh.geometry.dispose(); }
    objectsRef.current = objectsRef.current.filter((o) => o.id !== id);
    setObjects([...objectsRef.current]);
    if (selected === id) setSelected(null);
  };

  const clearAll = () => {
    const scene = sceneRef.current; if (!scene) return;
    objectsRef.current.forEach((o) => { scene.remove(o.mesh); o.mesh.geometry.dispose(); });
    objectsRef.current = []; setObjects([]); setSelected(null);
  };

  /* клик по объекту */
  const handleCanvasClick = (e: React.MouseEvent) => {
    const renderer = rendRef.current;
    const camera   = camRef.current;
    const scene    = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    const meshes = objectsRef.current.map((o) => o.mesh);
    const hits   = raycaster.current.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = (hits[0].object as any).__id as string;
      setSelected((prev) => prev === id ? null : id);
      // подсветка
      objectsRef.current.forEach((o) => {
        (o.mesh.material as THREE.MeshStandardMaterial).emissive.set(o.id === id ? 0x223366 : 0x000000);
      });
    } else {
      setSelected(null);
      objectsRef.current.forEach((o) => { (o.mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000); });
    }
  };

  /* трансформы выбранного */
  const transformSelected = (axis: "x" | "y" | "z", delta: number, mode: "pos" | "rot" | "scale") => {
    const obj = objectsRef.current.find((o) => o.id === selected);
    if (!obj) return;
    if (mode === "pos")   obj.mesh.position[axis] += delta;
    if (mode === "rot")   obj.mesh.rotation[axis] += delta;
    if (mode === "scale") obj.mesh.scale[axis]    = Math.max(0.1, obj.mesh.scale[axis] + delta);
  };

  const selectedObj = objects.find((o) => o.id === selected);

  /* скриншот */
  const screenshot = () => {
    const renderer = rendRef.current; if (!renderer) return;
    renderer.render(sceneRef.current!, camRef.current!);
    const a = document.createElement("a");
    a.href = renderer.domElement.toDataURL("image/png");
    a.download = "model3d.png"; a.click();
  };

  return (
    <div className="flex h-full bg-gray-950 rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: 560 }}>

      {/* Левая панель */}
      <div className="w-52 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Примитив</p>
          <div className="grid grid-cols-1 gap-1">
            {SHAPES.map((s) => (
              <button key={s.id} onClick={() => setShapeType(s.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${shapeType === s.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                <Icon name={s.icon as Parameters<typeof Icon>[0]["name"]} size={13} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 border-b border-gray-700">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Цвет</p>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="p-3 border-b border-gray-700">
          <button onClick={addObject}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
            <Icon name="Plus" size={13} />Добавить
          </button>
        </div>

        <div className="p-3 border-b border-gray-700 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
            Объекты ({objects.length})
          </p>
          {objects.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Пусто</p>
          ) : (
            <div className="space-y-1">
              {objects.map((o) => (
                <div key={o.id}
                  onClick={() => {
                    setSelected((prev) => prev === o.id ? null : o.id);
                    objectsRef.current.forEach((obj) => {
                      (obj.mesh.material as THREE.MeshStandardMaterial).emissive.set(obj.id === o.id ? 0x223366 : 0x000000);
                    });
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${selected === o.id ? "bg-blue-900/60 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: o.color }} />
                  <span className="flex-1 truncate">{o.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeObject(o.id); }}
                    className="text-gray-500 hover:text-red-400">
                    <Icon name="X" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3">
          <button onClick={clearAll} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg">
            <Icon name="Trash2" size={12} />Очистить
          </button>
        </div>
      </div>

      {/* Центр — viewport */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-700">
          <div className="flex gap-1">
            {(["solid", "wireframe", "both"] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${viewMode === v ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
                {v === "solid" ? "Тело" : v === "wireframe" ? "Каркас" : "Оба"}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gray-700 mx-1" />
          <button onClick={() => setShowAxes((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${showAxes ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800"}`}>
            <Icon name="Axis3d" size={13} />Оси
          </button>
          <button onClick={() => {
            if (camRef.current && ctrlRef.current) {
              camRef.current.position.set(4, 3, 5);
              ctrlRef.current.target.set(0, 0, 0);
              ctrlRef.current.update();
            }
          }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-300 hover:bg-gray-800">
            <Icon name="Home" size={13} />Сброс камеры
          </button>
          <button onClick={screenshot}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 ml-auto">
            <Icon name="Download" size={13} />PNG
          </button>
        </div>

        {/* Canvas */}
        <div
          ref={mountRef}
          className="flex-1 cursor-grab active:cursor-grabbing"
          onClick={handleCanvasClick}
          style={{ minHeight: 480 }}
        />

        {/* Нижняя строка */}
        <div className="px-3 py-1.5 bg-gray-900 border-t border-gray-700 flex items-center gap-4 text-[11px] text-gray-400">
          <span>{objects.length} объектов</span>
          <span className="text-gray-600">·</span>
          <span>ЛКМ — выбрать · ПКМ/колесо — камера</span>
          {selectedObj && <span className="text-blue-400 ml-auto">Выбран: {selectedObj.label}</span>}
        </div>
      </div>

      {/* Правая панель — свойства */}
      <div className="w-44 shrink-0 bg-gray-900 border-l border-gray-700 p-3 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">Свойства</p>
        {selectedObj ? (
          <div className="space-y-4 text-xs text-gray-300">
            <div>
              <p className="text-gray-500 mb-1">Позиция</p>
              {(["x", "y", "z"] as const).map((a) => (
                <div key={a} className="flex items-center justify-between mb-1">
                  <span className="w-4 text-gray-400 uppercase">{a}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => transformSelected(a, -0.5, "pos")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">−</button>
                    <button onClick={() => transformSelected(a,  0.5, "pos")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Поворот</p>
              {(["x", "y", "z"] as const).map((a) => (
                <div key={a} className="flex items-center justify-between mb-1">
                  <span className="w-4 text-gray-400 uppercase">{a}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => transformSelected(a, -0.1, "rot")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">−</button>
                    <button onClick={() => transformSelected(a,  0.1, "rot")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-gray-500 mb-1">Масштаб</p>
              {(["x", "y", "z"] as const).map((a) => (
                <div key={a} className="flex items-center justify-between mb-1">
                  <span className="w-4 text-gray-400 uppercase">{a}</span>
                  <div className="flex gap-0.5">
                    <button onClick={() => transformSelected(a, -0.2, "scale")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">−</button>
                    <button onClick={() => transformSelected(a,  0.2, "scale")} className="w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => removeObject(selectedObj.id)}
              className="w-full py-1.5 text-xs text-red-400 hover:bg-gray-800 rounded-lg border border-gray-700">
              Удалить
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-6">Выберите объект</p>
        )}
      </div>
    </div>
  );
}
