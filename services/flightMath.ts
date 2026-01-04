import * as Cesium from 'cesium';
import { Waypoint, SimulatedPoint, WaypointType, DEFAULT_SPEED } from '../types';

/**
 * Calculates a point at a distance and bearing from a start point.
 */
export const getPointAtDistanceAndBearing = (lat: number, lon: number, distMeters: number, bearingDegrees: number) => {
  const R = 6378137; // Earth Radius in meters
  const d = distMeters;
  const brng = Cesium.Math.toRadians(bearingDegrees);
  const lat1 = Cesium.Math.toRadians(lat);
  const lon1 = Cesium.Math.toRadians(lon);

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

  return {
    lat: Cesium.Math.toDegrees(lat2),
    lon: Cesium.Math.toDegrees(lon2)
  };
};

/**
 * Calculates bearing between two points
 */
export const calculateBearing = (startLat: number, startLon: number, destLat: number, destLon: number): number => {
  const startLatRad = Cesium.Math.toRadians(startLat);
  const startLonRad = Cesium.Math.toRadians(startLon);
  const destLatRad = Cesium.Math.toRadians(destLat);
  const destLonRad = Cesium.Math.toRadians(destLon);

  const y = Math.sin(destLonRad - startLonRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLonRad - startLonRad);
  const brng = Math.atan2(y, x);
  return (Cesium.Math.toDegrees(brng) + 360) % 360;
};

/**
 * Generates the "Real" flight path including orbit expansions.
 * For orbits: Calculates points along circumference based on Speed.
 * Rule: Speed = Distance / Time. 
 * To ensure smooth flight simulation, we want roughly 1 waypoint every 1 second (or 0.5s).
 */
export const generateSimulationPath = (waypoints: Waypoint[], speed: number = DEFAULT_SPEED): SimulatedPoint[] => {
  if (waypoints.length < 1) return [];

  const path: SimulatedPoint[] = [];

  for (let i = 0; i < waypoints.length; i++) {
    const current = waypoints[i];
    const next = waypoints[i + 1];

    if (current.type === WaypointType.ORBIT) {
      // 1. Calculate Circumference
      const circumference = 2 * Math.PI * current.orbitRadius;
      
      // 2. Calculate time to complete one lap at given speed
      const timePerLap = circumference / Math.max(0.1, speed);
      
      // 3. Determine number of points. 
      // We aim for 1 sample every 1 second for simulation fidelity, 
      // but enforce a minimum number of points (e.g. 18 points, every 20 degrees) to ensure it looks like a circle geometrically.
      const SAMPLE_INTERVAL_SECONDS = 1.0; 
      let pointsPerLap = Math.ceil(timePerLap / SAMPLE_INTERVAL_SECONDS);
      
      // Clamp minimal points so high speed doesn't create a triangle
      pointsPerLap = Math.max(pointsPerLap, 24); 

      const laps = current.orbitLaps || 1;
      const angleStep = 360 / pointsPerLap;
      const totalSteps = pointsPerLap * laps;
      
      // Generate points for the defined number of laps
      for (let j = 0; j <= totalSteps; j++) { 
        const angle = j * angleStep; 
        const circlePoint = getPointAtDistanceAndBearing(current.lat, current.lon, current.orbitRadius, angle);
        
        // In an orbit looking at center (POI mode)
        const headingToCenter = calculateBearing(circlePoint.lat, circlePoint.lon, current.lat, current.lon);

        path.push({
          lat: circlePoint.lat,
          lon: circlePoint.lon,
          alt: current.alt,
          heading: headingToCenter,
          isOrbit: true
        });
      }
    } else {
      // Normal Waypoint
      let heading = 0;
      if (next) {
        heading = calculateBearing(current.lat, current.lon, next.lat, next.lon);
      } else if (i > 0) {
         // Keep previous heading
         const prev = path[path.length - 1];
         heading = prev ? prev.heading : 0;
      }

      path.push({
        lat: current.lat,
        lon: current.lon,
        alt: current.alt,
        heading: heading,
        isOrbit: false
      });
    }
  }

  return path;
};