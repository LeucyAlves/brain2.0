import * as THREE from 'three';
import { CHARACTER_Y_OFFSET, PICK_RADIUS, POI_PICK_RADIUS } from '../constants';
import { PoiDef } from '@/lib/three/types';

const DRAG_THRESHOLD_PX = 4;
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/**
 * Manages user input (mouse/pointer) for interacting with agents and the world.
 */
export class InputManager {
    private raycaster = new THREE.Raycaster();
    private pointer = new THREE.Vector2();
    private dragStartX = 0;
    private dragStartY = 0;
    private isDragging = false;

    private boundPointerDown: (e: PointerEvent) => void;
    private boundPointerMove: (e: PointerEvent) => void;
    private boundPointerUp: (e: PointerEvent) => void;

    constructor(
        private canvas: HTMLElement,
        private camera: THREE.PerspectiveCamera,
        private getPositions: () => Float32Array | null,
        private getCount: () => number,
        private onSelect: (index: number | null) => void,
        private onWaypoint: (x: number, z: number) => void,
        private onHover: (index: number | null, pos: { x: number; y: number } | null) => void,
        private getPois: () => PoiDef[],
        private onPoiHover: (id: string | null, label: string | null, pos: { x: number; y: number } | null) => void,
        private onPoiClick: (id: string) => void,
        private raycastObject?: THREE.Object3D,
        private isPointValid?: (point: THREE.Vector3) => boolean,
    ) {
        this.boundPointerDown = this.handlePointerDown.bind(this);
        this.boundPointerMove = this.handlePointerMove.bind(this);
        this.boundPointerUp = this.handlePointerUp.bind(this);

        canvas.addEventListener('pointerdown', this.boundPointerDown);
        canvas.addEventListener('pointermove', this.boundPointerMove);
        canvas.addEventListener('pointerup', this.boundPointerUp);
    }

    private handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return;
        this.dragStartX = event.clientX;
        this.dragStartY = event.clientY;
        this.isDragging = false;
    }

    private handlePointerMove(event: PointerEvent) {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        if (event.buttons !== 0) {
            if (event.buttons === 1) {
                const dx = event.clientX - this.dragStartX;
                const dy = event.clientY - this.dragStartY;
                if ((dx * dx + dy * dy) > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
                    this.isDragging = true;
                }
            }
            return;
        }

        this.isDragging = false;
        const hoveredIdx = this.getAgentAtPointer();

        if (hoveredIdx !== null) {
            this.canvas.style.cursor = 'pointer';
            const positions = this.getPositions();
            if (positions) {
                const worldPos = new THREE.Vector3(
                    positions[hoveredIdx * 4],
                    positions[hoveredIdx * 4 + 1] + CHARACTER_Y_OFFSET + 0.4,
                    positions[hoveredIdx * 4 + 2]
                );
                worldPos.project(this.camera);
                const x = (worldPos.x * 0.5 + 0.5) * rect.width;
                const y = (worldPos.y * -0.5 + 0.5) * rect.height;
                this.onPoiHover(null, null, null);
                this.onHover(hoveredIdx, { x, y });
            }
        } else {
            const hoveredPoi = this.getPoiAtPointer();
            if (hoveredPoi && hoveredPoi.occupiedBy === null && hoveredPoi.label) {
                this.canvas.style.cursor = 'pointer';
                const worldPos = hoveredPoi.position.clone();
                worldPos.y += 0.5;
                worldPos.project(this.camera);
                const x = (worldPos.x * 0.5 + 0.5) * rect.width;
                const y = (worldPos.y * -0.5 + 0.5) * rect.height;
                this.onHover(null, null);
                this.onPoiHover(hoveredPoi.id, hoveredPoi.label, { x, y });
            } else {
                const target = this.getWorldClickPosition();
                this.canvas.style.cursor = target ? 'pointer' : 'auto';
                this.onHover(null, null);
                this.onPoiHover(null, null, null);
            }
        }
    }

    private handlePointerUp(event: PointerEvent) {
        if (event.button !== 0 || this.isDragging) return;
        this.handleClick(event as unknown as MouseEvent);
    }

    private handleClick(event: MouseEvent) {
        const closestIdx = this.getAgentAtPointer();
        if (closestIdx !== null) {
            this.onSelect(closestIdx);
        } else {
            const hoveredPoi = this.getPoiAtPointer();
            if (hoveredPoi && hoveredPoi.occupiedBy === null && hoveredPoi.label) {
                this.onPoiHover(null, null, null);
                this.onPoiClick(hoveredPoi.id);
            } else {
                const target = this.getWorldClickPosition();
                if (target) {
                    this.onWaypoint(target.x, target.z);
                } else {
                    this.onSelect(null);
                }
            }
        }
    }

    private getAgentAtPointer(): number | null {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const positions = this.getPositions();
        const count = this.getCount();
        if (!positions || count === 0) return null;

        let closestT = Infinity;
        let closestIdx: number | null = null;

        for (let i = 0; i < count; i++) {
            const cx = positions[i * 4];
            const cy = positions[i * 4 + 1] + CHARACTER_Y_OFFSET;
            const cz = positions[i * 4 + 2];

            const ocx = this.raycaster.ray.origin.x - cx;
            const ocy = this.raycaster.ray.origin.y - cy;
            const ocz = this.raycaster.ray.origin.z - cz;

            const halfB = ocx * this.raycaster.ray.direction.x + ocy * this.raycaster.ray.direction.y + ocz * this.raycaster.ray.direction.z;
            const c = ocx * ocx + ocy * ocy + ocz * ocz - PICK_RADIUS * PICK_RADIUS;
            const discriminant = halfB * halfB - c;

            if (discriminant < 0) continue;
            const t = -halfB - Math.sqrt(discriminant);
            if (t > 0 && t < closestT) {
                closestT = t;
                closestIdx = i;
            }
        }
        return closestIdx;
    }

    private getPoiAtPointer(): PoiDef | null {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        let closestT = Infinity;
        let closestPoi: PoiDef | null = null;

        for (const poi of this.getPois()) {
            if (!poi.label) continue;
            const ocx = this.raycaster.ray.origin.x - poi.position.x;
            const ocy = this.raycaster.ray.origin.y - poi.position.y;
            const ocz = this.raycaster.ray.origin.z - poi.position.z;
            const halfB = ocx * this.raycaster.ray.direction.x + ocy * this.raycaster.ray.direction.y + ocz * this.raycaster.ray.direction.z;
            const c = ocx * ocx + ocy * ocy + ocz * ocz - POI_PICK_RADIUS * POI_PICK_RADIUS;
            const discriminant = halfB * halfB - c;
            if (discriminant < 0) continue;
            const t = -halfB - Math.sqrt(discriminant);
            if (t > 0 && t < closestT) {
                closestT = t;
                closestPoi = poi;
            }
        }
        return closestPoi;
    }

    private getWorldClickPosition(): THREE.Vector3 | null {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        let point: THREE.Vector3 | null = null;

        if (this.raycastObject) {
            const intersects = this.raycaster.intersectObject(this.raycastObject, true);
            const navMeshHit = intersects.find(hit => hit.object.name.toLowerCase().includes('navmesh'));
            if (navMeshHit) point = navMeshHit.point;
        } else {
            const target = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(FLOOR_PLANE, target)) point = target;
        }

        if (point && this.isPointValid) {
            return this.isPointValid(point) ? point : null;
        }
        return point;
    }

    public dispose() {
        this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
        this.canvas.removeEventListener('pointermove', this.boundPointerMove);
        this.canvas.removeEventListener('pointerup', this.boundPointerUp);
    }
}
