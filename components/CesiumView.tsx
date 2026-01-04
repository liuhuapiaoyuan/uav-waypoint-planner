import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Viewer, Entity, PolylineGraphics, PointGraphics, ScreenSpaceEventHandler, ScreenSpaceEvent, CameraFlyTo, BillboardGraphics, ImageryLayer } from 'resium';
import * as Cesium from 'cesium';
import { Waypoint, WaypointType, SimulatedPoint, DEFAULT_CAMERA, DEFAULT_SPEED } from '../types';

interface CesiumViewProps {
  waypoints: Waypoint[];
  simulatedPath: SimulatedPoint[];
  onMapClick: (position: any) => void;
  selectedId: string | null;
  isSimulating: boolean;
  onSimulationEnd: () => void;
  flightSpeed: number;
}

// Tianditu Configuration
const TDT_TOKEN = 'd0f21c0e42be78dabaa04a4adbe99699';
const TDT_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];
const TDT_URL = 'https://t{s}.tianditu.gov.cn/';

// Helper to create an Up Arrow Emoji image data URL
const createArrowImage = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f59e0b'; // Amber-500
    // Draw text centered
    ctx.fillText('⬆️', 32, 32);
  }
  return canvas.toDataURL();
};

const arrowImageUrl = createArrowImage();

