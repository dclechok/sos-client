import { getAllScenes } from './api/mapDataApi';
import './styles/NavigationMenu.css';
import { useState, useEffect } from 'react';

function NavigationMenu() {
    const [sceneList, setSceneList] = useState([]);

    // TEMP player position
    const playerX = 0;
    const playerY = 0;

    // Security lookup table
    const sec = {
        0: { label: "Low", color: "rgba(236, 72, 72, 1)" },
        1: { label: "Medium", color: "rgba(236, 225, 72, 1)" },
        2: { label: "High", color: "rgba(72, 236, 107, 1)" },


    };

    useEffect(() => {
        async function fetchScenes() {
            const scenes = await getAllScenes();
            setSceneList(scenes);
        }
        fetchScenes();
    }, []);

    // Find scene for player's location
    const currentScene = sceneList.find(
        (ele) => ele.x === playerX && ele.y === playerY
    );
    // Security value fallback
    let securityIndex = 1; // default Medium

    if (currentScene && Number.isInteger(currentScene.security)) {
        securityIndex = currentScene.security;
    }

    const secValue = sec[securityIndex - 1]; //0 based index
    console.log(sceneList)
    return (
        <div className="nav-menu-cont">
            <div className="nav-content">
                <span className="nav-location">
                    World · Region · Area · Scene ([{playerX}, {playerY}]) — Security:
                    {secValue && (
                        <span style={{ color: secValue.color }}> {secValue.label}</span>
                    )}

                </span>
            </div>

            <div className="map-wrapper">
                Test
            </div>
        </div>
    );
}

export default NavigationMenu;
