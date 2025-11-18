import './styles/MainText.css';
import { useEffect, useState } from 'react';

import chatArrow from './img/chatarrow.png';



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
        <div className="scene-info-cont">
            <div className="scene-info-scroll">
            <div className="scene-info">
                <div>
                    <span className="time-stamp">[ 01:03:27 ]</span> A cold, electric blue moon hangs swollen in the sky, washing the world below in a ghost-light glow. Clouds drift low and heavy, smothering the horizon in slow-moving shadows. Beneath that pale light stretches the city—endless blocks of window-speckled towers stacked like a broken circuit board. Smokestacks cough ribbons of black smoke into the night, their silhouettes cutting harsh lines against the sky.





At the center of everything rises the Spire.

A needle of steel and glass, impossibly tall, its thousands of windows shimmer like a constellation trapped in metal. The deeper into the city the eye moves, the denser the buildings become—homes collapsing into apartments, apartments into factories, factories into the sprawling labyrinth that feeds the Spire’s base.

Far in the outskirts, where the forest meets forgotten suburbs, a crane hangs motionless over half-finished housing blocks. A thin mist clings to the roofs and roads, softening shapes but never the silence. There is no movement, save for the flicker of distant lights and the quiet pulse of the Spire’s glow—steady, rhythmic, alive.

From here, the world feels frozen, suspended between decay and something brighter. Every street, every chimney, every window leads inward… toward the heart of the city… toward the Spire.

And tonight, you are standing at the edge of it all, where wilderness becomes industry, and the last safe darkness gives way to the neon promise of the inner wards.

The Spire waits.

At the center of everything rises the Spire.

A needle of steel and glass, impossibly tall, its thousands of windows shimmer like a constellation trapped in metal. The deeper into the city the eye moves, the denser the buildings become—homes collapsing into apartments, apartments into factories, factories into the sprawling labyrinth that feeds the Spire’s base.

Far in the outskirts, where the forest meets forgotten suburbs, a crane hangs motionless over half-finished housing blocks. A thin mist clings to the roofs and roads, softening shapes but never the silence. There is no movement, save for the flicker of distant lights and the quiet pulse of the Spire’s glow—steady, rhythmic, alive.

From here, the world feels frozen, suspended between decay and something brighter. Every street, every chimney, every window leads inward… toward the heart of the city… toward the Spire.

And tonight, you are standing at the edge of it all, where wilderness becomes industry, and the last safe darkness gives way to the neon promise of the inner wards.

The Spire waits.

At the center of everything rises the Spire.

A needle of steel and glass, impossibly tall, its thousands of windows shimmer like a constellation trapped in metal. The deeper into the city the eye moves, the denser the buildings become—homes collapsing into apartments, apartments into factories, factories into the sprawling labyrinth that feeds the Spire’s base.

Far in the outskirts, where the forest meets forgotten suburbs, a crane hangs motionless over half-finished housing blocks. A thin mist clings to the roofs and roads, softening shapes but never the silence. There is no movement, save for the flicker of distant lights and the quiet pulse of the Spire’s glow—steady, rhythmic, alive.

From here, the world feels frozen, suspended between decay and something brighter. Every street, every chimney, every window leads inward… toward the heart of the city… toward the Spire.

And tonight, you are standing at the edge of it all, where wilderness becomes industry, and the last safe darkness gives way to the neon promise of the inner wards.

The Spire waits.

TEST
<br /> <br />

Flirvanta skrellim dunepar chostel vrinitho belargon trelux vinmarra hosteen blavikar. Murnath joruli parvex simtallo frandelis jekura monderith vaxen trillathor, spenvira lokutta felnorim draxello monquivax traduli. Grendash volartheen scripulo tamberith valquessa prondilux fenmarra jorthun eskelladri, fualthor chimbera teskavorn delliathor mingratha quillix. Navresto barthinex, prindlefo shavornik trelluma gosparron finvarteh krestova lishmonta verikallun prathenjo. Velkador sefrillun, trinvalis hexundo phermogast ryltherin, spundeli crestollin vargatha monjerri vespanith.

Trellikon druviasta melchuron finstavi quellonar frexthune parnivalle moskringet, brenquistar vollimex trellador fexundra noviaskim pelturna quarsithio. Mandaban grevinar quellistri foldarune brixudo felmantis claravond joltestri, histavill drathine melvarno pristalune dromvaxin tevalusta pronthico. Lerrimax franthiol merkovin staltiri quindemar festolath gevrondel hirthane, poldetta krevistus almontiro xentavali chorstifex prinderune. Frongalin temvosta quilladrim jaskithon halderin wroskavi feristullom drentavax. Melquistar
Flirvanta skrellim dunepar chostel vrinitho belargon trelux vinmarra hosteen blavikar. Murnath joruli parvex simtallo frandelis jekura monderith vaxen trillathor, spenvira lokutta felnorim draxello monquivax traduli. Grendash volartheen scripulo tamberith valquessa prondilux fenmarra jorthun eskelladri, fualthor chimbera teskavorn delliathor mingratha quillix. Navresto barthinex, prindlefo shavornik trelluma gosparron finvarteh krestova lishmonta verikallun prathenjo. Velkador sefrillun, trinvalis hexundo phermogast ryltherin, spundeli crestollin vargatha monjerri vespanith.

Trellikon druviasta melchuron finstavi quellonar frexthune parnivalle moskringet, brenquistar vollimex trellador fexundra noviaskim pelturna quarsithio. Mandaban grevinar quellistri foldarune brixudo felmantis claravond joltestri, histavill drathine melvarno pristalune dromvaxin tevalusta pronthico. Lerrimax franthiol merkovin staltiri quindemar festolath gevrondel hirthane, poldetta krevistus almontiro xentavali chorstifex prinderune. Frongalin temvosta quilladrim jaskithon halderin wroskavi feristullom drentavax. Melquistar
Flirvanta skrellim dunepar chostel vrinitho belargon trelux vinmarra hosteen blavikar. Murnath joruli parvex simtallo frandelis jekura monderith vaxen trillathor, spenvira lokutta felnorim draxello monquivax traduli. Grendash volartheen scripulo tamberith valquessa prondilux fenmarra jorthun eskelladri, fualthor chimbera teskavorn delliathor mingratha quillix. Navresto barthinex, prindlefo shavornik trelluma gosparron finvarteh krestova lishmonta verikallun prathenjo. Velkador sefrillun, trinvalis hexundo phermogast ryltherin, spundeli crestollin vargatha monjerri vespanith.

Trellikon druviasta melchuron finstavi quellonar frexthune parnivalle moskringet, brenquistar vollimex trellador fexundra noviaskim pelturna quarsithio. Mandaban grevinar quellistri foldarune brixudo felmantis claravond joltestri, histavill drathine melvarno pristalune dromvaxin tevalusta pronthico. Lerrimax franthiol merkovin staltiri quindemar festolath gevrondel hirthane, poldetta krevistus almontiro xentavali chorstifex prinderune. Frongalin temvosta quilladrim jaskithon halderin wroskavi feristullom drentavax. Melquistar

                </div>
                 <p className="other-chat"><span className="time-stamp">[ 01:07:19 ]</span> Laeik: Test</p>
            </div>
                
               


            <div>
                    
</div>
        </div>
        <div className="input-wrapper">
                    <input className="main-text-input" />
                    <img className="arrow-icon" src={chatArrow}/>
        </div>
        </div>
    );
}

export default MainText;