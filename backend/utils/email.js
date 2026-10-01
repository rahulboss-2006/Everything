const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendOTPEmail(email, otp) {
  await transporter.sendMail({
    from: `"Everything" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Everything - Email Verification Code",

    text: `Your Everything verification code is ${otp}. This code expires in 5 minutes.`,

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 500px;
        margin: 40px auto;
        padding: 30px;
        border: 1px solid #ddd;
        border-radius: 12px;
      ">
        <h2>Everything</h2>

        <p>Your email verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 20px;
          background: #f4f4f4;
          text-align: center;
          border-radius: 8px;
        ">
          ${otp}
        </div>

        <p>This code will expire in <strong>5 minutes</strong>.</p>

        <p>
          If you did not request this code, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}


async function sendAccountDeletionEmail(email, reason) {
  await transporter.sendMail({
    from: `"Everything" <${process.env.EMAIL_USER}>`,
    to: email,

    subject: "Everything - Account Deleted",

    text: [
      "Your Everything account has been deleted.",
      "",
      `Reason: ${reason}`,
      "",
      "If you believe this was a mistake, please contact support.",
    ].join("\n"),

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 40px auto;
        padding: 30px;
        border: 1px solid #ddd;
        border-radius: 14px;
        background: #ffffff;
      ">

        <h2 style="margin-top: 0;">
          Everything
        </h2>

        <h3>
          Your account has been deleted
        </h3>

        <p>
          Your Everything account has been deleted by the administrator.
        </p>

        <div style="
          margin: 20px 0;
          padding: 18px;
          background: #f5f5f5;
          border-radius: 10px;
        ">

          <strong>Reason:</strong>

          <p style="
            margin-bottom: 0;
            white-space: pre-wrap;
          ">
            ${reason}
          </p>

        </div>

        <p>
          If you believe this was a mistake, please contact support.
        </p>

        <p>
          Regards,<br/>
          Everything Team
        </p>

      </div>
    `,
  });
}
module.exports = {
  sendOTPEmail,
  sendAccountDeletionEmail,
};
