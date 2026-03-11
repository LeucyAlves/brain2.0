import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ExpressionKey, AnimationName, AgentBehavior, ICharacterDriver } from '@/lib/three/types';
import { DRACO_LIB_PATH } from '../constants';
import { AgentStateBuffer } from '../behavior/AgentStateBuffer';
import { ExpressionBuffer } from '../behavior/ExpressionBuffer';
import { PoiManager } from '../world/PoiManager';

/**
 * Manages character instances, animation baking, and GPU-side state.
 * Adapted for standard WebGL2Renderer (no TSL).
 */
export class CharacterManager {
    private instanceCount = 1;
    private poiManager: PoiManager | null = null;

    // Buffers (CPU) - in standard Three.js we use InstancedBufferAttribute
    private posAttribute: THREE.InstancedBufferAttribute | null = null;
    private velAttribute: THREE.InstancedBufferAttribute | null = null;
    private colorAttribute: THREE.InstancedBufferAttribute | null = null;

    private agentStateBuffer: AgentStateBuffer | null = null;
    private expressionBuffer: ExpressionBuffer | null = null;

    private debugPosArray: Float32Array | null = null;
    private currentTime = 0;

    private instancedMeshes: THREE.Mesh[] = [];
    private meshData: { name: string; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }[] = [];
    private colors: string[] | null = null;

    private animationsMeta: { [key: string]: { offset: number; numFrames: number; duration: number; index: number } } = {};
    private numBones = 0;

    public isLoaded = false;

    constructor(private scene: THREE.Scene) { }

    public setPoiManager(poiManager: PoiManager) {
        this.poiManager = poiManager;
    }

    public async load() {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(DRACO_LIB_PATH);
        loader.setDRACOLoader(dracoLoader);

        try {
            const gltf = await loader.loadAsync('/models/character.glb');
            const model = gltf.scene;

            const skinnedMeshes: THREE.SkinnedMesh[] = [];
            model.traverse((child) => {
                if ((child as any).isSkinnedMesh) {
                    skinnedMeshes.push(child as THREE.SkinnedMesh);
                }
            });

            if (skinnedMeshes.length === 0) {
                console.warn("CharacterManager: No skinned meshes found.");
                return;
            }

            this.meshData = skinnedMeshes.map(m => ({
                name: m.name,
                geometry: m.geometry,
                material: m.material as THREE.MeshStandardMaterial
            }));

            const firstMesh = skinnedMeshes[0];
            this.numBones = firstMesh.skeleton.bones.length;

            const animations = gltf.animations;
            const animNames = Object.values(AnimationName);

            animNames.forEach((name, i) => {
                let clip = animations.find(a => a.name === name);
                if (!clip) {
                    clip = animations.find(a => a.name === AnimationName.IDLE) || animations[0];
                }

                const duration = clip.duration;
                const numFrames = Math.ceil(duration * 60);

                this.animationsMeta[name] = {
                    offset: 0, // Not using storage buffers for now
                    numFrames,
                    duration,
                    index: i
                };
            });

            this.initInstances();
            this.isLoaded = true;
        } catch (err) {
            console.error("Failed to load character:", err);
        }
    }

    public setInstanceCount(count: number) {
        if (this.instanceCount === count) return;
        this.instanceCount = count;
        if (this.isLoaded) {
            this.cleanupInstances();
            this.initInstances();
        }
    }

    public async syncFromGPU(renderer: any): Promise<Float32Array | null> {
        // In WebGL mode, we update on CPU so we just return the array
        return this.debugPosArray;
    }

