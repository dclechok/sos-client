import './styles/MainText.css';
import { useEffect, useState } from 'react';


function MainText(){

    const [sceneData, setSceneData] = useState({});

    useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log('Connected to WebSocket');
    };

    socket.onmessage = async (event) => {
    const text = await event.data;
    if (!text) return; // prevent parsing empty string

    try {
        const data = JSON.parse(text);
        if (data.type === 'mapData') {
        setSceneData(data.payload);
        }
    } catch (err) {
        console.error('Invalid JSON received:', text);
    }
    };

    return () => socket.close(); // cleanup
    }, []);

    useEffect(() => {
        console.log('Scene data updated:', sceneData);
    }, [sceneData]);

    return(
        <div>
            <div>
                <span className="main-text-span">World · Region · Area · Scene ([0, 0]) - Security: Low</span>
            </div>
            <div className="scene-info">
                <p>{sceneData?.map01?.regions?.Tuscan?.newArrivalDesc}</p>
                <p className="other-chat">Laeik: Get fucked!</p>
                {/* <input className="main-text-input" /> */}
            </div>
            <div></div>
        </div>
    );
}

export default MainText;