const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const converterRoutes = require("./routes/converter");
const pdfRoutes = require("./routes/pdf");
const authRoutes = require("./routes/auth");
const rechargeRoutes = require("./routes/recharge");
const paymentRecordRoutes = require("./routes/paymentRecords");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/admin");

const app = express();

/* ================================
   CORS
================================ */

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.replace(/\/$/, "")] : []),
    ],

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
        "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* ================================
   BODY PARSER
================================ */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ================================
   COOKIE PARSER
================================ */

app.use(cookieParser());

/* ================================
   OUTPUT FILES
================================ */

app.get(
  "/outputs/:fileName",
  (req, res) => {
    const fileName =
      req.params.fileName;

    const filePath = path.join(
      __dirname,
      "outputs",
      fileName
    );

    res.download(
      filePath,
      fileName,
      (error) => {
        if (error) {
          console.error(
            "Download error:",
            error
          );

          if (!res.headersSent) {
            res.status(404).json({
              success: false,
              message:
                "File not found.",
            });
          }
        }
      }
    );
  }
);

/* ================================
   AUTH ROUTES
================================ */

app.use(
  "/api/auth",
  authRoutes
);

/* ================================
   CONVERTER ROUTES
================================ */

app.use(
  "/api/converter",
  converterRoutes
);

app.use(
  "/api/recharge", 
  rechargeRoutes
);

app.use(
  "/api/contact",
  contactRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

/* ================================
   PDF ROUTES
================================ */

app.use(
  "/api/pdf",
  pdfRoutes
);

/* ================================
   HEALTH CHECK
================================ */

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      success: true,
      message:
        "Everything backend is running",
    });
  }
);

/* ================================
   ERROR HANDLER
================================ */

app.use(
  (error, _req, res, _next) => {
    console.error(
      "API Error:",
      error
    );

    res.status(
      error.status || 400
    ).json({
      success: false,
      message:
        error.message ||
        "Something went wrong.",
    });
  }
);

module.exports = app;


