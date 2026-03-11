import * as THREE from 'three';
import { AgentBehavior, AnimationName, CharacterStateKey, ExpressionKey, ICharacterDriver } from '@/lib/three/types';
import { CharacterManager } from './entities/CharacterManager';
import { CharacterStateMachine } from './behavior/CharacterStateMachine';
import { AgentStateBuffer } from './behavior/AgentStateBuffer';
import { PathAgent } from './pathfinding/PathAgent';
import { NavMeshManager } from './pathfinding/NavMeshManager';
import { PoiManager } from './world/PoiManager';

/**
 * High-level API for controlling agents.
 */
export class CharacterController implements ICharacterDriver {
    private stateMachine: CharacterStateMachine;
    private pathAgents: PathAgent[] = [];
    private arrivalCallbacks: ((index: number) => void)[] = [];

    constructor(
        public readonly characterManager: CharacterManager,
        private readonly navMesh: NavMeshManager,
        public readonly poiManager: PoiManager,
    ) {
        const count = characterManager.getCount();
        this.stateMachine = new CharacterStateMachine(count);

        const stateBuffer = characterManager.getAgentStateBuffer()!;
        for (let i = 0; i < count; i++) {
            this.pathAgents.push(new PathAgent(i, stateBuffer));
        }
    }

    public play(index: number, state: CharacterStateKey): void {
        const currentState = this.stateMachine.getState(index);
        const isCurrentlySeated = currentState === 'sit_idle' || currentState === 'sit_work' || currentState === 'sit_down';
        const isNewStateSeated = state === 'sit_idle' || state === 'sit_work' || state === 'sit_down';

        if (isCurrentlySeated && !isNewStateSeated) {
            this.poiManager.releaseAll(index);
        }

        this.stateMachine.transition(index, state, this);
    }

    public moveTo(
        index: number,
        target: THREE.Vector3,
        arrivalState: CharacterStateKey = 'idle',
        onArrival?: (index: number) => void,
        fromPosition?: THREE.Vector3,
        targetOrientation?: THREE.Quaternion,
    ): boolean {
        let from: THREE.Vector3;

        if (fromPosition) {
            from = fromPosition.clone();
        } else {
            const positions = this.characterManager.getCPUPositions();
            if (!positions) return false;

            from = new THREE.Vector3(
                positions[index * 4],
                positions[index * 4 + 1],
                positions[index * 4 + 2],
            );
        }

        const path = this.navMesh.findPath(from, target);
        if (path.length === 0) return false;

        path[path.length - 1] = target.clone();

        this.pathAgents[index].setPath(path, from);
        this.arrivalCallbacks[index] = (i) => {
            if (targetOrientation) {
                this.characterManager.setOrientation(i, targetOrientation);
            }
            this.play(i, arrivalState);
            onArrival?.(i);
        };

        this.setPhysicsMode(index, AgentBehavior.GOTO);
        this.play(index, 'walk');

        return true;
    }

    public walkToPoi(
        index: number,
        poiId: string,
        onArrival?: (index: number) => void,
        fromPosition?: THREE.Vector3,
    ): boolean {
        const poi = this.poiManager.getPoi(poiId);
        if (!poi || (poi.occupiedBy !== null && poi.occupiedBy !== index)) return false;

        const targetState = poi.arrivalState;
        const isSitVariant = targetState === 'sit_idle' || targetState === 'sit_work';

        if (isSitVariant) {
            this.stateMachine.prepareSitDown(index, targetState as 'sit_idle' | 'sit_work');
        }

        const moved = this.moveTo(index, poi.position, 'idle', (i) => {
            this.characterManager.setPosition(i, poi.position);
            if (!poi.id.startsWith('area')) {
                this.characterManager.setOrientation(i, poi.quaternion);
            }

            if (isSitVariant) {
                this.setPhysicsMode(i, AgentBehavior.SEATED);
                this.play(i, 'sit_down');
            } else {
                this.play(i, targetState);
            }

            onArrival?.(i);
        }, fromPosition);

        if (!moved) return false;

        this.poiManager.releaseAll(index);
        this.poiManager.occupy(poiId, index);
        return true;
    }

