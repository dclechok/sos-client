import "./styles/MainImg.css";

function MainImg({ x, y }) {
    let src;

    try {
        // Dynamically load the matching scene picture
        src = require(`./scenepic/${x}-${y}.png`);
    } catch (err) {
        // Fallback image if scene picture doesn't exist
        src = require("./scenepic/default.png");
    }

    return <img className="scenepic" src={src} alt={`Scene ${x},${y}`} />;
}

export default MainImg;
