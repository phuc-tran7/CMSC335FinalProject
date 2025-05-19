import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";

function Navbar() {
  const main = { color: "white", textDecoration: "none" };
  let hover = { color: "grey", textDecoration: "none" };

  const [firstColor, setFirstColor] = useState(main);
  const [secondColor, setSecondColor] = useState(main);

  return (
    <nav
      style={{
        backgroundColor: "rgb(44, 115, 215)",
        color: "white",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        width: "225em",
        height: "10%",
        position: "fixed",
        top: "0",
        marginBottom: "20px",
        gap: "2rem",
        padding: "0 1rem",

      }}
    >
      <h1>Apptendance</h1>
      <ul
        style={{
          padding: "0",
          margin: "0",
          listStyle: "none",
          display: "flex",
          gap: "1rem",
          fontFamily: "'Inter', sans-serif",
          fontSize: "1.3em",
        }}
      >
        <li 
        
        >
          <a
            onMouseEnter={() => setFirstColor(hover)}
            onMouseLeave={() => setFirstColor(main)}
            style={firstColor}
            href="/"
          >
            
          </a>
        </li>
        <li>
          <a
            onMouseEnter={() => setSecondColor(hover)}
            onMouseLeave={() => setSecondColor(main)}
            style={secondColor}
            href="/sign-in"
          >
            <div className="user-button-wrapper" style={{ transform: "translateX(-80px)" }}>
  <UserButton />
</div>
          </a>
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
