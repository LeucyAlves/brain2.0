import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SCENE_BACKGROUND_COLOR } from '../constants';

/**
 * Manages the scene setup, lighting, and camera controls.
 */
export class Stage {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;

    private followTarget: THREE.Vector3 | null = null;
    private readonly defaultTarget = new THREE.Vector3(0, 0.8, 0);

    constructor(rendererElement: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SCENE_BACKGROUND_COLOR);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
        this.camera.position.set(10, 8, 15);

        this.controls = new OrbitControls(this.camera, rendererElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.8;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        this.controls.minPolarAngle = Math.PI / 4.5;
        this.controls.maxPolarAngle = Math.PI / 2.4;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 10;
        this.controls.target.set(0, 0.8, 0);

        this.setupLights();
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.bias = -0.0001;
        this.scene.add(dirLight);
    }

    public onResize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    public setFollowTarget(pos: THREE.Vector3 | null) {
        this.followTarget = pos ? pos.clone() : null;
    }

    public update() {
        const lerpTarget = this.followTarget
            ? new THREE.Vector3(this.followTarget.x, 0.8, this.followTarget.z)
            : this.defaultTarget;
        this.controls.target.lerp(lerpTarget, 0.06);
        this.controls.update();
    }

    public setChatMode(isChatting: boolean, playerMoving: boolean): void {
        if (!this.controls) return;
        if (isChatting) {
            if (playerMoving) {
                this.controls.enabled = false;
                this.controls.minDistance = 4;
                this.controls.maxDistance = 6;
            } else {
                this.controls.enabled = true;
                this.controls.minDistance = 3;
                this.controls.maxDistance = 10;
            }
        } else {
            this.controls.enabled = true;
            this.controls.minDistance = 3;
            this.controls.maxDistance = 50;
        }
    }
}
