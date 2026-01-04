import React, { useState } from 'react';
import * as Cesium from 'cesium';
import { Sidebar } from './components/Sidebar';
import { CesiumView } from './components/CesiumView';
import { Waypoint, WaypointType, SimulatedPoint, DEFAULT_ALTITUDE, DEFAULT_RADIUS, DEFAULT_ORBIT_POINTS, DEFAULT_ORBIT_LAPS, DEFAULT_SPEED } from './types';
import { generateSimulationPath } from './services/flightMath';

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalSpeed, setGlobalSpeed] = useState<number>(DEFAULT_SPEED);
  
  // Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedPath, setSimulatedPath] = useState<SimulatedPoint[]>([]);

  // Add waypoint on map click
  const handleMapClick = (cartesian: any) => {
    if (isSimulating) return; // Disable editing during sim

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const newWaypoint: Waypoint = {
      id: crypto.randomUUID(),
      lat: Cesium.Math.toDegrees(cartographic.latitude),
      lon: Cesium.Math.toDegrees(cartographic.longitude),
      alt: DEFAULT_ALTITUDE,
      type: WaypointType.NORMAL,
      orbitRadius: DEFAULT_RADIUS,
      orbitPoints: DEFAULT_ORBIT_POINTS, // Will be recalculated dynamically based on speed in simulation
      orbitLaps: DEFAULT_ORBIT_LAPS,
      orbitSpeed: globalSpeed
    };

    setWaypoints(prev => [...prev, newWaypoint]);
    setSelectedId(newWaypoint.id);
  };

  const handleRunSimulation = () => {
    if (isSimulating) {
      // Stop
      setIsSimulating(false);
      setSimulatedPath([]);
      return;
    }

    // Start
    const path = generateSimulationPath(waypoints, globalSpeed);
    if (path.length === 0) {
      alert("请先添加航点 (Please add waypoints first)");
      return;
    }

    setSimulatedPath(path);
    setIsSimulating(true);
  };

  return (
    <div className="flex h-screen w-screen bg-sky-50 overflow-hidden text-slate-700">
      <Sidebar 
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
        globalSpeed={globalSpeed}
        setGlobalSpeed={setGlobalSpeed}
      />
      
      <div className="flex-1 relative">
         <CesiumView 
           waypoints={waypoints}
           simulatedPath={simulatedPath}
           onMapClick={handleMapClick}
           selectedId={selectedId}
           isSimulating={isSimulating}
           onSimulationEnd={() => setIsSimulating(false)}
           flightSpeed={globalSpeed}
         />
         
         {/* Overlay Info */}
         <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-blue-100 min-w-[200px] pointer-events-none">
           <p className="font-bold text-blue-900 mb-2 border-b border-blue-100 pb-1">飞行状态监控</p>
           <div className="space-y-1 text-sm text-slate-600">
             <div className="flex justify-between"><span>航点数量:</span> <span className="font-mono font-bold">{waypoints.length}</span></div>
             <div className="flex justify-between"><span>全局航速:</span> <span className="font-mono font-bold">{globalSpeed} m/s</span></div>
             {isSimulating ? (
               <>
                  <div className="flex justify-between text-green-600 font-bold"><span>模拟执行中...</span></div>
                  <div className="text-xs text-slate-400 mt-1">飞机正在按规划路径平滑飞行</div>
               </>
             ) : (
                <div className="text-xs text-slate-400 mt-1">等待指令</div>
             )}
           </div>
         </div>
      </div>
    </div>
  );
}

export default App;