import './styles/InventoryMenu.css';

export default function InventoryMenu({ account, character }) {
    const slots = Array(35).fill(null); // fits 5 columns × 6 rows nicely
    console.log(character)
    return (
        <div className="inventory-grid">
            {slots.map((_, i) => (
                <div key={i} className="inventory-slot"></div>
            ))}
        </div>
    );
}
