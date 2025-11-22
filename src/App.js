// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";
import useButtonClickSound from "./hooks/useButtonClickSound";

import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import MainText from "./MainText";
import ChatMenu from "./ChatMenu";
import NavigationMenu from "./NavigationMenu";
import CharacterMenu from "./CharacterMenu";
import CharacterSelection from "./CharacterSelection";
import LogoutButton from "./LogoutButton";

import { loadStoredSession, verifyToken } from "./utils/session";

// --------------------------------------------------
// Window-size hook (must NOT be conditional)
// --------------------------------------------------
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handler() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// --------------------------------------------------
// MAIN APP COMPONENT
// --------------------------------------------------
function App() {
  const [account, setAccount] = useState(undefined);
  const [character, setCharacter] = useState(undefined);

  useButtonClickSound();
  const { width, height } = useWindowSize();

  // --------------------------------------------------
  // Restore local session + verify token
  // --------------------------------------------------
  useEffect(() => {
  const token = localStorage.getItem("pd_token");
  const savedAccount = localStorage.getItem("pd_account");
  const savedCharacter = localStorage.getItem("pd_character");

  if (!token || !savedAccount) {
    setAccount(null);
    setCharacter(null);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(savedAccount);
  } catch {
    setAccount(null);
    return;
  }

  // Make sure id exists
  if (!parsed.id) {
    console.warn("Invalid saved account. Clearing storage.");
    localStorage.removeItem("pd_account");
    localStorage.removeItem("pd_token");
    return;
  }

  // Restore account
  setAccount({ ...parsed, token });

  // Restore character
  if (savedCharacter) {
    try {
      setCharacter(JSON.parse(savedCharacter));
    } catch {
      setCharacter(null);
    }
  } else {
    setCharacter(null);
  }
}, []);


  // --------------------------------------------------
  // SIZE CHECK
  // --------------------------------------------------
  if (width < 1160 || height < 800) return <DisplayCheck />;
  if (account === undefined) return <Spinner />;

  // --------------------------------------------------
  // ROUTING LOGIC
  // --------------------------------------------------

  // Not logged in → Login
  if (account === null) {
    return <Login setAccount={setAccount} />;
  }

  // Logged in but no character chosen
  if (character === null) {
    return (
      <>
        <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
        <CharacterSelection
          account={account}
          setAccount={setAccount}
          setCharacter={(char) => {
            setCharacter(char);
            localStorage.setItem("pd_character", JSON.stringify(char));
          }}
        />
      </>
    );
  }

  // Logged in + character selected → Game UI
  return (
    <div className="App">
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />

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
