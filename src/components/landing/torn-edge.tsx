export function TornEdgeBottom({ className = "", fill = "var(--landing-ticket)" }: { className?: string; fill?: string }) {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={{ height: "20px" }}
    >
      <path
        d="M0,0 L0,12 Q30,28 60,15 Q90,2 120,18 Q150,32 180,14 Q210,0 240,16 Q270,30 300,12 Q330,0 360,20 Q390,35 420,10 Q450,0 480,18 Q510,32 540,14 Q570,0 600,16 Q630,30 660,10 Q690,0 720,20 Q750,35 780,12 Q810,0 840,16 Q870,28 900,14 Q930,2 960,20 Q990,34 1020,12 Q1050,0 1080,18 Q1110,30 1140,14 Q1170,2 1200,16 L1200,0 Z"
        fill={fill}
      />
    </svg>
  );
}

export function TornEdgeTop({ className = "", fill = "var(--landing-ticket)" }: { className?: string; fill?: string }) {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={{ height: "20px" }}
    >
      <path
        d="M0,40 L0,28 Q30,12 60,25 Q90,38 120,22 Q150,8 180,26 Q210,40 240,24 Q270,10 300,28 Q330,40 360,20 Q390,5 420,30 Q450,40 480,22 Q510,8 540,26 Q570,40 600,24 Q630,10 660,30 Q690,40 720,20 Q750,5 780,28 Q810,40 840,24 Q870,12 900,26 Q930,38 960,20 Q990,6 1020,28 Q1050,40 1080,22 Q1110,10 1140,26 Q1170,38 1200,24 L1200,40 Z"
        fill={fill}
      />
    </svg>
  );
}
