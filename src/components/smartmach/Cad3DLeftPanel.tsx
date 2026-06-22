 
import { useState } from "react";
import {
  type ShapeType, type MatType, type SceneObject,
} from "@/components/smartmach/cad3d.types";
import Cad3DPropertiesForm from "@/components/smartmach/Cad3DPropertiesForm";
import Cad3DObjectsList from "@/components/smartmach/Cad3DObjectsList";

interface Props {
  shapeType: ShapeType;
  matType: MatType;
  color: string;
  dims: { w: number; h: number; d: number };
  objects: SceneObject[];
  selected: string | null;
  objectsRef: React.MutableRefObject<SceneObject[]>;
  onShapeType: (s: ShapeType) => void;
  onMatType: (m: MatType) => void;
  onColor: (c: string) => void;
  onDims: (d: { w: number; h: number; d: number }) => void;
  onAddObject: () => void;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onRenameObject: (id: string, label: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export default function Cad3DLeftPanel({
  shapeType, matType, color, dims, objects, selected,
  onShapeType, onMatType, onColor, onDims,
  onAddObject, onSelect, onToggleVisibility, onToggleLock, onRemove, onClearAll,
  onRenameObject, onMoveUp, onMoveDown,
}: Props) {
  const [secShape, setSecShape]  = useState(true);
  const [secDims,  setSecDims]   = useState(true);
  const [secMat,   setSecMat]    = useState(true);
  const [secColor, setSecColor]  = useState(false);
  const [secScene, setSecScene]  = useState(true);

  return (
    <div className="w-52 shrink-0 bg-[#15162a] border-r border-gray-700/60 flex flex-col overflow-y-auto text-xs">

      <Cad3DPropertiesForm
        shapeType={shapeType}
        matType={matType}
        color={color}
        dims={dims}
        secShape={secShape}
        secDims={secDims}
        secMat={secMat}
        secColor={secColor}
        onToggleSecShape={() => setSecShape((v) => !v)}
        onToggleSecDims={() => setSecDims((v) => !v)}
        onToggleSecMat={() => setSecMat((v) => !v)}
        onToggleSecColor={() => setSecColor((v) => !v)}
        onShapeType={onShapeType}
        onMatType={onMatType}
        onColor={onColor}
        onDims={onDims}
        onAddObject={onAddObject}
      />

      <Cad3DObjectsList
        objects={objects}
        selected={selected}
        secScene={secScene}
        onToggleSecScene={() => setSecScene((v) => !v)}
        onSelect={onSelect}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onRemove={onRemove}
        onClearAll={onClearAll}
        onRenameObject={onRenameObject}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />
    </div>
  );
}
