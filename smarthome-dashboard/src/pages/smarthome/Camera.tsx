'use client';

import dynamic from 'next/dynamic';
import { useSmartHome } from '@/hooks/useSmartHome';
import { useState, useRef } from 'react';
import { AddIcon, CloseIcon, MinusIcon } from '@/lib/icons';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

const TEST_MODE = true;

export default function Camera() {
    const { cameras } = useSmartHome();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const draggingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    const handleExpand = (id: string) => {
        setExpanded(id);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const onMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1) return;
        draggingRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: e.clientX, y: e.clientY };

        setPan(p => {
            const container = containerRef.current;
            if (!container) return p;
            const { width, height } = container.getBoundingClientRect();
            const maxX = (width * (zoom - 1)) / 2;
            const maxY = (height * (zoom - 1)) / 2;
            return {
                x: Math.max(-maxX, Math.min(maxX, p.x + dx)),
                y: Math.max(-maxY, Math.min(maxY, p.y + dy)),
            };
        });
    };

    const onMouseUp = () => { draggingRef.current = false; };

    const displayCameras = TEST_MODE || cameras.length === 0 ? [
        { id: 'camera.front_door', name: 'Front Door' },
        { id: 'camera.backyard', name: 'Backyard' },
        { id: 'camera.kitchen', name: 'Kitchen' },
        { id: 'camera.bedroom', name: 'Bedroom' },
        { id: 'camera.yard', name: 'Yard' },
        { id: 'camera.inside', name: 'Inside' },
    ] : cameras;

    return (
        <div className="camera-page">
            <h1>Cameras</h1>

            {expanded && (
                <div className="camera-expanded">
                    <div className="camera-expanded-inner" onClick={e => e.stopPropagation()}>
                        <button className="camera-expanded-close" onClick={() => setExpanded(null)}>
                            <CloseIcon />
                        </button>
                        <div className="camera-expanded-zoom-btns">
                            <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}><AddIcon /></button>
                            <span>{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => {
                                const next = Math.max(z - 0.25, 0.25);
                                if (next === 1) setPan({ x: 0, y: 0 });
                                return next;
                            })}><MinusIcon /></button>
                        </div>
                        <p className="camera-name">
                            {displayCameras.find(c => c.id === expanded)?.name}
                        </p>
                        <div
                            ref={containerRef}
                            style={{ width: '100%', height: '100%', overflow: 'hidden' }}
                        >
                            <div
                                style={{
                                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                    transformOrigin: 'center center',
                                    transition: draggingRef.current ? 'none' : 'transform 0.2s ease',
                                    width: '100%',
                                    height: '100%',
                                    cursor: zoom > 1 ? 'grab' : 'default',
                                }}
                                onMouseDown={onMouseDown}
                                onMouseMove={onMouseMove}
                                onMouseUp={onMouseUp}
                                onMouseLeave={onMouseUp}
                            >
                                <CameraFeed
                                    entityId={expanded}
                                    name={displayCameras.find(c => c.id === expanded)?.name ?? ''}
                                    onClick={() => {}}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="camera-grid">
                {displayCameras.map(camera => (
                    <div className="camera-card" key={camera.id} onClick={() => handleExpand(camera.id)}>
                        <p className="camera-name">{camera.name}</p>
                        <CameraFeed
                            entityId={camera.id}
                            name={camera.name}
                            onClick={() => {}}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

function CameraFeed({ entityId, name, onClick }: { entityId: string; name: string; onClick: () => void }) {
    const realUrl = `${process.env.NEXT_PUBLIC_HA_URL}/api/camera_proxy_stream/${entityId}?token=${process.env.NEXT_PUBLIC_HA_TOKEN}`;
    const mockUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    const streamUrl = TEST_MODE ? mockUrl : realUrl;

    return (
        <div className="camera-card" onClick={onClick}>
            <div className="camera-feed">
                <ReactPlayer url={streamUrl} playing muted width="100%" height="100%" />
            </div>
        </div>
    );
}