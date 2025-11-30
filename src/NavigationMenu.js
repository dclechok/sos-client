import { getAllScenes } from './api/mapDataApi';
import './styles/NavigationMenu.css';
import { useState, useEffect } from 'react';

function NavigationMenu() {
    const [sceneList, setSceneList] = useState([]);
    
    // TEMP: Hardcode player location until you wire real one
    const playerX = 0;
    const playerY = 0;

    useEffect(() => {
        async function fetchScenes() {
            const scenes = await getAllScenes();
            setSceneList(scenes);
        }
        fetchScenes();
    }, []);

    console.log(sceneList)
    return (
        <div className="nav-menu-cont">
            <div className="nav-content">
                <span className="nav-location">
                    World · Region · Area · Scene ([{playerX}, {playerY}]) — Security: 
                    <span className="nav-security-high"> High</span>
                </span>
            </div>
            <div className="map-wrapper">
                Test
            </div>
        </div>
    );
}

export default NavigationMenu;
