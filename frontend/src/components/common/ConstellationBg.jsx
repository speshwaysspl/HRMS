import React, { useMemo } from "react";

/**
 * Decorative "route network" constellation backdrop.
 * Pure SVG, deterministic layout, sits behind the brand panel content.
 */
const ConstellationBg = ({ className = "" }) => {
  const { nodes, edges, accents } = useMemo(() => {
    const rand = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    const count = 46;
    const nodes = Array.from({ length: count }, (_, i) => ({
      x: rand(i * 1.7 + 1) * 600,
      y: rand(i * 2.3 + 5) * 820,
      r: 1 + rand(i * 3.1) * 1.6,
    }));

    const edges = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.hypot(dx, dy) < 132) edges.push([nodes[i], nodes[j]]);
      }
    }

    const accents = [nodes[6], nodes[19], nodes[28], nodes[37]].filter(Boolean);
    return { nodes, edges, accents };
  }, []);

  return (
    <svg
      viewBox="0 0 600 820"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1">
        {edges.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>
      <g fill="#ffffff" fillOpacity="0.35">
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} />
        ))}
      </g>
      <g>
        {accents.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="9" fill="#3f8b45" fillOpacity="0.25" />
            <circle cx={n.x} cy={n.y} r="3.5" fill="#5da562" />
          </g>
        ))}
      </g>
    </svg>
  );
};

export default ConstellationBg;
