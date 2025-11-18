import './styles/CharacterMenu.css';

import { useState } from 'react';

function CharacterMenu(){

    const [activeTab, setActiveTab] = useState("stats");

    const setTab = () => {

    }
    
    return (
            <div className="char-menu-cont">
                <h3>Character Overview</h3>
                <div className="char-menu-tabs">
                    <div className={`tab ${activeTab === "stats" ? "tab-active" : ""}`} onClick={() => setActiveTab("stats")}>Stats</div>
                    <div className={`tab ${activeTab === "inventory" ? "tab-active" : ""}`} onClick={() => setActiveTab("inventory")}>Inventory</div>
                    <div className={`tab ${activeTab === "loadout" ? "tab-active" : ""}`} onClick={() => setActiveTab("loadout")}>Loadout</div>
                    <div className={`tab ${activeTab === "stats2" ? "tab-active" : ""}`} onClick={() => setActiveTab("stats2")}>Stats2</div>
                </div>
                <div className="char-menu-display">
                    test
                </div>
            </div>
    );
}

export default CharacterMenu;