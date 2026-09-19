import "@radix-ui/themes/styles.css"
import "@radix-ui/colors/indigo.css"
import "@radix-ui/colors/slate.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles.css"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Popup root element is missing")
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
