
import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      padding: "40px",
      maxWidth: "900px",
      margin: "auto"
    }}>
      <h1>Cajun Projects</h1>
      <h2>Welcome to your project dashboard!</h2>
      <p>Your JavaScript application is working.</p>

      <button onClick={() => alert("It works!")}>
        Test Button
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
