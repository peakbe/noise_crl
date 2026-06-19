import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { router as apiRouter } from "./routes.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "CRL noise backend PRO+++" });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

app.listen(PORT, () => {
  console.log(`CRL noise backend listening on port ${PORT}`);
});
