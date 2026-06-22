/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useCad2DBlocks — вставка параметрических блоков из библиотеки на холст.
 * Блок строится из примитивов Fabric, группируется в один объект,
 * кладётся на активный слой, центрируется в видимой области и пишется в историю.
 */
import { useCallback, type MutableRefObject } from "react";
import { Canvas, Group } from "fabric";
import { BLOCKS } from "@/components/smartmach/cad2d.blocks";

interface BlocksDeps {
  fabricRef:      MutableRefObject<Canvas | null>;
  activeLayerRef: MutableRefObject<string>;
  saveHistory:    (fc: Canvas) => void;
}

export function useCad2DBlocks({ fabricRef, activeLayerRef, saveHistory }: BlocksDeps) {
  const insertBlock = useCallback((blockId: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const def = BLOCKS.find((b) => b.id === blockId);
    if (!def) return;

    const prims = def.build();
    if (!prims.length) return;

    // Группируем в единый объект — перемещается/копируется целиком
    const grp = new Group(prims, { subTargetCheck: false });
    (grp as any).__layer = activeLayerRef.current;
    (grp as any).__block = def.id;

    // Центр видимой области холста (с учётом зума и панорамирования)
    const vt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const zoom = fc.getZoom() || 1;
    const cx = (fc.getWidth() / 2 - vt[4]) / zoom;
    const cy = (fc.getHeight() / 2 - vt[5]) / zoom;
    grp.set({ left: cx, top: cy, originX: "center", originY: "center" });

    fc.add(grp);
    fc.setActiveObject(grp);
    fc.renderAll();
    saveHistory(fc);
  }, [fabricRef, activeLayerRef, saveHistory]);

  return { insertBlock };
}
