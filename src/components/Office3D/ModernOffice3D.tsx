"use client";

import React, { useEffect, useRef } from 'react';
import { SceneManager } from '../../lib/three/SceneManager';

/**
 * ModernOffice3D — React entry point for the 3D Agent simulation.
 */
export const ModernOffice3D: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneManagerRef = useRef<SceneManager | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize the 3D scene
        const sceneManager = new SceneManager(containerRef.current);
        sceneManagerRef.current = sceneManager;

        return () => {
            sceneManager.dispose();
            sceneManagerRef.current = null;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#0a0a0a',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.05)'
            }}
        >
            <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                zIndex: 10,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <div style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    3D Agent Simulation
                </div>
            </div>

            {/* Simulation tips / status could go here */}
            <div style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                zIndex: 10,
                pointerEvents: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.7rem'
            }}>
                Left Click: Interact & Walk • Right Click: Orbit
            </div>
        </div>
    );
};

export default ModernOffice3D;
