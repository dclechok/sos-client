// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";
import useButtonClickSound from "./hooks/useButtonClickSound";

import Login from "./Login";
import NavBar from "./NavBar";
import CharacterSelection from "./CharacterSelection";
import LogoutButton from "./LogoutButton";

import { loadStoredSession, verifyToken } from "./utils/session";

import { useGameSocket } from "./hooks/useGameSocket";
import MainViewport from "./MainViewport";
import ChatMenu from "./ChatMenu";
import PlayerRenderer from "./PlayerRenderer";

// --------------------------------------------------
// Window-size hook (must NOT be conditional)
// --------------------------------------------------
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    handler();
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

  useButtonClickSound();
  const { width, height } = useWindowSize();

  // ✅ Call the hook (this gives you socket + worldSeed + myId + players)
  const {
    socket,
    isReady,
    worldSeed,
    myId,
    players,
    me,
    identify,
    loadScene,
    // send, useSocketEvent  // still available if other components use them
  } = useGameSocket({
    // optional: if you still use sceneData anywhere
    // onSceneData: (data) => console.log("sceneData:", data),
  });

  // --------------------------------------------------
  // Restore local session + verify token cleanly
  // --------------------------------------------------
  useEffect(() => {
    async function init() {
      const { account: storedAccount, character: storedChar } =
        loadStoredSession();

      if (!storedAccount?.token) {
        setAccount(null);
        setCharacter(null);
        return;
      }

      const valid = await verifyToken(storedAccount.token);

      if (!valid) {
        localStorage.removeItem("pd_token");
        localStorage.removeItem("pd_account");
        localStorage.removeItem("pd_character");
        setAccount(null);
        setCharacter(null);
        return;
      }

      setAccount(valid);
      setCharacter(storedChar || null);
    }

    init();
  }, []);

  // --------------------------------------------------
  // IDENTIFY + LOAD SCENE (after socket is ready AND character chosen)
  // --------------------------------------------------
  useEffect(() => {
    if (!isReady) return;
    if (!character) return;

    const characterId = character._id || character.id;
    if (!characterId) return;

    console.log("🔗 identify ->", characterId);

    // ✅ new hook API (still emits to socket)
    identify(characterId);

    // ✅ loadScene after identify so server will accept player:input
    loadScene();
  }, [isReady, character, identify, loadScene]);

  if (width === 0 || height === 0) return <Spinner />;
  if (width < 1100 || height < 700) return <DisplayCheck />;

  // --------------------------------------------------
  // ROUTING LOGIC (your exact flow)
  // --------------------------------------------------
  if (account === null) {
    return <Login setAccount={setAccount} />;
  }

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
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
      <NavBar account={account} />

      {/* ✅ background uses same worldSeed, and camera uses server-authoritative me.x/me.y */}
      <MainViewport
        worldSeed={worldSeed}
        cameraX={me?.x ?? 0}
        cameraY={me?.y ?? 0}
      />

      {/* ✅ ships render from server snapshots */}
      <PlayerRenderer socket={socket} myId={myId} players={players} />

      {/* ChatMenu can keep using old send/useSocketEvent if it needs */}
      <ChatMenu character={character} />
    </div>
  );
}

export default App;
