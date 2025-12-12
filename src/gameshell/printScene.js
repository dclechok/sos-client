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
                    ? `You see a<span style="color:#ff4a4a; ">${name}.</span>`
                    : `You see [ ${count} ]<span style="color:#ff4a4a;"> ${name}s.</span>`;
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
