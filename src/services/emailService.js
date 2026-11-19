
import nodemailer from "nodemailer";

// ============================================
// EMAIL RECIPIENTS
// ============================================

function getRecipients() {
  const raw = process.env.ALERT_RECIPIENTS || "";

  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

// ============================================
// GMAIL TRANSPORTER
// ============================================

function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    throw new Error("Gmail environment variables are missing.");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPassword.replace(/\s/g, ""),
    },
  });
}

// ============================================
// TEST EMAIL
// ============================================

export async function sendTestEmail() {
  const gmailUser = process.env.GMAIL_USER;
  const recipients = getRecipients();

  if (!recipients.length) {
    throw new Error("No recipient email addresses configured.");
  }

  const transporter = createTransporter();

  await transporter.verify();

  const result = await transporter.sendMail({
    from: `"Bhavish Trading Alerts" <${gmailUser}>`,
    to: recipients,
    subject: "Bhavish Trading - Gmail Test Alert",
    text: [
      "Hello,",
      "",
      "This is a test email from Bhavish Trading.",
      "Your Gmail alert connection is working.",
      "",
      "Next step: ICA + EMA9 crossover alerts.",
      "",
      "Bhavish Trading",
    ].join("\n"),
  });

  return {
    messageId: result.messageId,
    recipientCount: recipients.length,
  };
}

// ============================================
// ICA + EMA9 CROSSOVER ALERT
// ============================================

export async function sendCrossoverAlert({
  direction,
  ema9,
  ica,
  price,
  candleTime,
}) {
  const gmailUser = process.env.GMAIL_USER;
  const recipients = getRecipients();

  if (!recipients.length) {
    throw new Error("No recipient email addresses configured.");
  }

  if (!["BULLISH", "BEARISH"].includes(direction)) {
    throw new Error("Invalid crossover direction.");
  }

  if (
    !Number.isFinite(Number(ema9)) ||
    !Number.isFinite(Number(ica)) ||
    !Number.isFinite(Number(price)) ||
    !Number.isFinite(Number(candleTime))
  ) {
    throw new Error("Invalid crossover alert data.");
  }

  const transporter = createTransporter();

  const bullish = direction === "BULLISH";

  const signal = bullish
    ? "BULLISH CROSSOVER"
    : "BEARISH CROSSOVER";

  const formattedTime = new Date(
    Number(candleTime) * 1000
  ).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `NIFTY ${signal} - EMA9 vs ICA`;

  const message = [
    "BHAVISH TRADING - NIFTY ALERT",
    "",
    `Signal: ${signal}`,
    `Time: ${formattedTime} IST`,
    "",
    `NIFTY Price: ${Number(price).toFixed(2)}`,
    `5-Minute EMA 9: ${Number(ema9).toFixed(2)}`,
    `5-Minute ICA: ${Number(ica).toFixed(2)}`,
    "",
    "Crossover detected on a confirmed 5-minute candle.",
    "",
    "Bhavish Trading",
  ].join("\n");

  const result = await transporter.sendMail({
    from: `"Bhavish Trading Alerts" <${gmailUser}>`,
    to: recipients,
    subject,
    text: message,
  });

  return {
    messageId: result.messageId,
    recipientCount: recipients.length,
    direction,
  };
}
