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
import CharacterSelection from "./CharacterSelection"; // ← you will create this

// window size hook
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
  // undefined = checking auth
  // null = not logged in
  // object = logged in
  const [account, setAccount] = useState(undefined);

  // character loading flag
  const [character, setCharacter] = useState(null); // null = not chosen yet

  // verify token on load
  useEffect(() => {
    const token = localStorage.getItem("pd_token");

    if (!token) {
      setAccount(null);
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
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
        characters: data.user.characters || [],
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

  if (tooSmall) return <DisplayCheck />;

  // still checking auth
  if (account === undefined) return <Spinner />;

  // ❶ Not logged in → show Login
  if (account === null) {
    return <Login setAccount={setAccount} />;
  }

  // ❷ Logged in, but no character selected yet → show character selection
  if (account && character === null) {
    return (
      <CharacterSelection
        account={account}
        setCharacter={setCharacter}
      />
    );
  }

  // ❸ Logged in + character loaded → full game UI
  return (
    <div className="App">
      <NavBar account={account} />
      <div className="game-shell">

        <div className="column-left">
          <div className="box-container map-overview">
            <NavigationMenu />
          </div>

          <ChatMenu />
        </div>

        <div className="center-container">
          <MainImg />
          <MainText />
        </div>

        <div className="column-right">
          <div className="box-container char">
            <CharacterMenu account={account} character={character} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
