export type GenerationType = 'Infinite' | 'Island' | 'Archipelago';
export type TopologyType = 'Standard' | 'Canyons' | 'Dunes' | 'Alpine';
export type ViewMode = 'Standard' | 'Tectonics' | 'Temperature' | 'Humidity' | 'Height';

export interface TerrainParams {
  seed: number;
  scale: number;
  heightScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  waterLevel: number;
  mapSize: number;
  resolution: number;
  wireframe: boolean;
  biomeContrast: number;
  exaggeration: number;
  erosionStrength: number;
  riverDepth: number;
  
  // Generation Style
  generationType: GenerationType;
  topology: TopologyType;

  // Geological Settings
  terrainAge: number; // 0 = Young/Jagged, 1 = Old/Smooth
  ridgeNoiseStrength: number; 
  peakRoughness: number; 
  terraceSteps: number; 
  
  // Detail Settings
  detailStrandFrequency: number; 

  // Climate System
  temperatureScale: number;
  temperatureOffset: number; 
  temperatureLapseRate: number; 
  humidityScale: number;
  humidityOffset: number; 

  // Biome Toggles
  enableSnow: boolean;
  enableDesert: boolean;
  enableForest: boolean;
  enableRock: boolean; 
  enableWater: boolean; 
  enableMesa: boolean; 
  enableVolcano: boolean; 
  enableCoral: boolean; 
  
  // Atmosphere
  timeOfDay: number; 

  // Debug
  viewMode: ViewMode;
}

export enum BiomeType {
  WATER = 'Water',
  SAND = 'Sand',
  GRASS = 'Grass',
  ROCK = 'Rock',
  SNOW = 'Snow',
  DESERT = 'Desert',
}