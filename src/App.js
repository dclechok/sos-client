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
import AdminPanel from "./AdminPanel.js";

// ✅ NEW
import { useWorldObjects } from "./world/useWorldObjects";

const API = process.env.REACT_APP_API_BASE_URL || "";

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

  // ✅ NEW: object defs map for renderer (defId -> def)
  const [objectDefs, setObjectDefs] = useState({});

  useButtonClickSound();
  const { width, height } = useWindowSize();

  const { socket, isReady, worldSeed, myId, players, me, identify } =
    useGameSocket();

  const canvasRef = useRef(null);

  const camTargetRef = useRef({ x: 0, y: 0 });
  const camSmoothRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!me) return;
    const x = Number(me.x);
    const y = Number(me.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    camTargetRef.current.x = x;
    camTargetRef.current.y = y;

    if (
      !Number.isFinite(camSmoothRef.current.x) ||
      !Number.isFinite(camSmoothRef.current.y)
    ) {
      camSmoothRef.current.x = x;
      camSmoothRef.current.y = y;
    }
  }, [me]);

  const world = useWorldChunks({
    preloadRadiusChunks: 2,
  });

  const { renderMapFrame } = useWorldMapRenderer({
    world,
    me,
  });

  // ✅ NEW: keep world objects in client state
  const { objects: worldObjects } = useWorldObjects({ socket, me, radius: 2400 });

  // ✅ NEW: fetch defs once (sprites + light config)
  useEffect(() => {
    if (!isReady) return;
    fetch(`${API}/api/defs/objects`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const list = j?.objects || [];
        const map = {};
        for (const o of list) {
          const id = String(o.id ?? o.key ?? o.name ?? "");
          if (!id) continue;
          map[id] = o;
        }
        setObjectDefs(map);
      })
      .catch(() => {});
  }, [isReady]);

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

      setAccount({
        ...storedAccount,
        ...valid,
        role: valid?.role ?? storedAccount?.role,
      });
      setCharacter(storedChar || null);
    }
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!character) return;

    const characterId = character._id || character.id;
    if (!characterId) return;

    identify(characterId, account?.role);
  }, [isReady, character, identify, account?.role]);

  if (width === 0 || height === 0) return <Spinner />;
  if (width < 800 || height < 500) return <DisplayCheck />;
  if (account === undefined) return <Spinner />;
  if (account === null) return <Login setAccount={setAccount} />;
  if (character === undefined) return <Spinner />;

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
          // ✅ NEW
          worldObjects={worldObjects}
          objectDefs={objectDefs}
        />
      )}

      {canMountWorld && (
        <PlayerRenderer
          socket={socket}
          myId={myId}
          players={players}
          character={character}
          accountRole={account?.role}
          canvasRef={canvasRef}
          zoom={zoom}
          camSmoothRef={camSmoothRef}
        />
      )}

      {canMountWorld && <ChatMenu character={character} myId={myId} />}

      {canMountWorld && ["owner", "admin"].includes(account?.role) && (
        <AdminPanel
          socket={socket}
          canvasRef={canvasRef}
          camSmoothRef={camSmoothRef}
          camTargetRef={camTargetRef}
          zoom={zoom}
          me={me}
        />
      )}

      <MapDrawer
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        renderMapFrame={renderMapFrame}
      />
    </div>
  );
}