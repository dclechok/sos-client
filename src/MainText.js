import './styles/MainText.css';

function MainText(){

    return(
        <div>
            <div>
                <span className="main-text-span">World · Region · Area · Scene ([0, 0]) - Security: Low</span>
            </div>
            <div className="scene-info">
                <p>The rain hit the rusted rooftops like static against a dead channel. Neon signs flickered through the smog, casting warped reflections in puddles of oil and blood. Sirens howled somewhere beyond the barricades, their wails swallowed by the thrum of distant turbines and the hiss of steam vents bleeding from fractured infrastructure. In the alleys below, data runners huddled in shadows, masking their neural signatures from patrolling drones. The sky was a grid of surveillance satellites and glitching ad banners — hope had long since been overwritten. Tonight, something shifted in the code of the city. Someone new had entered the Sprawl… and the system was already watching...</p>
                <p className="other-chat">Laeik: Get fucked!</p>
                {/* <input className="main-text-input" /> */}
            </div>
            <div></div>
        </div>
    );
}

export default MainText;