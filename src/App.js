// App.js
import "./styles/App.css";
import { useState, useEffect, useRef } from "react";

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

// ✅ UPDATED import for the split PlayerRenderer
import PlayerRenderer from "./render/players/PlayerRenderer";

function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handler = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

export default function App() {
  const [account, setAccount] = useState(undefined);
  const [character, setCharacter] = useState(undefined);

  useButtonClickSound();
  const { width, height } = useWindowSize();

  const { socket, isReady, worldSeed, myId, players, me, identify } =
    useGameSocket();

  const canvasRef = useRef(null);

  const camStableRef = useRef({ x: 0, y: 0 });
  const rawX =
    typeof me?.x === "number" ? me.x : (camStableRef.current.x ?? 0);
  const rawY =
    typeof me?.y === "number" ? me.y : (camStableRef.current.y ?? 0);

  // tweak: 0.25–1.0 typical
  const EPS = 0.35;

  const cameraX =
    Math.abs(rawX - camStableRef.current.x) < EPS
      ? camStableRef.current.x
      : (camStableRef.current.x = rawX);

  const cameraY =
    Math.abs(rawY - camStableRef.current.y) < EPS
      ? camStableRef.current.y
      : (camStableRef.current.y = rawY);

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

  // Identify after socket connected AND character selected
  useEffect(() => {
    if (!isReady) return;
    if (!character) return;

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

  // ✅ Only mount world once socket + seed are ready (DO NOT gate on bootActive)
  const hasPickedCharacter = character && character !== null;
  const canMountWorld =
    hasPickedCharacter && isReady && Number.isFinite(worldSeed);

  return (
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
      <NavBar account={account} />

      {canMountWorld && (
        <MainViewport
          canvasRef={canvasRef}
          worldSeed={worldSeed}
          cameraX={cameraX}
          cameraY={cameraY}
        />
      )}

      {canMountWorld && (
        <PlayerRenderer
          socket={socket}
          myId={myId}
          players={players}
          canvasRef={canvasRef}
        />
      )}

      {<ChatMenu character={character} />}
    </div>
  );
}
