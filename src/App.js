// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

// utils
import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";

// UI Components
import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import MainText from "./MainText";
import ChatMenu from "./ChatMenu";
import NavigationMenu from "./NavigationMenu";
import CharacterMenu from "./CharacterMenu";

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
  // undefined = still checking auth
  // null      = not logged in
  // object    = logged in
  const [account, setAccount] = useState(undefined);

  useEffect(() => {
    const token = localStorage.getItem("pd_token");

    // no token at all → explicitly “not logged in”
    if (!token) {
      setAccount(null);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem("pd_token");
          setAccount(null);
          return;
        }

        const data = await res.json();

        setAccount({
          id: data.user.id,
          username: data.user.username,
          token,
        });
      } catch (err) {
        console.error("Error verifying token:", err);
        localStorage.removeItem("pd_token");
        setAccount(null);
      }
    }

    verifyToken();
  }, []);

  // display check
  const { width, height } = useWindowSize();
  const tooSmall = width < 1160 || height < 800;

  if (tooSmall) {
    return <DisplayCheck />;
  }

  // still checking auth → show spinner or loading screen
  if (account === undefined) {
    return <Spinner />; // or some loading UI
  }

  // logged in
  if (account) {
    return (
      <div className="App">
        <NavBar />
        <div className="game-shell">
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
              <CharacterMenu account={account} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // not logged in
  return (
    <div className="App">
      <Login setAccount={setAccount} />
    </div>
  );
}

export default App;
