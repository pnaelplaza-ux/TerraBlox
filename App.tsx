import React, { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { TerrainParams } from './types';
import { Menu, ChevronRight } from 'lucide-react';

const INITIAL_PARAMS: TerrainParams = {
  seed: 8888,
  scale: 1800, 
  heightScale: 900, 
  octaves: 8, 
  persistence: 0.45, 
  lacunarity: 2.0,
  waterLevel: 0.2, 
  mapSize: 4096, 
  resolution: 512, 
  wireframe: false,
  biomeContrast: 1,
  exaggeration: 1.2,
  erosionStrength: 1.0, 
  riverDepth: 1.0,
  
  generationType: 'Infinite', 
  topology: 'Alpine', 
  
  terrainAge: 0.2,
  ridgeNoiseStrength: 0.8, 
  peakRoughness: 0.6,
  terraceSteps: 0,
  detailStrandFrequency: 50,

  // Climate Defaults
  temperatureScale: 3000,
  temperatureOffset: 0,
  temperatureLapseRate: 0.0008, 
  humidityScale: 3000,
  humidityOffset: 0,

  // Biome Defaults
  enableSnow: true,
  enableDesert: true,
  enableForest: true,
  enableRock: true,
  enableWater: true,
  enableMesa: true,
  enableVolcano: true,
  enableCoral: true,
  
  timeOfDay: 14,
  viewMode: 'Standard'
};

const App: React.FC = () => {
  const [params, setParams] = useState<TerrainParams>(INITIAL_PARAMS);
  const [deferredParams, setDeferredParams] = useState<TerrainParams>(INITIAL_PARAMS); // Debounced params for the scene
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);

  // Debounce logic: Only update the 3D scene 200ms after the user stops changing values
  useEffect(() => {
    const handler = setTimeout(() => {
      setDeferredParams(params);
    }, 200);

    return () => clearTimeout(handler);
  }, [params]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex bg-slate-900">
      
      {/* Mobile Toggle Button (Visible only on small screens) */}
      <div className="absolute top-4 left-4 z-20 md:hidden">
         <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2.5 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-sky-400 rounded-lg shadow-lg hover:bg-slate-800 transition-all active:scale-95"
         >
            <Menu size={24} />
         </button>
      </div>

      {/* Desktop Open Button (Visible only on desktop when menu is closed) */}
      {!desktopMenuOpen && (
        <div className="absolute top-4 left-4 z-20 hidden md:block animate-in fade-in duration-300">
           <button 
              onClick={() => setDesktopMenuOpen(true)}
              className="p-2.5 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-sky-400 rounded-lg shadow-lg hover:bg-slate-800 transition-all active:scale-95 group"
           >
              <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform" />
           </button>
        </div>
      )}

      {/* UI Sidebar - Controls receive 'params' for instant UI feedback */}
      <Controls 
        params={params} 
        setParams={setParams} 
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        desktopOpen={desktopMenuOpen}
        setDesktopOpen={setDesktopMenuOpen}
      />

      {/* 3D Viewport - Scene receives 'deferredParams' to prevent crashing */}
      <main className="flex-1 h-full relative">
        <Scene params={deferredParams} />
      </main>
    </div>
  );
};

export default App;