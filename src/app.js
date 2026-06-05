import express from "express";
import cors from "cors";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import indexRoutes from "./routes/index.routes.js";
import db from "./models/index.model.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : []),
];

const isPrivateNetworkOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
    origin,
  );

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      isPrivateNetworkOrigin(origin) ||
      process.env.NODE_ENV === "development"
    ) {
      return callback(null, true);
    }

    return callback(new Error(`Bloqueado por CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Middleware para parsear JSON - se inicializa UNA sola vez, no por cada request
app.use((req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    return next();
  }
  express.json({ strict: false })(req, res, (err) => {
    if (err) return next(err);
    // Garantizar que req.body siempre sea un objeto y nunca undefined
    if (req.body === undefined) req.body = {};
    next();
  });
});

app.use(express.urlencoded({ extended: true }));

app.use("/reports", express.static(path.join(__dirname, "../public/reports")));

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "MSG Repuestos API activa" });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "MSG Repuestos API activa" });
});

app.use("/api", indexRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Error no manejado:", err.stack || err.message);
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : err.message,
  });
});

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log("Conexion a MySQL exitosa (MSG Repuestos)");

    if (process.env.NODE_ENV === "development") {
      await db.sequelize.sync({ alter: false });
      console.log("Modelos verificados");
    }

    const PORT = Number(process.env.PORT) || 8080;
    const HOST = process.env.HOST || "0.0.0.0";

    const server = app.listen(PORT, HOST, () => {
      const networkUrls = Object.values(os.networkInterfaces())
        .flat()
        .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
        .map((iface) => `http://${iface.address}:${PORT}`);

      console.log("Motor MSG iniciado satisfactoriamente");
      console.log(`Local: http://localhost:${PORT}`);
      networkUrls.forEach((url) => console.log(`Red:   ${url}`));
    });

    process.on("SIGTERM", () => {
      server.close(async () => {
        await db.sequelize.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Error critico:", error.message);
    console.error(
      `MySQL configurado en ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306}`,
    );
    process.exit(1);
  }
}

startServer();
