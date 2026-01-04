import { TerrainParams } from '../types';
import { getFBM, getRidgedFBM, getBillowFBM, noiseGen } from './noise';

// --- MATH HELPERS ---
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const smoothstep = (min: number, max: number, value: number) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// --- TECTONIC HELPERS ---
const getTectonicChains = (x: number, z: number, params: TerrainParams, ageFactor: number) => {
    const { scale, seed, persistence, lacunarity } = params;
    
    // 1. Create Fault Lines using Warped Ridged Noise
    const warpScale = scale * 2.5;
    const wx = getFBM(x, z, { ...params, seed: seed + 300, scale: warpScale, octaves: 2 });
    const wz = getFBM(x + 500, z + 500, { ...params, seed: seed + 400, scale: warpScale, octaves: 2 });
    
    const faultX = x + (wx * scale * 1.2);
    const faultZ = z + (wz * scale * 1.2);

    // Primary Chain (The "Collision" zone)
    // 1.0 - abs(noise) gives a sharp ridge. 
    let rawChain = getRidgedFBM(faultX, faultZ, { ...params, scale: scale * 1.2, octaves: 6 });
    
    let chainHeight = rawChain;

    // 2. Terrain Age Modifier
    if (ageFactor < 0.3) {
        chainHeight = Math.pow(chainHeight, 1.2); // Young: Sharpen peaks
    } else {
        chainHeight = Math.pow(chainHeight, 0.8); // Old: Flatten peaks
    }

    return { height: chainHeight, activity: rawChain };
};

