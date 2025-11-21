const BASE_URL = "http://localhost:5000/api/characters/";

export async function fetchCharacterList(account, token) {
  try {
    const response = await fetch(BASE_URL + "byIds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ ids: account.characters })
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.characters;

  } catch (err) {
    console.error("Error fetching characters:", err);
    return [];
  }
}
