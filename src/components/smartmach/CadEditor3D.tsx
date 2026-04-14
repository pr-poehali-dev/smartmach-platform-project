/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { type PartInfo } from "@/components/smartmach/cad.data";
import {
  COLORS,
  type ShapeType, type ViewMode, type CameraView, type MatType, type TransformMode,
  type SceneObject, type SceneLight,
} from "@/components/smartmach/cad3d.types";
import { useCad3DScene }   from "@/components/smartmach/useCad3DScene";
import { useCad3DObjects } from "@/components/smartmach/useCad3DObjects";
import Cad3DPartPanel       from "@/components/smartmach/Cad3DPartPanel";
import Cad3DLeftPanel       from "@/components/smartmach/Cad3DLeftPanel";
import Cad3DToolbar         from "@/components/smartmach/Cad3DToolbar";
import Cad3DPropertiesPanel from "@/components/smartmach/Cad3DPropertiesPanel";

export default function CadEditor3D({ part }: { part?: PartInfo | null }) {
  const objectsRef = useRef<SceneObject[]>([]);

  const [objects,       setObjects]       = useState<SceneObject[]>([]);
  const [selected,      setSelected]      = useState<string | null>(null);
  const [viewMode,      setViewMode]      = useState<ViewMode>("solid");
  const [shapeType,     setShapeType]     = useState<ShapeType>("box");
  const [matType,       setMatType]       = useState<MatType>("metal");
  const [color,         setColor]         = useState(COLORS[0]);
  const [showAxes,      setShowAxes]      = useState(true);
  const [showGrid,      setShowGrid]      = useState(true);
  const [cameraView,    setCameraView]    = useState<CameraView>("perspective");
  const [lights,        setLights]        = useState<SceneLight>({ ambient: 0.5, directional: 1.2 });
  const [dims,          setDims]          = useState({ w: 1, h: 1, d: 1 });
  const [measureMode,   setMeasureMode]   = useState(false);
  const [measurePts,    setMeasurePts]    = useState<THREE.Vector3[]>([]);
  const [measureDist,   setMeasureDist]   = useState<number | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [snapEnabled,   setSnapEnabled]   = useState(false);

  /* ── Three.js сцена ── */
  const scene = useCad3DScene(
    showAxes, showGrid, lights, viewMode, objectsRef, setCameraView,
  );

  /* ── Логика объектов ── */
  const objs = useCad3DObjects({
    sceneRef:  scene.sceneRef,
    camRef:    scene.camRef,
    ctrlRef:   scene.ctrlRef,
    objectsRef,
    rendRef:   scene.rendRef,
    selected, viewMode, shapeType, matType, color, dims,
    part: part ?? null,
    setObjects, setSelected, setCameraView,
  });

  /* ── Клик по канвасу: выбор / измерение ── */
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const renderer = scene.rendRef.current;
    const camera   = scene.camRef.current;
    const scn      = scene.sceneRef.current;
    if (!renderer || !camera || !scn) return;

    const rect = renderer.domElement.getBoundingClientRect();
    scene.mouse.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    scene.mouse.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    scene.raycaster.current.setFromCamera(scene.mouse.current, camera);

    if (measureMode) {
      const meshes = objectsRef.current.map((o) => o.mesh);
      const hits = scene.raycaster.current.intersectObjects(meshes);
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
    const hits = scene.raycaster.current.intersectObjects(meshes);
    if (hits.length > 0) {
      const id = (hits[0].object as any).__id as string;
      setSelected((prev) => prev === id ? null : id);
      objectsRef.current.forEach((o) => {
        (o.mesh.material as THREE.MeshStandardMaterial).emissive?.set(o.id === id ? 0x223366 : 0x000000);
      });
    } else {
      setSelected(null);
      objectsRef.current.forEach((o) => {
        (o.mesh.material as THREE.MeshStandardMaterial).emissive?.set(0x000000);
      });
    }
  }, [scene, measureMode, measurePts, objectsRef]);

  const handleSelect = (id: string) => setSelected((prev) => prev === id ? null : id);

  const selectedObj = objects.find((o) => o.id === selected);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] rounded-xl border border-gray-700 overflow-hidden" style={{ minHeight: 600 }}>

      {/* ── Панель активной детали ── */}
      {part && (
        <Cad3DPartPanel part={part} onLoadPartModel={objs.loadPartModel} />
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
          onAddObject={objs.addObject}
          onSelect={handleSelect}
          onToggleVisibility={objs.toggleVisibility}
          onToggleLock={objs.toggleLock}
          onRemove={objs.removeObject}
          onClearAll={objs.clearAll}
          onRenameObject={objs.renameObject}
          onMoveUp={objs.moveObjectUp}
          onMoveDown={objs.moveObjectDown}
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
            selectedCount={selected ? 1 : 0}
            transformMode={transformMode}
            snapEnabled={snapEnabled}
            onViewMode={setViewMode}
            onCameraView={scene.setCam}
            onToggleAxes={() => setShowAxes((v) => !v)}
            onToggleGrid={() => setShowGrid((v) => !v)}
            onToggleMeasure={() => { setMeasureMode((v) => !v); setMeasurePts([]); setMeasureDist(null); }}
            onToggleSnap={() => setSnapEnabled((v) => !v)}
            onTransformMode={setTransformMode}
            onExportOBJ={objs.exportOBJ}
            onExportPNG={objs.exportPNG}
            onExportSTL={objs.exportSTL}
            onLights={setLights}
            onDuplicateSelected={() => { if (selected) objs.duplicateObject(selected); }}
            onDeleteSelected={() => { if (selected) objs.removeObject(selected); }}
            onGroupSelected={() => {}}
            onAlignGround={objs.alignGround}
            onCenterSelected={objs.centerSelected}
            onMirrorX={objs.mirrorX}
            onMirrorZ={objs.mirrorZ}
            onResetCamera={objs.resetCamera}
          />

          {/* Canvas + правая панель */}
          <div className="flex flex-1 overflow-hidden">
            <div
              ref={scene.mountRef}
              className={`flex-1 ${measureMode ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
              onClick={handleCanvasClick}
            />

            {selectedObj && (
              <Cad3DPropertiesPanel
                selectedObj={selectedObj}
                onUpdateMaterial={objs.updateSelectedMaterial}
                onTransform={objs.transform}
                onDuplicate={objs.duplicateObject}
                onRemove={objs.removeObject}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
