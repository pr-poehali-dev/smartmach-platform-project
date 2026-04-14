/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";
import {
  makeGeometry, makeMaterial, makeTextSprite,
  COLORS, CAMERA_VIEWS,
  type ShapeType, type ViewMode, type CameraView, type MatType,
  type SceneObject, type SceneLight,
} from "@/components/smartmach/cad3d.types";
import Cad3DLeftPanel from "@/components/smartmach/Cad3DLeftPanel";
import Cad3DToolbar from "@/components/smartmach/Cad3DToolbar";
import Cad3DPropertiesPanel from "@/components/smartmach/Cad3DPropertiesPanel";

export default function CadEditor3D({ part }: { part?: PartInfo | null }) {
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

    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(3);
    scene.add(axes);
    axesRef.current = axes;

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
      id, type: shapeType,
      label: `${["box","cylinder","sphere","cone","torus","tube","wedge","prism"].includes(shapeType)
        ? { box: "Параллелепипед", cylinder: "Цилиндр", sphere: "Сфера", cone: "Конус", torus: "Тор", tube: "Труба", wedge: "Клин", prism: "Призма" }[shapeType]
        : shapeType} ${objectsRef.current.length + 1}`,
      color, matType, mesh, dims: { ...dims }, visible: true,
    };
    (mesh as any).__id = id;
    objectsRef.current = [...objectsRef.current, obj];
    setObjects([...objectsRef.current]);
  }, [shapeType, matType, color, dims]);

  /* ── загрузка детали из библиотеки с реальными размерами ── */
  const loadPartModel = useCallback(() => {
    const scene = sceneRef.current; if (!scene || !part) return;
    const SCALE = 0.01;
    const L = (part.dim_length ?? 200) * SCALE;
    const W = (part.dim_width  ?? 100) * SCALE;
    const H = (part.dim_height ?? 50)  * SCALE;

    const typeMap: Record<string, ShapeType> = {
      "Валы и оси": "cylinder", "Зубчатые колёса": "cylinder",
      "Корпуса": "box", "Крепёж": "cylinder", "Подшипниковые узлы": "torus",
      "Фланцы": "cylinder", "Пружины": "torus", "Муфты": "cylinder",
    };
    const pType: ShapeType = typeMap[part.category] ?? "box";

    const matMap: Record<string, MatType> = {
      "Сталь 45": "metal", "Сталь 40Х": "metal", "Сталь 12Х18Н10Т": "metal",
      "Алюминий": "metal", "Чугун": "metal",
      "Пластик": "plastic", "Резина": "rubber",
    };
    const detectedMat: MatType = Object.entries(matMap).find(([k]) => part.material?.includes(k))?.[1] as MatType ?? "metal";

    const geo = makeGeometry(pType, L, H, W);
    const mat = makeMaterial(detectedMat, "#8899aa");
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.set(0, H / 2, 0);
    scene.add(mesh);

    const addDimLine = (from: THREE.Vector3, to: THREE.Vector3, label: string) => {
      const points = [from, to];
      const geo2 = new THREE.BufferGeometry().setFromPoints(points);
      const mat2 = new THREE.LineBasicMaterial({ color: 0x1e40af });
      const line = new THREE.Line(geo2, mat2);
      scene.add(line);
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const sprite = makeTextSprite(label);
      sprite.position.copy(mid);
      scene.add(sprite);
    };

    addDimLine(
      new THREE.Vector3(-L/2 - 0.1, 0, -W/2),
      new THREE.Vector3(-L/2 - 0.1, H, -W/2),
      `H=${part.dim_height ?? "?"}мм`
    );
    addDimLine(
      new THREE.Vector3(-L/2, -0.1, -W/2),
      new THREE.Vector3(L/2, -0.1, -W/2),
      `L=${part.dim_length ?? "?"}мм`
    );
    addDimLine(
      new THREE.Vector3(L/2 + 0.1, -0.1, -W/2),
      new THREE.Vector3(L/2 + 0.1, -0.1, W/2),
      `W=${part.dim_width ?? "?"}мм`
    );

    const id = `part-${Date.now()}`;
    const obj: SceneObject = {
      id, type: pType,
      label: `${part.code} ${part.name}`,
      color: "#8899aa", matType: detectedMat,
      mesh, dims: { w: L, h: H, d: W }, visible: true,
    };
    (mesh as any).__id = id;
    objectsRef.current = [...objectsRef.current, obj];
    setObjects([...objectsRef.current]);
    setSelected(id);

    const maxDim = Math.max(L, W, H);
    if (camRef.current) {
      camRef.current.position.set(maxDim * 3, maxDim * 2, maxDim * 3);
      ctrlRef.current?.target.set(0, H / 2, 0);
      ctrlRef.current?.update();
    }
  }, [part]);

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

  const handleSelect = (id: string) => {
    setSelected((prev) => prev === id ? null : id);
  };

  const selectedObj = objects.find((o) => o.id === selected);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: 600 }}>

      {/* ── Панель активной детали ── */}
      {part && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-950 border-b border-blue-800 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <Icon name="Box" size={14} className="text-blue-400" />
            <span className="text-blue-300 font-medium">{part.code}</span>
            <span className="text-white font-semibold">{part.name}</span>
            {part.material && <span className="text-blue-300">· {part.material}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-blue-300 ml-2">
            {part.dim_length && <span>L: <b className="text-white">{part.dim_length} мм</b></span>}
            {part.dim_width  && <span>W: <b className="text-white">{part.dim_width} мм</b></span>}
            {part.dim_height && <span>H: <b className="text-white">{part.dim_height} мм</b></span>}
          </div>
          <button onClick={loadPartModel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium ml-auto">
            <Icon name="Download" size={12} />Загрузить модель детали
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 560 }}>

        {/* ── Левая панель ── */}
        <Cad3DLeftPanel
          shapeType={shapeType}
          matType={matType}
          color={color}
          dims={dims}
          objects={objects}
          selected={selected}
          objectsRef={objectsRef}
          onShapeType={setShapeType}
          onMatType={setMatType}
          onColor={setColor}
          onDims={setDims}
          onAddObject={addObject}
          onSelect={handleSelect}
          onToggleVisibility={toggleVisibility}
          onRemove={removeObject}
          onClearAll={clearAll}
        />

        {/* ── Viewport ── */}
        <div className="flex-1 flex flex-col">

          <Cad3DToolbar
            viewMode={viewMode}
            cameraView={cameraView}
            showAxes={showAxes}
            showGrid={showGrid}
            measureMode={measureMode}
            measureDist={measureDist}
            lights={lights}
            objectCount={objects.length}
            onViewMode={setViewMode}
            onCameraView={setCam}
            onToggleAxes={() => setShowAxes((v) => !v)}
            onToggleGrid={() => setShowGrid((v) => !v)}
            onToggleMeasure={() => { setMeasureMode((v) => !v); setMeasurePts([]); setMeasureDist(null); }}
            onExportOBJ={exportOBJ}
            onExportPNG={exportPNG}
            onLights={setLights}
          />

          {/* Canvas + правая панель */}
          <div className="flex flex-1 overflow-hidden">
            <div ref={mountRef} className={`flex-1 ${measureMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
              onClick={handleCanvasClick} />

            {selectedObj && (
              <Cad3DPropertiesPanel
                selectedObj={selectedObj}
                onUpdateMaterial={updateSelectedMaterial}
                onTransform={transform}
                onDuplicate={duplicateObject}
                onRemove={removeObject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
