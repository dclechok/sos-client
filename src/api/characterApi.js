// src/api/characterApi.js

const BASE_URL = process.env.REACT_APP_API_BASE_URL + "/api/characters/";

// Helper: support account docs that use either `id` or `_id`
function getAccountId(account) {
  const id = account?.id || account?._id;
  return id ? String(id) : "";
}

/**
 * GET characters for account
 * GET /api/characters/:accountId
 */
export async function fetchCharacterList(account, token) {
  const accountId = getAccountId(account);

  try {
    if (!accountId || !token) return [];

    const response = await fetch(BASE_URL + accountId, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Optional: log server message for easier debugging
      const data = await response.json().catch(() => ({}));
      console.warn("fetchCharacterList failed:", response.status, data);
      return [];
    }

    const data = await response.json().catch(() => ({}));
    return Array.isArray(data.characters) ? data.characters : [];
  } catch (err) {
    console.error("Error fetching characters:", err);
    return [];
  }
}

/**
 * CREATE character for account
 * POST /api/characters/:accountId
 * Body: { charName, class }  (or classId)
 * Returns: { character }
 */
export async function createCharacter(account, token, { charName, classId }) {
  const accountId = getAccountId(account);

  try {
    if (!accountId || !token) {
      throw new Error("Missing accountId or token");
    }

    const response = await fetch(BASE_URL + accountId, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        charName,
        class: classId, // ✅ store class id string in DB
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // backend sends { message }
      throw new Error(data?.message || "Failed to create character");
    }

    return data.character;
  } catch (err) {
    console.error("Error creating character:", err);
    throw err;
  }
}

/**
 * DELETE character for account
 * DELETE /api/characters/:accountId/:charId
 * Returns: { ok: true }
 */
export async function deleteCharacter(account, token, charId) {
  const accountId = getAccountId(account);
  const cid = charId ? String(charId) : "";

  try {
    if (!accountId || !token) {
      throw new Error("Missing accountId or token");
    }
    if (!cid) {
      throw new Error("Missing charId");
    }

    const response = await fetch(BASE_URL + accountId + "/" + cid, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || "Failed to delete character");
    }

    return data; // { ok: true }
  } catch (err) {
    console.error("Error deleting character:", err);
    throw err;
  }
}