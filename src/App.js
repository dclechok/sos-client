// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

// utils
import DisplayCheck from "./DisplayCheck";

// UI Components
import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import MainText from "./MainText";
import ChatMenu from "./ChatMenu";
import NavigationMenu from "./NavigationMenu";
// import SystemMessages from "./SystemMessages";
// import ActionMenu from "./ActionMenu";
import CharacterMenu from "./CharacterMenu";

// handles display check
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

function App() {
  const [account, setAccount] = useState(true);

  // useEffect(() => {
  //   const token = localStorage.getItem("pd_token");
  //   if (!token) return;
  //
  //   async function verifyToken() {
  //     try {
  //       const res = await fetch("http://localhost:5000/api/auth/me", {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });
  //
  //       if (!res.ok) {
  //         localStorage.removeItem("pd_token");
  //         setAccount(false);
  //         return;
  //       }
  //
  //       const data = await res.json();
  //
  //       setAccount({
  //         id: data.user.id,
  //         username: data.user.username,
  //         token,
  //       });
  //     } catch (err) {
  //       console.error("Error verifying token:", err);
  //       localStorage.removeItem("pd_token");
  //       setAccount(false);
  //     }
  //   }
  //
  //   verifyToken();
  // }, []);

  //handles display check
  const { width, height } = useWindowSize();
  const tooSmall = width < 1160 || height < 800;

  if (tooSmall) {
    return <DisplayCheck />;
  }

  return (
    <div className="App">
      {account ? (
        <>
          <NavBar /* you can pass account here if you want */ />
          <div className="game-shell">
            {/* <div className="box-container sys-messages"><SystemMessages /></div> */}

            <div className="column-left">
              <div className="box-container map-overview">
                <NavigationMenu />
              </div>

              <>Hello2HeHello2HeHello2HeHello2HeHello2HeHeello2HeHeello2HeHeello2HeHeello2HeHello2HeHello2HeHello2HeHello2HeHello2He</>

              <ChatMenu />
            </div>

            <div className="center-container">
              <MainImg />
              <MainText />
            </div>

            <div className="column-right">
              <div className="box-container char">
                <CharacterMenu />
              </div>
            </div>
          </div>
        </>
      ) : (
        <Login setAccount={setAccount} />
      )}
    </div>
  );
}

export default App;