    public setSpeaking(index: number, isSpeaking: boolean): void {
        this.characterManager.setSpeaking(index, isSpeaking);
    }

    public getState(index: number): CharacterStateKey {
        return this.stateMachine.getState(index);
    }

    public update(delta: number, renderer: any): void {
        this.characterManager.update(delta, renderer);
        this.stateMachine.update(delta, this);
    }

    public async syncFromGPU(renderer: any): Promise<Float32Array | null> {
        return this.characterManager.syncFromGPU(renderer);
    }

    public updatePaths(positions: Float32Array): void {
        for (let i = 0; i < this.pathAgents.length; i++) {
            if (!this.pathAgents[i].isMoving) continue;
            const currentPos = new THREE.Vector3(positions[i * 4], 0, positions[i * 4 + 2]);
            const arrived = this.pathAgents[i].update(currentPos);
            if (arrived) {
                const lastDir = this.pathAgents[i].getLastDirection();
                this.characterManager.setFacing(i, lastDir.x, lastDir.z);
                this.setPhysicsMode(i, AgentBehavior.IDLE);
                this.arrivalCallbacks[i]?.(i);
            }
        }
    }

    public cancelMovement(index: number): void {
        this.pathAgents[index].cancel();
        this.setPhysicsMode(index, AgentBehavior.IDLE);
    }

    public warpAllToSpawn(playerIndex: number, npcIndices: number[]): void {
        this.poiManager.releaseAll(playerIndex);
        npcIndices.forEach(i => this.poiManager.releaseAll(i));
        this.cancelMovement(playerIndex);
        npcIndices.forEach(i => this.cancelMovement(i));

        this.characterManager.setPosition(playerIndex, new THREE.Vector3(0, 0, 0));
        this.play(playerIndex, 'idle');

        const spawnPois = this.poiManager.getPoisByPrefix('spawn');
        npcIndices.forEach((agentIndex, order) => {
            const poi = spawnPois[order % spawnPois.length];
            if (poi) {
                this.characterManager.setPosition(agentIndex, poi.position);
                this.characterManager.setOrientation(agentIndex, poi.quaternion);
                this.poiManager.occupy(poi.id, agentIndex);
            }
            this.play(agentIndex, 'idle');
        });
    }

    public getCPUPositions(): Float32Array | null {
        return this.characterManager.getCPUPositions();
    }

    public getCPUPosition(index: number): THREE.Vector3 | null {
        return this.characterManager.getCPUPosition(index);
    }

    public getCount(): number {
        return this.characterManager.getCount();
    }

    public getAgentStateBuffer(): AgentStateBuffer | null {
        return this.characterManager.getAgentStateBuffer();
    }

    public setColors(colors: string[]): void {
        this.characterManager.setColors(colors);
        this.setInstanceCount(colors.length);
    }

    public setInstanceCount(count: number): void {
        this.characterManager.setInstanceCount(count);
        const newCount = this.characterManager.getCount();
        const stateBuffer = this.characterManager.getAgentStateBuffer()!;
        this.pathAgents = [];
        for (let i = 0; i < newCount; i++) {
            this.pathAgents.push(new PathAgent(i, stateBuffer));
        }
        this.stateMachine = new CharacterStateMachine(newCount);
    }

    public get isLoaded(): boolean {
        return this.characterManager.isLoaded;
    }

    public setPhysicsMode(index: number, mode: AgentBehavior): void {
        this.characterManager.setPhysicsMode(index, mode);
    }

    public setAnimation(index: number, name: AnimationName, loop: boolean = true): void {
        this.characterManager.setAnimation(index, name, loop);
    }

    public setExpression(index: number, key: ExpressionKey): void {
        this.characterManager.setExpression(index, key);
    }

    public getAgentState(index: number): AgentBehavior {
        return this.characterManager.getAgentState(index);
    }

    public getAnimationDuration(name: AnimationName): number {
        return this.characterManager.getAnimationDuration(name);
    }
}
