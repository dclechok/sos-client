import { useEffect, useState } from "react";
import { fetchInventory } from "./api/inventoryApi";
import "./styles/InventoryMenu.css";
import { LOOT_COLORS } from "./utils/lootColorCodes";

export default function InventoryMenu({ account, character }) {

    const [slots, setSlots] = useState(Array(25).fill(null));
    const [hoverItem, setHoverItem] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!character?._id || !account?.token) return;

        async function load() {
            const inv = await fetchInventory(character._id, account.token);
            if (inv) setSlots(inv);
        }

        load();
    }, [character, account]);

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div 
            className="inventory-grid"
            onMouseMove={handleMouseMove}
        >
            {slots.map((slot, i) => (
                <div
                    key={i}
                    className="inventory-slot"
                    onMouseEnter={() => setHoverItem(slot)}
                    onMouseLeave={() => setHoverItem(null)}
                >
                    {slot && (
                        <img
                            src={`/art/items/${slot.graphic}`}
                            alt={slot.name}
                            className="inventory-item-graphic"
                        />
                    )}

                    {slot && slot.stackable && slot.qty > 1 && (
                        <div className="inventory-slot-stacksize">
                            {slot.qty}
                        </div>
                    )}
                </div>
            ))}

            {/* TOOLTIP (no styling, you add your own) */}
            {hoverItem && (
                <div 
                    className="inventory-tooltip"
                    style={{
                        position: "fixed",
                        top: mousePos.y + 12,
                        left: mousePos.x + 12,
                        pointerEvents: "none",
                        zIndex: 9999,
                        "--tooltip-glow": LOOT_COLORS[hoverItem.lootClass] 
                    }}
                >
                    <div className="tooltip-name"  style={{ color: LOOT_COLORS[hoverItem.lootClass] }}><strong>{hoverItem.name}</strong></div>
                    <br/>
                    <div>{hoverItem.desc}</div>
                    <br />

                    {/* EXTRA FIELDS */}
                    {hoverItem.stackable && (
                        <div>Max Stack: {hoverItem.maxStackSize}</div>
                    )}
                    {hoverItem.qty && (
                        <div>Qty: {hoverItem.qty}</div>
                    )}
                </div>
            )}
        </div>
    );
}
