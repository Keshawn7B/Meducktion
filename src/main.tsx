import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CardGameRoot } from "./card-app";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Meducktion could not find its application root.");
}

createRoot(root).render(
  <StrictMode>
    <CardGameRoot />
  </StrictMode>,
);
