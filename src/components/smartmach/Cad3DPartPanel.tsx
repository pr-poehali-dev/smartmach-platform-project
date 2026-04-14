import Icon from "@/components/ui/icon";
import { type PartInfo } from "@/components/smartmach/cad.data";

interface Props {
  part: PartInfo;
  onLoadPartModel: () => void;
}

export default function Cad3DPartPanel({ part, onLoadPartModel }: Props) {
  return (
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
      <button
        onClick={onLoadPartModel}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium ml-auto"
      >
        <Icon name="Download" size={12} />Загрузить модель детали
      </button>
    </div>
  );
}
