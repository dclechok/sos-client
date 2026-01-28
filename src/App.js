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

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

function App() {
  const [account, setAccount] = useState(undefined); // undefined = loading
  const [character, setCharacter] = useState(undefined); // undefined = loading

  useButtonClickSound();
  const { width, height } = useWindowSize();

  const {
    socket,
    isReady,
    worldSeed,
    myId,
    players,
    me,
    identify,
  } = useGameSocket();

  useEffect(() => {
    async function init() {
      const { account: storedAccount, character: storedChar } = loadStoredSession();

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

  // Identify after socket connected AND character actually selected (not undefined, not null)
  useEffect(() => {
    if (!isReady) return;
    if (!character) return; // skips undefined + null

    const characterId = character._id || character.id;
    if (!characterId) return;

    identify(characterId);

  }, [isReady, character, identify]);

  if (width === 0 || height === 0) return <Spinner />;
  if (width < 800 || height < 500) return <DisplayCheck />;

  if (account === null) return <Login setAccount={setAccount} />;

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

  return (
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
      <NavBar account={account} />

      <MainViewport
        worldSeed={worldSeed}
        cameraX={me?.x ?? 0}
        cameraY={me?.y ?? 0}
      />

      <PlayerRenderer socket={socket} myId={myId} players={players} />

      <ChatMenu character={character} />
    </div>
  );
}

export default App;
