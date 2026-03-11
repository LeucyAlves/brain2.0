import { AnimationName, CharacterStateDef, CharacterStateKey, ICharacterDriver } from '@/lib/three/types';

export const STATE_MAP: Record<CharacterStateKey, CharacterStateDef> = {
    idle: { animation: AnimationName.IDLE, expression: 'idle', loop: true, interruptible: true },
    walk: { animation: AnimationName.WALK, loop: true, interruptible: true },
    talk: { animation: AnimationName.TALK, expression: 'neutral', loop: true, interruptible: true },
    listen: { animation: AnimationName.LISTEN, expression: 'listening', loop: true, interruptible: true },
    sit_down: { animation: AnimationName.SIT_DOWN, loop: false, nextState: 'sit_idle', interruptible: false },
    sit_idle: { animation: AnimationName.SIT_IDLE, expression: 'idle', loop: true, interruptible: true },
    sit_work: { animation: AnimationName.SIT_WORK, expression: 'idle', loop: true, interruptible: true },
    look_around: { animation: AnimationName.LOOK_AROUND, expression: 'surprised', loop: false, nextState: 'idle', interruptible: true },
    happy: { animation: AnimationName.HAPPY, expression: 'happy', loop: false, nextState: 'idle', interruptible: true },
    sad: { animation: AnimationName.SAD, expression: 'sad', loop: false, nextState: 'idle', interruptible: true },
    pick: { animation: AnimationName.PICK, loop: false, nextState: 'idle', interruptible: false },
    wave: { animation: AnimationName.WAVE, loop: false, nextState: 'idle', interruptible: true },
    wave_loop: { animation: AnimationName.WAVE, loop: true, interruptible: true },
    happy_loop: { animation: AnimationName.HAPPY, expression: 'happy', loop: true, interruptible: true },
};

export class CharacterStateMachine {
    private currentState: CharacterStateKey[] = [];
    private stateTimer: number[] = [];
    private sitTarget: (CharacterStateKey | null)[] = [];

    constructor(private readonly count: number) {
        for (let i = 0; i < count; i++) {
            this.currentState[i] = 'idle';
            this.stateTimer[i] = 0;
            this.sitTarget[i] = null;
        }
    }

    public prepareSitDown(index: number, finalState: 'sit_idle' | 'sit_work'): void {
        this.sitTarget[index] = finalState;
    }

    public transition(index: number, newState: CharacterStateKey, driver: ICharacterDriver): void {
        const currentDef = STATE_MAP[this.currentState[index]];
        if (!currentDef.interruptible && this.stateTimer[index] > 0) {
            if (newState !== 'walk') return;
        }
        this._applyState(index, newState, driver);
    }

    public getState(index: number): CharacterStateKey {
        return this.currentState[index];
    }

    public update(delta: number, driver: ICharacterDriver): void {
        for (let i = 0; i < this.count; i++) {
            const def = STATE_MAP[this.currentState[i]];
            if (def.loop) continue;

            this.stateTimer[i] -= delta;
            if (this.stateTimer[i] <= 0) {
                const isSitDown = this.currentState[i] === 'sit_down';
                const next = (isSitDown ? this.sitTarget[i] : null) ?? def.nextState ?? 'idle';
                if (isSitDown) this.sitTarget[i] = null;
                this._applyState(i, next, driver);
            }
        }
    }

    private _applyState(index: number, key: CharacterStateKey, driver: ICharacterDriver): void {
        const def = STATE_MAP[key];
        if (!def) return;

        this.currentState[index] = key;
        driver.setAnimation(index, def.animation, def.loop);

        if (def.expression !== undefined) {
            driver.setExpression(index, def.expression);
        }

        if (!def.loop) {
            const duration = def.durationOverride ?? driver.getAnimationDuration(def.animation);
            this.stateTimer[index] = duration > 0 ? duration : 1.0;
        }
    }
}
