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

  useEffect(() => {
    noiseGen.setSeed(params.seed);
  }, [params.seed]);

  const { geometry, colors } = useMemo(() => {
    const { mapSize, resolution, seed } = params;
    
    noiseGen.setSeed(seed);

    const geom = new THREE.PlaneGeometry(mapSize, mapSize, resolution, resolution);
    const count = geom.attributes.position.count;
    
    const colorArray = new Float32Array(count * 3);
    const pos = geom.attributes.position;

    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y_plane = pos.getY(i); 

        // Get Surface Height and Tectonic Data
        let { height, tectonicActivity } = getTerrainData(x, y_plane, params);

        pos.setZ(i, height);

        // Pass tectonicActivity as extra data for debug visualization
        const { color } = getBiomeColor(height, x, y_plane, params, THREE, { tectonicActivity });

        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
    }

    geom.computeVertexNormals();
    
    return { geometry: geom, colors: colorArray };
  }, [params]);

  useEffect(() => {
    if (meshRef.current) {
        meshRef.current.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
  }, [colors]);

  // Exact Water Height Calculation matching Lua Script: WATER_LEVEL_RATIO * HEIGHT_SCALE
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