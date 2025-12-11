import { getAllScenes } from './api/mapDataApi';
import './styles/NavigationMenu.css';
import { useState, useEffect, useRef } from 'react';

function NavigationMenu({ playerLoc }) {


    const [sceneList, setSceneList] = useState([]);
    const containerRef = useRef(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    // Measure map wrapper
    useEffect(() => {
        function updateSize() {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSize({
                w: rect.width,
                h: rect.height
            });
        }

        // First attempt (after paint)
        requestAnimationFrame(updateSize);

        // 🔥 Second attempt (after layout stabilizes)
        setTimeout(updateSize, 50);

        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);


    // Fetch scenes initially
    useEffect(() => {
        async function fetchScenes() {
            const scenes = await getAllScenes();
            setSceneList(scenes);
        }
        fetchScenes();
    }, []);

        useEffect(() => {
        function measure() {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSize({ w: rect.width, h: rect.height });
        }

        requestAnimationFrame(measure);  // after paint
        setTimeout(measure, 20);         // after layout settles

    }, [playerLoc, sceneList]);


    /* ------------------------------------------------------------------
       EARLY EXIT (LEGAL NOW — AFTER ALL HOOKS)
    ------------------------------------------------------------------ */
    if (!playerLoc || playerLoc.x === undefined || sceneList.length === 0) {
        return (
            <div className="nav-menu-cont">
                <div className="nav-content">Loading map…</div>
            </div>
        );
    }
    // Measure container AFTER layout + AFTER playerLoc changes



    /* ------------------------------------------------------------------
       ORIGINAL CODE — UNCHANGED
    ------------------------------------------------------------------ */

    const playerX = playerLoc.x;
    const playerY = playerLoc.y;

    const NODE_SPACING = 30;
    const NODE_EDGE_OFFSET = 10;

    const sec = {
        0: { label: "Low", color: "rgba(236, 72, 72, 1)" },
        1: { label: "Medium", color: "rgba(236, 225, 72, 1)" },
        2: { label: "High", color: "rgba(72, 236, 107, 1)" },
    };

    const currentScene = sceneList.find(
        s => s.x === playerX && s.y === playerY
    );

    const securityIndex =
        currentScene && Number.isInteger(currentScene.security)
            ? currentScene.security
            : 1;

    const secValue = sec[securityIndex] ?? sec[1];

    const getScene = (x, y) =>
        sceneList.find(s => s.x === x && s.y === y);

    const toScreen = (x, y) => ({
        cx: size.w / 2 + (x - playerX) * NODE_SPACING,
        cy: size.h / 2 + (playerY - y) * NODE_SPACING
    });

    const connections = [];

    if (size.w > 0 && size.h > 0) {
        for (const scene of sceneList) {
            if (!scene.exits) continue;
            const { cx: sx, cy: sy } = toScreen(scene.x, scene.y);

            for (const dir of Object.keys(scene.exits)) {
                const [tx, ty] = scene.exits[dir].split(",").map(Number);
                const targetScene = getScene(tx, ty);
                if (!targetScene) continue;

                // prevent duplicates
                if (scene._id > targetScene._id) continue;

                const { cx: ex, cy: ey } = toScreen(tx, ty);

                const dx = ex - sx;
                const dy = ey - sy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist === 0) continue;

                const ux = dx / dist;
                const uy = dy / dist;

                // snap line edges
                const sxEdge = sx + ux * NODE_EDGE_OFFSET;
                const syEdge = sy + uy * NODE_EDGE_OFFSET;
                const exEdge = ex - ux * NODE_EDGE_OFFSET;
                const eyEdge = ey - uy * NODE_EDGE_OFFSET;

                const midX = (sxEdge + exEdge) / 2;
                const midY = (syEdge + eyEdge) / 2;
                const length = Math.sqrt(
                    (exEdge - sxEdge) ** 2 +
                    (eyEdge - syEdge) ** 2
                );
                const angle = Math.atan2(eyEdge - syEdge, exEdge - sxEdge) * 180 / Math.PI;

                connections.push({
                    id: `${scene._id}-${dir}`,
                    midX,
                    midY,
                    length,
                    angle
                });
            }
        }
    }

    return (
        <div className="nav-menu-cont">
            <div className="nav-content">
                <span className="nav-location">
                    System: Reverie<br />
                    Region: Test<br />
                    Node: {currentScene?.name}<br />
                    ([ <span className="coords">{playerX}, {playerY}</span> ])<br />
                    Security: [
                        <span style={{ color: secValue.color }}>
                            {secValue.label}
                        </span>
                    ]
                </span>
            </div>

            <div className="map-wrapper">
                <div className="map-grid-container" ref={containerRef}>

                    {connections.map(conn => (
                        <div
                            key={conn.id}
                            className="map-link"
                            style={{
                                left: `${conn.midX}px`,
                                top: `${conn.midY}px`,
                                width: `${conn.length}px`,
                                transform: `translate(-50%, -50%) rotate(${conn.angle}deg)`
                            }}
                        ></div>
                    ))}

                    {sceneList.map(scene => {
                        const { cx, cy } = toScreen(scene.x, scene.y);
                        const isPlayer = scene.x === playerX && scene.y === playerY;

                        return (
                            <div
                                key={scene._id}
                                style={{
                                    left: `${cx}px`,
                                    top: `${cy}px`,
                                    position: "absolute",
                                    transform: "translate(-50%, -50%)",
                                }}
                            >
                                {isPlayer ? (
                                    <div className="player-wrapper active-node">
                                        <div className="player-node"></div>
                                    </div>
                                ) : (
                                    <div className="map-node"></div>
                                )}
                            </div>
                        );
                    })}

                </div>
            </div>
        </div>
    );
}

export default NavigationMenu;
