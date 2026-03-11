import * as THREE from 'three';
import { Engine } from './core/Engine';
import { Stage } from './core/Stage';
import { CharacterManager } from './entities/CharacterManager';
import { CharacterController } from './CharacterController';
import { NavMeshManager } from './pathfinding/NavMeshManager';
import { PoiManager } from './world/PoiManager';
import { WorldManager } from './world/WorldManager';
import { DriverManager } from './drivers/DriverManager';
import { InputManager } from './input/InputManager';
import { AgentBehavior } from './types';
import { NPC_COUNT } from './constants';

/**
 * SceneManager — root orchestrator for the 3D environment.
 * Adapted for Brain 2.0.
 */
export class SceneManager {
    private engine: Engine;
    private stage: Stage;
    private characterManager: CharacterManager;
    private controller: CharacterController | null = null;
    private navMesh: NavMeshManager;
    private poiManager: PoiManager;
    private worldManager: WorldManager;
    private driverManager: DriverManager | null = null;
    private inputManager: InputManager | null = null;

    private container: HTMLElement;
    private resizeObserver: ResizeObserver;
    private isDisposed = false;
    private clock = new THREE.Clock();

    constructor(container: HTMLElement) {
        this.container = container;
        this.engine = new Engine(container);
        this.stage = new Stage(this.engine.renderer.domElement);
        this.characterManager = new CharacterManager(this.stage.scene);
        this.navMesh = new NavMeshManager();
        this.poiManager = new PoiManager();
        this.characterManager.setPoiManager(this.poiManager);
        this.worldManager = new WorldManager(this.stage.scene, this.navMesh, this.poiManager);

        this.resizeObserver = new ResizeObserver(() => this.onResize());
        this.resizeObserver.observe(container);

        this.init();
    }

    private async init() {
        await this.worldManager.load();
        await this.characterManager.load();
        if (this.isDisposed) return;

        this.controller = new CharacterController(
            this.characterManager,
            this.navMesh,
            this.poiManager,
        );

        this.driverManager = new DriverManager(this.controller);
        this.driverManager.registerPlayer();

        // Register some NPCs for demonstration
        for (let i = 1; i <= NPC_COUNT; i++) {
            this.driverManager.registerNpc(i, { id: `npc-${i}` });
        }

        this.inputManager = new InputManager(
            this.engine.renderer.domElement,
            this.stage.camera,
            () => this.controller!.getCPUPositions(),
            () => this.controller!.getCount(),
            (index) => console.log('Selected agent:', index),
            (x, z) => this.driverManager?.getPlayerDriver()?.onFloorClick(x, z),
            (index, pos) => { }, // Hover HUD skipped for now
            () => this.poiManager.getAllPois(),
            (id, label, pos) => { },
            (id) => this.driverManager?.getPlayerDriver()?.onPoiClick(id),
            this.worldManager.getOffice() ?? undefined,
            (point) => this.navMesh.isPointOnNavMesh(point),
        );

        this.engine.renderer.setAnimationLoop(this.animate.bind(this));
    }

    private onResize() {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w === 0 || h === 0) return;
        this.stage.onResize(w, h);
        this.engine.onResize(w, h);
    }

    private animate() {
        if (this.isDisposed) return;
        const delta = this.clock.getDelta();

        this.stage.update();
        this.controller?.update(delta, this.engine.renderer);

        // Standard CPU simulation path
        const positions = this.controller?.getCPUPositions();
        if (positions) {
            this.controller?.updatePaths(positions);
            this.driverManager?.update(positions, delta);
        }

        // Camera follow player
        const playerPos = this.controller?.getCPUPosition(0);
        if (playerPos) {
            this.stage.setFollowTarget(playerPos);
        }

        this.engine.render(this.stage.scene, this.stage.camera);
    }

    public dispose() {
        this.isDisposed = true;
        this.engine.renderer.setAnimationLoop(null);
        this.resizeObserver.disconnect();
        this.inputManager?.dispose();
        this.driverManager?.dispose();
        this.engine.dispose();
    }
}
