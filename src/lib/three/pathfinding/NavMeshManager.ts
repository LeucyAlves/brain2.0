import * as THREE from 'three';
import { Pathfinding } from 'three-pathfinding';
import { NAVMESH_ZONE } from '../constants';

/**
 * Manages the navigation mesh used for path queries.
 */
export class NavMeshManager {
    private pf = new Pathfinding();
    private ready = false;

    public loadFromGeometry(geometry: THREE.BufferGeometry): void {
        const zone = Pathfinding.createZone(geometry);
        this.pf.setZoneData(NAVMESH_ZONE, zone);
        this.ready = true;
    }

    public findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
        if (!this.ready) return [];

        const groupID = this.pf.getGroup(NAVMESH_ZONE, from);
        if (groupID === null) return [];

        const path = this.pf.findPath(from, to, NAVMESH_ZONE, groupID) as THREE.Vector3[];
        if (!path || path.length === 0) {
            return [];
        }
        return path;
    }

    public isReady(): boolean {
        return this.ready;
    }

    public isPointOnNavMesh(point: THREE.Vector3): boolean {
        if (!this.ready) return false;
        return this.pf.getGroup(NAVMESH_ZONE, point) !== null;
    }
}
