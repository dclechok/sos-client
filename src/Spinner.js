import { PulseLoader } from 'react-spinners';
import "./styles/Spinner.css";

function Spinner() {
  let color = "rgb(90, 255, 241)";

  return (
    <div className="spinner-wrapper">
      <PulseLoader
        color={color}
        loading={true}
        size={40}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
}

export default Spinner;
