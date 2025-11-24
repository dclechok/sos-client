import './styles/CharacterEquipment.css';
import maleHologram from './art/hologram/male4.png';

function CharacterEquipment(){
    return(
    <div className="hologram-cont">
        <img src={maleHologram} alt="Male Hologram" className="hologram-img" />
    </div>
    );
}

export default CharacterEquipment;