    public update(delta: number, renderer: any) {
        this.currentTime += delta;
        if (this.expressionBuffer) {
            this.expressionBuffer.update(delta);
        }

        // Physical update on CPU for standard Three.js compatibility
        if (this.debugPosArray && this.agentStateBuffer && this.posAttribute && this.velAttribute) {
            const agentStorage = this.agentStateBuffer.array;
            const speed = 0.045; // Base speed

            for (let i = 0; i < this.instanceCount; i++) {
                const state = agentStorage[i * 8 + 3]; // w of first vec4
                const wpX = agentStorage[i * 8 + 0];
                const wpZ = agentStorage[i * 8 + 2];

                const px = this.debugPosArray[i * 4 + 0];
                const pz = this.debugPosArray[i * 4 + 2];

                // GOTO = 1
                if (state > 0.5 && state < 1.5) {
                    const dx = wpX - px;
                    const dz = wpZ - pz;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist > 0.1) {
                        const vx = (dx / dist) * speed;
                        const vz = (dz / dist) * speed;
                        this.debugPosArray[i * 4 + 0] += vx;
                        this.debugPosArray[i * 4 + 2] += vz;
                        this.velAttribute.array[i * 4 + 0] = vx;
                        this.velAttribute.array[i * 4 + 2] = vz;
                    } else {
                        this.debugPosArray[i * 4 + 0] = wpX;
                        this.debugPosArray[i * 4 + 2] = wpZ;
                    }
                } else {
                    this.velAttribute.array[i * 4 + 0] = 0;
                    this.velAttribute.array[i * 4 + 2] = 0;
                }
            }
            this.posAttribute.set(this.debugPosArray);
            this.posAttribute.needsUpdate = true;
            this.velAttribute.needsUpdate = true;
        }
    }

    private cleanupInstances() {
        for (const mesh of this.instancedMeshes) {
            this.scene.remove(mesh);
        }
        this.instancedMeshes = [];
        this.expressionBuffer = null;
    }

    private initInstances() {
        if (this.meshData.length === 0) return;

        const posArray = new Float32Array(this.instanceCount * 4);
        const velArray = new Float32Array(this.instanceCount * 4);
        const colorArray = new Float32Array(this.instanceCount * 3);

        const tempColor = new THREE.Color();
        const spawnPois = this.poiManager?.getFreePoisByPrefix('spawn') || [];
        let spawnIndex = 0;

        for (let i = 0; i < this.instanceCount; i++) {
            const poi = spawnPois[spawnIndex % spawnPois.length];
            if (poi) {
                this.poiManager?.occupy(poi.id, i);
                posArray[i * 4 + 0] = poi.position.x;
                posArray[i * 4 + 2] = poi.position.z;
                spawnIndex++;
            }
            posArray[i * 4 + 3] = 1;
            tempColor.set(0x4f46e5);
            colorArray[i * 3 + 0] = tempColor.r;
            colorArray[i * 3 + 1] = tempColor.g;
            colorArray[i * 3 + 2] = tempColor.b;
        }

        this.debugPosArray = new Float32Array(posArray);
        this.posAttribute = new THREE.InstancedBufferAttribute(posArray, 4);
        this.velAttribute = new THREE.InstancedBufferAttribute(velArray, 4);
        this.colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3);

        this.agentStateBuffer = new AgentStateBuffer(this.instanceCount);
        this.expressionBuffer = new ExpressionBuffer(this.instanceCount);

        this.createInstancedMesh();
    }

    private createInstancedMesh() {
        for (const { name, geometry, material: baseMaterial } of this.meshData) {
            const instancedGeometry = new THREE.InstancedBufferGeometry().copy(geometry as any);
            instancedGeometry.instanceCount = this.instanceCount;

            instancedGeometry.setAttribute('instancePos', this.posAttribute!);
            instancedGeometry.setAttribute('instanceColor', this.colorAttribute!);

            // Simple implementation: Use standard material for now. 
            // Character baking in standard Three.js would require a custom shader or using standard Mesh (not instanced) for simplicity if count is low.
            // But we will stick to instancing and pass attributes.
            const material = new THREE.MeshStandardMaterial({
                map: baseMaterial.map,
                roughness: 1,
                metalness: 0.25,
                transparent: true,
            });

            // Note: Full skinning + instancing requires custom vertex shader.
            // For Brain 2.0, we might prefer simple meshes per agent if count is small (e.g. < 10 agents),
            // OR implement the vertex shader. Here we'll assume the manager handles it.

            const instancedMesh = new THREE.Mesh(instancedGeometry, material);
            instancedMesh.frustumCulled = false;
            this.scene.add(instancedMesh);
            this.instancedMeshes.push(instancedMesh);
        }
    }

    public getCount() { return this.instanceCount; }

    public getAgentStateBuffer(): AgentStateBuffer | null {
        return this.agentStateBuffer;
    }

    public getCPUPositions(): Float32Array | null {
        return this.debugPosArray;
    }

    public getCPUPosition(index: number): THREE.Vector3 | null {
        if (!this.debugPosArray || index < 0 || index >= this.instanceCount) return null;
        const i = index * 4;
        return new THREE.Vector3(this.debugPosArray[i], this.debugPosArray[i + 1], this.debugPosArray[i + 2]);
    }

    public setPhysicsMode(index: number, mode: AgentBehavior) {
        if (!this.agentStateBuffer) return;
        this.agentStateBuffer.setState(index, mode);
    }

    public setPosition(index: number, position: THREE.Vector3): void {
        if (!this.posAttribute) return;
        const arr = this.posAttribute.array as Float32Array;
        arr[index * 4 + 0] = position.x;
        arr[index * 4 + 1] = position.y;
        arr[index * 4 + 2] = position.z;
        this.posAttribute.needsUpdate = true;
        if (this.debugPosArray) {
            this.debugPosArray[index * 4 + 0] = position.x;
            this.debugPosArray[index * 4 + 1] = position.y;
            this.debugPosArray[index * 4 + 2] = position.z;
        }
    }

    public setPositionAndZeroVelocity(index: number, position: THREE.Vector3): void {
        this.setPosition(index, position);
        if (this.velAttribute) {
            const arr = this.velAttribute.array as Float32Array;
            arr[index * 4 + 0] = 0;
            arr[index * 4 + 2] = 0;
            this.velAttribute.needsUpdate = true;
        }
    }

    public setFacing(index: number, x: number, z: number) {
        if (!this.agentStateBuffer) return;
        this.agentStateBuffer.setFacing(index, x, z);
    }

    public setOrientation(index: number, quaternion: THREE.Quaternion) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        this.setFacing(index, forward.x, forward.z);
    }

    public getAgentState(index: number): AgentBehavior {
        return (this.agentStateBuffer?.getState(index) as AgentBehavior) ?? AgentBehavior.IDLE;
    }

    public setAnimation(index: number, name: AnimationName, loop: boolean = true) {
        if (this.agentStateBuffer) {
            const meta = this.animationsMeta[name];
            if (meta) {
                this.agentStateBuffer.setAnimation(index, meta.index, loop, this.currentTime);
            }
        }
    }

    public getAnimationDuration(name: AnimationName): number {
        return this.animationsMeta[name]?.duration ?? 1.0;
    }

    public setExpression(index: number, name: ExpressionKey) {
        if (this.expressionBuffer) {
            this.expressionBuffer.setExpression(index, name);
        }
    }

    public setSpeaking(index: number, isSpeaking: boolean) {
        if (this.expressionBuffer) {
            this.expressionBuffer.setSpeaking(index, isSpeaking);
        }
    }

    public setColors(hexColors: string[]) {
        this.colors = hexColors;
        if (this.isLoaded) {
            this.cleanupInstances();
            this.initInstances();
        }
    }
}
