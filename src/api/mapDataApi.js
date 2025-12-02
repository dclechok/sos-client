const BASE_URL = process.env.REACT_APP_API_BASE_URL + `/api/map`;

/**
 * Fetch region info by regionId
 * Example: getRegionData("slagline")
 */
export async function getRegionData(regionId) {
  try {
    const response = await fetch(`${BASE_URL}/region/${regionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch region:", response.status);
      return null;
    }

    const json = await response.json();
    return json.region;
  } catch (error) {
    console.error("Error fetching region data:", error);
    return null;
  }
}


/**
 * Fetch a scene using region + coordinates
 * Example: getSceneByCoords("slagline", 0, 1)
 */
export async function getSceneByCoords(regionId, x, y) {
  try {
    const response = await fetch(
      `${BASE_URL}/scene/${regionId}/${x}/${y}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to fetch scene by coords:", response.status);
      return null;
    }

    const json = await response.json();
    return json.scene;
  } catch (error) {
    console.error("Error fetching scene by coords:", error);
    return null;
  }
}

export async function getAllScenes() {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/scenes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch all scenes:", response.status);
      return [];
    }

    const json = await response.json();
    return json.scenes || [];
  } catch (error) {
    console.error("Error fetching scenes:", error);
    return [];
  }
}



