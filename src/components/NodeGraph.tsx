import { useEffect, useRef } from "react";

export function NodeGraph({ highlight }: { highlight?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.getBoundingClientRect().width;
    const H = () => canvas.getBoundingClientRect().height;

    type Node = { x: number; y: number; r: number; label: string; color: string; isMe: boolean };
    const colors = ["#e8ff47", "#47ffe8", "#47ff8a", "#c47fff", "#ff9147"];
    const count = 28;
    const nodes: Node[] = Array.from({ length: count }, (_, i) => {
      const label = i === 0 && highlight ? highlight : `0x${(0x1000 + i * 0x91).toString(16).slice(0, 4)}`;
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        r: i === 0 && highlight ? 6 : 3 + Math.random() * 4,
        label,
        color: i === 0 && highlight ? "#e8ff47" : colors[i % colors.length],
        isMe: i === 0 && !!highlight,
      };
    });

    type Packet = { from: number; to: number; t: number; speed: number };
    let packets: Packet[] = [];

    const spawnPacket = () => {
      // Bias packets toward "me" node so it feels alive
      const bias = Math.random() < 0.35 && highlight;
      const from = bias ? 0 : Math.floor(Math.random() * nodes.length);
      let to = Math.floor(Math.random() * nodes.length);
      if (to === from) to = (to + 1) % nodes.length;
      packets.push({ from, to, t: 0, speed: 0.004 + Math.random() * 0.008 });
    };

    let last = performance.now();
    let acc = 0;
    let raf = 0;

    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      while (acc > 350) {
        spawnPacket();
        acc -= 350;
      }

      ctx.clearRect(0, 0, W(), H());

      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (Math.hypot(dx, dy) < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      packets = packets.filter((p) => p.t < 1);
      for (const p of packets) {
        p.t += p.speed;
        const a = nodes[p.from];
        const b = nodes[p.to];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;

        ctx.strokeStyle = `rgba(232,255,71,${0.35 * (1 - p.t)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = "#e8ff47";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const n of nodes) {
        if (n.isMe) {
          ctx.strokeStyle = "rgba(232,255,71,0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = n.isMe ? "rgba(232,255,71,0.9)" : "rgba(255,255,255,0.4)";
        ctx.font = `${n.isMe ? "10" : "9"}px DM Mono, monospace`;
        ctx.fillText(n.label, n.x + n.r + 3, n.y + 3);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [highlight]);

  return <canvas ref={ref} className="w-full h-full block" />;
}
