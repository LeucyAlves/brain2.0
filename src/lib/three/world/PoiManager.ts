import * as THREE from 'three';
import { CharacterStateKey, PoiDef } from '@/lib/three/types';

/**
 * Manages Points of Interest (POIs) in the world.
 */
export class PoiManager {
    private pois = new Map<string, PoiDef>();

    public addPoi(def: PoiDef): void {
        this.pois.set(def.id, { ...def });
    }

    public removePoi(id: string): void {
        this.pois.delete(id);
    }

    public occupy(id: string, agentIndex: number): void {
        const poi = this.pois.get(id);
        if (poi) poi.occupiedBy = agentIndex;
    }

    public release(id: string): void {
        const poi = this.pois.get(id);
        if (poi) poi.occupiedBy = null;
    }

    public releaseAll(agentIndex: number): void {
        for (const poi of this.pois.values()) {
            if (poi.occupiedBy === agentIndex) poi.occupiedBy = null;
        }
    }

    public getPoi(id: string): PoiDef | undefined {
        return this.pois.get(id);
    }

    public getFreePois(arrivalState: CharacterStateKey, agentIndex?: number): PoiDef[] {
        return Array.from(this.pois.values()).filter(
            p => p.arrivalState === arrivalState && (p.occupiedBy === null || p.occupiedBy === agentIndex)
        );
    }

    public getFreePoisByPrefix(prefix: string, agentIndex?: number): PoiDef[] {
        return Array.from(this.pois.values()).filter(
            p => p.id.includes(prefix) && (p.occupiedBy === null || p.occupiedBy === agentIndex)
        );
    }

    public getRandomFreePoi(prefix?: string): PoiDef | null {
        const candidates = prefix
            ? this.getFreePoisByPrefix(prefix)
            : Array.from(this.pois.values()).filter(p => p.occupiedBy === null);

        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    public getNearestFreePoi(arrivalState: CharacterStateKey, from: THREE.Vector3): PoiDef | null {
        const candidates = this.getFreePois(arrivalState);
        if (candidates.length === 0) return null;

        let nearest: PoiDef | null = null;
        let nearestDist2 = Infinity;

        for (const poi of candidates) {
            const dx = poi.position.x - from.x;
            const dz = poi.position.z - from.z;
            const d2 = dx * dx + dz * dz;
            if (d2 < nearestDist2) {
                nearestDist2 = d2;
                nearest = poi;
            }
        }
        return nearest;
    }

    public loadFromGlb(scene: THREE.Object3D): void {
        scene.traverse((child) => {
            const match = child.name.match(/^poi-([a-z0-9_]+)-(.+)$/);
            if (!match) return;

            const type = match[1];
            const uniqueId = match[2];

            let arrivalState: CharacterStateKey = 'idle';
            let label: string | undefined = undefined;

            if (type !== 'spawn' && type !== 'area') {
                arrivalState = type as CharacterStateKey;
                if (arrivalState === 'sit_idle') {
                    label = 'Sit down';
                }
            }

            const id = `${type}-${uniqueId}`;

            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            child.getWorldPosition(worldPos);
            child.getWorldQuaternion(worldQuat);

            this.addPoi({ id, position: worldPos, quaternion: worldQuat, arrivalState, occupiedBy: null, label });
        });
    }

    public getAllPois(): PoiDef[] {
        return Array.from(this.pois.values());
    }

    public getPoisByPrefix(prefix: string): PoiDef[] {
        return Array.from(this.pois.values())
            .filter(p => p.id.includes(prefix))
            .sort((a, b) => a.id.localeCompare(b.id));
    }
}
