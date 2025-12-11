// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";
import useButtonClickSound from "./hooks/useButtonClickSound";

import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import Gameshell from "./Gameshell";
import ChatMenu from "./ChatMenu";
import NavigationMenu from "./NavigationMenu";
import CharacterMenu from "./CharacterMenu";
import CharacterSelection from "./CharacterSelection";
import LogoutButton from "./LogoutButton";

import { loadStoredSession, verifyToken } from "./utils/session";
import StatusBar from "./StatusBar";

import socket from "./hooks/socket"; 
import CreatureOverlay from "./CreatureOverlay";

// --------------------------------------------------
// Window-size hook (must NOT be conditional)
// --------------------------------------------------
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handler = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// --------------------------------------------------
// MAIN APP COMPONENT
// --------------------------------------------------
function App() {

  const [account, setAccount] = useState(undefined); // undefined = loading
  const [character, setCharacter] = useState(undefined);
  const [playerLoc, setPlayerLoc] = useState({ x: 0, y: 0 });
  const [sceneData, setSceneData] = useState(null);

  useButtonClickSound();
  const { width, height } = useWindowSize();

  // --------------------------------------------------
  // Restore local session + verify token cleanly
  // --------------------------------------------------
  useEffect(() => {
    async function init() {
      const { account: storedAccount, character: storedChar } = loadStoredSession();

      if (!storedAccount?.token) {
        setAccount(null);
        setCharacter(null);
        return;
      }

      // Attempt to verify token
      const valid = await verifyToken(storedAccount.token);

      if (!valid) {
        // Token invalid → wipe storage
        localStorage.removeItem("pd_token");
        localStorage.removeItem("pd_account");
        localStorage.removeItem("pd_character");
        setAccount(null);
        setCharacter(null);
        return;
      }

      // Token valid → restore full session
      setAccount(valid);
      setCharacter(storedChar || null);
    }

    init();
  }, []);

  // --------------------------------------------------
  // IDENTIFY PLAYER TO SOCKET SERVER
  // --------------------------------------------------
  useEffect(() => {
    if (!character) return; // Only run when character is chosen

    console.log("🔗 Identifying player to server:", character._id || character.id);

    socket.emit("identify", {
      characterId: character._id || character.id
    });

  }, [character]);

  // --------------------------------------------------
  // SIZE CHECK
  // --------------------------------------------------
  if (width < 1100 || height < 700) return <DisplayCheck />;

  // --------------------------------------------------
  // Still loading session
  // --------------------------------------------------
  if (account === undefined) return <Spinner />;

  // --------------------------------------------------
  // ROUTING LOGIC (your exact flow)
  // --------------------------------------------------
  // Not logged in → Login screen
  if (account === null) {
    return <Login setAccount={setAccount} />;
  }

  // Logged in but no character chosen → Character Selection
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
            <NavigationMenu playerLoc={playerLoc} />
          </div>
          <ChatMenu character={character}/>
        </div>

        <div className="center-container">
          <div className="mainimg-wrapper">
            <MainImg />
            <CreatureOverlay creatures={sceneData?.creatures || []}/>
            <StatusBar />
          </div>
          <Gameshell
            character={character}
            setPlayerLoc={setPlayerLoc}
            setSceneData={setSceneData}
            sceneData={sceneData}
          />

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
