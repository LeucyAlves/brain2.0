import { CharacterController } from '../CharacterController';
import { PlayerInputDriver } from './PlayerInputDriver';
import { NpcAgentDriver } from './NpcAgentDriver';

const PLAYER_INDEX = 0;

/**
 * DriverManager — registers and orchestrates all agent drivers.
 */
export class DriverManager {
    private drivers = new Map<number, any>();
    private playerDriver: PlayerInputDriver | null = null;

    constructor(private readonly controller: CharacterController) { }

    public registerPlayer(): PlayerInputDriver {
        const driver = new PlayerInputDriver(this.controller);
        this.drivers.set(PLAYER_INDEX, driver);
        this.playerDriver = driver;
        return driver;
    }

    public registerNpc(agentIndex: number, data: any): NpcAgentDriver {
        const driver = new NpcAgentDriver(agentIndex, this.controller, data);
        this.drivers.set(agentIndex, driver);
        return driver;
    }

    public unregister(agentIndex: number): void {
        this.drivers.get(agentIndex)?.dispose();
        this.drivers.delete(agentIndex);
    }

    public getPlayerDriver(): PlayerInputDriver | null {
        return this.playerDriver;
    }

    public update(positions: Float32Array, delta: number): void {
        for (const driver of this.drivers.values()) {
            driver.update(positions, delta);
        }
    }

    public dispose(): void {
        for (const driver of this.drivers.values()) {
            driver.dispose();
        }
        this.drivers.clear();
    }
}
