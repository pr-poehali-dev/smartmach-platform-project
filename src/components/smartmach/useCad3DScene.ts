/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, type MutableRefObject, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CAMERA_VIEWS, type CameraView, type SceneLight, type ViewMode, type SceneObject } from "@/components/smartmach/cad3d.types";

export interface Cad3DSceneRefs {
  mountRef:    RefObject<HTMLDivElement>;
  rendRef:     MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef:    MutableRefObject<THREE.Scene | null>;
  camRef:      MutableRefObject<THREE.PerspectiveCamera | null>;
  ctrlRef:     MutableRefObject<OrbitControls | null>;
  rafRef:      MutableRefObject<number>;
  raycaster:   MutableRefObject<THREE.Raycaster>;
  mouse:       MutableRefObject<THREE.Vector2>;
  axesRef:     MutableRefObject<THREE.AxesHelper | null>;
  gridRef:     MutableRefObject<THREE.GridHelper | null>;
  ambLightRef: MutableRefObject<THREE.AmbientLight | null>;
  dirLightRef: MutableRefObject<THREE.DirectionalLight | null>;
}

export function useCad3DScene(
  showAxes: boolean,
  showGrid: boolean,
  lights: SceneLight,
  viewMode: ViewMode,
  objectsRef: MutableRefObject<SceneObject[]>,
  setCameraView: (v: CameraView) => void,
): Cad3DSceneRefs & { setCam: (view: CameraView) => void } {
  const mountRef    = useRef<HTMLDivElement>(null);
  const rendRef     = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef    = useRef<THREE.Scene | null>(null);
  const camRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const ctrlRef     = useRef<OrbitControls | null>(null);
  const rafRef      = useRef(0);
  const raycaster   = useRef(new THREE.Raycaster());
  const mouse       = useRef(new THREE.Vector2());
  const axesRef     = useRef<THREE.AxesHelper | null>(null);
  const gridRef     = useRef<THREE.GridHelper | null>(null);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

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
      mat.wireframe   = viewMode === "wireframe";
      mat.opacity     = viewMode === "xray" ? 0.35 : (obj.matType === "glass" ? 0.4 : 1);
      mat.transparent = viewMode === "xray" || obj.matType === "glass";
    });
  }, [viewMode, objectsRef]);

  /* ── камера ── */
  const setCam = useCallback((view: CameraView) => {
    const cam = camRef.current; const ctrl = ctrlRef.current; if (!cam || !ctrl) return;
    const v = CAMERA_VIEWS.find((c) => c.id === view)!;
    cam.position.set(...v.pos);
    ctrl.target.set(...v.target);
    ctrl.update(); setCameraView(view);
  }, [setCameraView]);

  return {
    mountRef, rendRef, sceneRef, camRef, ctrlRef, rafRef,
    raycaster, mouse, axesRef, gridRef, ambLightRef, dirLightRef,
    setCam,
  };
}