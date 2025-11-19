import './styles/CharacterMenu.css';
import { useState } from 'react';

import clickSound from "./sounds/button_click1.wav";

function CharacterMenu({ account }){

    const [activeTab, setActiveTab] = useState("stats");
    // single audio instance for all tab clicks
    const audio = new Audio(clickSound);

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);
        audio.currentTime = 0;
        audio.play().catch(() => {});
    };

    return (
        <div className="char-menu-cont">
            {account?.username ? <h3>{account.username}</h3> : ""}

            <div className="char-menu-tabs">

                <div 
                    className={`tab ${activeTab === "stats" ? "tab-active" : ""}`} 
                    onClick={() => handleTabClick("stats")}
                >
                    Stats
                </div>

                <div 
                    className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`} 
                    onClick={() => handleTabClick("inventory")}
                >
                    Inventory
                </div>

                <div 
                    className={`tab ${activeTab === "loadout" ? "tab-active" : ""}`} 
                    onClick={() => handleTabClick("loadout")}
                >
                    Loadout
                </div>

                <div 
                    className={`tab ${activeTab === "stats2" ? "tab-active" : ""}`} 
                    onClick={() => handleTabClick("stats2")}
                >
                    Stats2
                </div>

            </div>

            <div className="char-menu-display">
                test
            </div>
        </div>
    );
}

export default CharacterMenu;
