import * as THREE from 'three';
import { CharacterController } from '../CharacterController';
import { AgentBehavior } from '@/lib/three/types';

/**
 * NpcAgentDriver — drives a single NPC autonomously.
 * Simplified for Brain 2.0 (no external store dependency yet).
 */
export class NpcAgentDriver {
    public readonly agentIndex: number;
    private behaviorTimer: number = Math.random() * 5 + 2;
    private wasBusy: boolean = false;

    constructor(
        agentIndex: number,
        protected readonly controller: CharacterController,
        protected readonly data: any,
    ) {
        this.agentIndex = agentIndex;
    }

    public kick(): void {
        this.behaviorTimer = 0;
    }

    public update(positions: Float32Array, delta: number): void {
        const currentState = this.controller.getState(this.agentIndex);

        // Suspend autonomous behaviors if the character is busy or chatting
        // (In Brain 2.0, we'll manage this through CharacterController's state)

        if (currentState === 'idle' || currentState === 'sit_idle' || currentState === 'look_around') {
            this.behaviorTimer -= delta;

            if (this.behaviorTimer <= 0) {
                this._decideNextAction(positions, currentState);
            }
        }
    }

    private _decideNextAction(positions: Float32Array, currentState: string): void {
        const rand = Math.random();
        const isSeated = currentState === 'sit_idle';

        if (isSeated) {
            if (rand < 0.1) {
                this.controller.play(this.agentIndex, 'sit_idle');
                this.behaviorTimer = Math.random() * 15 + 15;
                return;
            }
        }

        const currentPos = new THREE.Vector3(
            positions[this.agentIndex * 4],
            0,
            positions[this.agentIndex * 4 + 2]
        );

        if (!isSeated && rand < 0.3) {
            const pois = this.controller.poiManager.getFreePois('sit_idle', this.agentIndex);
            if (pois.length > 0) {
                const poi = pois[Math.floor(Math.random() * pois.length)];
                this.controller.walkToPoi(this.agentIndex, poi.id, undefined, currentPos);
                this.behaviorTimer = Math.random() * 15 + 15;
                return;
            }
        }

        if (rand < 0.6) {
            const areaPois = this.controller.poiManager.getFreePoisByPrefix('area-', this.agentIndex);
            if (areaPois.length > 0) {
                const areaPoi = areaPois[Math.floor(Math.random() * areaPois.length)];
                const target = areaPoi.position;
                if (this.controller.moveTo(this.agentIndex, target, 'look_around', undefined, currentPos, areaPoi.quaternion)) {
                    this.behaviorTimer = Math.random() * 5 + 10;
                    return;
                }
            }
        }

        if (!isSeated) {
            const expressions: ('look_around' | 'wave' | 'happy')[] = ['look_around', 'wave', 'happy'];
            const randomAnim = expressions[Math.floor(Math.random() * expressions.length)];
            this.controller.play(this.agentIndex, randomAnim);
            this.behaviorTimer = Math.random() * 5 + 5;
        } else {
            this.behaviorTimer = 5;
        }
    }

    public dispose(): void { }
}
