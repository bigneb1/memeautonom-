#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import process from "node:process";
import postgres from "postgres";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || "8080");
const SCHEMA = process.env.ENVIO_PG_PUBLIC_SCHEMA || "public";
const MAX_FIRST = Number(process.env.INDEXER_API_MAX_FIRST || "100");
const DEFAULT_ENVIO_METRICS_PORT = "9898";

let envioProcess = null;
let envioExit = null;
const startedAt = new Date().toISOString();

function derivePgEnv(env) {
  const next = { ...env };
  if (env.DATABASE_URL) {
    try {
      const url = new URL(env.DATABASE_URL);
      next.ENVIO_PG_HOST ||= url.hostname;
      next.ENVIO_PG_PORT ||= url.port || "5432";
      next.ENVIO_PG_USER ||= decodeURIComponent(url.username);
      next.ENVIO_PG_PASSWORD ||= decodeURIComponent(url.password);
      next.ENVIO_PG_DATABASE ||= url.pathname.replace(/^\//, "");
      if (url.searchParams.get("sslmode")) {
        next.ENVIO_PG_SSL_MODE ||= url.searchParams.get("sslmode") || "require";
      }
    } catch {
      // Fall back to explicit PG* variables below.
    }
  }
  next.ENVIO_PG_HOST ||= env.PGHOST;
  next.ENVIO_PG_PORT ||= env.PGPORT;
  next.ENVIO_PG_USER ||= env.PGUSER;
  next.ENVIO_PG_PASSWORD ||= env.PGPASSWORD;
  next.ENVIO_PG_DATABASE ||= env.PGDATABASE || env.POSTGRES_DB;
  next.ENVIO_PG_SSL_MODE ||= env.PGSSLMODE || "require";
  return next;
}

const runtimeEnv = derivePgEnv(process.env);

function pgOptions() {
  const sslMode = runtimeEnv.ENVIO_PG_SSL_MODE;
  return {
    host: runtimeEnv.ENVIO_PG_HOST || "localhost",
    port: Number(runtimeEnv.ENVIO_PG_PORT || "5433"),
    database: runtimeEnv.ENVIO_PG_DATABASE || "envio-dev",
    username: runtimeEnv.ENVIO_PG_USER || "postgres",
    password: runtimeEnv.ENVIO_PG_PASSWORD || "testing",
    ssl:
      sslMode && sslMode !== "false" && sslMode !== "disable"
        ? sslMode === "require"
          ? "require"
          : sslMode
        : false,
    max: Number(process.env.INDEXER_API_PG_MAX || "4"),
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
  };
}

const sql = postgres(pgOptions());

function startEnvio() {
  if (parseBool(process.env.RUN_ENVIO, true) === false) return;
  const childEnv = {
    ...runtimeEnv,
    ENVIO_HASURA: runtimeEnv.ENVIO_HASURA || "false",
    ENVIO_INDEXER_PORT: runtimeEnv.ENVIO_INDEXER_PORT || DEFAULT_ENVIO_METRICS_PORT,
    TUI_OFF: runtimeEnv.TUI_OFF || "true",
  };
  envioProcess = spawn("npm", ["run", "start:envio"], {
    env: childEnv,
    stdio: "inherit",
  });
  envioProcess.on("exit", (code, signal) => {
    envioExit = { code, signal, at: new Date().toISOString() };
    if (parseBool(process.env.EXIT_ON_ENVIO_STOP, true)) process.exit(code ?? 1);
  });
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function clampFirst(value, fallback = 20) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return Math.min(n, MAX_FIRST);
}

function json(res, code, payload) {
  res.writeHead(code, corsHeaders());
  res.end(JSON.stringify(payload, bigintJson));
}

function corsHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    "access-control-allow-origin": process.env.CORS_ORIGIN || "*",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    ...extra,
  };
}

