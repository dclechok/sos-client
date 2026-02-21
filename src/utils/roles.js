// src/utils/roles.js
// Centralized role color definitions for chat, overhead names, UI badges, etc.

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  SEER: "seer",
  PLAYER: "player",
};

export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  seer: 2,
  player: 1,
};

export const ROLE_COLORS = {
  owner: {
    primary: "#8058EA",   // ✅ UPDATED purple (matches screenshot)
    background: "#1A1A1E", // darker neutral backing if used anywhere
    text: "#8058EA",       // ✅ ensures letters stay purple everywhere
    label: "Owner",
  },
  admin: {
    primary: "#8058EA",   // ✅ same purple as owner
    background: "#1A1A1E",
    text: "#8058EA",
    label: "Admin",
  },
  seer: {
    primary: "#4FC3F7",
    background: "#0D2A3A",
    text: "#4FC3F7",
    label: "Seer",
  },
  player: {
    primary: "#A0A0A0",
    background: "#121216",
    text: "#A0A0A0",
    label: "Player",
  },
};

// --- helpers ---
function normalizeRole(role) {
  const raw =
    role && typeof role === "object"
      ? role.name ?? role.role ?? role.type ?? ""
      : role;

  const norm = String(raw || "player").trim().toLowerCase();
  return norm || "player";
}

export const getRoleColor = (role) => {
  const key = normalizeRole(role);
  return ROLE_COLORS[key] ?? ROLE_COLORS.player;
};

export const hasMinRole = (userRole, requiredRole) => {
  const u = normalizeRole(userRole);
  const r = normalizeRole(requiredRole);
  return (ROLE_HIERARCHY[u] ?? 0) >= (ROLE_HIERARCHY[r] ?? 0);
};