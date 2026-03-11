import * as THREE from 'three';

/**
 * Core rendering engine.
 * Fixed for standard WebGL2Renderer for maximum compatibility.
 */
export class Engine {
    public renderer: THREE.WebGLRenderer;

    constructor(container: HTMLElement) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight, false);

        // Standard shadow map
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';

        container.appendChild(this.renderer.domElement);
    }

    public onResize(width: number, height: number) {
        this.renderer.setSize(width, height, false);
    }

    public render(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.renderer.render(scene, camera);
    }

    public dispose() {
        this.renderer.domElement.remove();
        this.renderer.dispose();
    }
}
