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
  const canvasRef =
    useRef(null);

  const [
    renderVersion,
    setRenderVersion,
  ] = useState(0);

  const [
    isBlinking,
    setIsBlinking,
  ] = useState(false);

  /*
   * Random blink timing.
   */
  const BLINK_MIN_DELAY_MS =
    2500;

  const BLINK_MAX_DELAY_MS =
    7500;

  const BLINK_DURATION_MS =
    120;

  /*
   * Your composed sprite is 32×42.
   *
   * The body starts 10 pixels below the top
   * because hair can extend upward.
   *
   * These bounds keep the eye search limited
   * to the face area.
   */
  const FACE_LEFT = 7;
  const FACE_RIGHT = 24;
  const FACE_TOP = 12;
  const FACE_BOTTOM = 24;

  const appearanceKey =
    useMemo(() => {
      return JSON.stringify(
        appearance || {}
      );
    }, [appearance]);

  const sheetRecord =
    useMemo(() => {
      return getPlayerSheetRecord(
        appearance || {}
      );
    }, [appearanceKey]);

  /*
   * Convert the currently selected eye color
   * from hex into RGB values so we can locate
   * those exact pixels on the composed canvas.
   */
  const eyeRgb =
    useMemo(() => {
      const fallback =
        "#3b271b";

      const raw =
        String(
          appearance?.eyeColor ||
            fallback
        )
          .trim()
          .toLowerCase();

      const normalized =
        /^#[0-9a-f]{6}$/.test(
          raw
        )
          ? raw
          : fallback;

      return {
        r:
          parseInt(
            normalized.slice(
              1,
              3
            ),
            16
          ),

        g:
          parseInt(
            normalized.slice(
              3,
              5
            ),
            16
          ),

        b:
          parseInt(
            normalized.slice(
              5,
              7
            ),
            16
          ),
      };
    }, [
      appearance?.eyeColor,
    ]);

  /*
   * Give each character its own random blink
   * schedule so everyone does not blink together.
   */
  useEffect(() => {
    let blinkTimer = null;
    let reopenTimer = null;
    let cancelled = false;

    function scheduleNextBlink() {
      const delay =
        BLINK_MIN_DELAY_MS +
        Math.random() *
          (
            BLINK_MAX_DELAY_MS -
            BLINK_MIN_DELAY_MS
          );

      blinkTimer =
        window.setTimeout(
          () => {
            if (cancelled) {
              return;
            }

            setIsBlinking(
              true
            );

            reopenTimer =
              window.setTimeout(
                () => {
                  if (
                    cancelled
                  ) {
                    return;
                  }

                  setIsBlinking(
                    false
                  );

                  scheduleNextBlink();
                },
                BLINK_DURATION_MS
              );
          },
          delay
        );
    }

    scheduleNextBlink();

    return () => {
      cancelled = true;

      if (blinkTimer) {
        window.clearTimeout(
          blinkTimer
        );
      }

      if (reopenTimer) {
        window.clearTimeout(
          reopenTimer
        );
      }
    };
  }, []);

  /*
   * Wait for the asynchronously composed sprite.
   */
  useEffect(() => {
    let cancelled = false;

    if (
      sheetRecord.status ===
      "pending"
    ) {
      sheetRecord.promise
        .then(() => {
          if (!cancelled) {
            setRenderVersion(
              (current) =>
                current + 1
            );
          }
        })
        .catch(() => {
          /*
           * The runtime sheet record already
           * stores and reports its own error.
           */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [sheetRecord]);

  /*
   * Redraw the original composed sprite every
   * time the blink state changes.
   *
   * When blinking, eye-colored pixels are replaced
   * with the closest nearby non-eye pixel.
   *
   * Extremely dark pixels are ignored so the eyelid
   * is more likely to use a skin or skin-shadow color
   * instead of the nearly black outline.
   */
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
        "2d",
        {
          willReadFrequently:
            true,
        }
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

    /*
     * When not blinking, the normal source sprite
     * has already been drawn, so nothing else is needed.
     */
    if (!isBlinking) {
      return;
    }

    const imageData =
      context.getImageData(
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );

    const pixels =
      imageData.data;

    const width =
      outputCanvas.width;

    const height =
      outputCanvas.height;

    const left =
      Math.max(
        0,
        Math.min(
          FACE_LEFT,
          width - 1
        )
      );

    const right =
      Math.max(
        left,
        Math.min(
          FACE_RIGHT,
          width - 1
        )
      );

    const top =
      Math.max(
        0,
        Math.min(
          FACE_TOP,
          height - 1
        )
      );

    const bottom =
      Math.max(
        top,
        Math.min(
          FACE_BOTTOM,
          height - 1
        )
      );

    const eyePixels = [];

    /*
     * Locate every pixel matching the selected eye
     * color inside the defined face area.
     */
    for (
      let y = top;
      y <= bottom;
      y += 1
    ) {
      for (
        let x = left;
        x <= right;
        x += 1
      ) {
        const index =
          (
            y * width +
            x
          ) *
          4;

        const alpha =
          pixels[index + 3];

        if (alpha === 0) {
          continue;
        }

        const matchesEye =
          pixels[index] ===
            eyeRgb.r &&
          pixels[index + 1] ===
            eyeRgb.g &&
          pixels[index + 2] ===
            eyeRgb.b;

        if (matchesEye) {
          eyePixels.push({
            x,
            y,
            index,
          });
        }
      }
    }

    /*
     * Replace each eye pixel with the closest nearby
     * non-eye pixel that is not extremely dark.
     */
    for (
      const eyePixel of
        eyePixels
    ) {
      let eyelidRed =
        pixels[
          eyePixel.index
        ];

      let eyelidGreen =
        pixels[
          eyePixel.index + 1
        ];

      let eyelidBlue =
        pixels[
          eyePixel.index + 2
        ];

      let closestDistance =
        Number.POSITIVE_INFINITY;

      for (
        let offsetY = -2;
        offsetY <= 2;
        offsetY += 1
      ) {
        for (
          let offsetX = -2;
          offsetX <= 2;
          offsetX += 1
        ) {
          if (
            offsetX === 0 &&
            offsetY === 0
          ) {
            continue;
          }

          const sampleX =
            eyePixel.x +
            offsetX;

          const sampleY =
            eyePixel.y +
            offsetY;

          if (
            sampleX < 0 ||
            sampleX >= width ||
            sampleY < 0 ||
            sampleY >= height
          ) {
            continue;
          }

          const sampleIndex =
            (
              sampleY *
                width +
              sampleX
            ) *
            4;

          const sampleAlpha =
            pixels[
              sampleIndex + 3
            ];

          if (
            sampleAlpha === 0
          ) {
            continue;
          }

          const sampleRed =
            pixels[
              sampleIndex
            ];

          const sampleGreen =
            pixels[
              sampleIndex + 1
            ];

          const sampleBlue =
            pixels[
              sampleIndex + 2
            ];

          const sampleIsEye =
            sampleRed ===
              eyeRgb.r &&
            sampleGreen ===
              eyeRgb.g &&
            sampleBlue ===
              eyeRgb.b;

          if (sampleIsEye) {
            continue;
          }

          /*
           * Avoid choosing the nearly black face
           * outline or eyebrow as the eyelid color.
           */
          const brightness =
            sampleRed +
            sampleGreen +
            sampleBlue;

          if (brightness < 120) {
            continue;
          }

          const distance =
            Math.abs(
              offsetX
            ) +
            Math.abs(
              offsetY
            );

          if (
            distance <
            closestDistance
          ) {
            closestDistance =
              distance;

            eyelidRed =
              sampleRed;

            eyelidGreen =
              sampleGreen;

            eyelidBlue =
              sampleBlue;
          }
        }
      }

      /*
       * Actually replace the eye pixel.
       *
       * This assignment was missing in the
       * previous broken version.
       */
      pixels[
        eyePixel.index
      ] =
        eyelidRed;

      pixels[
        eyePixel.index + 1
      ] =
        eyelidGreen;

      pixels[
        eyePixel.index + 2
      ] =
        eyelidBlue;
    }

    context.putImageData(
      imageData,
      0,
      0
    );
  }, [
    appearanceKey,
    eyeRgb,
    isBlinking,
    renderVersion,
    sheetRecord,
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
   * Your composed sprite is:
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

  const meRef =
    useRef(null);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const z =
    Math.max(
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
          rectangle.width /
            2,

        cy:
          rectangle.top +
          rectangle.height /
            2,

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
          ? Number(
              camera.x
            )
          : Number(
              fallback.x || 0
            );

      const y =
        Number.isFinite(
          camera?.y
        )
          ? Number(
              camera.y
            )
          : Number(
              fallback.y || 0
            );

      if (z > 1) {
        return {
          x:
            Math.round(
              x * z
            ) / z,

          y:
            Math.round(
              y * z
            ) / z,
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
          Number(
            value || 0
          );

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
            (
              (
                Number(
                  position.x ||
                    0
                ) -
                camera.x
              ) *
              z
            ) /
              scale,

          y:
            cy +
            (
              (
                Number(
                  position.y ||
                    0
                ) -
                camera.y
              ) *
              z
            ) /
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
            (
              (
                clientX -
                cx
              ) *
              scale
            ) /
              z,

          y:
            camera.y +
            (
              (
                clientY -
                cy
              ) *
              scale
            ) /
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
      (
        id,
        player
      ) => {
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
        ).slice(
          0,
          4
        )}`;
      },
      [
        playerNames,
        myId,
        character,
      ]
    );

  const normalizeRole =
    useCallback(
      (role) => {
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
            raw ||
              "player"
          )
            .trim()
            .toLowerCase() ||
          "player"
        );
      },
      []
    );

  // ── Chat bubbles ───────────────────────────────────────────

  useEffect(() => {
    const ttlFor =
      (text) =>
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

    const onBubble =
      (event) => {
        const detail =
          event?.detail ||
          {};

        const message =
          String(
            detail.message ||
              ""
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
              text:
                message,

              expiresAt:
                Date.now() +
                ttlFor(
                  message
                ),

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
              const key of
                Object.keys(
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
      (
        id,
        player
      ) => {
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
            remaining <
            1100
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
      ({
        x,
        y,
      }) => {
        setMoveTarget(
          x,
          y
        );

        if (socket) {
          socket.emit(
            "player:moveTo",
            {
              x:
                Number(x),

              y:
                Number(y),
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
    let animationFrame =
      0;

    let lastMilliseconds =
      performance.now();

    const tick =
      (
        nowMilliseconds
      ) => {
        stepPrediction(
          Math.min(
            (
              nowMilliseconds -
              lastMilliseconds
            ) /
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
      interpDelayMs:
        120,
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
      [
        normalizeRole,
      ]
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
        ? Math.round(
            me.x
          )
        : 0;

  const displayY =
    predictedPosition
      ? Math.round(
          predictedPosition.y
        )
      : me
        ? Math.round(
            me.y
          )
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
                x:
                  Number(
                    player.x ||
                      0
                  ),

                y:
                  Number(
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

              x:
                snapWorld(
                  rawRenderState.x
                ),

              y:
                snapWorld(
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
                  setHoverId(
                    id
                  )
                }
                onMouseLeave={() =>
                  setHoverId(
                    (
                      current
                    ) =>
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
                   * This prevents the ten-pixel hair overflow
                   * from shifting the player's feet.
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
          setHoverId(
            myId
          )
        }
        onMouseLeave={() =>
          setHoverId(
            (
              current
            ) =>
              current ===
              myId
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
                {
                  bubble.text
                }

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