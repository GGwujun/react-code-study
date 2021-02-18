import logo from "./logo.svg";
import "./App.css";
import { useState } from "react";

import TestComponent from "./ClassComponent";

function App() {
  let [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        <div className="hookBox" onClick={() => setCount(count + 1)}>
          functon component useState：
          <p>{count}</p>
        </div>

        <TestComponent />
      </header>
    </div>
  );
}

export default App;
