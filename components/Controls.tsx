import React, { useState } from 'react';
import { TerrainParams, GenerationType, TopologyType, ViewMode } from '../types';
import { Copy, RefreshCw, Eye, X, Check, Activity, Droplets, Thermometer, Layers, Sun, Globe, Mountain, Clock, ScanEye, LayoutTemplate, ChevronLeft, Grid3X3 } from 'lucide-react';
import { generateRobloxScript } from '../utils/luaGenerator';

interface ControlsProps {
  params: TerrainParams;
  setParams: React.Dispatch<React.SetStateAction<TerrainParams>>;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  desktopOpen?: boolean;
  setDesktopOpen?: (open: boolean) => void;
}

// Restored Presets
const PRESETS: Record<string, Partial<TerrainParams>> = {
  "Default Balanced": {
    topology: 'Standard',
    scale: 1800, heightScale: 900, waterLevel: 0.2,
    temperatureOffset: 0, humidityOffset: 0,
    erosionStrength: 1.0, ridgeNoiseStrength: 0.8,
    enableSnow: true, enableForest: true, enableDesert: true,
    generationType: 'Infinite', peakRoughness: 0.6,
    enableVolcano: true, enableCoral: true, terrainAge: 0.5,
    exaggeration: 1.2
  },
  "Alpine Peaks": {
    topology: 'Alpine',
    scale: 2000, heightScale: 1800, waterLevel: 0,
    temperatureOffset: -0.3, humidityOffset: 0.2,
    erosionStrength: 1.8, ridgeNoiseStrength: 1.2, peakRoughness: 0.8,
    enableSnow: true, enableForest: false, enableDesert: false, enableRock: true,
    generationType: 'Infinite', enableVolcano: false, enableCoral: false, terrainAge: 0.1,
    exaggeration: 1.5
  },
  "Sahara Dunes": {
    topology: 'Dunes',
    scale: 800, heightScale: 300, waterLevel: -0.5,
    temperatureOffset: 0.6, humidityOffset: -0.6,
    erosionStrength: 0.5, ridgeNoiseStrength: 0.2, peakRoughness: 0,
    enableSnow: false, enableForest: false, enableDesert: true, enableRock: true,
    generationType: 'Infinite', enableVolcano: false, enableCoral: false, terrainAge: 0.8,
    exaggeration: 1.0
  },
  "Grand Canyon": {
    topology: 'Canyons',
    scale: 1200, heightScale: 1000, waterLevel: 0.05,
    temperatureOffset: 0.3, humidityOffset: -0.4,
    erosionStrength: 1.5, ridgeNoiseStrength: 1.0,
    enableSnow: false, enableForest: false, enableDesert: true, enableRock: true, enableMesa: true,
    generationType: 'Infinite', terrainAge: 0.9,
    exaggeration: 1.1
  },
  "Tropical Archipelago": {
    topology: 'Standard',
    scale: 1800, heightScale: 900, waterLevel: 0.4,
    temperatureOffset: 0.4, humidityOffset: 0.5,
    erosionStrength: 1.0, ridgeNoiseStrength: 0.8,
    enableSnow: false, enableDesert: true, enableForest: true, enableCoral: true, enableVolcano: true,
    generationType: 'Archipelago', terrainAge: 0.4,
    exaggeration: 1.2
  },
  "Frozen Wastes": {
    topology: 'Standard',
    scale: 2500, heightScale: 600, waterLevel: 0.2,
    temperatureOffset: -0.8, humidityOffset: -0.2,
    erosionStrength: 0.8, ridgeNoiseStrength: 1.0,
    enableSnow: true, enableForest: false, enableDesert: false,
    generationType: 'Infinite', enableVolcano: false, terrainAge: 0.6,
    exaggeration: 1.0
  }
};

const Slider = ({ label, value, min, max, step, onChange, tooltip }: any) => (
  <div className="mb-4">
    <div className="flex justify-between mb-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <span className="text-xs text-sky-400 font-mono">{typeof value === 'number' ? value.toFixed(step < 0.01 ? 3 : 2) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all"
    />
    {tooltip && <p className="text-[10px] text-slate-500 mt-1">{tooltip}</p>}
  </div>
);

