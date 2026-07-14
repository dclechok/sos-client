const BASE_URL =
  process.env.REACT_APP_API_BASE_URL +
  "/api/characters/";

/**
 * Supports account objects that use either `id` or `_id`.
 */
function getAccountId(account) {
  const id = account?.id || account?._id;

  return id ? String(id) : "";
}

/**
 * Safely reads JSON from a response.
 */
async function readResponseJson(response) {
  return response
    .json()
    .catch(() => ({}));
}

/**
 * GET characters for an account.
 *
 * GET /api/characters/:accountId
 *
 * Returns:
 * Character[]
 */
export async function fetchCharacterList(
  account,
  token
) {
  const accountId =
    getAccountId(account);

  try {
    if (!accountId || !token) {
      return [];
    }

    const response = await fetch(
      `${BASE_URL}${accountId}`,
      {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data =
      await readResponseJson(
        response
      );

    if (!response.ok) {
      console.warn(
        "fetchCharacterList failed:",
        response.status,
        data
      );

      return [];
    }

    return Array.isArray(
      data.characters
    )
      ? data.characters
      : [];
  } catch (error) {
    console.error(
      "Error fetching characters:",
      error
    );

    return [];
  }
}

/**
 * CREATE a character for an account.
 *
 * POST /api/characters/:accountId
 *
 * Body:
 * {
 *   charName,
 *   class,
 *   appearance: {
 *     skinToneId,
 *     eyeColor,
 *     hairStyle,
 *     hairIndex,
 *     hairColor,
 *     beardStyle,
 *     beardIndex,
 *     beardColor
 *   }
 * }
 *
 * Returns:
 * Character
 */
export async function createCharacter(
  account,
  token,
  {
    charName,
    classId,
    appearance = {},
  }
) {
  const accountId =
    getAccountId(account);

  try {
    if (!accountId) {
      throw new Error(
        "Missing accountId"
      );
    }

    if (!token) {
      throw new Error(
        "Missing authentication token"
      );
    }

    const cleanName = String(
      charName || ""
    )
      .replace(
        /[^a-zA-Z0-9 _'-]/g,
        ""
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);

    if (cleanName.length < 3) {
      throw new Error(
        "Character name must be at least 3 characters."
      );
    }

    if (!classId) {
      throw new Error(
        "Missing character class"
      );
    }

    const payload = {
      charName: cleanName,

      class: classId,

      appearance: {
        skinToneId:
          appearance?.skinToneId ||
          "light_neutral_1",

        eyeColor:
          appearance?.eyeColor ||
          "#3b271b",

        hairStyle:
          appearance?.hairStyle ||
          "none",

        /*
         * Use ?? instead of || because
         * zero is a valid sprite index.
         */
        hairIndex:
          appearance?.hairIndex ??
          null,

        hairColor:
          appearance?.hairColor ||
          "#2b1d16",

        beardStyle:
          appearance?.beardStyle ||
          "none",

        beardIndex:
          appearance?.beardIndex ??
          null,

        beardColor:
          appearance?.beardColor ||
          appearance?.hairColor ||
          "#2b1d16",
      },
    };

    const response = await fetch(
      `${BASE_URL}${accountId}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(
          payload
        ),
      }
    );

    const data =
      await readResponseJson(
        response
      );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "Failed to create character"
      );
    }

    /*
     * Most backends return:
     * { character: {...} }
     *
     * This fallback also supports a backend
     * that returns the character directly.
     */
    return (
      data?.character ||
      data
    );
  } catch (error) {
    console.error(
      "Error creating character:",
      error
    );

    throw error;
  }
}

/**
 * DELETE a character for an account.
 *
 * DELETE /api/characters/:accountId/:charId
 *
 * Returns:
 * { ok: true }
 */
export async function deleteCharacter(
  account,
  token,
  charId
) {
  const accountId =
    getAccountId(account);

  const characterId = charId
    ? String(charId)
    : "";

  try {
    if (!accountId) {
      throw new Error(
        "Missing accountId"
      );
    }

    if (!token) {
      throw new Error(
        "Missing authentication token"
      );
    }

    if (!characterId) {
      throw new Error(
        "Missing character ID"
      );
    }

    const response = await fetch(
      `${BASE_URL}${accountId}/${characterId}`,
      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

    const data =
      await readResponseJson(
        response
      );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          "Failed to delete character"
      );
    }

    return data;
  } catch (error) {
    console.error(
      "Error deleting character:",
      error
    );

    throw error;
  }
}

/**
 * PATCH a character's world position.
 *
 * PATCH
 * /api/characters/:accountId/:charId/position
 *
 * Body:
 * {
 *   x,
 *   y
 * }
 *
 * Returns:
 * Updated character data or null on failure.
 */
export async function updateCharacterPosition(
  account,
  token,
  charId,
  { x, y }
) {
  const accountId =
    getAccountId(account);

  const characterId = charId
    ? String(charId)
    : "";

  try {
    if (!accountId) {
      throw new Error(
        "Missing accountId"
      );
    }

    if (!token) {
      throw new Error(
        "Missing authentication token"
      );
    }

    if (!characterId) {
      throw new Error(
        "Missing character ID"
      );
    }

    const numericX = Number(x);
    const numericY = Number(y);

    if (
      !Number.isFinite(numericX) ||
      !Number.isFinite(numericY)
    ) {
      throw new Error(
        "Invalid character coordinates"
      );
    }

    const response = await fetch(
      `${BASE_URL}${accountId}/${characterId}/position`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          x: numericX,
          y: numericY,
        }),
      }
    );

    const data =
      await readResponseJson(
        response
      );

    if (!response.ok) {
      console.warn(
        "updateCharacterPosition failed:",
        response.status,
        data
      );

      return null;
    }

    return data;
  } catch (error) {
    console.error(
      "Error updating character position:",
      error
    );

    return null;
  }
}