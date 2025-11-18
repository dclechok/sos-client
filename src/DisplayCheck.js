import './styles/DisplayCheck.css';

function DisplayCheck(){

    return(
    <div className="too-small">
        <div className="check-msg">Your screen resolution is too low to run the game.
Please switch to a desktop or a device with a larger display to continue.</div>
    </div>);
}

export default DisplayCheck;