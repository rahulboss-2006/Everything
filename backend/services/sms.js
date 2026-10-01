const https = require("https");

function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

function sendTwilioSms({ to, body }) {
  return new Promise((resolve, reject) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      return reject(new Error("SMS provider is not configured."));
    }

    const payload = new URLSearchParams({
      To: to,
      From: from,
      Body: body,
    }).toString();

    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const request = https.request(
      {
        hostname: "api.twilio.com",
        path: `/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          let parsed = {};
          try { parsed = JSON.parse(data); } catch {}
          if (response.statusCode >= 200 && response.statusCode < 300) {
            return resolve({ provider: "twilio", sid: parsed.sid || null });
          }
          reject(new Error(parsed.message || `SMS provider returned ${response.statusCode}.`));
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

async function sendSms({ to, body }) {
  if (!to) throw new Error("User does not have a phone number.");
  if (!isSmsConfigured()) throw new Error("SMS provider is not configured.");
  return sendTwilioSms({ to, body });
}

module.exports = { sendSms, isSmsConfigured };
