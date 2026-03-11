import type * as THREE from 'three';

export enum AnimationName {
    IDLE = 'Idle',
    WALK = 'Walk',
    TALK = 'Talk',
    LISTEN = 'Listen',
    SIT_DOWN = 'Sit',      // one-shot sit-down entry animation
    SIT_IDLE = 'Sit_Idle', // loop: seated idle
    SIT_WORK = 'Sit_Work', // loop: seated working
    LOOK_AROUND = 'LookAround',
    HAPPY = 'Happy',
    SAD = 'Sad',
    PICK = 'Pick',
    WAVE = 'Wave'
}

/** Stored as a float in the GPU agent buffer (.w component). */
export enum AgentBehavior {
    IDLE = 0, // position locked, velocity zero, facing follows waypoint field (if non-zero)
    GOTO = 1, // moves toward target waypoint (.x/.z of agent buffer)
    SEATED = 2, // position locked, velocity zero — character is seated, treated like IDLE on GPU
}

export type CharacterStateKey =
    | 'idle'
    | 'walk'
    | 'talk'
    | 'listen'
    | 'sit_down'   // one-shot entry animation; auto-transitions to sit_idle
    | 'sit_idle'   // looping: seated at rest
    | 'sit_work'   // looping: seated working
    | 'look_around'
    | 'happy'
    | 'happy_loop' // looping version of happy, no auto-transition
    | 'sad'
    | 'pick'
    | 'wave'
    | 'wave_loop'; // looping version of wave, no auto-transition

export interface CharacterStateDef {
    animation: AnimationName;
    expression?: ExpressionKey;
    loop: boolean;
    durationOverride?: number;
    nextState?: CharacterStateKey;
    interruptible: boolean;
}

export interface PoiDef {
    id: string;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    arrivalState: CharacterStateKey;
    occupiedBy: number | null;
    label?: string;
}

export interface ICharacterDriver {
    setPhysicsMode(index: number, mode: AgentBehavior): void;
    setAnimation(index: number, name: AnimationName, loop?: boolean): void;
    setExpression(index: number, key: ExpressionKey): void;
    setSpeaking(index: number, isSpeaking: boolean): void;
    getAgentState(index: number): AgentBehavior;
    getAnimationDuration(name: AnimationName): number;
    getCPUPositions(): Float32Array | null;
}

export type ExpressionKey = 'idle' | 'listening' | 'neutral' | 'surprised' | 'happy' | 'sick' | 'wink' | 'doubtful' | 'sad';

export interface AtlasCoords {
    col: number;
    row: number;
}

export interface ExpressionConfig {
    eyes: AtlasCoords;
    mouth: AtlasCoords;
}
