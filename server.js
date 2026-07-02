const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT || 80);
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "data.json");
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function loadState() {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveState(data) {
  ensureDataDir();
  const payload = {
    ...data,
    serverUpdatedAt: new Date().toISOString()
  };
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tempFile, DATA_FILE);
  return payload;
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const rawPath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
  const normalized = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.basename(filePath) === "index.html" ? "no-store" : "public, max-age=60"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/state" && req.method === "GET") {
      sendJson(res, 200, { state: loadState() });
      return;
    }
    if (req.url === "/api/state" && req.method === "PUT") {
      const data = await readJsonBody(req);
      if (!data || typeof data !== "object") {
        sendJson(res, 400, { error: "Invalid state" });
        return;
      }
      sendJson(res, 200, { state: saveState(data) });
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`clean system listening on ${PORT}`);
});
