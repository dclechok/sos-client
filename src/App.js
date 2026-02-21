// App.js
import "./styles/App.css";
import { useState, useEffect, useRef } from "react";

import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";
import useButtonClickSound from "./hooks/useButtonClickSound";

import Login from "./Login";
import NavBar from "./NavBar";
import CharacterSelection from "./CharacterSelection";

import { loadStoredSession, verifyToken } from "./utils/session";
import { useGameSocket } from "./hooks/useGameSocket";

import MainViewport from "./MainViewport";
import ChatMenu from "./ChatMenu";

import PlayerRenderer from "./render/players/PlayerRenderer";

import MapDrawer from "./MapDrawer";
import { useWorldMapRenderer } from "./render/systems/map/useWorldMapRenderer";

import { useWorldChunks } from "./world/useWorldChunks";

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
  const [mapOpen, setMapOpen] = useState(false);

  useButtonClickSound();
  const { width, height } = useWindowSize();

  const { socket, isReady, worldSeed, myId, players, me, identify } =
    useGameSocket();

  const canvasRef = useRef(null);

  // ✅ ONE shared camera for BOTH canvas + DOM overlays
  const camTargetRef = useRef({ x: 0, y: 0 });
  const camSmoothRef = useRef({ x: 0, y: 0 });

  // Keep camera target following "me"
  useEffect(() => {
    if (!me) return;
    const x = Number(me.x);
    const y = Number(me.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    camTargetRef.current.x = x;
    camTargetRef.current.y = y;

    // init smooth camera on first valid me
    if (
      !Number.isFinite(camSmoothRef.current.x) ||
      !Number.isFinite(camSmoothRef.current.y)
    ) {
      camSmoothRef.current.x = x;
      camSmoothRef.current.y = y;
    }
  }, [me]);

  const world = useWorldChunks({
    metaUrl: "/world/meta.json",
    chunkBaseUrl: "/world/chunks",
    preloadRadiusChunks: 2,
  });

  const { renderMapFrame } = useWorldMapRenderer({
    world,
    me,
  });

  // -------------------------
  // session boot logic
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
      // Only restore character from storage if it actually exists
      setCharacter(storedChar || null);
    }
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!character) return;

    const characterId = character._id || character.id;
    if (!characterId) return;

    identify(characterId);
  }, [isReady, character, identify]);

  // -------------------------
  // Guard: window not measured yet
  if (width === 0 || height === 0) return <Spinner />;
  if (width < 800 || height < 500) return <DisplayCheck />;

  // Guard: session still loading (undefined = not resolved yet)
  if (account === undefined) return <Spinner />;

  // Guard: not logged in
  if (account === null) return <Login setAccount={setAccount} />;

  // Guard: session loaded but character not resolved yet
  if (character === undefined) return <Spinner />;

  // Guard: logged in but no character selected → show character selection
  if (character === null) {
    return (
      <CharacterSelection
        account={account}
        setAccount={setAccount}
        setCharacter={(char) => {
          setCharacter(char);
          localStorage.setItem("pd_character", JSON.stringify(char));
        }}
      />
    );
  }

  const hasPickedCharacter = character && character !== null;
  const canMountWorld =
    hasPickedCharacter && isReady && Number.isFinite(worldSeed);

  // choose ONE zoom value and pass it to both
  const zoom = 2;

  return (
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
      <NavBar
        onMapClick={() => setMapOpen(true)}
        setAccount={setAccount}
        setCharacter={setCharacter}
      />

      {canMountWorld && (
        <MainViewport
          canvasRef={canvasRef}
          world={world}
          worldSeed={worldSeed}
          zoom={zoom}
          camTargetRef={camTargetRef}
          camSmoothRef={camSmoothRef}
        />
      )}

      {canMountWorld && (
        <PlayerRenderer
          socket={socket}
          myId={myId}
          players={players}
          character={character}
          canvasRef={canvasRef}
          zoom={zoom}
          camSmoothRef={camSmoothRef}
        />
      )}

      {canMountWorld && <ChatMenu character={character} myId={myId} />}

      <MapDrawer
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        renderMapFrame={renderMapFrame}
      />
    </div>
  );
}