export const CesiumView: React.FC<CesiumViewProps> = ({ 
  waypoints, 
  simulatedPath, 
  onMapClick, 
  selectedId,
  isSimulating,
  onSimulationEnd,
  flightSpeed = DEFAULT_SPEED
}) => {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const wtfsRef = useRef<any>(null); // Reference for Tianditu 3D Place Names
  const [pluginsLoaded, setPluginsLoaded] = useState(false);

  // Convert waypoints to Cartesian3 array for the line
  const positions = useMemo(() => {
    return waypoints.map(wp => Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt));
  }, [waypoints]);

  // Convert simulated path to Cartesian3 array for visualization
  const simPositions = useMemo(() => {
    return simulatedPath.map(p => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt));
  }, [simulatedPath]);

  // Tianditu Imagery Provider (Satellite) - img_w (Spherical Mercator)
  const imgProvider = useMemo(() => new Cesium.UrlTemplateImageryProvider({
    url: `${TDT_URL}DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
    subdomains: TDT_SUBDOMAINS,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 18
  }), []);

  // Tianditu Annotation Provider (Labels) - cia_w
  const ciaProvider = useMemo(() => new Cesium.UrlTemplateImageryProvider({
    url: `${TDT_URL}DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`,
    subdomains: TDT_SUBDOMAINS,
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 18
  }), []);

  // 1. Initialize Global Cesium and Load Scripts
  useEffect(() => {
    // CRITICAL: Tianditu plugins expect 'Cesium' to be on the window object.
    if (!(window as any).Cesium) {
        (window as any).Cesium = Cesium;
    }

    const loadScript = (src: string) => {
        return new Promise((resolve, reject) => {
            // Check if script already exists to prevent duplicates
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(true); 
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            // User example had 'cesium="true"', might be used by the loader to find base path
            script.setAttribute('cesium', 'true'); 
            script.async = false; // Important for order if appended quickly
            script.onload = () => resolve(true);
            script.onerror = (e) => {
                console.error(`Failed to load ${src}`, e);
                // We resolve anyway so other scripts might try to load, or the app can continue without this plugin
                resolve(false); 
            };
            document.head.appendChild(script);
        });
    };

    const initScripts = async () => {
        try {
            // Load dependencies in specific order
            await loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/long.min.js');
            await loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/bytebuffer.min.js');
            await loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/protobuf.min.js');
            
            // Load the main extension
            await loadScript('https://api.tianditu.gov.cn/cdn/plugins/cesium/Cesium_ext_min.js');
            
            console.log('Tianditu plugins scripts loaded.');
            setPluginsLoaded(true);
        } catch (error) {
            console.error('Error during Tianditu script initialization:', error);
        }
    };

    initScripts();
  }, []);

  // 2. Initialize Terrain and WTFS (Labels) after scripts are loaded
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !pluginsLoaded) return;

    // --- Terrain Setup ---
    try {
      const GeoTerrainProvider = (Cesium as any).GeoTerrainProvider;
      if (GeoTerrainProvider) {
        const terrainUrls = TDT_SUBDOMAINS.map(s => 
          TDT_URL.replace('{s}', s) + 'mapservice/swdx?T=elv_c&tk=' + TDT_TOKEN
        );
        const terrainProvider = new GeoTerrainProvider({
          urls: terrainUrls
        });
        viewer.terrainProvider = terrainProvider;
        console.log("Tianditu Terrain initialized");
      } else {
        console.warn("GeoTerrainProvider not found on global Cesium object");
      }
    } catch (e) {
      console.warn("Failed to init Terrain:", e);
    }

    // --- WTFS Setup (3D Place Names) ---
    try {
      const GeoWTFS = (Cesium as any).GeoWTFS;
      if (GeoWTFS && !wtfsRef.current) {
        const wtfs = new GeoWTFS({
            viewer,
            subdomains: TDT_SUBDOMAINS,
            metadata:{
                boundBox: { minX: -180, minY: -90, maxX: 180, maxY: 90 },
                minLevel: 1,
                maxLevel: 20
            },
            depthTestOptimization: true,
            dTOElevation: 15000,
            dTOPitch: Cesium.Math.toRadians(-70),
            aotuCollide: true, 
            collisionPadding: [5, 10, 8, 5],
            serverFirstStyle: true,
            labelGraphics: {
                font:"28px sans-serif",
                fontSize: 28,
                fillColor: Cesium.Color.WHITE,
                scale: 0.5,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                showBackground: false,
                pixelOffset: new Cesium.Cartesian2(5, 5),
            },
            billboardGraphics: {
                width: 18,
                height: 18,
            }
        });

        wtfs.getTileUrl = function(){
            return TDT_URL + 'mapservice/GetTiles?lxys={z},{x},{y}&VERSION=1.0.0&tk='+ TDT_TOKEN; 
        }
        wtfs.getIcoUrl = function(){
            return TDT_URL + 'mapservice/GetIcon?id={id}&tk='+ TDT_TOKEN;
        }

        wtfs.initTDT([{"x":6,"y":1,"level":2,"boundBox":{"minX":90,"minY":0,"maxX":135,"maxY":45}},{"x":7,"y":1,"level":2,"boundBox":{"minX":135,"minY":0,"maxX":180,"maxY":45}},{"x":6,"y":0,"level":2,"boundBox":{"minX":90,"minY":45,"maxX":135,"maxY":90}},{"x":7,"y":0,"level":2,"boundBox":{"minX":135,"minY":45,"maxX":180,"maxY":90}},{"x":5,"y":1,"level":2,"boundBox":{"minX":45,"minY":0,"maxX":90,"maxY":45}}]);
        
        wtfsRef.current = wtfs;
        console.log("Tianditu WTFS initialized");
      }
    } catch (e) {
      console.warn("Failed to init WTFS:", e);
    }

  }, [pluginsLoaded]); 


  // Prepare Animation Properties
  const { positionProperty, rotationProperty, startTime, stopTime } = useMemo(() => {
    if (!isSimulating || simulatedPath.length < 2) {
      return { positionProperty: undefined, rotationProperty: undefined, startTime: undefined, stopTime: undefined };
    }

    const start = Cesium.JulianDate.now();
    let currentSeconds = 0;
    
    const posProp = new Cesium.SampledPositionProperty();
    const rotProp = new Cesium.SampledProperty(Number);
    posProp.setInterpolationOptions({
      interpolationDegree: 1,
      interpolationAlgorithm: Cesium.LinearApproximation
    });
    
    const SPEED = Math.max(0.1, flightSpeed);

    for (let i = 0; i < simulatedPath.length; i++) {
      const pt = simulatedPath[i];
      const position = Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, pt.alt);
      
      if (i > 0) {
        const prevPt = simulatedPath[i-1];
        const prevPos = Cesium.Cartesian3.fromDegrees(prevPt.lon, prevPt.lat, prevPt.alt);
        const dist = Cesium.Cartesian3.distance(prevPos, position);
        const duration = dist / SPEED;
        currentSeconds += Math.max(0.05, duration); 
      }

      const time = Cesium.JulianDate.addSeconds(start, currentSeconds, new Cesium.JulianDate());
      posProp.addSample(time, position);

      const billboardRot = -Cesium.Math.toRadians(pt.heading);
      if (i > 0 && !pt.isOrbit && !simulatedPath[i-1].isOrbit) {
         const prevHeading = simulatedPath[i-1].heading;
         const prevRot = -Cesium.Math.toRadians(prevHeading);
         const holdTime = Cesium.JulianDate.addSeconds(start, currentSeconds - 0.2, new Cesium.JulianDate());
         rotProp.addSample(holdTime, prevRot);
      }
      rotProp.addSample(time, billboardRot);
    }

    const stop = Cesium.JulianDate.addSeconds(start, currentSeconds, new Cesium.JulianDate());
    return { positionProperty: posProp, rotationProperty: rotProp, startTime, stopTime };

  }, [isSimulating, simulatedPath, flightSpeed]);

  // Manage Clock Lifecycle
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (isSimulating && startTime && stopTime) {
      viewer.clock.startTime = startTime;
      viewer.clock.stopTime = stopTime;
      viewer.clock.currentTime = startTime;
      viewer.clock.clockRange = Cesium.ClockRange.CLAMPED; 
      viewer.clock.multiplier = 1; 
      viewer.clock.shouldAnimate = true;
      
      const removeListener = viewer.clock.onStop.addEventListener(() => {
        onSimulationEnd();
      });
      return () => {
        removeListener();
        viewer.clock.shouldAnimate = false;
      };
    } else {
      viewer.clock.shouldAnimate = false;
    }
  }, [isSimulating, startTime, stopTime, onSimulationEnd]);

  // Handle map click
  const handleLeftClick = (movement: any) => {
    if (!viewerRef.current) return;
    const cartesian = viewerRef.current.camera.pickEllipsoid(movement.position);
    if (cartesian) {
      onMapClick(cartesian);
    }
  };

  return (
    <Viewer 
      full
      ref={e => { if (e && e.cesiumElement) viewerRef.current = e.cesiumElement; }}
      timeline={isSimulating}
      animation={isSimulating}
      baseLayerPicker={false} 
      imageryProvider={imgProvider} // Sets the BASE layer. This should work even if plugins fail.
      vrButton={false}
      geocoder={false}
      homeButton={false}
      infoBox={false}
      sceneModePicker={false}
      navigationHelpButton={false}
    >
      {/* Tianditu Annotation Layer (Labels) - Placed ON TOP of base layer */}
      <ImageryLayer imageryProvider={ciaProvider} />

      <CameraFlyTo 
        destination={Cesium.Cartesian3.fromDegrees(
          DEFAULT_CAMERA.destination.lon, 
          DEFAULT_CAMERA.destination.lat, 
          DEFAULT_CAMERA.destination.height
        )}
        duration={2} 
        once={true}
      />

      <ScreenSpaceEventHandler>
        <ScreenSpaceEvent action={handleLeftClick} type={Cesium.ScreenSpaceEventType.LEFT_CLICK} />
      </ScreenSpaceEventHandler>

      {/* Render Main Waypoints */}
      {!isSimulating && waypoints.map((wp, index) => (
        <Entity
          key={wp.id}
          position={Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt)}
          name={`航点 ${index + 1}`}
          description={wp.type === WaypointType.ORBIT ? `环绕半径: ${wp.orbitRadius}m` : '普通飞越'}
        >
          <PointGraphics 
            pixelSize={selectedId === wp.id ? 20 : 12} 
            color={selectedId === wp.id ? Cesium.Color.fromCssColorString('#f59e0b') : (wp.type === WaypointType.ORBIT ? Cesium.Color.fromCssColorString('#ef4444') : Cesium.Color.fromCssColorString('#3b82f6'))} 
            outlineColor={Cesium.Color.WHITE}
            outlineWidth={2}
          />
          {wp.type === WaypointType.ORBIT && (
            <Entity position={Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt)}>
               <PolylineGraphics
                 positions={(() => {
                    const points = [];
                    for(let i=0; i<=360; i+=5) {
                        const rad = Cesium.Math.toRadians(i);
                        const latRad = Cesium.Math.toRadians(wp.lat);
                        const dLat = (wp.orbitRadius * Math.cos(rad)) / 111320; 
                        const dLon = (wp.orbitRadius * Math.sin(rad)) / (111320 * Math.cos(latRad));
                        points.push(Cesium.Cartesian3.fromDegrees(wp.lon + dLon, wp.lat + dLat, wp.alt));
                    }
                    return points;
                 })()}
                 material={Cesium.Color.ORANGE.withAlpha(0.6)}
                 width={2}
               />
            </Entity>
          )}
        </Entity>
      ))}

      {/* Render Planned Path */}
      {!isSimulating && (
        <Entity>
          <PolylineGraphics 
            positions={positions}
            width={2}
            material={new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.CYAN,
              dashLength: 16
            })}
          />
        </Entity>
      )}

      {/* Render Simulated Path */}
      {simPositions.length > 0 && (
        <Entity name="真实航迹">
          <PolylineGraphics 
            positions={simPositions}
            width={4}
            material={Cesium.Color.fromCssColorString('#10b981').withAlpha(0.6)}
          />
        </Entity>
      )}

      {/* Render Drone Entity */}
      {isSimulating && positionProperty && (
        <Entity
          position={positionProperty}
          name="模拟无人机"
        >
          <BillboardGraphics 
             image={arrowImageUrl}
             scale={1.5}
             rotation={rotationProperty}
             alignedAxis={Cesium.Cartesian3.UNIT_Z}
          />
        </Entity>
      )}

    </Viewer>
  );
};