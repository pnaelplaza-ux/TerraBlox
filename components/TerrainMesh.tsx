import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TerrainParams } from '../types';
import { noiseGen } from '../utils/noise';
import { getTerrainData, getBiomeColor } from '../utils/terrainMath';

interface TerrainMeshProps {
  params: TerrainParams;
}

// StaticWater component now accepts the exact height used in generation
const StaticWater = ({ mapSize, waterHeight }: { mapSize: number, waterHeight: number }) => (
    <mesh position={[0, 0, waterHeight]}> 
        <planeGeometry args={[mapSize, mapSize]} />
        <meshPhysicalMaterial 
            color={0x0099ff} 
            transparent 
            opacity={0.7} 
            roughness={0.05} 
            metalness={0.1}
            transmission={0.4}
            thickness={1.5}
            ior={1.33}
            side={THREE.DoubleSide}
        />
    </mesh>
);

export const TerrainMesh: React.FC<TerrainMeshProps> = ({ params }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Destructure heavy structural params to separate dependencies
  const {
    mapSize, resolution, seed, scale, heightScale, octaves, persistence, lacunarity,
    exaggeration, erosionStrength, riverDepth, generationType, topology, terrainAge,
    ridgeNoiseStrength, peakRoughness, terraceSteps, detailStrandFrequency
  } = params;

  // Memoize Geometry (Expensive)
  // Only regenerates if the shape-defining parameters change
  const geometry = useMemo(() => {
    noiseGen.setSeed(seed);

    const geom = new THREE.PlaneGeometry(mapSize, mapSize, resolution, resolution);
    const count = geom.attributes.position.count;
    const pos = geom.attributes.position;
    
    // Create a structural params object to pass to logic
    const structuralParams = {
        mapSize, resolution, seed, scale, heightScale, octaves, persistence, lacunarity,
        exaggeration, erosionStrength, riverDepth, generationType, topology, terrainAge,
        ridgeNoiseStrength, peakRoughness, terraceSteps, detailStrandFrequency
    } as TerrainParams;

    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y_plane = pos.getY(i); 

        // Get Surface Height
        // Note: getTerrainData internally handles height calc
        const { height } = getTerrainData(x, y_plane, structuralParams);
        pos.setZ(i, height);
    }

    geom.computeVertexNormals();
    return geom;
  }, [
    mapSize, resolution, seed, scale, heightScale, octaves, persistence, lacunarity,
    exaggeration, erosionStrength, riverDepth, generationType, topology, terrainAge,
    ridgeNoiseStrength, peakRoughness, terraceSteps, detailStrandFrequency
  ]);

  // Memoize Colors (Lighter, depends on Geometry + Visual Params)
  // This updates when Water Level, Temperature, or Biome Toggles change without rebuilding the mesh
  const colors = useMemo(() => {
    if (!geometry) return new Float32Array(0);

    const count = geometry.attributes.position.count;
    const colorArray = new Float32Array(count * 3);
    const pos = geometry.attributes.position;
    
    // Ensure noise is seeded for visual consistency
    noiseGen.setSeed(seed);

    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y_plane = pos.getY(i);
        const height = pos.getZ(i);

        // We need tectonic activity for debug view, so we grab it if needed.
        // Optimization: only calculate if viewMode requires it
        let tectonicActivity = 0;
        if (params.viewMode === 'Tectonics') {
           tectonicActivity = getTerrainData(x, y_plane, params).tectonicActivity;
        }

        const { color } = getBiomeColor(height, x, y_plane, params, THREE, { tectonicActivity });

        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
    }
    
    return colorArray;
  }, [geometry, params]); // Re-runs if geometry changes OR if any param (like waterLevel/visuals) changes

  useEffect(() => {
    if (meshRef.current) {
        meshRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
  }, [colors]);

  const waterHeight = params.waterLevel * params.heightScale;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}> 
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial 
            vertexColors 
            roughness={0.9} 
            metalness={0.1} 
            wireframe={params.wireframe}
            flatShading={false} 
        />
      </mesh>

      {/* Only render water if enabled and viewMode is Standard */}
      {params.enableWater && params.viewMode === 'Standard' && (
        <StaticWater mapSize={params.mapSize} waterHeight={waterHeight} />
      )}
    </group>
  );
};