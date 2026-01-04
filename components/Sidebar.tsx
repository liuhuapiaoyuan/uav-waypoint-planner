import React from 'react';
import { Waypoint, WaypointType } from '../types';
import { Trash2, ArrowUp, ArrowDown, Plane, CircleDashed, Save, Upload, Play, RefreshCw, MapPin, RotateCw, Gauge } from 'lucide-react';

interface SidebarProps {
  waypoints: Waypoint[];
  setWaypoints: React.Dispatch<React.SetStateAction<Waypoint[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  globalSpeed: number;
  setGlobalSpeed: (speed: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  waypoints,
  setWaypoints,
  selectedId,
  setSelectedId,
  onRunSimulation,
  isSimulating,
  globalSpeed,
  setGlobalSpeed
}) => {

  const updateWaypoint = (id: string, updates: Partial<Waypoint>) => {
    setWaypoints(prev => prev.map(wp => wp.id === id ? { ...wp, ...updates } : wp));
  };

  const removeWaypoint = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveWaypoint = (e: React.MouseEvent, index: number, direction: -1 | 1) => {
    e.stopPropagation();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= waypoints.length) return;
    
    const newWaypoints = [...waypoints];
    const [moved] = newWaypoints.splice(index, 1);
    newWaypoints.splice(newIndex, 0, moved);
    setWaypoints(newWaypoints);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(waypoints, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "mission_plan.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        if (e.target?.result) {
          try {
            const parsed = JSON.parse(e.target.result as string);
            if (Array.isArray(parsed)) {
              setWaypoints(parsed);
            } else {
              alert("JSON 格式无效");
            }
          } catch (error) {
            alert("解析 JSON 失败");
          }
        }
      };
    }
  };

  const selectedWP = waypoints.find(wp => wp.id === selectedId);

  return (
    <div className="w-96 bg-white border-r border-blue-100 flex flex-col h-full shadow-2xl z-10 relative">
      <div className="p-5 border-b border-blue-100 bg-blue-50/50">
        <h1 className="text-xl font-bold text-blue-700 flex items-center gap-2">
          <Plane className="w-6 h-6" /> 
          无人机航线规划器
        </h1>
        <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
          <MapPin size={10} /> 中国福建泉州·洛江基地
        </p>

        {/* Global Settings */}
        <div className="mt-4 bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
          <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
             <Gauge size={12} /> 全局巡航速度 (m/s)
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={globalSpeed} 
              onChange={(e) => setGlobalSpeed(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="font-mono text-sm font-bold text-blue-600 w-8 text-right">{globalSpeed}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {waypoints.length === 0 && (
          <div className="text-center text-slate-400 py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <p className="font-medium">暂无航点</p>
            <p className="text-sm mt-2">请点击地图添加航点</p>
          </div>
        )}

        {waypoints.map((wp, index) => (
          <div 
            key={wp.id}
            onClick={() => setSelectedId(wp.id)}
            className={`p-3 rounded-xl border cursor-pointer transition-all group ${
              selectedId === wp.id 
                ? 'bg-white border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.15)] scale-[1.02]' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`font-mono text-sm font-bold flex items-center gap-2 ${selectedId === wp.id ? 'text-blue-700' : 'text-slate-600'}`}>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors ${selectedId === wp.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {index + 1}
                </span>
                {wp.type === WaypointType.NORMAL ? '普通航点' : '环绕中心'}
              </span>
              <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => moveWaypoint(e, index, -1)}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-20 text-slate-500"
                >
                  <ArrowUp size={14} />
                </button>
                <button 
                  onClick={(e) => moveWaypoint(e, index, 1)}
                  disabled={index === waypoints.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-20 text-slate-500"
                >
                  <ArrowDown size={14} />
                </button>
                <button 
                  onClick={(e) => removeWaypoint(e, wp.id)}
                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="text-xs text-slate-400 grid grid-cols-2 gap-2 pl-8">
              <div>纬度: {wp.lat.toFixed(5)}</div>
              <div>经度: {wp.lon.toFixed(5)}</div>
              {wp.type === WaypointType.ORBIT && (
                <div className="col-span-2 text-orange-500 flex items-center gap-1">
                   <RotateCw size={10} /> {wp.orbitLaps || 1} 圈 / R: {wp.orbitRadius}m
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Editor Panel for Selected Waypoint */}
      {selectedWP && (
        <div className="p-4 bg-white border-t border-blue-100 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-20">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            编辑航点 #{waypoints.findIndex(w => w.id === selectedId) + 1} 参数
          </h3>
          
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1.5">航点类型</label>
                  <select 
                    value={selectedWP.type}
                    onChange={(e) => updateWaypoint(selectedWP.id, { type: e.target.value as WaypointType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 outline-none transition-colors"
                  >
                    <option value={WaypointType.NORMAL}>普通航点 (Fly Through)</option>
                    <option value={WaypointType.ORBIT}>环绕航点 (Orbit)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1.5">飞行高度 (米)</label>
                  <input 
                    type="number" 
                    value={selectedWP.alt}
                    onChange={(e) => updateWaypoint(selectedWP.id, { alt: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
             </div>

             {selectedWP.type === WaypointType.ORBIT && (
               <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 space-y-3">
                  <div className="flex items-center gap-2 text-orange-600 text-xs font-bold">
                    <CircleDashed size={14} /> 环绕参数配置
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-orange-700/70 block mb-1">环绕半径 (米)</label>
                      <input 
                        type="number" 
                        value={selectedWP.orbitRadius}
                        onChange={(e) => updateWaypoint(selectedWP.id, { orbitRadius: parseFloat(e.target.value) })}
                        className="w-full bg-white border border-orange-200 rounded px-2 py-1 text-sm text-slate-700 focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-orange-700/70 block mb-1">环绕圈数</label>
                      <input 
                        type="number" 
                        min={1}
                        max={100}
                        value={selectedWP.orbitLaps || 1}
                        onChange={(e) => updateWaypoint(selectedWP.id, { orbitLaps: parseInt(e.target.value) })}
                        className="w-full bg-white border border-orange-200 rounded px-2 py-1 text-sm text-slate-700 focus:border-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-orange-400 italic leading-tight">
                     * 环绕点密度将根据全局速度 ({globalSpeed}m/s) 自动计算，确保匀速飞行。
                  </p>
               </div>
             )}
          </div>
        </div>
      )}

      {/* Global Actions */}
      <div className="p-4 border-t border-blue-100 bg-white flex flex-col gap-2">
        <button 
          onClick={onRunSimulation}
          className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
            isSimulating 
            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200' 
            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
          }`}
        >
          {isSimulating ? (
             <><RefreshCw size={16} className="animate-spin" /> 停止模拟 (Stop)</>
          ) : (
             <><Play size={16} /> 生成航迹并模拟飞行</>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
             onClick={handleExport}
             className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-xs border border-slate-200 transition-colors font-medium"
          >
            <Save size={14} /> 导出航线
          </button>
          <label className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-lg text-xs border border-slate-200 cursor-pointer transition-colors font-medium">
            <Upload size={14} /> 导入航线
            <input type="file" onChange={handleImport} accept=".json" className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};