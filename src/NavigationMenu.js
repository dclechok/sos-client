import './styles/NavigationMenu.css';

function NavigationMenu() {
    return (
        <div className="nav-menu-cont">
            <div className="nav-content">
                <span className="nav-location">
                    World · Region · Area · Scene ([0, 0]) — Security: 
                    <span className="nav-security-high"> High</span>
                </span>
            </div>
        </div>
    );
}

export default NavigationMenu;
