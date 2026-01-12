import React from "react";

export default function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
