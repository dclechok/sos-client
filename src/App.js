import './styles/App.css';
import { useState } from 'react';

// UI Components
import Login from './Login';
import NavBar from './NavBar';
import MainImg from './MainImg';
import MainText from './MainText';
import MapOverview from './MapOverview';
import SystemMessages from './SystemMessages';
import ActionMenu from './ActionMenu';
import CharacterOverview from './CharacterOverview';
// import SomethingHere from './SomethingHere';

function App() {
  const [account, setAccount] = useState(true);

  return (
    <div className="App">
      {account ? (
        <>
          <NavBar />
            {/* <div className="box-container sys-messages"><SystemMessages /></div> */}
            <div className="main-box-container">
              <MainImg />
              <MainText />
              </div>
            {/* <div className="box-container map-overview"><MapOverview /></div> */}

          <div className="lower-ui-grid">
            {/* <div className="box-container char"><CharacterOverview /></div> */}
          </div>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
