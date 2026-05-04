/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.tsx";
import { registerServiceWorker, isPushSupported } from "./store/push.ts";

const root = document.getElementById("root");

if (isPushSupported()) {
  registerServiceWorker();
}

render(() => <App />, root!);
