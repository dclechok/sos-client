// src/render/players/PlayerRenderer.js

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePlayerInput } from "./usePlayerInput";
import { useRemoteInterpolation } from "./useRemoteInterpolation";
import { useLocalPlayerPrediction } from "./useLocalPlayerPrediction";
import { getPlayerSheetRecord } from "./playerSheetRuntime";

import { getRoleColor } from "../../utils/roles";

import "../../styles/PlayerRenderer.css";

function RuntimePlayerSprite({
  appearance,
  facing = "right",
}) {
  const canvasRef = useRef(null);

  /*
   * Forces a redraw after the asynchronous
   * sprite composition finishes.
   */
  const [renderVersion, setRenderVersion] =
    useState(0);

  /*
   * Use a stable string dependency because an
   * appearance object may be recreated without
   * any actual values changing.
   */
  const appearanceKey = useMemo(() => {
    return JSON.stringify(
      appearance || {}
    );
  }, [appearance]);

  const sheetRecord = useMemo(() => {
    return getPlayerSheetRecord(
      appearance || {}
    );
  }, [appearanceKey]);

  useEffect(() => {
    let cancelled = false;

    if (
      sheetRecord.status ===
      "pending"
    ) {
      sheetRecord.promise.then(() => {
        if (!cancelled) {
          setRenderVersion(
            (current) =>
              current + 1
          );
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [sheetRecord]);

  useEffect(() => {
    const outputCanvas =
      canvasRef.current;

    const sourceCanvas =
      sheetRecord.canvas;

    if (
      !outputCanvas ||
      !sourceCanvas ||
      sheetRecord.status !==
        "ready"
    ) {
      return;
    }

    outputCanvas.width =
      sourceCanvas.width;

    outputCanvas.height =
      sourceCanvas.height;

    const context =
      outputCanvas.getContext(
        "2d"
      );

    if (!context) {
      return;
    }

    context.imageSmoothingEnabled =
      false;

    context.clearRect(
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    );

    context.drawImage(
      sourceCanvas,
      0,
      0
    );
  }, [
    sheetRecord,
    renderVersion,
  ]);

  if (
    sheetRecord.status ===
    "error"
  ) {
    return null;
  }

  return (
    <div
      className={`pr-spriteWrap ${
        facing === "left"
          ? "is-left"
          : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        className="pr-sprite"
        aria-hidden="true"
      />
    </div>
  );
}

export default function PlayerRenderer({
  socket,
  myId,
  players,
  character,
  accountRole,

  sendRateHz = 20,
  zoom = 2,
  renderOthers = true,
  playerNames = {},

  canvasRef,
  camSmoothRef,
  camTargetRef,
  predictedLocalPosRef,

  /*
   * Your composed sprite is now:
   *
   * 32 pixels wide
   * 42 pixels tall
   *
   * The extra 10 pixels allow hair to extend
   * above the regular 32×32 body frame.
   */
  spriteW = 32,
  spriteH = 42,
}) {
  const [
    hoverId,
    setHoverId,
  ] = useState(null);

  const [
    myFacing,
    setMyFacing,
  ] = useState("right");

  const [
    bubbles,
    setBubbles,
  ] = useState({});

  const me =
    myId && players
      ? players[myId]
      : null;

  const meRef = useRef(null);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const z = Math.max(
    1,
    Math.floor(
      Number(zoom) || 1
    )
  );

  const drawW =
    spriteW * z;

  const drawH =
    spriteH * z;

  // ── Canvas / world transforms ──────────────────────────────

  const getCanvasMetrics =
    useCallback(() => {
      const canvas =
        canvasRef?.current;

      if (!canvas) {
        return {
          cx:
            window.innerWidth /
            2,

          cy:
            window.innerHeight /
            2,

          scale: 1,
        };
      }

      const rectangle =
        canvas.getBoundingClientRect();

      return {
        cx:
          rectangle.left +
          rectangle.width / 2,

        cy:
          rectangle.top +
          rectangle.height / 2,

        scale:
          rectangle.width
            ? canvas.width /
              rectangle.width
            : 1,
      };
    }, [canvasRef]);

  const getRenderCam =
    useCallback(() => {
      const camera =
        camSmoothRef?.current;

      const fallback =
        meRef.current || {
          x: 0,
          y: 0,
        };

      const x =
        Number.isFinite(
          camera?.x
        )
          ? Number(camera.x)
          : Number(
              fallback.x || 0
            );

      const y =
        Number.isFinite(
          camera?.y
        )
          ? Number(camera.y)
          : Number(
              fallback.y || 0
            );

      if (z > 1) {
        return {
          x:
            Math.round(x * z) /
            z,

          y:
            Math.round(y * z) /
            z,
        };
      }

      return {
        x,
        y,
      };
    }, [
      camSmoothRef,
      z,
    ]);

  const snapWorld =
    useCallback(
      (value) => {
        const numeric =
          Number(value || 0);

        if (
          !Number.isFinite(
            numeric
          )
        ) {
          return 0;
        }

        if (z > 1) {
          return (
            Math.round(
              numeric * z
            ) / z
          );
        }

        return Math.round(
          numeric
        );
      },
      [z]
    );

  const worldToScreen =
    useCallback(
      (position) => {
        const {
          cx,
          cy,
          scale,
        } =
          getCanvasMetrics();

        const camera =
          getRenderCam();

        return {
          x:
            cx +
            ((Number(
              position.x || 0
            ) -
              camera.x) *
              z) /
              scale,

          y:
            cy +
            ((Number(
              position.y || 0
            ) -
              camera.y) *
              z) /
              scale,
        };
      },
      [
        getCanvasMetrics,
        getRenderCam,
        z,
      ]
    );

  const screenToWorld =
    useCallback(
      (
        clientX,
        clientY
      ) => {
        const {
          cx,
          cy,
          scale,
        } =
          getCanvasMetrics();

        const camera =
          getRenderCam();

        return {
          x:
            camera.x +
            ((clientX - cx) *
              scale) /
              z,

          y:
            camera.y +
            ((clientY - cy) *
              scale) /
              z,
        };
      },
      [
        getCanvasMetrics,
        getRenderCam,
        z,
      ]
    );

  // ── Display helpers ────────────────────────────────────────

  const getDisplayName =
    useCallback(
      (id, player) => {
        const playerName =
          player?.name;

        if (
          playerName &&
          String(
            playerName
          ).trim()
        ) {
          return String(
            playerName
          );
        }

        const mappedName =
          playerNames?.[id];

        if (
          mappedName &&
          String(
            mappedName
          ).trim()
        ) {
          return String(
            mappedName
          );
        }

        if (
          id === myId &&
          character?.charName
        ) {
          return String(
            character.charName
          );
        }

        return `Player ${String(
          id
        ).slice(0, 4)}`;
      },
      [
        playerNames,
        myId,
        character,
      ]
    );

  const normalizeRole =
    useCallback((role) => {
      const raw =
        role &&
        typeof role ===
          "object"
          ? role.name ??
            role.role ??
            role.type ??
            role.title ??
            role.key ??
            role.rank ??
            role.level ??
            ""
          : role;

      return (
        String(
          raw || "player"
        )
          .trim()
          .toLowerCase() ||
        "player"
      );
    }, []);

  // ── Chat bubbles ───────────────────────────────────────────

  useEffect(() => {
    const ttlFor = (
      text
    ) =>
      Math.max(
        3000,
        Math.min(
          18000,
          2000 +
            String(
              text || ""
            ).length *
              80
        )
      );

    const onBubble = (
      event
    ) => {
      const detail =
        event?.detail || {};

      const message =
        String(
          detail.message || ""
        ).trim();

      if (!message) {
        return;
      }

      const key =
        String(
          detail.senderId ??
            detail.user ??
            ""
        ).trim();

      if (!key) {
        return;
      }

      setBubbles(
        (current) => ({
          ...current,

          [key]: {
            text: message,

            expiresAt:
              Date.now() +
              ttlFor(message),

            role:
              detail.role ??
              null,
          },
        })
      );
    };

    window.addEventListener(
      "chat:bubble",
      onBubble
    );

    return () => {
      window.removeEventListener(
        "chat:bubble",
        onBubble
      );
    };
  }, []);

  useEffect(() => {
    const intervalId =
      setInterval(() => {
        const now =
          Date.now();

        setBubbles(
          (current) => {
            let changed =
              false;

            const next = {
              ...current,
            };

            for (
              const key of Object.keys(
                next
              )
            ) {
              if (
                now >=
                next[key]
                  .expiresAt
              ) {
                delete next[
                  key
                ];

                changed =
                  true;
              }
            }

            return changed
              ? next
              : current;
          }
        );
      }, 250);

    return () => {
      clearInterval(
        intervalId
      );
    };
  }, []);

  const getBubble =
    useCallback(
      (id, player) => {
        const bubble =
          bubbles?.[
            String(id)
          ] ||
          bubbles?.[
            getDisplayName(
              id,
              player
            )
          ];

        if (!bubble) {
          return null;
        }

        const remaining =
          Math.max(
            0,
            bubble.expiresAt -
              Date.now()
          );

        return {
          ...bubble,

          alpha:
            remaining < 1100
              ? remaining /
                1100
              : 1,
        };
      },
      [
        bubbles,
        getDisplayName,
      ]
    );

  // ── Input ──────────────────────────────────────────────────

  const inputEnabled =
    Boolean(socket);

  const onMoveToRef =
    useRef(null);

  const getMyPosRef =
    useRef(null);

  const onMoveToDelegate =
    useCallback(
      (position) =>
        onMoveToRef.current?.(
          position
        ),
      []
    );

  const getMyPosDelegate =
    useCallback(
      () =>
        getMyPosRef.current?.(),
      []
    );

  usePlayerInput({
    enabled:
      inputEnabled,

    sendRateHz,

    screenToWorld,

    onMoveTo:
      onMoveToDelegate,

    getMyPos:
      getMyPosDelegate,

    onFacingChange:
      (direction) =>
        setMyFacing(
          direction
        ),

    button: 2,

    deadzoneWorld: 0.5,

    targetRef:
      canvasRef,
  });

  // ── Local prediction ───────────────────────────────────────

  const {
    setMoveTarget,
    stepPrediction,
    getPredictedPos,
  } =
    useLocalPlayerPrediction({
      myId,
      players,
      camTargetRef,
      predictedLocalPosRef,
    });

  const onMoveTo =
    useCallback(
      ({ x, y }) => {
        setMoveTarget(
          x,
          y
        );

        if (socket) {
          socket.emit(
            "player:moveTo",
            {
              x: Number(x),
              y: Number(y),
            }
          );
        }
      },
      [
        socket,
        setMoveTarget,
      ]
    );

  const getMyPos =
    useCallback(() => {
      return (
        getPredictedPos() ||
        meRef.current ||
        getRenderCam()
      );
    }, [
      getPredictedPos,
      getRenderCam,
    ]);

  useEffect(() => {
    onMoveToRef.current =
      onMoveTo;
  }, [onMoveTo]);

  useEffect(() => {
    getMyPosRef.current =
      getMyPos;
  }, [getMyPos]);

  useEffect(() => {
    let animationFrame = 0;

    let lastMilliseconds =
      performance.now();

    const tick = (
      nowMilliseconds
    ) => {
      stepPrediction(
        Math.min(
          (nowMilliseconds -
            lastMilliseconds) /
            1000,
          0.05
        )
      );

      lastMilliseconds =
        nowMilliseconds;

      animationFrame =
        requestAnimationFrame(
          tick
        );
    };

    animationFrame =
      requestAnimationFrame(
        tick
      );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, [stepPrediction]);

  // ── Remote interpolation ───────────────────────────────────

  const {
    remoteIds,
    getRenderState,
  } =
    useRemoteInterpolation({
      players,
      myId,
      interpDelayMs: 120,
    });

  const visibleRemoteIds =
    useMemo(() => {
      return renderOthers
        ? remoteIds
        : [];
    }, [
      renderOthers,
      remoteIds,
    ]);

  const roleToColor =
    useCallback(
      (role) => {
        const roleColor =
          getRoleColor(
            normalizeRole(
              role
            )
          );

        return (
          roleColor?.primary ||
          "#e9e6f2"
        );
      },
      [normalizeRole]
    );

  const myRole =
    me?.accountRole ??
    accountRole ??
    "player";

  const predictedPosition =
    getPredictedPos();

  const displayX =
    predictedPosition
      ? Math.round(
          predictedPosition.x
        )
      : me
        ? Math.round(me.x)
        : 0;

  const displayY =
    predictedPosition
      ? Math.round(
          predictedPosition.y
        )
      : me
        ? Math.round(me.y)
        : 0;

  /*
   * Local appearance comes primarily from the
   * selected database character.
   *
   * The socket player appearance is used as a
   * fallback when available.
   */
  const localAppearance =
    character?.appearance ||
    me?.appearance ||
    {};

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="pr-root">
      {players &&
        myId &&
        visibleRemoteIds.map(
          (id) => {
            const player =
              players[id];

            if (!player) {
              return null;
            }

            const rawRenderState =
              getRenderState(
                id
              ) || {
                x: Number(
                  player.x ||
                    0
                ),

                y: Number(
                  player.y ||
                    0
                ),

                facing:
                  player?.facing ===
                  "left"
                    ? "left"
                    : "right",
              };

            const renderState = {
              ...rawRenderState,

              x: snapWorld(
                rawRenderState.x
              ),

              y: snapWorld(
                rawRenderState.y
              ),
            };

            const {
              x,
              y,
            } =
              worldToScreen(
                renderState
              );

            const hovered =
              hoverId === id;

            const bubble =
              getBubble(
                id,
                player
              );

            const name =
              getDisplayName(
                id,
                player
              );

            return (
              <div
                key={id}
                className={`pr-player ${
                  hovered
                    ? "is-hover"
                    : ""
                }`}
                onMouseEnter={() =>
                  setHoverId(id)
                }
                onMouseLeave={() =>
                  setHoverId(
                    (current) =>
                      current ===
                      id
                        ? null
                        : current
                  )
                }
                style={{
                  width:
                    drawW,

                  height:
                    drawH,

                  /*
                   * Anchor the player's world position near
                   * the bottom-center of the 32×42 sprite.
                   *
                   * This prevents the 10px hair overflow from
                   * shifting the player's feet/world position.
                   */
                  transform:
                    `translate3d(` +
                    `${Math.round(
                      x -
                        drawW /
                          2
                    )}px, ` +
                    `${Math.round(
                      y -
                        drawH
                    )}px, 0)`,
                }}
              >
                <RuntimePlayerSprite
                  appearance={
                    player?.appearance ||
                    {}
                  }
                  facing={
                    renderState.facing
                  }
                />

                {bubble && (
                  <div
                    className="pr-bubble"
                    style={{
                      "--bubbleA":
                        bubble.alpha,
                    }}
                  >
                    {
                      bubble.text
                    }

                    <div className="pr-bubbleTail" />
                  </div>
                )}

                {hovered && (
                  <div
                    className="pr-name"
                    style={{
                      "--nameColor":
                        roleToColor(
                          player?.accountRole ??
                            "player"
                        ),
                    }}
                  >
                    {name}
                  </div>
                )}
              </div>
            );
          }
        )}

      <div
        className={`pr-local ${
          hoverId === myId
            ? "is-hover"
            : ""
        }`}
        onMouseEnter={() =>
          setHoverId(myId)
        }
        onMouseLeave={() =>
          setHoverId(
            (current) =>
              current === myId
                ? null
                : current
          )
        }
        style={{
          width: drawW,
          height: drawH,

          /*
           * Keep the player's feet at the screen center.
           * The sprite itself extends upward from there.
           */
          transform:
            "translate(-50%, -100%)",
        }}
      >
        <RuntimePlayerSprite
          appearance={
            localAppearance
          }
          facing={
            myFacing
          }
        />

        {me &&
          (() => {
            const bubble =
              getBubble(
                myId,
                me
              );

            return bubble ? (
              <div
                className="pr-bubble"
                style={{
                  "--bubbleA":
                    bubble.alpha,
                }}
              >
                {bubble.text}

                <div className="pr-bubbleTail" />
              </div>
            ) : null;
          })()}

        {me &&
          hoverId ===
            myId && (
            <div
              className="pr-name"
              style={{
                "--nameColor":
                  roleToColor(
                    myRole
                  ),
              }}
            >
              {getDisplayName(
                myId,
                me
              )}
            </div>
          )}
      </div>

      {me && (
        <div className="pr-debug">
          x: {displayX}
          <br />

          y: {displayY}
          <br />

          zoom: {z}x
          <br />

          face: {myFacing}
          <br />

          class:{" "}
          {String(
            me?.class ||
              character?.class ||
              "—"
          )}
          <br />

          role:{" "}
          {String(
            myRole
          )}
        </div>
      )}
    </div>
  );
}