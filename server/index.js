import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "data", "consumers.json");

app.use(cors());
app.use(express.json());

const captchaStore = new Map();
const CAPTCHA_TTL_MS = 5 * 60 * 1000;

function readConsumers() {
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw);
}

function writeConsumers(consumers) {
  fs.writeFileSync(dataPath, JSON.stringify(consumers, null, 2));
}

function generateTextCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function generateMathCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { text: `${a} + ${b}`, value: String(a + b) };
}

function buildCaptchaSvg(text) {
  const wobble = Math.floor(Math.random() * 6) - 3;
  return `
<svg width="140" height="40" viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg">
  <rect width="140" height="40" rx="8" fill="#f7fbff" />
  <line x1="10" y1="8" x2="130" y2="32" stroke="#9bb7d4" stroke-width="2" />
  <line x1="8" y1="32" x2="130" y2="12" stroke="#c2d6ee" stroke-width="2" />
  <text x="70" y="26" text-anchor="middle" font-size="18" fill="#0a3560" font-family="Courier New, monospace" transform="rotate(${wobble} 70 20)">${text}</text>
</svg>
  `.trim();
}

function createCaptcha() {
  const useMath = Math.random() > 0.6;
  let value = "";
  let text = "";

  if (useMath) {
    const math = generateMathCaptcha();
    value = math.value;
    text = math.text;
  } else {
    text = generateTextCaptcha();
    value = text;
  }

  const captchaId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  captchaStore.set(captchaId, { value, createdAt: Date.now() });

  return {
    captchaId,
    svg: buildCaptchaSvg(text)
  };
}

function validateCaptcha(captchaId, input) {
  const entry = captchaStore.get(captchaId);
  if (!entry) return false;
  if (Date.now() - entry.createdAt > CAPTCHA_TTL_MS) {
    captchaStore.delete(captchaId);
    return false;
  }
  const isValid = entry.value.toLowerCase() === String(input).trim().toLowerCase();
  if (isValid) captchaStore.delete(captchaId);
  return isValid;
}

function findConsumer(consumers, consumerNumber, section) {
  return consumers.find(
    (item) => item.consumerNumber === consumerNumber && item.section === section
  );
}

function normalizeConsumer(consumer) {
  if (consumer.bills && Array.isArray(consumer.bills)) {
    return consumer;
  }

  const fallbackBill = {
    id: `BILL-${consumer.consumerNumber}-1`,
    billAmount: consumer.billAmount,
    dueDate: consumer.dueDate,
    penalty: consumer.penalty,
    status: consumer.status || "PENDING"
  };

  return {
    consumerNumber: consumer.consumerNumber,
    section: consumer.section,
    name: consumer.name,
    address: consumer.address,
    bills: [fallbackBill]
  };
}

function findBill(consumer, billId) {
  if (!consumer || !consumer.bills) return null;
  return consumer.bills.find((bill) => bill.id === billId);
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/sections", (req, res) => {
  const consumers = readConsumers();
  const sections = Array.from(new Set(consumers.map((item) => item.section))).sort();
  res.json({ sections });
});

app.get("/api/captcha", (req, res) => {
  const captcha = createCaptcha();
  res.json(captcha);
});

app.post("/api/bill", (req, res) => {
  const { consumerNumber, section, captchaId, captchaValue } = req.body || {};

  if (!validateCaptcha(captchaId, captchaValue)) {
    res.json({ status: "CAPTCHA_INVALID" });
    return;
  }

  const consumers = readConsumers();
  const consumer = findConsumer(consumers, consumerNumber, section);

  if (!consumer) {
    res.json({ status: "INVALID_CONSUMER" });
    return;
  }

  const normalized = normalizeConsumer(consumer);

  res.json({
    status: "OK",
    consumer: normalized
  });
});

app.post("/api/pay", (req, res) => {
  const { consumerNumber, section, vpa, billId } = req.body || {};
  const consumers = readConsumers();
  const consumer = findConsumer(consumers, consumerNumber, section);

  if (!consumer) {
    res.json({ status: "INVALID_CONSUMER", message: "Consumer not found." });
    return;
  }

  const normalized = normalizeConsumer(consumer);
  const bill = findBill(normalized, billId);

  if (!bill) {
    res.json({ status: "INVALID_BILL", message: "Bill not found." });
    return;
  }

  if (!vpa || !vpa.includes("@")) {
    res.json({ status: "FAILURE", message: "Invalid UPI ID." });
    return;
  }

  const isFailure = vpa.toLowerCase().includes("fail");
  const isSuccess = vpa.toLowerCase().includes("success") || !isFailure;

  if (isSuccess) {
    bill.status = "PAID";
    consumer.bills = normalized.bills;
    writeConsumers(consumers);
    res.json({
      status: "SUCCESS",
      message: "Payment captured. Your bill is marked as paid.",
      bill
    });
  } else {
    res.json({
      status: "FAILURE",
      message: "UPI authorization failed. Please try again."
    });
  }
});

app.listen(port, () => {
  console.log(`Mock server running on http://localhost:${port}`);
});
