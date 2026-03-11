import * as THREE from 'three';
import { AgentBehavior } from '@/lib/three/types';

/**
 * CPU/GPU buffer for per-instance physics mode and animation state.
 * Fixed for standard Three.js (not using webgpu specific imports yet if not available).
 */
export class AgentStateBuffer {
    public readonly array: Float32Array;
    public readonly attribute: THREE.InstancedBufferAttribute;

    constructor(private readonly count: number) {
        this.array = new Float32Array(count * 8);
        // Initialize alpha to 1.0 (opaque)
        for (let i = 0; i < count; i++) {
            this.array[i * 8 + 6] = 1.0;
        }
        this.attribute = new THREE.InstancedBufferAttribute(this.array, 8);
    }

    public getState(index: number): number {
        return this.array[index * 8 + 3];
    }

    public setState(index: number, state: number): void {
        this.array[index * 8 + 3] = state;
        this.attribute.needsUpdate = true;
    }

    public getAnimation(index: number): number {
        return this.array[index * 8 + 1];
    }

    public setAnimation(index: number, animIndex: number, loop: boolean = true, startTime: number = 0): void {
        this.array[index * 8 + 1] = animIndex;
        this.array[index * 8 + 4] = startTime;
        this.array[index * 8 + 5] = loop ? 1.0 : 0.0;
        this.attribute.needsUpdate = true;
    }

    public setAlpha(index: number, alpha: number): void {
        this.array[index * 8 + 6] = alpha;
        this.attribute.needsUpdate = true;
    }

    public getAlpha(index: number): number {
        return this.array[index * 8 + 6];
    }

    public setWaypoint(index: number, x: number, z: number): void {
        this.array[index * 8 + 0] = x;
        this.array[index * 8 + 2] = z;
        this.attribute.needsUpdate = true;
    }

    public setFacing(index: number, x: number, z: number): void {
        this.array[index * 8 + 0] = x;
        this.array[index * 8 + 2] = z;
        this.attribute.needsUpdate = true;
    }

    public getWaypoint(index: number): { x: number; z: number } {
        return {
            x: this.array[index * 8 + 0],
            z: this.array[index * 8 + 2],
        };
    }

    public resetAllNPCsToState(state: AgentBehavior, startIndex = 1): void {
        for (let i = startIndex; i < this.count; i++) {
            this.array[i * 8 + 3] = state;
        }
        this.attribute.needsUpdate = true;
    }
}
