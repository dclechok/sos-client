import "./styles/Login.css";
import discordImg from "./img/discord.png";
import bgUrl from "./art/login-wallpaper.png";
import { useState } from "react";
import { handleLoginPassCheck } from "./api/accountApi";
import Spinner from "./Spinner";

function Login({ setAccount }) {
  const [creds, setCreds] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleLoginClick(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await handleLoginPassCheck(creds.name, creds.password);

      if (!data || !data.token) {
        alert("Login failed");
        setLoading(false);
        return;
      }

      console.log("LOGIN RESPONSE:", data);

      const user = data.user || {};

      // ✅ accept id OR _id OR accountId
      const id =
        user.id ??
        user._id ??
        user.accountId ??
        null;

      // ✅ accept role from multiple possible backend shapes
      const role =
        user.role ??
        user.accountRole ??
        data.role ??
        data.accountRole ??
        "player";

      const accountObj = {
        id,
        username: user.username,
        role,
        characters: user.characters || [],
        token: data.token,
      };

      // ✅ persist token + account with role included
      localStorage.setItem("pd_token", data.token);
      localStorage.setItem("pd_account", JSON.stringify(accountObj));
      localStorage.removeItem("pd_character");

      setAccount(accountObj);
    } catch (err) {
      console.error(err);
      alert("Login failed");
      setLoading(false);
    }
  }

  // If loading: show spinner, but keep wallpaper behind it
  if (loading) {
    return (
      <div className="login-page">
        <div
          className="login-wallpaper"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
        <Spinner />
      </div>
    );
  }

  return (
    <div className="login-page">
      <div
        className="login-wallpaper"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      <div className="login-box">
        <h1>Lorn Online</h1>

        <form onSubmit={handleLoginClick}>
          <div className="inputs">
            User
            <br />
            <input
              type="text"
              value={creds.name}
              onChange={(e) => setCreds({ ...creds, name: e.target.value })}
            />
            <br />
            <br />

            Password
            <br />
            <input
              type="password"
              value={creds.password}
              onChange={(e) => setCreds({ ...creds, password: e.target.value })}
              required
            />
          </div>

          <br />

          <button type="submit">Login</button>
        </form>

        <br />
        Join our Discord!
        <br />
        <img src={discordImg} alt="Project Domehead Discord" />
      </div>
    </div>
  );
}

export default Login;