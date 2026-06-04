import { useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";

export function NodeGraph({
  highlight,
  wallets = [],
}: {
  highlight?: string;
  wallets?: { addr: string; role: string; rep: number }[];
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const overlayNodes = useMemo(() => {
    const source =
      wallets.length > 0
        ? wallets.slice(0, 8)
        : highlight
          ? [{ addr: highlight, role: "YOU", rep: 0 }]
          : [];
    return source.map((wallet, i) => {
      const angle = (Math.PI * 2 * i) / Math.max(1, source.length);
      const radius = source.length === 1 ? 0 : 34;
      return {
        wallet,
        left: 50 + Math.cos(angle) * radius,
        top: 50 + Math.sin(angle) * radius,
        primary: wallet.addr.toLowerCase() === highlight?.toLowerCase(),
      };
    });
  }, [highlight, wallets]);

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
    const count = Math.max(12, wallets.length || 28);
    const nodes: Node[] = Array.from({ length: count }, (_, i) => {
      const wallet = wallets[i];
      const label = wallet
        ? wallet.addr
        : i === 0 && highlight
          ? highlight
          : `0x${(0x1000 + i * 0x91).toString(16).slice(0, 4)}`;
      return {
        x: Math.random() * W(),
        y: Math.random() * H(),
        r: wallet
          ? Math.min(8, 3 + Math.max(1, wallet.rep) / 20)
          : i === 0 && highlight
            ? 6
            : 3 + Math.random() * 4,
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
  }, [highlight, wallets]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={ref} className="w-full h-full block" />
      {overlayNodes.map(({ wallet, left, top, primary }) => (
        <Link
          key={wallet.addr}
          to="/wallet/$address"
          params={{ address: wallet.addr }}
          aria-label={`Open wallet ${wallet.addr}`}
          className={`absolute -translate-x-1/2 -translate-y-1/2 border bg-black/80 px-2 py-1 text-left font-mono text-[10px] shadow-[0_0_18px_rgba(232,255,71,0.08)] backdrop-blur transition-colors hover:border-yellow hover:text-yellow ${
            primary ? "border-yellow text-yellow" : "border-cyan/50 text-cyan"
          }`}
          style={{ left: `${left}%`, top: `${top}%` }}
        >
          <span className="block max-w-[150px] truncate">
            {wallet.addr.slice(0, 8)}...{wallet.addr.slice(-6)}
          </span>
          <span className="block text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {wallet.role} · rep {wallet.rep}
          </span>
        </Link>
      ))}
      {wallets.length > 0 && (
        <div className="absolute right-2 top-2 flex max-w-[220px] flex-col gap-1">
          {wallets.slice(0, 5).map((w) => (
            <Link
              key={w.addr}
              to="/wallet/$address"
              params={{ address: w.addr }}
              className="border border-border bg-black/70 px-2 py-1 font-mono text-[10px] text-cyan hover:border-yellow hover:text-yellow"
            >
              {w.addr}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
