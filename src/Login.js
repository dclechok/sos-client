import "./styles/Login.css";
import discordImg from "./img/discord.png";
import { useState } from "react";
import { handleLoginPassCheck } from "./api/accountApi";

function Login({ setAccount }) {
  const [creds, setCreds] = useState({
    name: "",
    password: "",
  });

  async function handleLoginClick(e) {
    e.preventDefault();
    try {
      const data = await handleLoginPassCheck(creds.name, creds.password);

      if (!data || !data.token) {
        alert("Login failed");
        return;
      }

      // Save token
      localStorage.setItem("pd_token", data.token);

      // Save account info for persistence
      localStorage.setItem(
        "pd_account",
        JSON.stringify({
          id: data.user.id,
          username: data.user.username,
          characters: data.user.characters || []
        })
      );

      // clear any old character selection
      localStorage.removeItem("pd_character");

      // Restore UI immediately
      setAccount({
        id: data.user.id,
        username: data.user.username,
        characters: data.user.characters || [],
        token: data.token,
      });

    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  }

  return (
    <div className="login-box">
      <h1>Project Domehead</h1>
      <form onSubmit={handleLoginClick}>

        <div className="inputs">
          User
          <br />
          <input
            type="text"
            value={creds.name}
            onChange={(e) => setCreds({ ...creds, name: e.target.value })}
          />
          <br /><br />

          Password
          <br />
          <input
            type="password"
            value={creds.password}
            onChange={(e) => setCreds({ ...creds, password: e.target.value })}
            required
          />
          <br />
        </div>

        <br />

        <button type="submit">Login</button>
      </form>

      <br />
      Join our Discord!
      <br />
      <img src={discordImg} alt="Project Domehead Discord" />
    </div>
  );
}

export default Login;
