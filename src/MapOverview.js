import './styles/MapOverview.css';

function MapOverview(){

    return(
        <div className="ui-box">
            <div className="title-bar">
                <h3>Navigation</h3>
            </div>  
            <div>
                <span className="main-text-span">World · Region · Area · Scene ([0, 0]) - Security: <span style={{ color: "rgba(72, 236, 107, 1)" }}>High</span></span>
            </div>
        </div>
    );
}

export default MapOverview;