// Returns Height (studs) + Tectonic Data
export const getTerrainData = (x: number, z: number, params: TerrainParams) => {
  const { 
    heightScale, riverDepth, exaggeration, erosionStrength, scale, seed, 
    ridgeNoiseStrength, terraceSteps,
    detailStrandFrequency, generationType, mapSize, peakRoughness, topology, terrainAge
  } = params;

  // Age Factor (0 = Young, 1 = Old)
  const age = terrainAge !== undefined ? terrainAge : 0.5;

  // --- 1. Soft Domain Warping (Global) ---
  const warpScale = scale * 1.5; 
  // Old terrain has more chaotic warping due to erosion history
  const warpFactor = erosionStrength * 25 * (1 + age * 0.5); 
  
  const qx = getFBM(x, z, { ...params, scale: warpScale, octaves: 2 });
  const qz = getFBM(x + 5.2, z + 1.3, { ...params, scale: warpScale, octaves: 2 });
  
  const wx = x + qx * warpFactor;
  const wz = z + qz * warpFactor;

  let height01 = 0;
  let tectonicActivity = 0; // 0 = Passive, 1 = Active Plate Boundary

  // --- 2. TOPOLOGY GENERATION ---
  if (topology === 'Dunes') {
       // Billow Noise
       height01 = getBillowFBM(wx, wz, { ...params, scale: scale * 0.6, octaves: 4 });
       height01 = height01 * 0.3 + 0.1;
       tectonicActivity = 0;
  } 
  else if (topology === 'Alpine') {
       // Tectonic Chain Logic
       const chainData = getTectonicChains(wx, wz, params, age);
       height01 = chainData.height;
       tectonicActivity = chainData.activity;
       
       // Young terrain has extra rough noise on top
       if (age < 0.5) {
           const rough = getFBM(wx, wz, { ...params, scale: scale * 0.1, octaves: 3 });
           height01 += rough * 0.05 * (1 - age);
       } else {
           height01 *= 0.8; // Eroded height
       }
  }
  else if (topology === 'Canyons') {
       const plateau = getFBM(wx, wz, { ...params, scale: scale * 2.0, octaves: 3 });
       const valley = getRidgedFBM(wx, wz, { ...params, scale: scale * 0.8, octaves: 4 });
       const base = (plateau * 0.2 + 0.6); 
       // Older canyons are wider
       height01 = base - (valley * (1.5 + age * 0.5) * erosionStrength);
       tectonicActivity = valley; // Use valley depth as 'activity' for visuals
       
       const steps = 8;
       height01 = Math.round(height01 * steps) / steps;
  }
  else {
      // --- STANDARD CONTINENT LOGIC ---
      const baseNoise = getFBM(wx, wz, { ...params, scale: scale * 2.5, octaves: 4 });
      height01 = (baseNoise + 1) / 2; // 0..1

      // Add Tectonic Mountains
      // Use noise mask to place mountains in clusters/chains
      const chainMask = getFBM(wx / 2, wz / 2, { ...params, seed: seed + 99, scale: scale * 2, octaves: 2 });
      
      if (chainMask > 0) {
          const chainData = getTectonicChains(wx, wz, params, age);
          const blend = smoothstep(0, 0.4, chainMask);
          height01 = lerp(height01, chainData.height, blend * ridgeNoiseStrength);
          tectonicActivity = chainData.activity * blend;
      }
  }

  // --- 3. Exaggeration & Age Erosion ---
  if (topology !== 'Canyons') {
     let ex = exaggeration;
     if (age > 0.7) ex *= 0.7; // Old terrain is flatter
     height01 = Math.pow(Math.max(0, height01 + 0.1), ex) - Math.pow(0.1, ex);
  }

  // --- 4. World Shape Masking ---
  const dist = Math.sqrt(x*x + z*z);
  const normalizedDist = dist / (mapSize * 0.5);

  if (generationType === 'Island') {
      const mask = smoothstep(0.95, 0.6, normalizedDist); 
      height01 = lerp(-0.2, height01, mask);
  } 
  else if (generationType === 'Archipelago') {
      const globalMask = smoothstep(1.0, 0.7, normalizedDist);
      const clusterNoise = getFBM(x, z, { ...params, scale: scale * 4, octaves: 2 });
      const clusterVal = (clusterNoise + 1) / 2;
      const clusterMask = smoothstep(0.4, 0.55, clusterVal);
      height01 = lerp(-0.2, height01, globalMask * clusterMask);
  }

  // --- 5. River System ---
  let isRiver = false;
  if (riverDepth > 0 && topology !== 'Dunes' && topology !== 'Canyons') {
      const riverScale = scale * 3.5; 
      const riverRaw = noiseGen.noise(wx / riverScale, seed + 999, wz / riverScale);
      const riverVal = Math.abs(riverRaw);

      const valleyWidth = 0.3 + (age * 0.1); 
      const channelWidth = 0.08 + (age * 0.05);

      if (riverVal < valleyWidth) {
          const valleyProfile = 1.0 - smoothstep(0, valleyWidth, riverVal);
          const channelProfile = 1.0 - smoothstep(0, channelWidth, riverVal);

          const digStrength = valleyProfile * riverDepth * 0.4; 
          const channelDig = channelProfile * riverDepth * 0.1; 
          
          height01 -= digStrength + channelDig;

          if (riverVal < channelWidth * 0.8) {
              isRiver = true;
          }
      }
  }

  // --- 6. Terracing ---
  if (terraceSteps > 0 && topology !== 'Canyons') {
      const steps = terraceSteps;
      const stepped = Math.round(height01 * steps) / steps;
      height01 = lerp(height01, stepped, 0.6); 
  }

  // --- 7. Final Scaling ---
  let finalHeight = height01 * heightScale;

  // --- 8. Detail (Roughness) ---
  if (detailStrandFrequency > 0 && finalHeight > 5) {
      const freqMult = age < 0.3 ? 2.0 : 0.5;
      const ampMult = age < 0.3 ? 1.0 : 0.3;

      const detailScale = detailStrandFrequency * 0.05 * freqMult; 
      const detail = noiseGen.noise(x * detailScale, seed, z * detailScale);
      finalHeight += detail * 0.8 * ampMult; 
  }

  return { height: finalHeight, isRiver, tectonicActivity };
};

export const getTerrainHeight = (x: number, z: number, params: TerrainParams) => {
    return getTerrainData(x, z, params).height;
}

// --- CLIMATE ---
export const getClimateData = (x: number, z: number, height: number, params: TerrainParams) => {
    const { 
        seed, temperatureScale, temperatureOffset, temperatureLapseRate,
        humidityScale, humidityOffset
    } = params;

    const tempNoiseRaw = getFBM(x, z, { seed: seed + 1000, scale: temperatureScale, octaves: 3, persistence: 0.5, lacunarity: 2.0 });
    const baseTemp = (tempNoiseRaw + 1) / 2;
    const altitudeCooling = Math.max(0, height) * temperatureLapseRate;
    const finalTemp = baseTemp + temperatureOffset - altitudeCooling;

    const humidNoiseRaw = getFBM(x, z, { seed: seed + 2000, scale: humidityScale, octaves: 3, persistence: 0.5, lacunarity: 2.0 });
    const baseHumid = (humidNoiseRaw + 1) / 2;
    const altitudeWetness = Math.max(0, height) * 0.0002; 
    const finalHumid = baseHumid + humidityOffset + altitudeWetness;

    return { 
        temp: clamp(finalTemp, 0, 1), 
        humidity: clamp(finalHumid, 0, 1) 
    };
}

