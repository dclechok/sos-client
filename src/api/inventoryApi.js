
export async function fetchInventory(playerId, token) {
    try {
        const res = await fetch(
            `http://localhost:5000/api/inventory/${playerId}`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                }
            }
        );

        if (!res.ok) {
            console.error("Inventory fetch failed:", res.status);
            return null;
        }

        const data = await res.json();
        return data.slots || null;

    } catch (err) {
        console.error("fetchInventory ERROR:", err);
        return null;
    }
}
