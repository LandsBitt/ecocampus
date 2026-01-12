import React from "react";

export default function LoadingState({ message = "Carregando..." }) {
  return <div className="glass-panel p-6 text-slate-300">{message}</div>;
}
