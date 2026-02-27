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

import { useWorldObjects } from "./world/useWorldObjects";

// ✅ NEW right docked menu (Character top + Inventory bottom)
import RightPanelMenu from "./RightPanelMenu";

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
  const [inventoryOpen, setInventoryOpen] = useState(false);

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

  const world = useWorldChunks({ preloadRadiusChunks: 2 });

  const { renderMapFrame } = useWorldMapRenderer({ world, me });

  const { objects: worldObjects } = useWorldObjects({ socket, me, radius: 2400 });

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

  const hasPickedCharacter = character && character !== null;
  const canMountWorld =
    hasPickedCharacter && isReady && Number.isFinite(worldSeed);

  // -------------------------
  // ✅ HOTKEYS (robust, single listener, uses refs)
  const canMountWorldRef = useRef(false);
  const inventoryOpenRef = useRef(false);
  const mapOpenRef = useRef(false);

  useEffect(() => {
    canMountWorldRef.current = canMountWorld;
  }, [canMountWorld]);

  useEffect(() => {
    inventoryOpenRef.current = inventoryOpen;
  }, [inventoryOpen]);

  useEffect(() => {
    mapOpenRef.current = mapOpen;
  }, [mapOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      // ignore typing in inputs/textarea/contenteditable
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isTyping) return;

      // Toggle inventory panel on I
      if (e.code === "KeyC") {
        if (!canMountWorldRef.current) return;
        e.preventDefault();

        setInventoryOpen((v) => !v);
        setMapOpen(false);
        return;
      }
      // Toggle map on M
      if (e.code === "KeyM") {
        if (!canMountWorldRef.current) return;
        e.preventDefault();

        setMapOpen((v) => !v);
        setInventoryOpen(false);
        return;
      }
      // Esc closes open menus
      if (e.code === "Escape") {
        if (inventoryOpenRef.current || mapOpenRef.current) {
          e.preventDefault();
          setInventoryOpen(false);
          setMapOpen(false);
        }
      }
    };

    // capture phase so it fires even if something stops propagation
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // -------------------------

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

  const zoom = 2;

  return (
    <div className="App" onContextMenu={(e) => e.preventDefault()}>
        <NavBar
          onMapClick={() => setMapOpen(true)}
          onCharacterClick={() => setInventoryOpen(true)}
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
          zoom={zoom}
          me={me}
          worldObjects={worldObjects}      // from useWorldObjects().objects
          objectDefs={objectDefs}     // your defs map (defId -> def with sizePx)
        />
      )}

      {/* ✅ RIGHT DOCKED CHARACTER + INVENTORY PANEL */}
      {canMountWorld && inventoryOpen && (
        <div
          className="rightpanel-overlay"
        >
          <RightPanelMenu
            account={account}
            character={character}
            onClose={() => setInventoryOpen(false)}
          />
        </div>
      )}

      <MapDrawer
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        renderMapFrame={renderMapFrame}
      />

      {/* ✅ DEBUG BADGE (remove later) */}
      <div
        style={{
          position: "fixed",
          left: 10,
          bottom: 10,
          zIndex: 999999,
          padding: "4px 8px",
          fontSize: 12,
          background: "rgba(0,0,0,0.55)",
          color: "white",
          borderRadius: 6,
          pointerEvents: "none",
          fontFamily: "monospace",
        }}
      >
        inv:{String(inventoryOpen)} world:{String(canMountWorld)}
      </div>
    </div>
  );
}