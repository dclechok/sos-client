const BASE_URL = process.env.REACT_APP_API_BASE_URL + "/api/characters/";

export async function fetchCharacterList(account, token) {
  console.log(account.id)
  try {
    const response = await fetch(BASE_URL + account.id, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    console.log(data)
    return data.characters;

  } catch (err) {
    console.error("Error fetching characters:", err);
    return [];
  }
}