// Pass extra 'data' object containing tectonicActivity from the main loop
export const getBiomeColor = (height: number, x: number, z: number, params: TerrainParams, THREE: any, extraData?: any) => {
    const { viewMode } = params;
    
    // --- DEBUG VIEWS ---
    if (viewMode === 'Height') {
        const hNorm = clamp(height / params.heightScale, 0, 1);
        const c = new THREE.Color().setHSL(0, 0, hNorm);
        return { color: c, biome: 'Debug' };
    }

    if (viewMode === 'Tectonics') {
        // Visualize Tectonic Activity (Red = High Stress/Collision, Dark = Passive)
        const activity = extraData?.tectonicActivity || 0;
        const c = new THREE.Color();
        // Heatmap style: Black -> Red -> Yellow -> White
        if (activity < 0.2) c.setHex(0x111111);
        else if (activity < 0.5) c.setHex(0x550000);
        else if (activity < 0.8) c.setHex(0xff0000);
        else c.setHex(0xffff00);
        
        // Blend slightly with height to show shape
        const hNorm = clamp(height / params.heightScale, 0, 1);
        c.addScalar(hNorm * 0.1);
        return { color: c, biome: 'Debug' };
    }

    const { temp, humidity } = getClimateData(x, z, height, params);

    if (viewMode === 'Temperature') {
        // Blue (Cold) to Red (Hot)
        const hue = (1.0 - temp) * 0.7; // 0.7 (Blue) to 0.0 (Red)
        const c = new THREE.Color().setHSL(hue, 1, 0.5);
        return { color: c, biome: 'Debug' };
    }

    if (viewMode === 'Humidity') {
        // Yellow (Dry) to Blue (Wet)
        // Dry (0) = Yellow (0.16)
        // Wet (1) = Blue (0.6)
        const hue = 0.16 + (humidity * 0.44);
        const c = new THREE.Color().setHSL(hue, 1, 0.5);
        return { color: c, biome: 'Debug' };
    }

    // --- STANDARD BIOME COLORING ---
    const { heightScale, waterLevel, seed } = params;
    const { enableSnow, enableDesert, enableForest, enableRock, enableWater, enableMesa, enableVolcano, enableCoral, terrainAge } = params;

    const waterHeightAbsolute = waterLevel * heightScale;
    
    // --- SLOPE ---
    const dist = 1.0; 
    const h1 = getTerrainData(x + dist, z, params).height;
    const h2 = getTerrainData(x, z + dist, params).height;
    const slopeX = (h1 - height) / dist;
    const slopeZ = (h2 - height) / dist;
    const slope = Math.sqrt(slopeX*slopeX + slopeZ*slopeZ);

    const textureNoise = (noiseGen.noise(x * 0.3, seed, z * 0.3) * 0.05);

    // --- COLORS ---
    const C_BEACH = new THREE.Color(0xd6cba5); 
    const C_SAND = new THREE.Color(0xe6d9b3); 
    const C_MESA_ORANGE = new THREE.Color(0xd67f45);
    const C_MESA_RED = new THREE.Color(0xa34a26);
    const C_MESA_BROWN = new THREE.Color(0x754228);

    const C_GRASS_DRY = new THREE.Color(0x8da860);
    const C_SAVANNAH = new THREE.Color(0xbab548);
    const C_GRASS_LUSH = new THREE.Color(0x4c8c3e);
    const C_FOREST = new THREE.Color(0x2d5e2e);
    const C_TAIGA = new THREE.Color(0x3b4d3b);
    const C_JUNGLE = new THREE.Color(0x1a330a); 
    const C_SWAMP = new THREE.Color(0x4a5438);
    
    const C_ROCK = new THREE.Color(0x5a5752); 
    const C_ROCK_DARK = new THREE.Color(0x3e3b38);
    const C_ROCK_LIGHT = new THREE.Color(0x757068);
    const C_MUD = new THREE.Color(0x5c4f3d);
    
    const C_SNOW = new THREE.Color(0xffffff);
    const C_ICE = new THREE.Color(0xaaddff);

    const C_VOLCANIC = new THREE.Color(0x1a1a1a);
    const C_LAVA = new THREE.Color(0xff4400);
    const C_CORAL_1 = new THREE.Color(0xe06c75);
    const C_CORAL_2 = new THREE.Color(0x98c379);

    let baseColor = new THREE.Color();

    const isUnderwater = height < waterHeightAbsolute;
    
    if (isUnderwater && enableWater) {
        let isCoral = false;
        if (enableCoral) {
            const depth = waterHeightAbsolute - height;
            if (depth < 25 && temp > 0.6) {
                const coralNoise = noiseGen.noise(x/20, seed+888, z/20);
                if (coralNoise > 0.2) {
                   isCoral = true;
                   if (coralNoise > 0.5) baseColor.copy(C_CORAL_1);
                   else baseColor.copy(C_CORAL_2);
                   baseColor.lerp(C_SAND, 0.3);
                }
            }
        }
        if (!isCoral) {
            if (slope > 0.8 && enableRock) {
                baseColor.copy(C_ROCK_DARK);
            } else {
                const depth = waterHeightAbsolute - height;
                if (depth < 15) baseColor.copy(C_SAND);
                else baseColor.copy(C_MUD);
            }
        }
    } else {
        // --- LAND BIOME ---
        let isVolcano = false;
        if (enableVolcano) {
             const volcanoNoise = noiseGen.noise(x/1000, seed+555, z/1000); 
             if (volcanoNoise > 0.6 && height > heightScale * 0.25) {
                 isVolcano = true;
                 if (height > heightScale * 0.7 && slope < 1.0) {
                     const lavaNoise = noiseGen.noise(x/50, seed+111, z/50);
                     if (lavaNoise > 0.4) baseColor.copy(C_LAVA);
                     else baseColor.copy(C_VOLCANIC);
                 } else {
                     baseColor.copy(C_VOLCANIC);
                 }
             }
        }

        if (!isVolcano) {
            // Biomes
            if (temp < 0.25) {
                if (enableSnow) {
                    if (slope > 0.9 && enableRock) baseColor.copy(C_ROCK_LIGHT);
                    else if (humidity > 0.6) baseColor.copy(C_ICE);
                    else baseColor.copy(C_SNOW);
                } else {
                    baseColor.copy(C_ROCK_LIGHT);
                }
            }
            else if (temp < 0.45) {
                if (humidity > 0.5 && enableForest) baseColor.copy(C_TAIGA);
                else baseColor.copy(C_GRASS_DRY).lerp(C_ROCK_LIGHT, 0.5);
            }
            else if (temp < 0.75) {
                if (humidity < 0.3) {
                    if (enableDesert) baseColor.copy(C_GRASS_DRY);
                    else baseColor.copy(C_GRASS_DRY);
                } else if (humidity > 0.6) {
                    if (enableForest) {
                        if (height < waterHeightAbsolute + 20) baseColor.copy(C_SWAMP);
                        else baseColor.copy(C_FOREST);
                    } else baseColor.copy(C_GRASS_LUSH);
                } else baseColor.copy(C_GRASS_LUSH);
            }
            else {
                if (humidity < 0.35) {
                    if (enableMesa && humidity < 0.25) {
                        const bandNoise = Math.sin(height * 0.1 + noiseGen.noise(x*0.02, 0, z*0.02)*5);
                        if (bandNoise > 0.5) baseColor.copy(C_MESA_RED);
                        else if (bandNoise > 0) baseColor.copy(C_MESA_ORANGE);
                        else baseColor.copy(C_MESA_BROWN);
                    } 
                    else if (enableDesert) baseColor.copy(C_SAND);
                    else baseColor.copy(C_GRASS_DRY);
                } else if (humidity < 0.6) baseColor.copy(C_SAVANNAH);
                else {
                    if (enableForest) baseColor.copy(C_JUNGLE);
                    else baseColor.copy(C_GRASS_LUSH);
                }
            }
            // Shoreline
            if (enableWater && height < waterHeightAbsolute + 8 && slope < 0.5 && temp > 0.3) {
                const sandBlend = 1.0 - Math.min(1, (height - waterHeightAbsolute) / 8);
                if (enableDesert) baseColor.lerp(C_BEACH, sandBlend);
                else baseColor.lerp(C_MUD, sandBlend * 0.5); 
            }
        }
    }

    // Rock blending
    let rockThreshold = 1.4; 
    if (terrainAge !== undefined) {
         rockThreshold = 1.2 + (terrainAge * 0.4);
    }

    let rockFactor = smoothstep(rockThreshold - 0.7, rockThreshold, slope);
    if (!enableRock) rockFactor = 0; 
    
    if (temp < 0.25 && enableSnow) {
        if (slope > 1.5) rockFactor = 1;
        else rockFactor = 0; 
    }

    if (enableVolcano && baseColor.equals(C_VOLCANIC)) rockFactor = 0;
    if (enableVolcano && baseColor.equals(C_LAVA)) rockFactor = 0;

    let rockColor = C_ROCK.clone();
    if (rockFactor > 0.1 && enableRock) {
        rockColor.lerp(C_ROCK_DARK, 0.2);
        rockColor.addScalar(textureNoise * 0.5);
    }

    baseColor.lerp(rockColor, rockFactor);
    baseColor.addScalar(textureNoise * 0.5);
    
    return { color: baseColor, biome: 'Complex' }; 
};