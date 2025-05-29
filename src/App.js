import './styles/App.css';

// UI
import NavBar from './NavBar';
import MainText from './MainText';
import MapOverview from './MapOverview';
import SystemMessages from './SystemMessages';
import SomethingHere from './SomethingHere';
import ActionMenu from './ActionMenu';

function App() {
  return (
    <div className="App">
     <NavBar />
    <div className="ui-grid">
      <div className="box-container sys-messages"><SystemMessages /></div>
      <div className="box-container main-text"><MainText  /></div>
      <div className="box-container map-overview"><MapOverview /></div>
    </div>
       <div className="lower-ui-grid">
        <div className="box-container action-bar"><ActionMenu /></div>
       </div>
    </div>
  );
}

export default App;
