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

app.get("/reset-password", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer contraseña - MSG Repuestos</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          padding: 20px;
          color: #334155;
        }
        .container {
          background: #ffffff;
          max-width: 420px;
          width: 100%;
          border-radius: 20px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
          padding: 40px 32px;
          text-align: center;
          box-sizing: border-box;
        }
        .icon-wrapper {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #EF4444, #F97316);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 16px -4px rgba(239, 68, 68, 0.4);
        }
        .icon-wrapper svg {
          width: 36px;
          height: 36px;
          fill: none;
          stroke: white;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        h1 {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px 0;
          letter-spacing: -0.02em;
        }
        p {
          font-size: 15px;
          line-height: 1.6;
          color: #64748b;
          margin: 0 0 32px 0;
        }
        .store-badges {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #0f172a;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          padding: 14px 24px;
          border-radius: 14px;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.2);
          background: #1e293b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon-wrapper">
          <svg viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        </div>
        <h1>Acción requerida en la app</h1>
        <p>Para proteger tu cuenta, el restablecimiento de contraseña solo puede realizarse directamente desde la aplicación oficial de <b>MSG Repuestos</b>.</p>
        <p style="font-size: 13px; margin-top: -16px; margin-bottom: 24px; color: #94a3b8;">
          Si ya la tienes instalada, abre este correo desde tu dispositivo móvil.
        </p>
        <div class="store-badges">
          <a href="#" class="btn" onclick="alert('Busca MSG Repuestos en Google Play Store.'); return false;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Abrir en Play Store
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

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

    // Hostinger te asignará el puerto correcto automáticamente.
    const PORT = process.env.PORT || 8080;

    // EL CAMBIO CLAVE: Quitamos 'HOST' del app.listen
    const server = app.listen(PORT, () => {
      console.log("Motor MSG iniciado satisfactoriamente");
      console.log(`Servidor corriendo en el puerto: ${PORT}`);
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
