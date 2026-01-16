/**
 * PoliceSystem - Handles police enforcement, patrols, and visitor detention
 * Each active police station has:
 * - 1 Captain
 * - 15 Officers
 * - Max 50 held visitors
 * - Patrol radius of 15 tiles
 */

export class PoliceSystem {
    constructor(game) {
        this.game = game;
        this.stations = new Map();  // Map of station positions to station data
        this.patrols = [];  // Active patrol groups
        this.officers = [];  // Individual officers on patrol

        // Configuration
        this.officersPerStation = 15;
        this.officersPerPatrol = 5;
        this.patrolRadius = 15;
        this.maxHeldPerStation = 50;
        this.officerSpeed = 0.03;  // Tiles per frame
        this.captureRadius = 1.5;  // How close officer needs to be to capture
    }

    /**
     * Update police system - called each game tick
     */
    update() {
        this.updateStations();
        this.checkForPatrols();
        this.processHeldVisitors();
    }

    /**
     * Process held visitors - convert them to residents over time
     * Each station processes 2 visitors per game tick (month)
     */
    processHeldVisitors() {
        for (const [key, station] of this.stations) {
            if (!station.isActive) continue;
            if (station.heldVisitors <= 0) continue;

            // Process 2 visitors per tick - they become residents
            const toProcess = Math.min(2, station.heldVisitors);
            station.heldVisitors -= toProcess;

            // Add to population
            this.game.population = (this.game.population || 0) + toProcess;

            if (toProcess > 0) {
                // console.log(`[POLICE] Station ${key} processed ${toProcess} visitors -> residents. Population: ${this.game.population}, Still held: ${station.heldVisitors}`);
            }
        }
    }

    /**
     * Animate police officers - called each frame (60fps)
     */
    animate() {
        this.updateOfficers();
        this.updatePatrols();
    }

