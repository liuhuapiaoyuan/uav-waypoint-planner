export enum WaypointType {
  NORMAL = 'NORMAL',
  ORBIT = 'ORBIT',
}

export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  alt: number; // Altitude in meters
  type: WaypointType;
  // Orbit specifics
  orbitRadius: number; // meters
  orbitPoints: number; // Number of waypoints to generate for one circle (granularity)
  orbitLaps: number; // Number of full circles to perform
  orbitSpeed: number; // m/s (Optional/Legacy, we will use global speed)
}

export interface SimulatedPoint {
  lat: number;
  lon: number;
  alt: number;
  heading: number; // Degrees (0-360)
  isOrbit: boolean;
}

export const DEFAULT_ALTITUDE = 50;
export const DEFAULT_RADIUS = 30;
export const DEFAULT_ORBIT_POINTS = 36; // Legacy default
export const DEFAULT_ORBIT_LAPS = 1;
export const DEFAULT_SPEED = 10; // m/s

// Luojiang District, Quanzhou, Fujian
export const DEFAULT_CAMERA = {
  destination: {
    lat: 24.93418,
    lon: 118.65280,
    height: 1500
  }
};