// App.js
import "./styles/App.css";
import { useState, useEffect, useRef, useMemo } from "react";

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
// If you placed the new files at: src/render/players/PlayerRenderer.jsx
import PlayerRenderer from "./render/players/PlayerRenderer";

import { useWorldBoot } from "./hooks/useWorldBoot";
import WorldBootOverlay from "./WorldBootOverlay";

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

  const bootSteps = useMemo(
    () => ["snapshot", "stars", "nebula", "dust", "ready"],
    []
  );
  const worldBoot = useWorldBoot(bootSteps);

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

  // Start boot immediately when character is chosen (overlay first)
  useEffect(() => {
    const hasPickedCharacter = character && character !== null;

    if (!hasPickedCharacter) {
      worldBoot.api.end();
      worldBoot.api.reset();
      return;
    }

    worldBoot.api.reset();
    worldBoot.api.begin();

    worldBoot.api.start("snapshot", "Waiting for server…");
    worldBoot.api.start("stars", "Preparing starfield…");
    worldBoot.api.start("nebula", "Baking nebula…");
    worldBoot.api.start("dust", "Spawning dust…");
    worldBoot.api.start("ready", "Loading ship sprite…");
  }, [character]); // intentionally NOT dependent on isReady/worldSeed

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

  const bootActive = worldBoot.active;

  // ✅ Only mount world once socket + seed are ready
  const canMountWorld = bootActive && isReady && Number.isFinite(worldSeed);

  return (
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
      <NavBar account={account} />

      <WorldBootOverlay worldBoot={worldBoot} />

      {canMountWorld && (
        <MainViewport
          canvasRef={canvasRef}
          worldSeed={worldSeed}
          cameraX={me?.x ?? 0}
          cameraY={me?.y ?? 0}
          worldBoot={worldBoot}
          bootApi={worldBoot.api}
        />
      )}

      {canMountWorld && (
        <PlayerRenderer
          socket={socket}
          myId={myId}
          players={players}
          canvasRef={canvasRef}
          worldBoot={worldBoot}
          bootApi={worldBoot.api}
        />
      )}

      {worldBoot.ready && <ChatMenu character={character} />}
    </div>
  );
}
