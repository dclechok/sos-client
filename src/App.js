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

  // ✅ Shared ref written by useLocalPlayerPrediction (in PlayerRenderer)
  // and read by MainViewport's render loop each frame.
  // Do NOT use React state — this must be zero-overhead.
  const predictedLocalPosRef = useRef(null);

  // ✅ REMOVED: the old useEffect that wrote camTargetRef from `me` every snapshot.
  // That was overriding the prediction hook's smooth position with a raw server
  // position every 50ms, causing the camera to stutter.
  //
  // Instead: only initialize camSmoothRef on first valid position, then let
  // useLocalPlayerPrediction own camTargetRef from that point on.
  const camInitializedRef = useRef(false);
  useEffect(() => {
    if (camInitializedRef.current) return; // only run once
    if (!me) return;
    const x = Number(me.x);
    const y = Number(me.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    // Snap both refs to starting position so there's no initial camera jump
    camTargetRef.current = { x, y };
    camSmoothRef.current = { x, y };
    predictedLocalPosRef.current = { x, y };
    camInitializedRef.current = true;
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

  // session boot
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

  const canMountWorldRef = useRef(false);
  const inventoryOpenRef = useRef(false);
  const mapOpenRef = useRef(false);

  useEffect(() => { canMountWorldRef.current = canMountWorld; }, [canMountWorld]);
  useEffect(() => { inventoryOpenRef.current = inventoryOpen; }, [inventoryOpen]);
  useEffect(() => { mapOpenRef.current = mapOpen; }, [mapOpen]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.code === "KeyC") {
        if (!canMountWorldRef.current) return;
        e.preventDefault();
        setInventoryOpen((v) => !v);
        setMapOpen(false);
        return;
      }
      if (e.code === "KeyM") {
        if (!canMountWorldRef.current) return;
        e.preventDefault();
        setMapOpen((v) => !v);
        setInventoryOpen(false);
        return;
      }
      if (e.code === "Escape") {
        if (inventoryOpenRef.current || mapOpenRef.current) {
          e.preventDefault();
          setInventoryOpen(false);
          setMapOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

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
          players={players}
          myId={myId}
          mySpriteSrc="/art/items/sprites/AdeptNecromancer.gif"
          otherSpriteSrc="/art/items/sprites/NovicePyromancer.gif"
          playerSpriteW={16}
          playerSpriteH={16}
          predictedLocalPosRef={predictedLocalPosRef}  // ✅ canvas reads predicted pos here
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
          camTargetRef={camTargetRef}              // ✅ prediction writes camera here
          predictedLocalPosRef={predictedLocalPosRef}  // ✅ prediction writes pos here
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
          worldObjects={worldObjects}
          objectDefs={objectDefs}
        />
      )}

      {canMountWorld && inventoryOpen && (
        <div className="rightpanel-overlay">
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

    </div>
  );
}