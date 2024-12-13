// ==UserScript==
// @name         CalculateWarpTest
// @namespace    http://tampermonkey.net/
// @version      2024-10-26
// @description  test script
// @author       You
// @match        *://*/*

// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function() {
    'use strict';
     const THREE = await import('https://cdn.jsdelivr.net/npm/three/build/three.module.min.js')

     let globalSettings = { useWarp:true, returnTrip:true, subwarpShortDist:true }

     function calcNextWarpPoint(warpRange, startCoords, endCoords) {

        const maxWarpRangeAU = warpRange / 100;

        const vStartCoords = new THREE.Vector2(Number(startCoords[0]), Number(startCoords[1]));
        const vEndCoords = new THREE.Vector2(Number(endCoords[0]), Number(endCoords[1]));
        const vStartToEnd = new THREE.Vector2().subVectors(vEndCoords, vStartCoords);

        // Calculate normalized direction vector from start to end
        const unitDirection = vStartToEnd.clone().normalize();

        // Scale the direction vector to the max possible warp distance
        const maxUnclampedWarpVector = unitDirection.clone().multiplyScalar(maxWarpRangeAU);
        const maxUnclampedWarpCoords = vStartCoords.clone().add(maxUnclampedWarpVector);

        const totalEstimatedWarpDistance = vStartToEnd.length();

        let subwarpShortDist = globalSettings.subwarpShortDist

        console.log(`%cCalculating Warp jump from (${vStartCoords.x}, ${vStartCoords.y}) to (${vEndCoords.x}, ${vEndCoords.y})`,"color: white; font-weight: bold;");
        console.log(`maxWapRangeAU ${maxWarpRangeAU}`);

        // If we can make it to the destination in a single jump, return endCoords.

        if(maxWarpRangeAU >= totalEstimatedWarpDistance) {
            console.log('Choose end coords as we are within max warp range...');
            console.log(`bestWarpCoords ${vEndCoords.x}, ${vEndCoords.y}, warpDistance: ${totalEstimatedWarpDistance}`);
            return endCoords;
        }

        // The first potential warp coords to test are the coords for the sector the maxUnclampedWarpCoords falls into.

        const potentialWarpCoords = new THREE.Vector2(
            Math.trunc(maxUnclampedWarpCoords.x),
            Math.trunc(maxUnclampedWarpCoords.y)
        );

        // Check all nearby sector coords (adjusting by 1 grid unit in each direction)

        const possibleWarpCoords = [
            potentialWarpCoords,
            new THREE.Vector2(potentialWarpCoords.x, potentialWarpCoords.y + 1),
            new THREE.Vector2(potentialWarpCoords.x, potentialWarpCoords.y - 1),

            new THREE.Vector2(potentialWarpCoords.x - 1, potentialWarpCoords.y),
            new THREE.Vector2(potentialWarpCoords.x - 1, potentialWarpCoords.y + 1),
            new THREE.Vector2(potentialWarpCoords.x - 1, potentialWarpCoords.y - 1),

            new THREE.Vector2(potentialWarpCoords.x + 1, potentialWarpCoords.y),
            new THREE.Vector2(potentialWarpCoords.x + 1, potentialWarpCoords.y + 1),
            new THREE.Vector2(potentialWarpCoords.x + 1, potentialWarpCoords.y - 1),
        ];

        const warpData = possibleWarpCoords.map(warpCoords => {
            const warpDistance = warpCoords.distanceTo(vStartCoords);
            const remainingWarpDistance = warpCoords.distanceTo(vEndCoords);
            const totalWarpDistance = warpDistance + remainingWarpDistance;

            // Calculate the estimated number of remaining jumps needed to reach the destination.
            // We take the ceiling because you cannot warp "a little bit" into a sector, it's all or nothing.

            const remaingJumpsRaw = remainingWarpDistance / maxWarpRangeAU;
            const remainingJumps = Math.ceil(remaingJumpsRaw);

            let primaryCriteria = remainingJumps;
            let secondaryCriteria = 0;
            let tertiaryCriteria = 0;

            if(remainingJumps > 1) {
                secondaryCriteria = remainingWarpDistance;
                tertiaryCriteria = totalWarpDistance;
            }
            else {

                if(globalSettings.subwarpShortDist && remainingWarpDistance < 1.5) {
                    secondaryCriteria = remainingWarpDistance;
                    tertiaryCriteria = totalWarpDistance;
                }
                else {
                    secondaryCriteria = totalWarpDistance;
                    tertiaryCriteria = remainingWarpDistance;
                }
            }

            return {
                warpCoords: [...warpCoords],
                warpDistance,
                remainingWarpDistance,
                totalWarpDistance,
                primaryCriteria,
                secondaryCriteria,
                tertiaryCriteria,
                remaingJumpsRaw,
                remainingJumps
            };
        });

        const filteredSortedData = warpData.filter(entry => entry.warpDistance <= maxWarpRangeAU).sort((a, b) => {
            if (a.primaryCriteria !== b.primaryCriteria) {
                return a.primaryCriteria - b.primaryCriteria;
            }

            if (a.secondaryCriteria !== b.secondaryCriteria) {
                return a.secondaryCriteria - b.secondaryCriteria;
            }

            return a.tertiaryCriteria - b.tertiaryCriteria;
        });

        console.log('Sorted/Filtered list excluding coords outside of the warp range.');
        filteredSortedData.forEach(entry => {
            console.log(`warpCoords: ${entry.warpCoords}, warpDistance: ${entry.warpDistance.toFixed(6)}, remainingWarpDistance: ${entry.remainingWarpDistance.toFixed(6)}, totalWarpDistance: ${entry.totalWarpDistance.toFixed(6)} estimated remaining jumpsRaw: ${entry.remaingJumpsRaw} estimated remaining jumps: ${entry.remainingJumps}`);
        });

        // Choose the first entry in the sorted list as it is the best option given our criteria.
        let bestWarpCoords = filteredSortedData[0].warpCoords;
        return [bestWarpCoords[0], bestWarpCoords[1]];
	}

	function CoordsEqual(a, b) {
		return Array.isArray(a) && Array.isArray(b) &&
			a.length === 2 && b.length === 2 &&
			Number(a[0]) === Number(b[0]) &&
			Number(a[1]) === Number(b[1])
	}

    function FormatSeconds(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.round(seconds % 60); // Round seconds to nearest whole number

        let result = "";

        if (hrs > 0) {
            result += `${hrs}hr `;
        }
        if (mins > 0 || hrs > 0) { // Include minutes if there are hours
            result += `${mins}m `;
        }
        result += `${secs}s`; // Always include seconds

        return result.trim(); // Remove any trailing space
    }

    function calculateMovementDistance(orig, dest) {
        return dest ? Math.sqrt((orig[0] - dest[0]) ** 2 + (orig[1] - dest[1]) ** 2) : 0
    }

    function calculateWarpTime(fleet, distance) {
        return fleet.warpSpeed > 0 ? distance / (fleet.warpSpeed / 1e6) : 0
    }

    function calculateSubwarpTime(fleet, distance) {
        return fleet.subwarpSpeed > 0 ? distance / (fleet.subwarpSpeed / 1e6) : 0
    }

    function calculateMiningDuration(cargoCapacity, miningRate, resourceHardness, systemRichness) {
        return resourceHardness > 0 ? Math.ceil(cargoCapacity / (((miningRate / 10000) * (systemRichness / 100)) / (resourceHardness / 100))) : 0;
    }

     function calculateMiningDurationAndResourceConsumption(userFleet, resourceHardness, systemRichness) {
         let miningDuration = calculateMiningDuration(userFleet.cargoCapacity, userFleet.miningRate, resourceHardness, systemRichness)
         let foodConsumption = Math.max(Math.ceil((miningDuration) * (userFleet.foodConsumptionRate / 10000)), 0);
         let ammoConsumption = Math.ceil(miningDuration * (userFleet.ammoConsumptionRate / 10000));
         let fuelConsumption = userFleet.planetExitFuelAmount;
         miningDuration = miningDuration / 10000;

         return {
             miningDuration,
             foodConsumption,
             ammoConsumption,
             fuelConsumption
         };
    }

    function calculateSupplyRequirements(miningFleet, systemData, resourceType, cargoFleet, supplyTime) {

        const resource = systemData.resources.get(resourceType);
        const miningDataPerFill = calculateMiningDurationAndResourceConsumption(miningFleet, resource.hardness, resource.richness)

        // Calculate the number of fills (including partial fills)
        const fillsPerTrip = supplyTime / miningDataPerFill.miningDuration;

        // Calculate the total mined output during the supply time
        const totalMinedOutput = fillsPerTrip * miningFleet.cargoCapacity;

        // Calculate the disparity between mining output and cargo fleet capacity
        const cargoDisparity = cargoFleet.cargoCapacity - totalMinedOutput;

        // Calculate the normalized efficiency between -1 and 1
        const normalizedEfficiency = cargoDisparity / cargoFleet.cargoCapacity;

        const foodPerTrip = fillsPerTrip * miningDataPerFill.foodConsumption;
        const ammoPerTip = fillsPerTrip * miningDataPerFill.ammoConsumption;
        const fuelPerTrip = fillsPerTrip * miningDataPerFill.fuelConsumption;

        // Round up to ensure enough resources are supplied
        return {
            resourceType: resourceType,
            resourceHardness: resource.hardness,
            resourceRichness: resource.richness,
            planetExitFuelAmount: miningFleet.planetExitFuelAmount,
            ammoConsumptionRate: miningFleet.ammoConsumptionRate,
            foodConsumptionRate: miningFleet.foodConsumptionRate,
            miningRate: miningFleet.miningRate,
            miningDurationPerFill: miningDataPerFill.miningDuration,
            foodPerFill: miningDataPerFill.foodConsumption,
            ammoPerFill: miningDataPerFill.ammoConsumption,
            fuelPerFill: miningDataPerFill.fuelConsumption,
            resourceOutputPerFill: miningFleet.cargoCapacity,
            fillsPerTrip: supplyTime / miningDataPerFill.miningDuration,
            resourceOutputPerTrip: totalMinedOutput,
            foodPerTrip: Math.ceil(foodPerTrip),
            ammoPerTrip: Math.ceil(ammoPerTip),
            fuelPerTrip: Math.ceil(fuelPerTrip),
            cargoDisparity: cargoDisparity,
            cargoEfficiency: normalizedEfficiency.toFixed(2)
        };
    }

    const ResourceType = Object.freeze({
        BIOMASS: "Biomass",
        CARBON: "Carbon",
        SILICA: "Silica",
        COPPER_ORE: "Copper Ore",
        IRON_ORE: "Iron Ore",
        TITANIUM_ORE: "Titanium Ore",
        HYDROGEN: "Hydrogen",
        NITROGEN: "Nitrogen",
        LUMANITE: "Lumanite",
        DIAMOND: "Diamond",
        ARCO: "Arco",
        ROCHINOL: "Rochinol"
    });

    class Resource {
        constructor(name, richness, hardness) {
            this.name = name;
            this.richness = richness;
            this.hardness = hardness;
        }

        toString() {
            return `Resource(name: ${this.name}, hardness: ${this.hardness}, richness: ${this.richness})`;
        }
    }

   function createResourceMap(resources) {
       const resourceMap = new Map();
       resources.forEach((resource) => {
           resourceMap.set(resource.name, resource);
       });
       return resourceMap;
   }

    const systemData = Object.freeze({
        MUD_CSS: { name: "MUD_CSS", coords: [0, -39], resources: createResourceMap([
            new Resource(ResourceType.HYDROGEN, 100, 100),
        ])},

        MUD_2: { name: "MUD_2", coords: [2, -34], resources: createResourceMap([
            new Resource(ResourceType.IRON_ORE, 100, 200),
        ])},

        MUD_3: { name: "MUD_3", coords: [10, -41], resources: createResourceMap([
            new Resource(ResourceType.CARBON, 100, 100),
        ])},

        MUD_4: { name: "MUD_4", coords: [-2, -44], resources: createResourceMap([
            new Resource(ResourceType.BIOMASS, 100, 100),
        ])},

        MUD_5: { name: "MUD_5", coords: [-10, -37], resources: createResourceMap([
            new Resource(ResourceType.COPPER_ORE, 100, 200),
        ])},

        MRZ_1: { name: "MRZ_1", coords: [-15, -33], resources: createResourceMap([
            new Resource(ResourceType.IRON_ORE, 150, 200),
            new Resource(ResourceType.NITROGEN, 150, 100),
        ])},

        MRZ_2: { name: "MRZ_2", coords: [12, -31], resources: createResourceMap([
            new Resource(ResourceType.SILICA, 100, 200),
            new Resource(ResourceType.LUMINITE, 100, 250),
        ])},

        MRZ_3: { name: "MRZ_3", coords: [-22, -25], resources: createResourceMap([
            new Resource(ResourceType.IRON_ORE, 150, 200),
            new Resource(ResourceType.BIOMASS, 150, 100),
        ])},

        MRZ_4: { name: "MRZ_4", coords: [-8, -24], resources: createResourceMap([
            new Resource(ResourceType.HYDROGEN, 150, 100),
            new Resource(ResourceType.COPPER_ORE, 150, 200),
        ])},

        MRZ_5: { name: "MRZ_5", coords: [2, -23], resources: createResourceMap([
            new Resource(ResourceType.HYDROGEN, 150, 100),
            new Resource(ResourceType.CARBON, 150, 100),
        ])},

        MRZ_6: { name: "MRZ_6", coords: [11, -16], resources: createResourceMap([
            new Resource(ResourceType.HYDROGEN, 200, 100),
        ])},

        MRZ_7: { name: "MRZ_7", coords: [21, -26], resources: createResourceMap([
            new Resource(ResourceType.CARBON, 150, 100),
            new Resource(ResourceType.COPPER_ORE, 150, 200),
        ])},

        MRZ_8: { name: "MRZ_8", coords: [-30, -16], resources: createResourceMap([
            new Resource(ResourceType.TITANIUM_ORE, 200, 500),
        ])},

        MRZ_9: { name: "MRZ_9", coords: [-14, -16], resources: createResourceMap([
            new Resource(ResourceType.BIOMASS, 150, 100),
            new Resource(ResourceType.CARBON, 150, 100),
        ])},

        MRZ_10: { name: "MRZ_10", coords: [23, -12], resources: createResourceMap([
            new Resource(ResourceType.LUMANITE, 150, 250),
        ])},

        MRZ_11: { name: "MRZ_11", coords: [31, -19], resources: createResourceMap([
            new Resource(ResourceType.CARBON, 200, 100),
        ])},

        MRZ_12: { name: "MRZ_12", coords: [-16, 0], resources: createResourceMap([
            new Resource(ResourceType.DIAMOND, 100, 400),
        ])},
    });

     class CargoFleet {
        constructor({name, warpSpeed, subwarpSpeed, warpCooldown, maxWarpDistance, cargoCapacity}) {
            this.name = name;
            this.warpSpeed = warpSpeed * 1000000;
            this.subwarpSpeed = subwarpSpeed * 1000000;
            this.warpCooldown = warpCooldown;
            this.maxWarpDistance = maxWarpDistance * 100;
            this.cargoCapacity = cargoCapacity;
        }
    }

    class MiningFleet {
        constructor({name, timeToFull, foodToFull, ammoToFull, planetExitFuelAmount, cargoCapacity, miningRate}) {
            this.name = name;
            this.timeToFull = timeToFull;
            this.foodToFull = foodToFull;
            this.ammoToFull = ammoToFull;
            this.planetExitFuelAmount = planetExitFuelAmount;
            this.cargoCapacity = cargoCapacity;
            this.miningRate = miningRate;
        }
    }

    class Fleet
    {
        constructor({name, subwarpSpeed, warpSpeed, maxWarpDistance, warpCooldown, cargoCapacity, planetExitFuelAmount, ammoConsumptionRate, foodConsumptionRate, miningRate}) {
            this.name = name;
            this.subwarpSpeed = subwarpSpeed * 1000000;
            this.warpSpeed = warpSpeed * 1000000;
            this.maxWarpDistance = maxWarpDistance * 100;
            this.warpCooldown = warpCooldown;
            this.cargoCapacity = cargoCapacity;
            this.planetExitFuelAmount = planetExitFuelAmount;
            this.ammoConsumptionRate = ammoConsumptionRate;
            this.foodConsumptionRate = foodConsumptionRate;
            this.miningRate = miningRate;
        }
    }

    class SupplyChainTest {
        constructor({targetSystemData, starbaseSystemData, useWarp, subwarpShortDist, returnTrip, miningFleet, cargoFleet, resourceType}) {
            this.targetSystemData = targetSystemData;
            this.starbaseSystemData = starbaseSystemData;
            this.useWarp = useWarp;
            this.subwarpShortDist = subwarpShortDist;
            this.returnTrip = returnTrip;
            this.miningFleet = miningFleet;
            this.cargoFleet = cargoFleet;
            this.resourceType = resourceType;
        }
    }

    function testWarpJumps() {

//         let PackliteFleet = new Fleet({
//             name: "Packlite",
//             warpSpeed: 0.1,
//             subwarpSpeed: 0.0048,
//             warpCooldown: 240,
//             maxWarpDistance: 9.5,
//             cargoCapacity = cargoCapacity
//         });

//         let OmFleet = new CargoFleet({
//             name: "OM",
//             warpSpeed: 0.1,
//             subwarpSpeed: 0.0038,
//             warpCooldown: 240,
//             maxWarpDistance: 10.2,
//         });

//         // OM Expected Warp Jumps Complete with 3 and a total distance of 21.947466518650742 au
//         let omFleetWarpTest01 = new WarpTest({
//            cargoFleet: OmFleet,
//            startCoords: systemData.UST_CSS.coords,
//            endCoords: systemData.MRZ_21.coords,
//            useWarp: true,
//            subwarpShortDist: false,
//            returnTrip: false
//         });

//         // OM Expected Warp Jumps Complete with 2 and a total distance of 14.868559065654289 au
//         let omFleetWarpTest02 = new WarpTest({
//            cargoFleet: OmFleet,
//            startCoords: systemData.MRZ_22.coords,
//            endCoords: systemData.UST_CSS.coords,
//            useWarp: true,
//            subwarpShortDist: false,
//            returnTrip: false
//         });

//          // OM Expected Warp Jumps Complete with 2 and a total distance of 19.899494936611667 au
//         let omFleetWarpTest03 = new WarpTest({
//            cargoFleet: OmFleet,
//            startCoords: systemData.MRZ_22.coords,
//            endCoords: systemData.MRZ_34.coords,
//            useWarp: true,
//            subwarpShortDist: false,
//            returnTrip: false
//         });

//          // Packlite Expected Warp Jumps Complete with 2 and a total distance of 19.899494936611667 au
//         let packliteFleetWarpTest01 = new WarpTest({
//            cargoFleetleet: PackliteFleet,
//            startCoords: systemData.MRZ_4.coords,
//            endCoords: systemData.MRZ_5.coords,
//            useWarp: true,
//            subwarpShortDist: true,
//            returnTrip: true
//         });

//         let cargoFleet_CF5 = new CargoFleet({
//             name: "CF5-Titanium",
//             warpSpeed: 0.1,
//             subwarpSpeed: 0.0048,
//             warpCooldown: 240,
//             maxWarpDistance: 9.5,
//             cargoCapacity: 45073
//         });

//         let miningFleet_MF5 = new MiningFleet({
//             name: "MF5-Titanium",
//             timeToFull: 4204,
//             foodToFull: 303,
//             ammoToFull: 0,
//             planetExitFuelAmount: 145,
//             cargoCapacity: 32270
//         });

//         let supplyWarpTestCF5_MF5 = new WarpTest({
//             cargoFleet: cargoFleet_CF5,
//             startCoords: systemData.MRZ_8.coords,
//             endCoords: systemData.MRZ_4.coords,
//             useWarp: false,
//             subwarpShortDist: true,
//             returnTrip: true,
//             miningFleet: miningFleet_MF5
//         });

//          let cargoFleet_CF3 = new CargoFleet({
//             name: "CF3-Nitorgen",
//             warpSpeed: 0.1,
//             subwarpSpeed: 0.0038,
//             warpCooldown: 240,
//             maxWarpDistance: 10.2,
//             cargoCapacity: 84406
//         });

//         let miningFleet_MF3 = new MiningFleet({
//             name: "MF3-Nitorgen",
//             timeToFull: 1111,
//             foodToFull: 274,
//             ammoToFull: 278,
//             planetExitFuelAmount: 399,
//             cargoCapacity: 82621
//         });

//         let supplyWarpTestCF3_MF3 = new WarpTest({
//             cargoFleet: cargoFleet_CF3,
//             startCoords: systemData.MRZ_1.coords,
//             endCoords: systemData.MRZ_4.coords,
//             useWarp: true,
//             subwarpShortDist: true,
//             returnTrip: true,
//             miningFleet: miningFleet_MF3,
//         });

//         let cargoFleet_CF4 = new CargoFleet({
//             name: "CF4-Silica",
//             warpSpeed: 0.1,
//             subwarpSpeed: 0.0048,
//             warpCooldown: 240,
//             maxWarpDistance: 9.5,
//             cargoCapacity: 45074
//         });

//         let miningFleet_MF4 = new MiningFleet({
//             name: "MF4-Silica",
//             timeToFull: 3529,
//             foodToFull: 587,
//             ammoToFull: 6449,
//             planetExitFuelAmount: 508,
//             cargoCapacity: 64540
//         });

//         let supplyWarpTestCF4_MF4 = new WarpTest({
//             cargoFleet: cargoFleet_CF4,
//             startCoords: systemData.MRZ_2.coords,
//             endCoords: systemData.MRZ_4.coords,
//             useWarp: true,
//             subwarpShortDist: true,
//             returnTrip: true,
//             miningFleet: miningFleet_MF4,
//         });

         const cargoFleet_CF_1 = new Fleet({
            name: "CF-1",
            subwarpSpeed: 0.0038,
            warpSpeed: 0.1,
            maxWarpDistance: 10.2,
            warpCooldown: 240,
            cargoCapacity: 84406,
            planetExitFuelAmount: 195,
            ammoConsumptionRate: 0.704,
            foodConsumptionRate: 0.129,
            miningRate: 14.074
        });

         const miningFleet_MF_1 = new Fleet({
            name: "MF-2",
            subwarpSpeed: 0.0039,
            warpSpeed: 0.1,
            maxWarpDistance: 7.5,
            warpCooldown: 240,
            cargoCapacity: 50351,
            planetExitFuelAmount: 254,
            ammoConsumptionRate: 0.25,
            foodConsumptionRate: 0.173,
            miningRate: 20.407
        });

        const cargoFleet_CF_2 = new Fleet({
            name: "CF-2",
            subwarpSpeed: 0.0038,
            warpSpeed: 0.1,
            maxWarpDistance: 10.2,
            warpCooldown: 240,
            cargoCapacity: 84406,
            planetExitFuelAmount: 195,
            ammoConsumptionRate: 0.704,
            foodConsumptionRate: 0.129,
            miningRate: 14.074
        });

        const miningFleet_MF_2 = new Fleet({
            name: "MF-2",
            subwarpSpeed: 0.0064,
            warpSpeed: 0.1,
            maxWarpDistance: 7.6,
            warpCooldown: 240,
            cargoCapacity: 64540,
            planetExitFuelAmount: 508,
            ammoConsumptionRate: 1.892,
            foodConsumptionRate: 0.172,
            miningRate: 37.872
        });

        const cargoFleet_CF_5 = new Fleet({
            name: "CF-5",
            warpSpeed: 0.1,
            subwarpSpeed: 0.0048,
            warpCooldown: 240,
            maxWarpDistance: 9.5,
            cargoCapacity: 45074,
            planetExitFuelAmount: 107,
            ammoConsumptionRate: 0.352,
            foodConsumptionRate: 0.072,
            miningRate: 7.037
        });

         const miningFleet_MF_5 = new Fleet({
            name: "MF-5",
            subwarpSpeed: 0.0064,
            warpSpeed: 0.1,
            maxWarpDistance: 7.6,
            warpCooldown: 240,
            cargoCapacity: 64540,
            planetExitFuelAmount: 508,
            ammoConsumptionRate: 1.892,
            foodConsumptionRate: 0.172,
            miningRate: 37.872
        });

         const cargoFleet_CF_8 = new Fleet({
            name: "CF-8",
            subwarpSpeed: 0.0048,
            warpSpeed: 0.1,
            maxWarpDistance: 9.5,
            warpCooldown: 240,
            cargoCapacity: 45074,
            planetExitFuelAmount: 107,
            ammoConsumptionRate: 0.352,
            foodConsumptionRate: 0.072,
            miningRate: 7.037
        });

         const miningFleet_MF_8 = new Fleet({
            name: "MF-8",
            subwarpSpeed: 0.0039,
            warpSpeed: 0.1,
            maxWarpDistance: 7.5,
            warpCooldown: 240,
            cargoCapacity: 32270,
            planetExitFuelAmount: 145,
            ammoConsumptionRate: 0,
            foodConsumptionRate: 0.072,
            miningRate: 19.192
        });

        const cargoFleet_CF_12 = new Fleet({
            name: "CF-12",
            subwarpSpeed: 0.0048,
            warpSpeed: 0.1,
            maxWarpDistance: 9.5,
            warpCooldown: 240,
            cargoCapacity: 45074,
            planetExitFuelAmount: 107,
            ammoConsumptionRate: 0.352,
            foodConsumptionRate: 0.072,
            miningRate: 7.037
        });

        const miningFleet_MF_12 = new Fleet({
            name: "MF-12",
            warpSpeed: 0.1,
            subwarpSpeed: 0.0039,
            warpCooldown: 240,
            maxWarpDistance: 7.5,
            cargoCapacity: 32270,
            planetExitFuelAmount: 145,
            ammoConsumptionRate: 0,
            foodConsumptionRate: 0.072,
            miningRate: 19.192
        });

         let supplyChainTest_MRZ_1 = new SupplyChainTest({
             targetSystemData: systemData.MRZ_1,
             starbaseSystemData: systemData.MRZ_4,
             useWarp: true,
             subwarpShortDist: true,
             returnTrip: true,
             miningFleet: miningFleet_MF_1,
             cargoFleet: cargoFleet_CF_1,
             resourceType: ResourceType.NITROGEN
         });

        let supplyChainTest_MRZ_2 = new SupplyChainTest({
             targetSystemData: systemData.MRZ_2,
             starbaseSystemData: systemData.MRZ_4,
             useWarp: true,
             subwarpShortDist: true,
             returnTrip: true,
             miningFleet: miningFleet_MF_2,
             cargoFleet: cargoFleet_CF_2,
             resourceType: ResourceType.SILICA
         });

         let supplyChainTest_MRZ_5 = new SupplyChainTest({
             targetSystemData: systemData.MRZ_5,
             starbaseSystemData: systemData.MRZ_4,
             useWarp: true,
             subwarpShortDist: true,
             returnTrip: true,
             miningFleet: miningFleet_MF_2,
             cargoFleet: cargoFleet_CF_2,
             resourceType: ResourceType.CARBON
        });

        let supplyChainTest_MRZ_8 = new SupplyChainTest({
             targetSystemData: systemData.MRZ_8,
             starbaseSystemData: systemData.MRZ_4,
             useWarp: false,
             subwarpShortDist: true,
             returnTrip: true,
             miningFleet: miningFleet_MF_12,
             cargoFleet: cargoFleet_CF_12,
             resourceType: ResourceType.TITANIUM_ORE
        });

        let supplyChainTest_MRZ_12 = new SupplyChainTest({
             targetSystemData: systemData.MRZ_8,
             starbaseSystemData: systemData.MRZ_8,
             useWarp: false,
             subwarpShortDist: true,
             returnTrip: true,
             miningFleet: miningFleet_MF_12,
             cargoFleet: cargoFleet_CF_12,
             resourceType: ResourceType.DIAMOND
        });

        let currentWarpTest = supplyChainTest_MRZ_8;
        let startCoords = [...currentWarpTest.targetSystemData.coords];
        let endCoords = [...currentWarpTest.starbaseSystemData.coords];

        globalSettings.useWarp = currentWarpTest.useWarp;
        globalSettings.returnTrip = currentWarpTest.returnTrip;
        globalSettings.subwarpShortDist = currentWarpTest.subwarpShortDist;

		let warpJumps = 0;
        let totalWarpDistance = 0;
        let totalWarpTime = 0;

        let subwarpJumps = 0;
        let totalSubwarpDistance = 0;
        let totalSubwarpTime = 0;

        let totalDistance = 0;
        let totalTime = 0;
        let totalCooldownTime = 0;

        let returnTripStarted = false;
        let firstWarpAfterSubwarp = false;
        let coolDownTimeAftersubwarp = 0;

        let totalLoadingTime = 0;

        const estimatedLoadingTime = 90;

        console.warn(`Testing Warp with Fleet: ${currentWarpTest.cargoFleet.name} from (${startCoords}) to (${endCoords}) / Return Trip ${globalSettings.returnTrip} / Use Warp: ${globalSettings.useWarp} / Short Distance Subwarp: ${globalSettings.subwarpShortDist}`);

        let curWP = startCoords;

        totalLoadingTime += estimatedLoadingTime;

		while(!CoordsEqual(curWP, endCoords)) {

            console.log("------------------------------------------------------------");

            const remainingDistance = calculateMovementDistance(curWP, endCoords)

            let nextWP = curWP;

            if(!globalSettings.useWarp || (remainingDistance < 1.5 && globalSettings.subwarpShortDist))
            {
                console.log(`%cCalculating Subwarp jump from (${curWP}) to (${endCoords})`,"color: white; font-weight: bold;");

                let subwarpDistane = remainingDistance;
                let subWarpTime = calculateSubwarpTime(currentWarpTest.cargoFleet, remainingDistance);

                subwarpJumps++;

                nextWP = [...endCoords];

                totalSubwarpDistance += subwarpDistane;
                totalSubwarpTime += subWarpTime;

                totalDistance += subwarpDistane;
                totalTime += subWarpTime;

                if(globalSettings.returnTrip && !returnTripStarted)
                {
                    if(globalSettings.useWarp)
                    {
                        firstWarpAfterSubwarp = true;
                        coolDownTimeAftersubwarp = Math.max(0, currentWarpTest.cargoFleet.warpCooldown - subWarpTime);
                    }

                    totalLoadingTime += estimatedLoadingTime;
                    endCoords = [...startCoords];
                    returnTripStarted = true;
                }

                console.log(`%cSubwarp #${subwarpJumps}, Current WP = (${curWP}), Next WP = (${nextWP}), Subwarp Distance = ${subwarpDistane}, Subwarp Time = ${FormatSeconds(subWarpTime)}`,"color: yellow;");
            }
            else
            {
                nextWP = calcNextWarpPoint(currentWarpTest.cargoFleet.maxWarpDistance, curWP, endCoords);

                let coolDownTime = 0;

                if(warpJumps > 0 || firstWarpAfterSubwarp)
                {
                    coolDownTime = firstWarpAfterSubwarp ? coolDownTimeAftersubwarp : currentWarpTest.cargoFleet.warpCooldown;

                    firstWarpAfterSubwarp = false;

                    totalTime += coolDownTime;
                    totalCooldownTime += coolDownTime;
                }

                warpJumps++;

                let warpDistance = calculateMovementDistance(curWP, nextWP);
                let warpTime = calculateWarpTime(currentWarpTest.cargoFleet, warpDistance);

                totalWarpDistance += warpDistance;
                totalWarpTime += warpTime;

                totalDistance += warpDistance;
                totalTime += warpTime;

                if(!returnTripStarted && globalSettings.returnTrip && CoordsEqual(nextWP, endCoords))
                {
                    endCoords = [...startCoords];
                    returnTripStarted = true;
                    totalLoadingTime += estimatedLoadingTime;
                }

                console.log(`%cWarp #${warpJumps}: Current WP = (${curWP}), Next WP = (${nextWP}), Warp Distance = ${warpDistance} Cooldown Time = ${FormatSeconds(coolDownTime)} Warp Time = ${FormatSeconds(warpTime)}`, "color: orange;");
            }

			curWP = nextWP;

            if(warpJumps > 100)
            {
                break;
            }
		};

        totalTime += totalLoadingTime;

        let supplyRequirements = calculateSupplyRequirements(currentWarpTest.miningFleet, currentWarpTest.targetSystemData, currentWarpTest.resourceType, currentWarpTest.cargoFleet, totalTime);

        console.warn('Testing Warp Jumps Complete ------------------------------------------');
        console.log(`Total Warp Jumps: ${warpJumps} / Total Warp Distance: ${totalWarpDistance} au / Total Warp Time: ${FormatSeconds(totalWarpTime)}`);
        console.log(`Total Subwarp Jumps: ${subwarpJumps} / Total Warp Distance: ${totalSubwarpDistance} au / Total Subwarp Time: ${FormatSeconds(totalSubwarpTime)}`);
        console.log(`Total Cooldown Time: ${FormatSeconds(totalCooldownTime)}`);
        console.log(`Total Estimated Loading Time: ${FormatSeconds(totalLoadingTime)}`);
        console.log(`%cTotal Travel Distance: ${totalDistance} au Total Travel Time: ${FormatSeconds(totalTime)}`, "color:lime;");
        console.warn("Supply Chain Info-----------------------------------------------------");
        console.log(`Resouce: ${supplyRequirements.resourceType} Richness: ${supplyRequirements.resourceRichness / 100} Hardness: ${supplyRequirements.resourceHardness / 100}`);
        console.log(`Planet Exit Fuel Amount: ${supplyRequirements.planetExitFuelAmount}`);
        console.log(`Ammo Consumption Rate: ${supplyRequirements.ammoConsumptionRate}`);
        console.log(`Food Consumption Rate: ${supplyRequirements.foodConsumptionRate}`);
        console.log(`Mining Rate: ${supplyRequirements.miningRate}`);
        console.log(`Total Food Needed Per Fill: ${supplyRequirements.foodPerFill}`);
        console.log(`Total Ammo Needed Per Fill: ${supplyRequirements.ammoPerFill}`);
        console.log(`Total Fuel Needed Per Fill: ${supplyRequirements.fuelPerFill}`);
        console.log(`Total Time Needed Per Fill: ${FormatSeconds(supplyRequirements.miningDurationPerFill)}`);
        console.log(`Resource Output Per Fill: ${Math.floor(supplyRequirements.resourceOutputPerFill)}`);
        console.log(`Fills Per Trip: ${supplyRequirements.fillsPerTrip.toFixed(2)}`);
        console.log(`Total Food Needed Per Trip: ${supplyRequirements.foodPerTrip}`);
        console.log(`Total Ammo Needed Per Trip: ${supplyRequirements.ammoPerTrip}`);
        console.log(`Total Fuel Needed Per Trip: ${supplyRequirements.fuelPerTrip}`);
        console.log(`Total Time Needed Per Trip: ${FormatSeconds(totalTime)}`);
        console.log(`Resource Output Per Trip: ${Math.floor(supplyRequirements.resourceOutputPerTrip)}`);
        console.log(`Cargo Capacity Per Trip: ${currentWarpTest.cargoFleet.cargoCapacity}`);
        console.log(`Cargo/Mining fleet cargo disparity: %c${Math.floor(supplyRequirements.cargoDisparity)}`, getColor(supplyRequirements.cargoDisparity));
        console.log(`Cargo fleet efficiency: %c${supplyRequirements.cargoEfficiency}`, getColor(supplyRequirements.cargoEfficiency));
        console.warn("----------------------------------------------------------------------");
	};

    function getColor(value) {
        return `color: ${value < 0 ? 'tomato' : 'lime'};`;
    }

    testWarpJumps()

})();