const Toggle = ({ label, checked, onChange }: any) => (
    <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-slate-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 cursor-pointer"
        />
    </div>
);

export const Controls: React.FC<ControlsProps> = ({ 
    params, setParams, mobileOpen = false, setMobileOpen, desktopOpen = true, setDesktopOpen 
}) => {
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateParam = (key: keyof TerrainParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetName: string) => {
      const preset = PRESETS[presetName];
      if (preset) {
          setParams(prev => ({ ...prev, ...preset, seed: Math.floor(Math.random() * 9999) }));
      }
  };

  const scriptContent = generateRobloxScript(params);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileOpen?.(false)}
          />
      )}

      <div className={`
          fixed inset-y-0 left-0 z-40 bg-slate-900/95 backdrop-blur-md border-r border-slate-700 shadow-2xl overflow-hidden
          transform transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[85vw] max-w-sm
          md:relative md:h-full md:bg-slate-900/90
          ${desktopOpen ? 'md:w-80 md:translate-x-0' : 'md:w-0 md:-translate-x-full md:border-none'}
      `}>
         {/* Inner Container with fixed width to prevent squash during transition */}
         <div className="w-[85vw] max-w-sm md:w-80 h-full overflow-y-auto p-6 scrollbar-thin">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-slate-900/95 z-50 pb-4 border-b border-slate-800 -mx-6 px-6 pt-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-md shadow-lg flex-shrink-0"></div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-400 whitespace-nowrap">
                        Terrablox
                    </h1>
                </div>
                <div className="flex items-center gap-1">
                    {/* Desktop Collapse Button */}
                    <button 
                        onClick={() => setDesktopOpen?.(false)}
                        className="hidden md:flex text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
                        title="Collapse Menu"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    {/* Mobile Close Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setMobileOpen?.(false);
                        }}
                        className="md:hidden text-slate-400 hover:text-white p-2 rounded-md hover:bg-slate-800 transition-colors z-50"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-10">
            {/* Quick Presets Menu */}
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <LayoutTemplate size={14} className="text-emerald-400"/> Quick Presets
                </h2>
                <div className="grid grid-cols-2 gap-2">
                    {Object.keys(PRESETS).map(name => (
                        <button
                            key={name}
                            onClick={() => applyPreset(name)}
                            className="px-2 py-2 text-xs bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white rounded-md transition-colors text-center border border-slate-600 truncate"
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <ScanEye size={14} className="text-pink-400"/> Visualization
                </h2>
                {/* View Mode Selector */}
                <div className="mb-4">
                    <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            Debug View
                        </label>
                    </div>
                    <select 
                        value={params.viewMode}
                        onChange={(e) => updateParam('viewMode', e.target.value as ViewMode)}
                        className="w-full bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-pink-500 outline-none"
                    >
                        <option value="Standard">Standard Biomes</option>
                        <option value="Tectonics">Tectonic Plates</option>
                        <option value="Temperature">Temperature Map</option>
                        <option value="Humidity">Humidity Map</option>
                        <option value="Height">Heightmap (Grayscale)</option>
                    </select>
                </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <RefreshCw size={14} className="text-sky-400"/> Generation
                </h2>
                
                <div className="mb-4">
                    <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Mountain size={10} /> Topology
                        </label>
                    </div>
                    <select 
                        value={params.topology}
                        onChange={(e) => updateParam('topology', e.target.value as TopologyType)}
                        className="w-full bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                        <option value="Standard">Standard Continent</option>
                        <option value="Alpine">Alpine Chains</option>
                        <option value="Canyons">Fractured Canyons</option>
                        <option value="Dunes">Sand Dunes</option>
                    </select>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Globe size={10} /> Mask Type
                        </label>
                    </div>
                    <select 
                        value={params.generationType}
                        onChange={(e) => updateParam('generationType', e.target.value as GenerationType)}
                        className="w-full bg-slate-700 text-white text-xs p-2 rounded-lg border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                        <option value="Infinite">Infinite</option>
                        <option value="Island">Island</option>
                        <option value="Archipelago">Archipelago</option>
                    </select>
                </div>
                
                <div className="border-t border-slate-600 my-4 pt-2">
                    <div className="flex items-center gap-2 mb-2">
                    <Clock size={12} className="text-orange-400"/> 
                    <span className="text-xs font-bold text-slate-300">Geological Age</span>
                    </div>
                    <Slider
                    label="Terrain Age"
                    value={params.terrainAge}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v: number) => updateParam('terrainAge', v)}
                    tooltip="0 = Young/Jagged (Himalayas), 1 = Old/Eroded (Appalachians)."
                    />
                </div>

                <Slider
                label="Map Size (Studs)"
                value={params.mapSize}
                min={100}
                max={20000}
                step={100}
                onChange={(v: number) => updateParam('mapSize', v)}
                />
                <Slider
                label="Resolution (Vertices)"
                value={params.resolution}
                min={64}
                max={4096}
                step={32}
                onChange={(v: number) => updateParam('resolution', v)}
                tooltip="Vertex Density. Higher = More Detail but Slower. Warning: High values may freeze the browser."
                />
                <Slider
                label="Seed"
                value={params.seed}
                min={0}
                max={99999}
                step={1}
                onChange={(v: number) => updateParam('seed', v)}
                />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Activity size={14} className="text-purple-400"/> Tectonics & Noise
                </h2>
                <Slider
                    label="Scale (Feature Size)"
                    value={params.scale}
                    min={50}
                    max={5000}
                    step={50}
                    onChange={(v: number) => updateParam('scale', v)}
                />
                <Slider
                    label="Height Scale"
                    value={params.heightScale}
                    min={50}
                    max={3000}
                    step={50}
                    onChange={(v: number) => updateParam('heightScale', v)}
                />
                {/* Restored Advanced Sliders */}
                <Slider
                    label="Exaggeration"
                    value={params.exaggeration}
                    min={1}
                    max={5}
                    step={0.1}
                    onChange={(v: number) => updateParam('exaggeration', v)}
                />
                <Slider
                    label="Ridge Strength"
                    value={params.ridgeNoiseStrength}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v: number) => updateParam('ridgeNoiseStrength', v)}
                />
                <Slider
                    label="Terrace Steps"
                    value={params.terraceSteps}
                    min={0}
                    max={20}
                    step={1}
                    onChange={(v: number) => updateParam('terraceSteps', v)}
                    tooltip="0 = Smooth. Higher = More Stepped (Rice Fields/Canyons)"
                />
                
                <div className="border-t border-slate-600 my-2 pt-2"></div>
                
                <Slider
                    label="Octaves"
                    value={params.octaves}
                    min={1}
                    max={12}
                    step={1}
                    onChange={(v: number) => updateParam('octaves', v)}
                />
                <Slider
                    label="Persistence"
                    value={params.persistence}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v: number) => updateParam('persistence', v)}
                />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Droplets size={14} className="text-blue-400"/> Weathering
                </h2>
                <Slider
                    label="Water Level"
                    value={params.waterLevel}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v: number) => updateParam('waterLevel', v)}
                />
                <Slider
                    label="Erosion Strength"
                    value={params.erosionStrength}
                    min={0}
                    max={5}
                    step={0.1}
                    onChange={(v: number) => updateParam('erosionStrength', v)}
                />
                <Slider
                    label="River Depth"
                    value={params.riverDepth}
                    min={0}
                    max={2}
                    step={0.1}
                    onChange={(v: number) => updateParam('riverDepth', v)}
                />
                <Slider
                    label="Peak Roughness"
                    value={params.peakRoughness}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v: number) => updateParam('peakRoughness', v)}
                />
                <Slider
                    label="Detail Noise"
                    value={params.detailStrandFrequency}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(v: number) => updateParam('detailStrandFrequency', v)}
                />
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Thermometer size={14} className="text-red-400"/> Climate System
                </h2>
                
                <div className="mb-4 border-b border-slate-600 pb-2">
                    <span className="text-xs font-bold text-slate-300 block mb-2">Temperature</span>
                    <Slider
                        label="Global Offset"
                        value={params.temperatureOffset}
                        min={-1}
                        max={1}
                        step={0.05}
                        onChange={(v: number) => updateParam('temperatureOffset', v)}
                    />
                    <Slider
                        label="Lapse Rate"
                        value={params.temperatureLapseRate}
                        min={0}
                        max={0.01}
                        step={0.0001}
                        onChange={(v: number) => updateParam('temperatureLapseRate', v)}
                    />
                </div>

                <div>
                    <span className="text-xs font-bold text-slate-300 block mb-2">Humidity</span>
                    <Slider
                        label="Global Offset"
                        value={params.humidityOffset}
                        min={-1}
                        max={1}
                        step={0.05}
                        onChange={(v: number) => updateParam('humidityOffset', v)}
                    />
                </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-stone-400"/> Biome Toggles
                </h2>
                <div className="grid grid-cols-2 gap-x-4">
                    <Toggle label="Snow/Ice" checked={params.enableSnow} onChange={(v: boolean) => updateParam('enableSnow', v)} />
                    <Toggle label="Desert" checked={params.enableDesert} onChange={(v: boolean) => updateParam('enableDesert', v)} />
                    <Toggle label="Forest/Jungle" checked={params.enableForest} onChange={(v: boolean) => updateParam('enableForest', v)} />
                    <Toggle label="Mesa/Badlands" checked={params.enableMesa} onChange={(v: boolean) => updateParam('enableMesa', v)} />
                    <Toggle label="Volcanic" checked={params.enableVolcano} onChange={(v: boolean) => updateParam('enableVolcano', v)} />
                    <Toggle label="Coral Reefs" checked={params.enableCoral} onChange={(v: boolean) => updateParam('enableCoral', v)} />
                    <Toggle label="Cliffs" checked={params.enableRock} onChange={(v: boolean) => updateParam('enableRock', v)} />
                    <Toggle label="Water" checked={params.enableWater} onChange={(v: boolean) => updateParam('enableWater', v)} />
                </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Sun size={14} className="text-yellow-400"/> Atmosphere
                </h2>
                <Slider
                    label="Time of Day"
                    value={params.timeOfDay}
                    min={0}
                    max={24}
                    step={0.1}
                    onChange={(v: number) => updateParam('timeOfDay', v)}
                />
                <Toggle label="Wireframe" checked={params.wireframe} onChange={(v: boolean) => updateParam('wireframe', v)} />
            </div>

            <div className="flex flex-col gap-3 mt-8">
                <button
                    onClick={() => setShowScriptModal(true)}
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg transition-all font-semibold shadow-lg shadow-sky-900/20 active:scale-95"
                >
                    <Eye size={16} /> View & Copy Script
                </button>
            </div>
            </div>
        </div>
      </div>

      {/* Script Preview Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-10">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"/>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                        <div className="w-3 h-3 rounded-full bg-green-500"/>
                        <span className="ml-4 text-slate-300 font-mono text-sm font-semibold">generation_script.lua</span>
                    </div>
                    <button 
                        onClick={() => setShowScriptModal(false)} 
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-0 bg-[#0d1117] relative group">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={copyToClipboard}
                            className="bg-slate-700/80 hover:bg-slate-600 text-white px-3 py-1.5 rounded-md text-xs font-mono backdrop-blur-md border border-slate-600 flex items-center gap-2"
                        >
                            {copied ? <Check size={12}/> : <Copy size={12}/>}
                            {copied ? "Copied!" : "Copy Raw"}
                        </button>
                    </div>
                    <pre className="p-6 font-mono text-xs md:text-sm text-blue-100 whitespace-pre-wrap leading-relaxed selection:bg-sky-500/30">
                        {scriptContent}
                    </pre>
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-800/80 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono hidden md:block">
                        Roblox Studio &gt; ServerScriptService &gt; Script
                    </span>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setShowScriptModal(false)} 
                            className="flex-1 md:flex-none px-5 py-2.5 text-slate-300 hover:text-white font-semibold hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <button 
                            onClick={copyToClipboard} 
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${copied ? 'bg-green-600 hover:bg-green-500' : 'bg-sky-600 hover:bg-sky-500'} text-white shadow-lg`}
                        >
                            {copied ? <Check size={18}/> : <Copy size={18}/>}
                            {copied ? "Copied to Clipboard" : "Copy Script"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </>
  );
};