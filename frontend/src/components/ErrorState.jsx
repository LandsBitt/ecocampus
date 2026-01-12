import React from "react";

export default function ErrorState({ message = "Erro ao carregar dados." }) {
  return (
    <div className="glass-panel p-6 border border-red-400/40 text-red-200">
      {message}
    </div>
  );
}
