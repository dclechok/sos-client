// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

// UI Components
import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import MainText from "./MainText";
// import MapOverview from './MapOverview';
// import SystemMessages from './SystemMessages';
// import ActionMenu from './ActionMenu';
// import CharacterOverview from './CharacterOverview';

function App() {
  const [account, setAccount] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("pd_token");
    if (!token) return;

    // Verify token with the backend and load user
    async function verifyToken() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          // token invalid or expired
          localStorage.removeItem("pd_token");
          setAccount(false);
          return;
        }

        const data = await res.json();
        // data.user should be { id, username, ... }

        setAccount({
          id: data.user.id,
          username: data.user.username,
          token,
        });
      } catch (err) {
        console.error("Error verifying token:", err);
        localStorage.removeItem("pd_token");
        setAccount(false);
      }
    }

    verifyToken();
  }, []);

  return (
    <div className="App">
      {account ? (
        <>
          <NavBar /* you can pass account here if you want */ />

          {/* <div className="box-container sys-messages"><SystemMessages /></div> */}

          <div className="main-box-container">
            <MainImg />
            <MainText />
          </div>

          <div className="lower-ui-grid">
            {/* <div className="box-container map-overview"><MapOverview /></div> */}
            {/* <div className="box-container char"><CharacterOverview /></div> */}
          </div>
        </>
      ) : (
        <Login setAccount={setAccount} />
      )}
    </div>
  );
}

export default App;
