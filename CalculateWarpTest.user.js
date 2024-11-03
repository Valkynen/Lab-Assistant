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

    function calculateSupplyRequirements(timeToFull, foodToFull, ammoToFull, planetExitFuelAmount, supplyTime, miningFleetCapacity, cargoFleetCapacity) {
        // Calculate consumption rates per second for food, ammo, and fuel
        const foodConsumptionRate = foodToFull / timeToFull;
        const ammoConsumptionRate = ammoToFull / timeToFull;
        const fuelConsumptionRate = planetExitFuelAmount / timeToFull;

        // Calculate food, ammo, and fuel needed for the duration of each supply trip
        const foodNeeded = foodConsumptionRate * supplyTime;
        const ammoNeeded = ammoConsumptionRate * supplyTime;
        const fuelNeeded = fuelConsumptionRate * supplyTime;

        // Calculate the number of fills (including partial fills)
        const fillsPerTrip = Math.floor(supplyTime / timeToFull);

        // Calculate the total mined output during the supply time
        const totalMinedOutput = fillsPerTrip * miningFleetCapacity;

        // Calculate the disparity between mining output and cargo fleet capacity
        const cargoDisparity = cargoFleetCapacity - totalMinedOutput;

        // Calculate the normalized efficiency between -1 and 1
        const normalizedEfficiency = cargoDisparity / cargoFleetCapacity;

        // Round up to ensure enough resources are supplied
        return {
            resourceOutputPerTrip: totalMinedOutput,
            food: Math.ceil(foodNeeded),
            ammo: Math.ceil(ammoNeeded),
            fuel: Math.ceil(fuelNeeded),
            cargoDisparity: cargoDisparity,
            cargoEfficiency: normalizedEfficiency.toFixed(2)
        };
    }

    const mudCoords = {
        MUD_CSS: [0, -39],
        MUD_2: [2, -34],
        MUD_3: [10, -41],
        MUD_4: [-2, -44],
        MUD_5: [-10, -37],
        MRZ_1: [-15, -33],
        MRZ_2: [12, -31],
        MRZ_3: [-22, -25],
        MRZ_4: [-8, -24],
        MRZ_5: [2, -23],
        MRZ_6: [11, -16],
        MRZ_7: [21, -25],
        MRZ_8: [-30, -16],
        MRZ_9: [-14, -16],
        MRZ_10: [23, -12],
        MRZ_11: [31, -19],
        MRZ_12: [-16, 0],
    };

    const ustCoords = {
        UST_CSS: [40, 30],
        UST_2: [42, 35],
        UST_3: [48, 32],
        UST_4: [38, 25],
        UST_5: [30, 28],
        MRZ_15: [22,5],
        MRZ_16: [39,-1],
        MRZ_17: [16,-5],
        MRZ_21: [25,14],
        MRZ_22: [35,16],
        MRZ_23: [44,10],
        MRZ_27: [2,26],
        MRZ_28: [17,21],
        MRZ_32: [5,44],
        MRZ_33: [13,37],
        MRZ_34: [22,31],
        MRZ_35: [49,20]
    };

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
        constructor({name, timeToFull, foodToFull, ammoToFull, planetExitFuelAmount, cargoCapacity}) {
            this.name = name;
            this.timeToFull = timeToFull;
            this.foodToFull = foodToFull;
            this.ammoToFull = ammoToFull;
            this.planetExitFuelAmount = planetExitFuelAmount;
            this.cargoCapacity = cargoCapacity;
        }
    }

    class WarpTest {
        constructor({fleet, startCoords, endCoords, useWarp, subwarpShortDist, returnTrip}) {
            this.fleet = fleet;
            this.startCoords = startCoords;
            this.endCoords = endCoords;
            this.useWarp = useWarp;
            this.subwarpShortDist = subwarpShortDist;
            this.returnTrip = returnTrip;
        }
    }

    function testWarpJumps() {

        let PackliteFleet = new CargoFleet({
            name: "Packlite",
            warpSpeed: 0.1,
            subwarpSpeed: 0.0048,
            warpCooldown: 240,
            maxWarpDistance: 9.5,
        });

        let OmFleet = new CargoFleet({
            name: "OM",
            warpSpeed: 0.1,
            subwarpSpeed: 0.0038,
            warpCooldown: 240,
            maxWarpDistance: 10.2,
        });

        // OM Expected Warp Jumps Complete with 3 and a total distance of 21.947466518650742 au
        let omFleetWarpTest01 = new WarpTest({
           fleet: OmFleet,
           startCoords: ustCoords.UST_CSS,
           endCoords: ustCoords.MRZ_21,
           useWarp: true,
           subwarpShortDist: false,
           returnTrip: false
        });

        // OM Expected Warp Jumps Complete with 2 and a total distance of 14.868559065654289 au
        let omFleetWarpTest02 = new WarpTest({
           fleet: OmFleet,
           startCoords: ustCoords.MRZ_22,
           endCoords: ustCoords.UST_CSS,
           useWarp: true,
           subwarpShortDist: false,
           returnTrip: false
        });

         // OM Expected Warp Jumps Complete with 2 and a total distance of 19.899494936611667 au
        let omFleetWarpTest03 = new WarpTest({
           fleet: OmFleet,
           startCoords: ustCoords.MRZ_22,
           endCoords: ustCoords.MRZ_34,
           useWarp: true,
           subwarpShortDist: false,
           returnTrip: false
        });

         // Packlite Expected Warp Jumps Complete with 2 and a total distance of 19.899494936611667 au
        let packliteFleetWarpTest01 = new WarpTest({
           fleet: PackliteFleet,
           startCoords: mudCoords.MRZ_4,
           endCoords: mudCoords.MRZ_5,
           useWarp: true,
           subwarpShortDist: true,
           returnTrip: true
        });

        let cargoFleet_CF5 = new CargoFleet({
            name: "CF5",
            warpSpeed: 0.1,
            subwarpSpeed: 0.0048,
            warpCooldown: 240,
            maxWarpDistance: 9.5,
            cargoCapacity: 45073
        });

        let miningFleet_MF5 = new MiningFleet({
            name: "MF5-Titanium",
            timeToFull: 4204,
            foodToFull: 303,
            ammoToFull: 0,
            planetExitFuelAmount: 145,
            cargoCapacity: 32270
        });

        let supplyWarpTestCF5 = new WarpTest({
           fleet: cargoFleet_CF5,
           startCoords: mudCoords.MRZ_8,
           endCoords: mudCoords.MRZ_4,
           useWarp: false,
           subwarpShortDist: true,
           returnTrip: true
        });

        let currentWarpTest = supplyWarpTestCF5;
        let currentMiningFleet = miningFleet_MF5;

        let currentFleet = currentWarpTest.fleet;
        let startCoords = [...currentWarpTest.startCoords];
        let endCoords = [...currentWarpTest.endCoords];

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

        console.warn(`Testing Warp with Fleet: ${currentFleet.name} from (${startCoords}) to (${endCoords}) / Return Trip ${globalSettings.returnTrip} / Use Warp: ${globalSettings.useWarp} / Short Distance Subwarp: ${globalSettings.subwarpShortDist}`);

        let curWP = startCoords;

		while(!CoordsEqual(curWP, endCoords)) {

            console.log("------------------------------------------------------------");

            const remainingDistance = calculateMovementDistance(curWP, endCoords)

            let nextWP = curWP;

            if(!globalSettings.useWarp || (remainingDistance < 1.5 && globalSettings.subwarpShortDist))
            {
                console.log(`%cCalculating Subwarp jump from (${curWP}) to (${endCoords})`,"color: white; font-weight: bold;");

                let subwarpDistane = remainingDistance;
                let subWarpTime = calculateSubwarpTime(currentFleet, remainingDistance);

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
                        coolDownTimeAftersubwarp = Math.max(0, currentFleet.warpCooldown - subWarpTime);
                    }

                    endCoords = [...startCoords];
                    returnTripStarted = true;
                }

                console.log(`%cSubwarp #${subwarpJumps}, Current WP = (${curWP}), Next WP = (${nextWP}), Subwarp Distance = ${subwarpDistane}, Subwarp Time = ${FormatSeconds(subWarpTime)}`,"color: yellow;");
            }
            else
            {
                nextWP = calcNextWarpPoint(currentFleet.maxWarpDistance, curWP, endCoords);

                let coolDownTime = 0;

                if(warpJumps > 0)
                {
                    coolDownTime = firstWarpAfterSubwarp ? coolDownTimeAftersubwarp : currentFleet.warpCooldown;

                    firstWarpAfterSubwarp = false;

                    totalTime += coolDownTime;
                    totalCooldownTime += coolDownTime;
                }

                warpJumps++;

                let warpDistance = calculateMovementDistance(curWP, nextWP);
                let warpTime = calculateWarpTime(currentFleet, warpDistance);

                totalWarpDistance += warpDistance;
                totalWarpTime += warpTime;

                totalDistance += warpDistance;
                totalTime += warpTime;

                if(!returnTripStarted && globalSettings.returnTrip && CoordsEqual(nextWP, endCoords))
                {
                    endCoords = [...startCoords];
                    returnTripStarted = true;
                }

                console.log(`%Warp #${warpJumps}: Current WP = (${curWP}), Next WP = (${nextWP}), Warp Distance = ${warpDistance} Cooldown Time = ${FormatSeconds(coolDownTime)} Warp Time = ${FormatSeconds(warpTime)}`, "color: orange;");
            }

			curWP = nextWP;

            if(warpJumps > 100)
            {
                break;
            }
		};

        let supplyRequirements = calculateSupplyRequirements(currentMiningFleet.timeToFull, currentMiningFleet.foodToFull, currentMiningFleet.ammoToFull, currentMiningFleet.planetExitFuelAmount, totalTime, currentMiningFleet.cargoCapacity, currentWarpTest.fleet.cargoCapacity);

        console.warn('Testing Warp Jumps Complete ------------------------------------------');
        console.log(`Total Warp Jumps: ${warpJumps} / Total Warp Distance: ${totalWarpDistance} au / Total Warp Time: ${FormatSeconds(totalWarpTime)}`);
        console.log(`Total Subwarp Jumps: ${subwarpJumps} / Total Warp Distance: ${totalSubwarpDistance} au / Total Subwarp Time: ${FormatSeconds(totalSubwarpTime)}`);
        console.log(`Total Cooldown Time: ${FormatSeconds(totalCooldownTime)}`);
        console.log(`%cTotal Travel Distance: ${totalDistance} au Total Travel Time: ${FormatSeconds(totalTime)}`, "color:lime;");
        console.warn("Supply Chain Info-----------------------------------------------------");
        console.log(`Total Food Needed Per Trip: ${supplyRequirements.food}`);
        console.log(`Total Ammo Needed Per Trip: ${supplyRequirements.ammo}`);
        console.log(`Total Fuel Needed Per Trip: ${supplyRequirements.fuel}`);
        console.log(`Resource Output Per Trip: ${supplyRequirements.resourceOutputPerTrip}`);
        console.log(`Cargo Capacity Per Trip: ${currentWarpTest.fleet.cargoCapacity}`);
        console.log(`Cargo/Mining fleet cargo disparity: %c${supplyRequirements.cargoDisparity}`, getColor(supplyRequirements.cargoDisparity));
        console.log(`Cargo fleet efficiency: %c${supplyRequirements.cargoEfficiency}`, getColor(supplyRequirements.cargoEfficiency));
        console.warn("----------------------------------------------------------------------");
	};

    function getColor(value) {
        return `color: ${value < 0 ? 'tomato' : 'lime'};`;
    }

    testWarpJumps()

})();