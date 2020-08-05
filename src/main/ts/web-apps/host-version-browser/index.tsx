import React from "react";
import ReactDOM from "react-dom";

import { App } from "./App"

ReactDOM.render(<App path={document.location.hash.slice(1)}/>, document.getElementById("root"));
