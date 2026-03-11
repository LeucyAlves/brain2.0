import * as THREE from 'three';
import { CharacterController } from '../CharacterController';

const PLAYER_INDEX = 0;

/**
 * PlayerInputDriver — translates user input into CharacterController actions.
 */
export class PlayerInputDriver {
    public readonly agentIndex = PLAYER_INDEX;
    private lastPositions: Float32Array | null = null;

    constructor(private readonly controller: CharacterController) { }

    public onFloorClick(x: number, z: number): void {
        const target = new THREE.Vector3(x, 0, z);
        const from = this._getCurrentPos();
        this.controller.moveTo(PLAYER_INDEX, target, 'idle', undefined, from);
    }

    public onPoiClick(id: string): void {
        const from = this._getCurrentPos();
        this.controller.walkToPoi(PLAYER_INDEX, id, undefined, from);
    }

    public walkTo(
        target: THREE.Vector3,
        arrivalState: any = 'idle',
        onArrival?: (index: number) => void,
    ): void {
        const from = this._getCurrentPos();
        this.controller.moveTo(PLAYER_INDEX, target, arrivalState, onArrival, from);
    }

    private _getCurrentPos(): THREE.Vector3 | undefined {
        if (!this.lastPositions) return undefined;
        return new THREE.Vector3(
            this.lastPositions[this.agentIndex * 4],
            this.lastPositions[this.agentIndex * 4 + 1],
            this.lastPositions[this.agentIndex * 4 + 2]
        );
    }

    public cancelMovement(): void {
        this.controller.cancelMovement(PLAYER_INDEX);
    }

    public update(positions: Float32Array, _delta: number): void {
        this.lastPositions = positions;
    }

    public dispose(): void { }
}
