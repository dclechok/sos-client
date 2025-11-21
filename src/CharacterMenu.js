import './styles/CharacterMenu.css';
import { useState, useEffect } from 'react';

import clickSound from "./sounds/button_click1.wav";
import InventoryMenu from './InventoryMenu';

function CharacterMenu({ account, character }){

    // Load from localStorage or default to "stats"
    const [activeTab, setActiveTab] = useState(
        () => localStorage.getItem("pd_character_tab") || "stats"
    );

    const audio = new Audio(clickSound);

    const handleTabClick = (tabName) => {
        setActiveTab(tabName);

        // 🔥 Save selected tab for persistence
        localStorage.setItem("pd_character_tab", tabName);

        audio.currentTime = 0;
        audio.volume = 0.3;
        audio.play().catch(() => {});
    };

    return (
        <div className="char-menu-cont noselect">
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
                {activeTab === "inventory" && (
                    <InventoryMenu account={account} character={character} />
                )}
            </div>
        </div>
    );
}

export default CharacterMenu;
