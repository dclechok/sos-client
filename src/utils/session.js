// utils/session.js

export function normalizeAccount(acc) {
  if (!acc) return null;
  return {
    id: acc.id || acc._id,
    username: acc.username,
    characters: acc.characters || [],
  };
}

// Load account + character from localStorage
export function loadStoredSession() {
  const token = localStorage.getItem("pd_token");
  const rawAcc = localStorage.getItem("pd_account");
  const rawChar = localStorage.getItem("pd_character");

  if (!token || !rawAcc) return { account: null, character: null };

  let parsed = null;
  try {
    parsed = JSON.parse(rawAcc);
  } catch {
    return { account: null, character: null };
  }

  const account = { ...normalizeAccount(parsed), token };
  let character = null;

  try {
    if (rawChar) character = JSON.parse(rawChar);
  } catch {
    character = null;
  }

  return { account, character };
}

// Verify the token with the backend
export async function verifyToken(token) {
  const API = process.env.REACT_APP_API_BASE_URL;

  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      id: data.user._id,
      username: data.user.username,
      characters: data.user.characters || [],
      token,
    };
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}
