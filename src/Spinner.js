import { PulseLoader } from 'react-spinners';
import "./styles/Spinner.css";

function Spinner() {

  let color = "rgba(205, 165, 85, 0.95)";

  return (
    <div className="spinner-wrapper">
      <PulseLoader
        color={color}
        loading={true}
        size={26}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
}

export default Spinner;
