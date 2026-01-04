import { TerrainParams } from '../types';

export const generateRobloxScript = (params: TerrainParams) => {
  const { 
    seed, scale, heightScale, octaves, persistence, lacunarity, mapSize, 
    waterLevel, exaggeration, erosionStrength, riverDepth, 
    ridgeNoiseStrength, terraceSteps, 
    detailStrandFrequency, timeOfDay,
    temperatureScale, temperatureOffset, temperatureLapseRate,
    humidityScale, humidityOffset,
    enableSnow, enableDesert, enableForest, enableRock, enableWater, enableMesa, enableVolcano, enableCoral,
    generationType, peakRoughness, topology, terrainAge
  } = params;

  return `
-- [[ Terrablox - Voxel Terrain Generator ]]
-- 1:1 Parity with Web Visualizer

local Terrain = workspace.Terrain
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")

-- // CONFIGURATION //
local SEED = ${seed}
local SCALE = ${scale}
local HEIGHT_SCALE = ${heightScale}
local OCTAVES = ${octaves}
local PERSISTENCE = ${persistence}
local LACUNARITY = ${lacunarity}
local EXAGGERATION = ${exaggeration} 

local RIDGE_STRENGTH = ${ridgeNoiseStrength}
local PEAK_ROUGHNESS = ${peakRoughness !== undefined ? peakRoughness : 0.5}
local TERRACE_STEPS = ${terraceSteps}
local GEN_TYPE = "${generationType}" 
local TOPOLOGY = "${topology}"
local AGE = ${terrainAge !== undefined ? terrainAge : 0.5}

local DETAIL_FREQ = ${detailStrandFrequency} * 0.05
local EROSION_STRENGTH = ${erosionStrength} * 25
local RIVER_DEPTH = ${riverDepth}

-- Climate
local TEMP_SCALE = ${temperatureScale}
local TEMP_OFFSET = ${temperatureOffset}
local TEMP_LAPSE = ${temperatureLapseRate}
local HUMID_SCALE = ${humidityScale}
local HUMID_OFFSET = ${humidityOffset}

-- Toggles
local ENABLE_SNOW = ${enableSnow}
local ENABLE_DESERT = ${enableDesert}
local ENABLE_FOREST = ${enableForest}
local ENABLE_ROCK = ${enableRock}
local ENABLE_WATER = ${enableWater}
local ENABLE_MESA = ${enableMesa}
local ENABLE_VOLCANO = ${enableVolcano}
local ENABLE_CORAL = ${enableCoral}

local MAP_SIZE = ${mapSize} 
local WATER_LEVEL_RATIO = ${waterLevel}
local WATER_HEIGHT_STUD = (WATER_LEVEL_RATIO) * HEIGHT_SCALE 

-- // BATCH SETTINGS //
local BATCH_SIZE_VOXELS = 32 -- 32x32 voxels = 128x128 studs per batch
local VOXEL_RES = 4

-- // MATH & NOISE HELPERS //
local function lerp(a, b, t) return a + (b - a) * t end
local function clamp(v, min, max) return math.max(min, math.min(max, v)) end
local function smoothstep(min, max, value)
    local x = math.max(0, math.min(1, (value - min) / (max - min)))
    return x * x * (3 - 2 * x)
end

-- Wrapper for Roblox noise to match Standard Perlin (-1 to 1)
-- Roblox math.noise is approx -0.5 to 0.5
local function noise(x, y, z)
    return math.noise(x, y, z) * 2
end

local function getFBM(x, z, customScale, customOctaves, customSeed)
    local s = customScale or SCALE
    local o = customOctaves or OCTAVES
    local sd = customSeed or SEED
	local total = 0
	local frequency = 1 / s
	local amplitude = 1
	local maxAmplitude = 0
	for i = 1, o do
        -- Use seed * 100 as Y coordinate for variety (Parity with TS)
		local n = noise(x * frequency, sd * 100, z * frequency)
		total = total + (n * amplitude)
		maxAmplitude = maxAmplitude + amplitude
		amplitude = amplitude * PERSISTENCE
		frequency = frequency * LACUNARITY
	end
    return total / maxAmplitude -- Returns -1 to 1
end

local function getRidgedFBM(x, z, customScale, customOctaves, customSeed)
    local s = customScale or SCALE
    local o = customOctaves or OCTAVES
    local sd = customSeed or SEED
    local total = 0
    local frequency = 1 / s
    local amplitude = 1
    local maxAmplitude = 0
    for i = 1, o do
        -- 1.0 - abs(noise)
        local n = 1.0 - math.abs(noise(x * frequency, (sd + 100) * 100, z * frequency))
        n = n * n 
        total = total + (n * amplitude)
        maxAmplitude = maxAmplitude + amplitude
        amplitude = amplitude * PERSISTENCE
        frequency = frequency * LACUNARITY
    end
    return total / maxAmplitude -- Returns 0 to 1
end

local function getBillowFBM(x, z, customScale, customOctaves)
    local s = customScale or SCALE
    local o = customOctaves or OCTAVES
    local total = 0
    local frequency = 1 / s
    local amplitude = 1
    local maxAmplitude = 0
    for i = 1, o do
        local n = math.abs(noise(x * frequency, (SEED + 200) * 100, z * frequency))
        n = 2 * n - 1 
        total = total + (n * amplitude)
        maxAmplitude = maxAmplitude + amplitude
        amplitude = amplitude * PERSISTENCE
        frequency = frequency * LACUNARITY
    end
    return total / maxAmplitude -- Returns -1 to 1
end

local function getTectonicChains(x, z)
    -- 1. Warped Fault Lines
    local warpScale = SCALE * 2.5
    local wx = getFBM(x, z, warpScale, 2, SEED + 300)
    local wz = getFBM(x + 500, z + 500, warpScale, 2, SEED + 400)
    
    local faultX = x + (wx * SCALE * 1.2)
    local faultZ = z + (wz * SCALE * 1.2)

    -- 2. Ridged Chain (Returns 0..1)
    local chain = getRidgedFBM(faultX, faultZ, SCALE * 1.2, 6, SEED)
    
    -- 3. Age Modification
    if AGE < 0.3 then
        chain = math.pow(chain, 1.2) -- Young: Sharp
    else
        chain = math.pow(chain, 0.8) -- Old: Round
    end
    
    return chain
end

local function getTerrainHeight(x, z)
    -- 1. Global Warping
    local warpScale = SCALE * 1.5
    local warpFactor = EROSION_STRENGTH * 25 * (1 + AGE * 0.5)
    
    -- FBM returns -1..1
    local qx = getFBM(x, z, warpScale, 2, SEED) 
    local qz = getFBM(x + 5.2, z + 1.3, warpScale, 2, SEED)
    
    local wx = x + qx * warpFactor
    local wz = z + qz * warpFactor

    local height01 = 0

    -- 2. TOPOLOGY LOGIC
    if TOPOLOGY == 'Dunes' then
        height01 = getBillowFBM(wx, wz, SCALE * 0.6, 4) -- -1..1
        height01 = height01 * 0.3 + 0.1
        
    elseif TOPOLOGY == 'Alpine' then
        height01 = getTectonicChains(wx, wz) -- 0..1
        if AGE < 0.5 then
             local rough = getFBM(wx, wz, SCALE * 0.1, 3) -- -1..1
             height01 = height01 + rough * 0.05 * (1 - AGE)
        else
             height01 = height01 * 0.8
        end

    elseif TOPOLOGY == 'Canyons' then
        local plateau = getFBM(wx, wz, SCALE * 2.0, 3) -- -1..1
        local valley = getRidgedFBM(wx, wz, SCALE * 0.8, 4, SEED) -- 0..1
        local base = (plateau * 0.2 + 0.6)
        height01 = base - (valley * (1.5 + AGE * 0.5) * EROSION_STRENGTH)
        local steps = 8
        height01 = math.floor(height01 * steps + 0.5) / steps

    else 
        -- STANDARD CONTINENT
        local baseVal = getFBM(wx, wz, SCALE * 2.5, 4, SEED) -- -1..1
        height01 = (baseVal + 1) / 2 -- Normalize to 0..1

        -- Tectonic Chains
        local chainMask = getFBM(wx / 2, wz / 2, SCALE * 2, 2, SEED + 99) -- -1..1
        
        if chainMask > 0 then
            local mountains = getTectonicChains(wx, wz) -- 0..1
            local blend = smoothstep(0, 0.4, chainMask)
            height01 = lerp(height01, mountains, blend * RIDGE_STRENGTH)
        end
    end

    -- 3. Exaggeration
    if TOPOLOGY ~= 'Canyons' then
        local ex = EXAGGERATION
        if AGE > 0.7 then ex = ex * 0.7 end
        height01 = math.pow(math.max(0, height01 + 0.1), ex) - math.pow(0.1, ex)
    end

    -- 4. Masking
    local dist = math.sqrt(x*x + z*z)
    local normalizedDist = dist / (MAP_SIZE * 0.5)

    if GEN_TYPE == "Island" then
        local mask = smoothstep(0.95, 0.6, normalizedDist)
        height01 = lerp(-0.2, height01, mask)
    elseif GEN_TYPE == "Archipelago" then
        local globalMask = smoothstep(1.0, 0.7, normalizedDist)
        -- Cluster noise
        local clusterNoise = getFBM(x, z, SCALE * 4, 2, SEED) -- -1..1
        local clusterVal = (clusterNoise + 1) / 2 -- 0..1
        local clusterMask = smoothstep(0.4, 0.55, clusterVal)
        height01 = lerp(-0.2, height01, globalMask * clusterMask)
    end

    -- 5. Rivers
    local isRiver = false
    if RIVER_DEPTH > 0 and TOPOLOGY ~= 'Dunes' and TOPOLOGY ~= 'Canyons' then
        local riverScale = SCALE * 3.5
        local riverRaw = noise(wx / riverScale, SEED + 999, wz / riverScale) -- -1..1
        local riverVal = math.abs(riverRaw) -- 0..1
        
        local valleyWidth = 0.3 + (AGE * 0.1)
        local channelWidth = 0.08 + (AGE * 0.05)
        
        if riverVal < valleyWidth then
            local valleyProfile = 1.0 - smoothstep(0, valleyWidth, riverVal)
            local channelProfile = 1.0 - smoothstep(0, channelWidth, riverVal)
            local dig = (valleyProfile * 0.4 + channelProfile * 0.1) * RIVER_DEPTH
            height01 = height01 - dig
            if riverVal < channelWidth * 0.8 then isRiver = true end
        end
    end

    -- 6. Terracing (Standard/Alpine only)
    if TERRACE_STEPS > 0 and TOPOLOGY ~= 'Canyons' then
        local steps = TERRACE_STEPS
        local stepped = math.floor(height01 * steps + 0.5) / steps
        height01 = lerp(height01, stepped, 0.6)
    end
    
    local finalHeight = height01 * HEIGHT_SCALE
    
    -- 7. Detail
    if DETAIL_FREQ > 0 and finalHeight > 5 then
         local freqMult = 0.5
         local ampMult = 0.3
         if AGE < 0.3 then 
             freqMult = 2.0 
             ampMult = 1.0
         end
         local detailScale = DETAIL_FREQ * freqMult
         -- Note: noise() returns -1..1
         finalHeight = finalHeight + (noise(x * detailScale, SEED, z * detailScale) * 0.8 * ampMult)
    end
    
    return finalHeight, isRiver
end

local function getBiomeMaterial(x, z, height, slope, isRiver)
    -- Climate (Fractal FBM Logic)
    -- Temp
    local tempNoiseRaw = getFBM(x, z, TEMP_SCALE, 3, SEED+1000) -- -1..1
    local baseTemp = (tempNoiseRaw + 1) / 2 -- 0..1
    local altitudeCooling = math.max(0, height) * TEMP_LAPSE
    local temp = clamp(baseTemp + TEMP_OFFSET - altitudeCooling, 0, 1)
    
    -- Humid
    local humidNoiseRaw = getFBM(x, z, HUMID_SCALE, 3, SEED+2000) -- -1..1
    local baseHumid = (humidNoiseRaw + 1) / 2 -- 0..1
    local altitudeWetness = math.max(0, height) * 0.0002
    local humidity = clamp(baseHumid + HUMID_OFFSET + altitudeWetness, 0, 1)
    
    -- Underwater
    if isRiver and height < WATER_HEIGHT_STUD + 5 then return Enum.Material.Mud end
    if (ENABLE_WATER and height < WATER_HEIGHT_STUD) or isRiver then
        if ENABLE_CORAL then
            local depth = WATER_HEIGHT_STUD - height
            -- Coral Reef (Warm, Shallow)
            if depth < 25 and temp > 0.6 then
                 local coralNoise = noise(x/20, SEED+888, z/20)
                 if coralNoise > 0.2 then
                     return Enum.Material.Limestone -- Rough texture for reef
                 end
            end
        end
        return Enum.Material.Mud
    end

    -- Slope Rock (General)
    local rockThreshold = 1.2 + (AGE * 0.4)
    if ENABLE_ROCK and slope > rockThreshold then return Enum.Material.Rock end

    -- Volcanic Biome (Overrides other biomes)
    if ENABLE_VOLCANO then
        local volcanoNoise = noise(x/1000, SEED+555, z/1000)
        if volcanoNoise > 0.1 and height > HEIGHT_SCALE * 0.25 then -- >0.1 matches 0.6 normalized (approx)
            -- Hotspot found
            if height > HEIGHT_SCALE * 0.7 and slope < 1.0 then
                -- Peak/Crater with Lava chance
                local lavaNoise = noise(x/50, SEED+111, z/50)
                if lavaNoise > 0.4 then return Enum.Material.CrackedLava end
                return Enum.Material.Basalt
            else
                return Enum.Material.Basalt
            end
        end
    end

    -- 1. Extreme Cold (Ice/Snow)
    if temp < 0.25 then
        if ENABLE_SNOW then
             if slope > 0.9 and ENABLE_ROCK then
                 return Enum.Material.Rock -- Too steep for snow
             else
                 if humidity > 0.6 then return Enum.Material.Glacier end
                 return Enum.Material.Snow
             end
        else
            return Enum.Material.Rock -- Tundra rock
        end
    -- 2. Cold (Taiga / Tundra)
    elseif temp < 0.45 then
        if humidity > 0.5 and ENABLE_FOREST then
            return Enum.Material.Ground -- Taiga floor
        else
            return Enum.Material.Grass -- Tundra grass
        end
    -- 3. Temperate
    elseif temp < 0.75 then
        if humidity < 0.3 then
             if ENABLE_DESERT then return Enum.Material.Grass end -- Dry grass
        elseif humidity > 0.6 then
             if ENABLE_FOREST then
                if height < WATER_HEIGHT_STUD + 20 then return Enum.Material.Mud end -- Swamp
                return Enum.Material.LeafyGrass
             else
                return Enum.Material.Grass
             end
        else
             return Enum.Material.Grass
        end
    -- 4. Hot (Mesa/Desert/Jungle)
    else
        if humidity < 0.35 then
            if ENABLE_MESA and humidity < 0.25 then
                 -- Mesa Bands
                 local bandNoise = math.sin(height * 0.1 + noise(x*0.02, 0, z*0.02)*5)
                 if bandNoise > 0 then return Enum.Material.Sandstone end
                 return Enum.Material.Rock -- Darker band
            elseif ENABLE_DESERT then
                 return Enum.Material.Sand
            else
                return Enum.Material.Ground
            end
        elseif humidity < 0.6 then
            return Enum.Material.Ground -- Savannah
        else
            if ENABLE_FOREST then return Enum.Material.LeafyGrass end -- Jungle
            return Enum.Material.Grass
        end
    end
    
    return Enum.Material.Grass -- Fallback
end

local function generate()
    Terrain:Clear()
    local startTime = os.clock()
    
    -- // GRID ALIGNMENT //
    -- Ensure start coordinates are perfectly aligned to the voxel grid (divisible by 4)
    local mapHalf = MAP_SIZE / 2
    local startX = math.floor(-mapHalf / VOXEL_RES) * VOXEL_RES
    local startZ = math.floor(-mapHalf / VOXEL_RES) * VOXEL_RES
    local endX = math.ceil(mapHalf / VOXEL_RES) * VOXEL_RES
    local endZ = math.ceil(mapHalf / VOXEL_RES) * VOXEL_RES
    
    local batchStuds = BATCH_SIZE_VOXELS * VOXEL_RES -- 128
    
    local totalBatches = math.ceil((endX - startX)/batchStuds) * math.ceil((endZ - startZ)/batchStuds)
    local batchesDone = 0
    
    local message = Instance.new("Message", workspace)
    message.Text = "Starting Generation..."

    print("Generating " .. MAP_SIZE .. "x" .. MAP_SIZE .. " map.")

    for x = startX, endX, batchStuds do
        for z = startZ, endZ, batchStuds do
            
            -- Pre-calculate heights for this batch to determine Y bounds
            local heights = {} 
            local minH, maxH = 100000, -100000
            
            -- Scan one voxel extra for slope calculation later if needed, but keeping it simple for speed
            for lx = 0, BATCH_SIZE_VOXELS - 1 do
                for lz = 0, BATCH_SIZE_VOXELS - 1 do
                     local wx = x + lx * VOXEL_RES
                     local wz = z + lz * VOXEL_RES
                     
                     local h, r = getTerrainHeight(wx, wz)
                     local i = lx + 1
                     local k = lz + 1
                     if not heights[i] then heights[i] = {} end
                     heights[i][k] = {h = h, r = r}
                     
                     if h < minH then minH = h end
                     if h > maxH then maxH = h end
                end
            end
            
            -- Align Y Bounds to Grid (4 studs)
            local waterY = WATER_HEIGHT_STUD
            if ENABLE_WATER then maxH = math.max(maxH, waterY) end
            
            -- Create a 32-stud deep buffer below min height for ground solidity
            local bottomY = math.floor((minH - 32) / VOXEL_RES) * VOXEL_RES
            local topY = math.ceil((maxH + 8) / VOXEL_RES) * VOXEL_RES
            
            local sizeY_Voxels = (topY - bottomY) / VOXEL_RES
            if sizeY_Voxels < 1 then sizeY_Voxels = 1 end
            
            -- Construct Region3 aligned to the grid
            local minVec = Vector3.new(x, bottomY, z)
            local maxVec = Vector3.new(x + batchStuds, topY, z + batchStuds)
            local region = Region3.new(minVec, maxVec)
            
            -- 3D Voxel Tables
            local materials = table.create(BATCH_SIZE_VOXELS)
            local occupancy = table.create(BATCH_SIZE_VOXELS)
            
            for vx = 1, BATCH_SIZE_VOXELS do
                materials[vx] = table.create(sizeY_Voxels)
                occupancy[vx] = table.create(sizeY_Voxels)
                
                for vy = 1, sizeY_Voxels do
                    materials[vx][vy] = table.create(BATCH_SIZE_VOXELS)
                    occupancy[vx][vy] = table.create(BATCH_SIZE_VOXELS)
                end
            end

            -- Fill Voxels
            for vx = 1, BATCH_SIZE_VOXELS do
                for vz = 1, BATCH_SIZE_VOXELS do
                    
                    local data = heights[vx][vz]
                    local surfH = data.h
                    local isRiver = data.r
                    
                    local slope = 0 
                    if vx > 1 and vx < BATCH_SIZE_VOXELS and vz > 1 and vz < BATCH_SIZE_VOXELS then
                       local h1 = heights[vx+1][vz].h
                       local h2 = heights[vx-1][vz].h
                       local h3 = heights[vx][vz+1].h
                       local h4 = heights[vx][vz-1].h
                       local dx = math.abs(h1 - h2) / (VOXEL_RES * 2)
                       local dz = math.abs(h3 - h4) / (VOXEL_RES * 2)
                       slope = math.sqrt(dx*dx + dz*dz)
                    end

                    for vy = 1, sizeY_Voxels do
                        local worldY = bottomY + (vy - 1) * VOXEL_RES
                        
                        local mat = Enum.Material.Air
                        local occ = 0
                        
                        -- Ground Physics
                        if worldY <= surfH + 2 then 
                            local diff = surfH - worldY
                            occ = math.clamp(0.5 + (diff / 4), 0, 1)
                            if occ > 0 then
                                mat = getBiomeMaterial(x + (vx-1)*4, z + (vz-1)*4, surfH, slope, isRiver)
                            end
                        end
                        
                        -- Water Physics
                        if ENABLE_WATER and worldY > surfH and worldY <= waterY then
                             local wDiff = waterY - worldY
                             local wOcc = math.clamp(0.5 + (wDiff / 4), 0, 1)
                             if wOcc > occ then
                                 mat = Enum.Material.Water
                                 occ = wOcc
                             end
                        end
                        
                        -- Underground fill
                        if worldY < surfH - 2 then
                            occ = 1
                            mat = Enum.Material.Rock
                             if worldY > surfH - 12 then
                                mat = getBiomeMaterial(x + (vx-1)*4, z + (vz-1)*4, surfH, slope, isRiver)
                            end
                        end

                        materials[vx][vy][vz] = mat
                        occupancy[vx][vy][vz] = occ
                    end
                end
            end
            
            Terrain:WriteVoxels(region, VOXEL_RES, materials, occupancy)
            
            batchesDone = batchesDone + 1
            if batchesDone % 10 == 0 then
                message.Text = "Generating: " .. math.floor((batchesDone/totalBatches)*100) .. "%"
                RunService.Heartbeat:Wait()
            end
        end
    end

    message:Destroy()
    
    Lighting.ClockTime = ${timeOfDay}
    print("Generation Completed in " .. string.format("%.2f", os.clock() - startTime) .. "s")
end

generate()
`;
}
