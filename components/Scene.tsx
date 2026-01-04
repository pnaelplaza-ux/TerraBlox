import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls, Sky, Stars } from '@react-three/drei';
import { TerrainMesh } from './TerrainMesh';
import { TerrainParams } from '../types';
import * as THREE from 'three';

interface SceneProps {
  params: TerrainParams;
}

export const Scene: React.FC<SceneProps> = ({ params }) => {
  const { timeOfDay } = params;

  // Calculate Sun Position based on Time of Day (0-24)
  const sunPosition = useMemo(() => {
    // 12 = Noon (Top), 6 = Sunrise, 18 = Sunset
    const timeRatio = (timeOfDay - 6) / 24; 
    const theta = timeRatio * Math.PI * 2; 
    
    const distance = 4000;
    const x = Math.cos(theta) * distance;
    const y = Math.sin(theta) * distance;
    const z = -1000; // Slight tilt
    
    return new THREE.Vector3(x, y, z);
  }, [timeOfDay]);

  // Dynamic Atmospheric Lighting
  const { sunColor, ambientIntensity, fogColor, starOpacity } = useMemo(() => {
      let sColor = new THREE.Color("#ffffff");
      let aIntensity = 0.4;
      let fColor = new THREE.Color("#0f172a");
      let stars = 0;

      if (timeOfDay >= 6 && timeOfDay < 18) {
          // Day
          const distFromNoon = Math.abs(timeOfDay - 12);
          if (distFromNoon > 4) {
             // Golden Hour
             sColor.set("#ffaa5e");
             fColor.set("#ffcea5");
             aIntensity = 0.3;
          } else {
             // Noon
             sColor.set("#ffffff");
             fColor.set("#bfdbfe"); 
             aIntensity = 0.6;
          }
      } else {
          // Night
          sColor.set("#222244"); 
          fColor.set("#050510");
          aIntensity = 0.1;
          stars = 1;
      }
      
      return { sunColor: sColor, ambientIntensity: aIntensity, fogColor: fColor, starOpacity: stars };
  }, [timeOfDay]);

  return (
    <div className="w-full h-full bg-black">
      <Canvas 
        shadows 
        dpr={[1, 1.5]} // Performance: Limit pixel ratio to 1.5 to avoid heavy load on retina screens
        camera={{ position: [500, 500, 500], fov: 45, far: 20000 }}
        gl={{ powerPreference: "high-performance", antialias: false }} // Performance: Disable MSAA if needed, prefer GPU power
      >
        {/* Environment & Lighting */}
        <Sky 
            sunPosition={sunPosition} 
            turbidity={timeOfDay > 16 || timeOfDay < 8 ? 10 : 0.5} 
            rayleigh={timeOfDay > 16 || timeOfDay < 8 ? 0.5 : 0.2} 
            distance={450000} 
            inclination={0}
            azimuth={0.25}
        />
        <Stars 
            radius={5000} 
            depth={500} 
            count={5000} 
            factor={4} 
            saturation={0} 
            fade 
            speed={1} 
        />
        
        <ambientLight intensity={ambientIntensity} color={timeOfDay > 19 || timeOfDay < 5 ? "#111122" : "#ffffff"} />
        
        <directionalLight 
            position={sunPosition} 
            intensity={timeOfDay < 6 || timeOfDay > 18 ? 0.2 : 1.2} 
            color={sunColor} 
            castShadow 
            shadow-mapSize={[2048, 2048]} // Performance: Reduced from 4096 to 2048
            shadow-camera-far={10000}
            shadow-camera-left={-4000}
            shadow-camera-right={4000}
            shadow-camera-top={4000}
            shadow-camera-bottom={-4000}
            shadow-bias={-0.0005}
            shadow-normalBias={0.06}
        />
        
        <MapControls 
            makeDefault
            enableDamping 
            dampingFactor={0.05} 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            minDistance={20}
            maxDistance={8000}
            screenSpacePanning={false}
        />

        <group>
             <TerrainMesh params={params} />
        </group>

        <fog attach="fog" args={[fogColor, 2000, 18000]} />
      </Canvas>
      
      <div className="absolute bottom-4 right-4 pointer-events-none text-white/50 text-xs font-mono select-none text-right px-4">
        <div className="hidden md:block">Left Click: Pan | Right Click: Rotate | Scroll: Zoom</div>
        <div className="md:hidden">1 Finger: Pan | 2 Fingers: Rotate/Zoom</div>
        <div className="opacity-50 mt-1">Terrablox</div>
      </div>
    </div>
  );
};