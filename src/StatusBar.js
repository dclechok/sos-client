import './styles/StatusBar.css';

function StatusBar(){
    return(
<div className="sys-vitals-bar">
  <div className="vital">
    <span className="label">HP</span>
    <div className="bar"><div className="fill hp"></div></div>
    <span className="value">72%</span>
  </div>

  <div className="vital">
    <span className="label">Shield</span>
    <div className="bar"><div className="fill shield"></div></div>
    <span className="value">54%</span>
  </div>

  <div className="vital">
    <span className="label">CPU Heat</span>
    <div className="bar"><div className="fill heat"></div></div>
    <span className="value">25%</span>
  </div>

  <div className="vital">
    <span className="label">Stamina</span>
    <div className="bar"><div className="fill stamina"></div></div>
    <span className="value">61%</span>
  </div>

  <div className="vital">
    <span className="label">Energy</span>
    <div className="bar"><div className="fill energy"></div></div>
    <span className="value">83%</span>
  </div>
</div>

    );

}

export default StatusBar;

