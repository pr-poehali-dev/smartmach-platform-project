/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  makeGeometry, makeMaterial, makeTextSprite,
  type ShapeType, type MatType, type ViewMode,
  type SceneObject,
} from "@/components/smartmach/cad3d.types";
import { type PartInfo } from "@/components/smartmach/cad.data";

interface Deps {
  sceneRef:    MutableRefObject<THREE.Scene | null>;
  camRef:      MutableRefObject<THREE.PerspectiveCamera | null>;
  ctrlRef:     MutableRefObject<any | null>;
  objectsRef:  MutableRefObject<SceneObject[]>;
  rendRef:     MutableRefObject<THREE.WebGLRenderer | null>;
  selected:    string | null;
  viewMode:    ViewMode;
  shapeType:   ShapeType;
  matType:     MatType;
  color:       string;
  dims:        { w: number; h: number; d: number };
  part:        PartInfo | null | undefined;
  setObjects:  (o: SceneObject[]) => void;
  setSelected: (id: string | null) => void;
  setCameraView: (v: any) => void;
}

export function useCad3DObjects({
  sceneRef, camRef, ctrlRef, objectsRef, rendRef,
  selected, viewMode, shapeType, matType, color, dims, part,
  setObjects, setSelected, setCameraView,
}: Deps) {

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
  }, [sceneRef, objectsRef, shapeType, matType, color, dims, setObjects]);

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
  }, [sceneRef, camRef, ctrlRef, objectsRef, part, setObjects, setSelected]);

  const removeObject = useCallback((id: string) => {
    const scene = sceneRef.current; if (!scene) return;
    const obj = objectsRef.current.find((o) => o.id === id);
    if (obj) { scene.remove(obj.mesh); obj.mesh.geometry.dispose(); (obj.mesh.material as THREE.Material).dispose(); }
    objectsRef.current = objectsRef.current.filter((o) => o.id !== id);
    setObjects([...objectsRef.current]);
    if (selected === id) setSelected(null);
  }, [sceneRef, objectsRef, selected, setObjects, setSelected]);

  const toggleVisibility = useCallback((id: string) => {
    const obj = objectsRef.current.find((o) => o.id === id); if (!obj) return;
    obj.mesh.visible = !obj.mesh.visible;
    obj.visible = obj.mesh.visible;
    setObjects([...objectsRef.current]);
  }, [objectsRef, setObjects]);

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
  }, [sceneRef, objectsRef, setObjects]);

  const updateSelectedMaterial = useCallback((newColor: string, newMat: MatType) => {
    const obj = objectsRef.current.find((o) => o.id === selected); if (!obj) return;
    const mat = makeMaterial(newMat, newColor);
    if (viewMode === "wireframe") mat.wireframe = true;
    if (viewMode === "xray") { mat.transparent = true; mat.opacity = 0.35; }
    obj.mesh.material = mat;
    obj.color = newColor; obj.matType = newMat;
    setObjects([...objectsRef.current]);
  }, [objectsRef, selected, viewMode, setObjects]);

  const transform = useCallback((axis: "x"|"y"|"z", delta: number, mode: "pos"|"rot"|"scale") => {
    const obj = objectsRef.current.find((o) => o.id === selected); if (!obj) return;
    if (mode === "pos")   obj.mesh.position[axis] += delta;
    if (mode === "rot")   obj.mesh.rotation[axis] += delta;
    if (mode === "scale") obj.mesh.scale[axis] = Math.max(0.05, obj.mesh.scale[axis] + delta);
  }, [objectsRef, selected]);

  const clearAll = useCallback(() => {
    const scene = sceneRef.current; if (!scene) return;
    objectsRef.current.forEach((o) => { scene.remove(o.mesh); o.mesh.geometry.dispose(); });
    objectsRef.current = []; setObjects([]); setSelected(null);
  }, [sceneRef, objectsRef, setObjects, setSelected]);

  const toggleLock = useCallback((id: string) => {
    const obj = objectsRef.current.find((o) => o.id === id); if (!obj) return;
    obj.locked = !obj.locked;
    setObjects([...objectsRef.current]);
  }, [objectsRef, setObjects]);

  const renameObject = useCallback((id: string, label: string) => {
    const obj = objectsRef.current.find((o) => o.id === id); if (!obj) return;
    obj.label = label;
    setObjects([...objectsRef.current]);
  }, [objectsRef, setObjects]);

  const moveObjectUp = useCallback((id: string) => {
    const idx = objectsRef.current.findIndex((o) => o.id === id);
    if (idx <= 0) return;
    const arr = [...objectsRef.current];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    objectsRef.current = arr;
    setObjects([...arr]);
  }, [objectsRef, setObjects]);

  const moveObjectDown = useCallback((id: string) => {
    const idx = objectsRef.current.findIndex((o) => o.id === id);
    if (idx < 0 || idx >= objectsRef.current.length - 1) return;
    const arr = [...objectsRef.current];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    objectsRef.current = arr;
    setObjects([...arr]);
  }, [objectsRef, setObjects]);

  const alignGround = useCallback(() => {
    const sel = selected ? objectsRef.current.find((o) => o.id === selected) : null;
    const targets = sel ? [sel] : objectsRef.current;
    targets.forEach((o) => { o.mesh.position.y = o.dims.h / 2; });
  }, [objectsRef, selected]);

  const centerSelected = useCallback(() => {
    const sel = selected ? objectsRef.current.find((o) => o.id === selected) : null;
    const targets = sel ? [sel] : objectsRef.current;
    targets.forEach((o) => { o.mesh.position.set(0, o.mesh.position.y, 0); });
  }, [objectsRef, selected]);

  const mirrorX = useCallback(() => {
    const obj = selected ? objectsRef.current.find((o) => o.id === selected) : null;
    if (!obj) return;
    obj.mesh.scale.x *= -1;
  }, [objectsRef, selected]);

  const mirrorZ = useCallback(() => {
    const obj = selected ? objectsRef.current.find((o) => o.id === selected) : null;
    if (!obj) return;
    obj.mesh.scale.z *= -1;
  }, [objectsRef, selected]);

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
  }, [objectsRef]);

  const exportPNG = useCallback(() => {
    const renderer = rendRef.current; if (!renderer) return;
    renderer.render(sceneRef.current!, camRef.current!);
    const a = document.createElement("a");
    a.href = renderer.domElement.toDataURL("image/png");
    a.download = "model3d.png"; a.click();
  }, [rendRef, sceneRef, camRef]);

  const exportSTL = useCallback(() => {
    let stl = "solid SmartMach\n";
    objectsRef.current.forEach((o) => {
      const geo = o.mesh.geometry.clone().applyMatrix4(o.mesh.matrixWorld);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i += 3) {
        stl += `  facet normal 0 0 0\n    outer loop\n`;
        for (let j = 0; j < 3; j++) {
          stl += `      vertex ${pos.getX(i+j).toFixed(4)} ${pos.getY(i+j).toFixed(4)} ${pos.getZ(i+j).toFixed(4)}\n`;
        }
        stl += `    endloop\n  endfacet\n`;
      }
    });
    stl += "endsolid SmartMach\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([stl], { type: "text/plain" }));
    a.download = "model.stl"; a.click();
  }, [objectsRef]);

  const resetCamera = useCallback(() => {
    const cam = camRef.current; const ctrl = ctrlRef.current; if (!cam || !ctrl) return;
    cam.position.set(4, 3, 5); ctrl.target.set(0, 0, 0); ctrl.update();
    setCameraView("perspective");
  }, [camRef, ctrlRef, setCameraView]);

  return {
    addObject, loadPartModel,
    removeObject, toggleVisibility, duplicateObject,
    updateSelectedMaterial, transform,
    clearAll, toggleLock, renameObject, moveObjectUp, moveObjectDown,
    alignGround, centerSelected, mirrorX, mirrorZ,
    exportOBJ, exportPNG, exportSTL, resetCamera,
  };
}