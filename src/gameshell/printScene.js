// printScene.js

export async function printScene(scene, typeLine) {
    await typeLine(`Region: ${scene.region || "Unknown Sector"}`);
    await typeLine(
        `Node: [ <span class="coords">${scene.currentLoc.x},${scene.currentLoc.y}</span> ]`
    );
    await typeLine("Loading environmental data...");
    await typeLine("&nbsp;");
    await typeLine(
        `<span class="entrance-desc">${scene.entranceDesc || "No description."}</span>`
    );

    // ---- Creature Summary ----
    if (scene.creatures?.length > 0) {
        const counts = scene.creatures.reduce((map, c) => {
            map[c.name] = (map[c.name] || 0) + 1;
            return map;
        }, {});

        for (const [name, count] of Object.entries(counts)) {
            const txt =
                count === 1
                    ? `<span style="color:#ffffff; text-shadow:0 0 4px rgba(255,255,255,0.6)">You see a</span> <span style="color:#ff4a4a; text-shadow:0 0 4px rgba(255,255,255,0.6);">${name}.</span>`
                    : `<span style="color:#ffffff; text-shadow:0 0 4px rgba(255,255,255,0.6)">You see [ ${count} ]</span> <span style="color:#ff4a4a; text-shadow:0 0 4px rgba(255,255,255,0.6);">${name}s.</span>`;
            await typeLine(txt);
        }
    }

    // ---- Exits ----
    if (scene.exits) {
        await typeLine("&nbsp;");
        await typeLine("Available exits:");

        const order = ["N", "S", "E", "W"];
        const exits = order
            .filter((d) => scene.exits[d])
            .map((d) => `<span class="exit-tag">[${d}]</span>`)
            .join(" ");

        await typeLine("&nbsp;&nbsp;" + exits);
    }
}
