import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';

/**
 * Manages world assets and theme colors.
 * Standardized for standard Three.js materials.
 */
export class WorldManager {
    private office: THREE.Group | null = null;

    constructor(
        private scene: THREE.Scene,
        private navMesh: NavMeshManager,
        private poiManager: PoiManager
    ) { }

    public async load(): Promise<void> {
        const loader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(DRACO_LIB_PATH);
        loader.setDRACOLoader(dracoLoader);

        // Using relative path for robustness in Next.js
        const officeGltf = await loader.loadAsync('/models/office.glb');
        this.office = officeGltf.scene;
        this.scene.add(this.office);

        const themeColor = new THREE.Color(0x4f46e5); // Default indigo

        this.office.traverse((child) => {
            if ((child as any).isMesh) {
                const mesh = child as THREE.Mesh;
                const name = mesh.name.toLowerCase();

                if (name.includes('navmesh')) {
                    this.navMesh.loadFromGeometry(mesh.geometry);
                    mesh.visible = false;
                } else {
                    mesh.receiveShadow = true;
                    mesh.castShadow = true;

                    if (mesh.material) {
                        const oldMat = mesh.material as THREE.MeshStandardMaterial;
                        const isColoredMesh = name.startsWith('colored');

                        // Convert to basic StandardMaterial for compatibility without TSL
                        mesh.material = new THREE.MeshStandardMaterial({
                            color: isColoredMesh ? themeColor : oldMat.color,
                            map: oldMat.map,
                            roughness: 1,
                            metalness: 0.35,
                        });
                    }
                }
            }
        });

        this.poiManager.loadFromGlb(this.office);
    }

    public updateThemeColor(color: string): void {
        if (!this.office) return;
        const themeColor = new THREE.Color(color);

        this.office.traverse((child) => {
            if ((child as any).isMesh) {
                const mesh = child as THREE.Mesh;
                const name = mesh.name.toLowerCase();

                if (name.startsWith('colored') && mesh.material) {
                    (mesh.material as THREE.MeshStandardMaterial).color.copy(themeColor);
                }
            }
        });
    }

    public getOffice(): THREE.Group | null {
        return this.office;
    }
}