    /**
     * Scan for active police stations and update their status
     */
    updateStations() {
        const map = this.game.tileMap;
        if (!map) return;

        // Find all police stations
        const foundStations = new Set();

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.getTile(x, y);
                if (tile?.building?.type === 'policeStation' && tile.building.mainTile !== false) {
                    const key = `${x},${y}`;
                    foundStations.add(key);

                    // Check if station is active (powered + road connected)
                    const isActive = this.isStationActive(x, y);

                    if (!this.stations.has(key)) {
                        // New station found
                        this.stations.set(key, {
                            x: x,
                            y: y,
                            isActive: isActive,
                            captain: 1,
                            totalOfficers: this.officersPerStation,
                            availableOfficers: this.officersPerStation,
                            heldVisitors: 0,
                            patrolActive: false
                        });
                        console.log(`[POLICE] New station registered at (${x}, ${y})`);
                    } else {
                        // Update existing station
                        const station = this.stations.get(key);
                        station.isActive = isActive;
                    }
                }
            }
        }

        // Remove stations that no longer exist
        for (const key of this.stations.keys()) {
            if (!foundStations.has(key)) {
                // console.log(`[POLICE] Station removed at ${key}`);
                this.stations.delete(key);
            }
        }
    }

    /**
     * Check if a police station is active (has power and road connection)
     */
    isStationActive(x, y) {
        const infraManager = this.game.infrastructureManager;
        if (!infraManager) {
            // console.log(`[POLICE] No infrastructure manager`);
            return false;
        }

        const hasPower = infraManager.hasPower(x, y);
        const hasRoad = infraManager.hasRoadAccess(x, y);

        // Debug log on status change
        const key = `${x},${y}`;
        const station = this.stations.get(key);
        const wasActive = station?.isActive;
        const isActive = hasPower && hasRoad;

        if (wasActive !== isActive) {
            // console.log(`[POLICE] Station (${x},${y}) status: power=${hasPower}, road=${hasRoad}, active=${isActive}`);
        }

        return isActive;
    }

    /**
     * Check if any station should send out a patrol
     */
    checkForPatrols() {
        if (!this.game.immigrationSystem) {
            // console.log('[POLICE] No immigration system');
            return;
        }

        const crowds = this.game.immigrationSystem.crowds || [];

        // Debug: Log station and crowd status periodically
        if (this.game.month % 3 === 0 && !this._lastDebugMonth) {
            this._lastDebugMonth = this.game.month;
            // console.log(`[POLICE] Stations: ${this.stations.size}, Crowds: ${crowds.length}`);
            for (const [key, station] of this.stations) {
                // console.log(`[POLICE] Station ${key}: active=${station.isActive}, officers=${station.availableOfficers}, held=${station.heldVisitors}, patrolActive=${station.patrolActive}`);
            }
            for (const crowd of crowds) {
                // console.log(`[POLICE] Crowd at (${crowd.x?.toFixed(1)}, ${crowd.y?.toFixed(1)}), count=${crowd.count}`);
            }
        } else if (this.game.month % 3 !== 0) {
            this._lastDebugMonth = null;
        }

        for (const [key, station] of this.stations) {
            if (!station.isActive) continue;
            if (station.heldVisitors >= this.maxHeldPerStation) continue;
            if (station.availableOfficers < this.officersPerPatrol) continue;

            // Check for visitors within patrol radius
            const nearbyVisitors = this.findNearbyVisitors(station.x, station.y, crowds);

            if (nearbyVisitors.length > 0 && !station.patrolActive) {
                this.sendPatrol(station, nearbyVisitors[0]);
            }
        }
    }

    /**
     * Find visitors (crowds) within radius of a position
     */
    findNearbyVisitors(x, y, crowds) {
        const nearby = [];

        for (const crowd of crowds) {
            const dx = crowd.x - x;
            const dy = crowd.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.patrolRadius) {
                nearby.push({ crowd, dist });
            }
        }

        // Sort by distance
        nearby.sort((a, b) => a.dist - b.dist);
        return nearby.map(n => n.crowd);
    }

    /**
     * Send a patrol from a station to intercept visitors
     */
    sendPatrol(station, targetCrowd) {
        if (station.availableOfficers < this.officersPerPatrol) return;

        station.availableOfficers -= this.officersPerPatrol;
        station.patrolActive = true;

        // Create patrol group
        const patrol = {
            stationKey: `${station.x},${station.y}`,
            station: station,
            officers: [],
            targetCrowd: targetCrowd,
            state: 'pursuing',  // pursuing, returning
            capturedCount: 0
        };

        // Spawn officers at station
        for (let i = 0; i < this.officersPerPatrol; i++) {
            const officer = {
                x: station.x + 1 + (i % 2) * 0.5,
                y: station.y + 2 + Math.floor(i / 2) * 0.3,
                patrol: patrol,
                state: 'pursuing',  // pursuing, capturing, returning
                capturedVisitors: 0
            };
            patrol.officers.push(officer);
            this.officers.push(officer);
        }

        this.patrols.push(patrol);
        // console.log(`[POLICE] Patrol dispatched from (${station.x}, ${station.y}) with ${this.officersPerPatrol} officers`);
    }

    /**
     * Update officer positions and actions
     */
    updateOfficers() {
        for (const officer of this.officers) {
            if (officer.state === 'pursuing') {
                this.moveOfficerToTarget(officer);
            } else if (officer.state === 'returning') {
                this.moveOfficerToStation(officer);
            }
        }
    }

    /**
     * Move officer towards target crowd
     */
    moveOfficerToTarget(officer) {
        const patrol = officer.patrol;
        if (!patrol.targetCrowd) {
            officer.state = 'returning';
            return;
        }

        const dx = patrol.targetCrowd.x - officer.x;
        const dy = patrol.targetCrowd.y - officer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.captureRadius) {
            // Capture visitors from crowd
            this.captureVisitors(officer, patrol);
        } else {
            // Move towards target
            officer.x += (dx / dist) * this.officerSpeed;
            officer.y += (dy / dist) * this.officerSpeed;
        }
    }

    /**
     * Capture visitors from a crowd
     */
    captureVisitors(officer, patrol) {
        const crowd = patrol.targetCrowd;
        if (!crowd || crowd.count <= 0) {
            officer.state = 'returning';
            return;
        }

        // Each officer captures up to 2 visitors per capture action
        const toCapture = Math.min(2, crowd.count);
        crowd.count -= toCapture;
        officer.capturedVisitors += toCapture;
        patrol.capturedCount += toCapture;

        // Update game visitors count
        if (this.game.visitors) {
            this.game.visitors = Math.max(0, this.game.visitors - toCapture);
        }

        console.log(`[POLICE] Officer captured ${toCapture} visitors. Crowd remaining: ${crowd.count}`);

        // If crowd is empty or officer has enough, return to station
        if (crowd.count <= 0 || officer.capturedVisitors >= 10) {
            officer.state = 'returning';

            // Remove empty crowd from immigration system
            if (crowd.count <= 0 && this.game.immigrationSystem) {
                const idx = this.game.immigrationSystem.crowds.indexOf(crowd);
                if (idx >= 0) {
                    this.game.immigrationSystem.crowds.splice(idx, 1);
                }
            }
        }
    }

    /**
     * Move officer back to station
     */
    moveOfficerToStation(officer) {
        const station = officer.patrol.station;
        const dx = station.x + 1 - officer.x;
        const dy = station.y + 1 - officer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.5) {
            // Arrived at station - deposit captured visitors
            station.heldVisitors += officer.capturedVisitors;
            station.heldVisitors = Math.min(station.heldVisitors, this.maxHeldPerStation);

            console.log(`[POLICE] Officer returned with ${officer.capturedVisitors} visitors. Station now holds: ${station.heldVisitors}`);

            // Remove officer from active list
            const idx = this.officers.indexOf(officer);
            if (idx >= 0) this.officers.splice(idx, 1);

            // Check if patrol is complete
            const patrolIdx = officer.patrol.officers.indexOf(officer);
            if (patrolIdx >= 0) officer.patrol.officers.splice(patrolIdx, 1);

            if (officer.patrol.officers.length === 0) {
                // All officers returned
                this.completePatrol(officer.patrol);
            }

            // Return officer to available pool
            station.availableOfficers++;
        } else {
            // Move towards station
            officer.x += (dx / dist) * this.officerSpeed;
            officer.y += (dy / dist) * this.officerSpeed;
        }
    }

    /**
     * Complete a patrol and clean up
     */
    completePatrol(patrol) {
        patrol.station.patrolActive = false;

        const idx = this.patrols.indexOf(patrol);
        if (idx >= 0) this.patrols.splice(idx, 1);

        // console.log(`[POLICE] Patrol complete. Total captured: ${patrol.capturedCount}`);
    }

    /**
     * Update patrol states
     */
    updatePatrols() {
        for (const patrol of this.patrols) {
            // Check if target crowd still exists
            if (patrol.targetCrowd && patrol.targetCrowd.count <= 0) {
                // Target depleted, all officers should return
                for (const officer of patrol.officers) {
                    if (officer.state === 'pursuing') {
                        officer.state = 'returning';
                    }
                }
            }
        }
    }

    /**
     * Render police officers and patrol indicators
     */
    render(ctx, offsetX, offsetY, tileSize) {
        // Render officers
        ctx.font = `${Math.max(10, tileSize * 0.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const officer of this.officers) {
            const screenX = officer.x * tileSize + offsetX;
            const screenY = officer.y * tileSize + offsetY;

            // Officer icon
            ctx.fillText('👮', screenX, screenY);

            // Show captured count if any
            if (officer.capturedVisitors > 0) {
                ctx.font = `${Math.max(8, tileSize * 0.25)}px Arial`;
                ctx.fillStyle = '#FF0000';
                ctx.fillText(`+${officer.capturedVisitors}`, screenX + tileSize * 0.3, screenY - tileSize * 0.2);
                ctx.font = `${Math.max(10, tileSize * 0.4)}px Arial`;
            }
        }

        // Render held count on stations
        for (const [key, station] of this.stations) {
            if (station.heldVisitors > 0) {
                const screenX = (station.x + 1.5) * tileSize + offsetX;
                const screenY = station.y * tileSize + offsetY - 5;

                // Background badge
                ctx.fillStyle = station.heldVisitors >= this.maxHeldPerStation ? '#FF0000' : '#FF6600';
                const badgeWidth = tileSize * 0.8;
                const badgeHeight = tileSize * 0.4;
                ctx.beginPath();
                ctx.roundRect(screenX - badgeWidth/2, screenY - badgeHeight/2, badgeWidth, badgeHeight, 5);
                ctx.fill();

                // Text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `bold ${Math.max(10, tileSize * 0.3)}px Arial`;
                ctx.fillText(`🔒${station.heldVisitors}`, screenX, screenY);
            }
        }
    }

    /**
     * Get statistics for UI display
     */
    getStats() {
        let totalHeld = 0;
        let activeStations = 0;
        let totalOfficers = 0;
        let availableOfficers = 0;

        for (const station of this.stations.values()) {
            if (station.isActive) {
                activeStations++;
                totalOfficers += station.totalOfficers;
                availableOfficers += station.availableOfficers;
            }
            totalHeld += station.heldVisitors;
        }

        return {
            activeStations,
            totalHeld,
            totalOfficers,
            availableOfficers,
            activePatrols: this.patrols.length
        };
    }
}