function bigintJson(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function dbPing() {
  await sql`select 1 as ok`;
}

async function tableCount(tableName) {
  try {
    const rows = await sql`
      select count(*)::int as count
      from information_schema.tables
      where table_schema = ${SCHEMA} and table_name = ${tableName}
    `;
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

async function health() {
  let db = false;
  let tables = {};
  let error = "";
  try {
    await dbPing();
    db = true;
    const names = ["Wallet", "Skill", "SkillInstall", "Execution", "EconomyStat"];
    tables = Object.fromEntries(
      await Promise.all(names.map(async (name) => [name, await tableCount(name)])),
    );
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  return {
    ok: db,
    db,
    schema: SCHEMA,
    tables,
    envio: {
      pid: envioProcess?.pid ?? null,
      running: Boolean(envioProcess && !envioProcess.killed && envioExit === null),
      exit: envioExit,
    },
    startedAt,
    error,
  };
}

async function walletById(id) {
  const rows = await sql`
    select
      w.id,
      w.address,
      w.role,
      w.reputation,
      w."jobsCompleted",
      w."volumeUsdc",
      w."autonomyScore",
      w."activatedAt",
      w."identityId",
      w."identityUri",
      w.controller
    from ${sql(SCHEMA)}."Wallet" w
    where w.id = ${id.toLowerCase()}
    limit 1
  `;
  if (rows.length === 0) return null;
  const wallet = rows[0];
  wallet.skills = await skillsForWallet(wallet.id);
  wallet.executions = await executionsForWallet(wallet.id, 20);
  return wallet;
}

async function wallets(first) {
  const rows = await sql`
    select
      w.id,
      w.address,
      w.role,
      w.reputation,
      w."jobsCompleted",
      w."volumeUsdc",
      w."autonomyScore",
      w."activatedAt",
      w."identityId",
      w."identityUri",
      w.controller
    from ${sql(SCHEMA)}."Wallet" w
    order by w.reputation desc, w."activatedAt" desc
    limit ${first}
  `;
  return Promise.all(
    rows.map(async (wallet) => ({
      ...wallet,
      skills: await skillsForWallet(wallet.id),
      executions: await executionsForWallet(wallet.id, 20),
    })),
  );
}

async function skillsForWallet(walletId) {
  return sql`
    select si.name, si.status, si.fires
    from ${sql(SCHEMA)}."SkillInstall" si
    where si.wallet_id = ${walletId}
    order by si.fires desc, si."installedAt" desc
  `;
}

async function executionsForWallet(walletId, first) {
  return sql`
    select e.timestamp, e.action, e.detail, e."txHash", e.color
    from ${sql(SCHEMA)}."Execution" e
    where e.wallet_id = ${walletId}
    order by e.timestamp desc
    limit ${first}
  `;
}

async function latestExecutions(first) {
  const rows = await sql`
    select
      e.timestamp,
      e.action,
      e.detail,
      e."txHash",
      e.color,
      w.address as wallet_address
    from ${sql(SCHEMA)}."Execution" e
    left join ${sql(SCHEMA)}."Wallet" w on w.id = e.wallet_id
    order by e.timestamp desc
    limit ${first}
  `;
  return rows.map((row) => ({
    timestamp: row.timestamp,
    action: row.action,
    detail: row.detail,
    txHash: row.txHash,
    color: row.color,
    wallet: { address: row.wallet_address || "unknown" },
  }));
}

async function economyStat() {
  const rows = await sql`
    select id, "activeWallets", "jobsToday", "usdcSettled", "avgDecisionMs", "updatedAt"
    from ${sql(SCHEMA)}."EconomyStat"
    where id = 'global'
    limit 1
  `;
  return rows[0] ?? null;
}

async function skills(first) {
  const rows = await sql`
    select
      s.id,
      s.name,
      s.uri,
      s.installs,
      s.fires,
      w.address as author_address,
      w.role as author_role
    from ${sql(SCHEMA)}."Skill" s
    left join ${sql(SCHEMA)}."Wallet" w on w.id = s.author_id
    order by s.fires desc, s."publishedAt" desc
    limit ${first}
  `;
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    uri: row.uri,
    installs: row.installs,
    fires: row.fires,
    author: row.author_address ? { address: row.author_address, role: row.author_role } : null,
  }));
}

async function handleGraphql({ query = "", variables = {} }) {
  const compact = query.replace(/\s+/g, " ");
  if (compact.includes("wallet(id:")) {
    return { data: { wallet: await walletById(String(variables.addr || "")) } };
  }
  if (compact.includes("wallets(")) {
    return { data: { wallets: await wallets(clampFirst(variables.first, 25)) } };
  }
  if (compact.includes("economyStat(")) {
    return { data: { economyStat: await economyStat() } };
  }
  if (compact.includes("executions(")) {
    return { data: { executions: await latestExecutions(clampFirst(variables.first, 20)) } };
  }
  if (compact.includes("skills(")) {
    return { data: { skills: await skills(clampFirst(variables.first, 20)) } };
  }
  return {
    errors: [
      {
        message:
          "Unsupported query. This service implements the MemeAutonom frontend read model only.",
      },
    ],
  };
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/healthz")) {
      return json(res, 200, await health());
    }
    if (req.method === "GET" && url.pathname === "/") {
      return json(res, 200, {
        ok: true,
        service: "memeautonom-indexer",
        graphql: "/v1/graphql",
        health: "/health",
      });
    }
    if (req.method === "POST" && url.pathname === "/v1/graphql") {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      return json(res, 200, await handleGraphql(body));
    }
    return json(res, 404, { ok: false, error: "not found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, 500, { ok: false, errors: [{ message }] });
  }
});

startEnvio();
server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({ ok: true, service: "memeautonom-indexer", host: HOST, port: PORT }));
});

process.on("SIGTERM", async () => {
  envioProcess?.kill("SIGTERM");
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(0);
});
