import { PropagateLoader } from 'react-spinners';

function Spinner(){

    let color = "rgb(90, 255, 241)";
    
    return(
        <PropagateLoader
        color={color}
        loading={true}
        size={150}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    );
}

export default Spinner;