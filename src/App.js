// App.js
import "./styles/App.css";
import { useState, useEffect } from "react";

import DisplayCheck from "./DisplayCheck";
import Spinner from "./Spinner";
import useButtonClickSound from "./hooks/useButtonClickSound";

import Login from "./Login";
import NavBar from "./NavBar";
import MainImg from "./MainImg";
import MainText from "./MainText";
import ChatMenu from "./ChatMenu";
import NavigationMenu from "./NavigationMenu";
import CharacterMenu from "./CharacterMenu";
import CharacterSelection from "./CharacterSelection";
import LogoutButton from "./LogoutButton";

console.log(process.env.REACT_APP_API_BASE_URL);
// --------------------------------------------------
// Window-size hook (must NOT be conditional)
// --------------------------------------------------
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handler = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return size;
}

// --------------------------------------------------
// MAIN APP COMPONENT
// --------------------------------------------------
function App() {
  const [account, setAccount] = useState(undefined);
  const [character, setCharacter] = useState(undefined);

  useButtonClickSound();
  const { width, height } = useWindowSize();

  // --------------------------------------------------
  // Restore account + character from localStorage
  // --------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("pd_token");
    const savedAccount = localStorage.getItem("pd_account");
    const savedCharacter = localStorage.getItem("pd_character");

    if (!token || !savedAccount) {
      setAccount(null);
      setCharacter(null);
      return;
    }

    // Restore account immediately
    let parsedAccount;
    try {
      parsedAccount = JSON.parse(savedAccount);
    } catch {
      setAccount(null);
      return;
    }

    setAccount({ ...parsedAccount, token });

    // Restore selected character if exists
    if (savedCharacter) {
      try {
        setCharacter(JSON.parse(savedCharacter));
      } catch {
        setCharacter(null);
      }
    } else {
      setCharacter(null);
    }

    // Verify token async AFTER restoring UI
    async function verifyToken() {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          localStorage.removeItem("pd_token");
          localStorage.removeItem("pd_account");
          localStorage.removeItem("pd_character");
          setAccount(null);
          setCharacter(null);
          return;
        }

        const data = await res.json();
        setAccount({
          id: data.user.id,
          username: data.user.username,
          characters: data.user.characters || [],
          token,
        });

      } catch (err) {
        console.error("Token verify failed:", err);
      }
    }

    verifyToken();
  }, []);

  // --------------------------------------------------
  // SIZE CHECK
  // --------------------------------------------------
  if (width < 1160 || height < 800) return <DisplayCheck />;
  if (account === undefined) return <Spinner />;

  // --------------------------------------------------
  // ROUTING LOGIC
  // --------------------------------------------------

  // 1️⃣ NOT LOGGED IN → LOGIN PAGE
  if (account === null) {
    return <Login setAccount={setAccount} />;
  }

  // 2️⃣ LOGGED IN BUT NO CHARACTER SELECTED YET
  if (character === null) {
    return (
      <>
        <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />
        <CharacterSelection
          account={account}
          setAccount={setAccount}
          setCharacter={(char) => {
            setCharacter(char);
            localStorage.setItem("pd_character", JSON.stringify(char));
          }}
        />
      </>
    );
  }

  // 3️⃣ LOGGED IN + CHARACTER SELECTED → FULL GAME UI
  return (
    <div className="App">
      <LogoutButton setAccount={setAccount} setCharacter={setCharacter} />

      <NavBar account={account} />

      <div className="game-shell">
        <div className="column-left">
          <div className="box-container map-overview">
            <NavigationMenu />
          </div>
          <ChatMenu />
        </div>

        <div className="center-container">
          <MainImg />
          <MainText />
        </div>

        <div className="column-right">
          <div className="box-container char">
            <CharacterMenu account={account} character={character} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
