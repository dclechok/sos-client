import './styles/Login.css';
import discordImg from './img/discord.png';

function Login(){
    return(
        <div className="login-box">
            <h1>Project Domehead</h1>
            <div className="inputs">
                User<br/>   <input /><br/><br/>
                Password<br/> <input /><br />
            </div>
            <br />
            <button >Login</button><br/>
            Join our Discord!<br/>
            <a href="https://discord.gg/M74rSWaa"><img src={discordImg} alt="Project Domehead Discord"/></a>
        </div>
    );
}

export default Login;