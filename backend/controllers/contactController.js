const nodemailer = require("nodemailer");
const ContactMessage = require("../models/ContactMessage");

const transporter = nodemailer.createTransport({
service: "gmail",
auth: {
user: process.env.CONTACT_EMAIL,
pass: process.env.CONTACT_EMAIL_PASSWORD,
},
});

const submitContact = async (req, res) => {
try {
const { name, email, subject, message } = req.body;
if (!name || !email || !subject || !message) {
  return res.status(400).json({
    success: false,
    message: "All fields are required.",
  });
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  return res.status(400).json({
    success: false,
    message: "Please provide a valid email address.",
  });
}

const savedMessage = await ContactMessage.create({
  name: name.trim(),
  email: email.trim().toLowerCase(),
  subject: subject.trim(),
  message: String(message),
});

await transporter.sendMail({
  from: {
    name: "Everything Contact",
    address: process.env.CONTACT_EMAIL,
  },

  to: process.env.CONTACT_RECEIVER,

  replyTo: email,

  subject: `Contact Form: ${subject}`,

  text: `

New contact message from Everything website

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`,

  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Contact Message</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>

      <hr />

      <h3>Message</h3>

      <p>
        ${message.replace(/\n/g, "<br />")}
      </p>
    </div>
  `,
});

console.log(
  `Contact email sent successfully from ${email}`
);

return res.status(200).json({
  success: true,
  message: "Your message has been sent successfully.",
});

} catch (error) {
console.error("Contact email error:", error);

return res.status(500).json({
  success: false,
  message: "Unable to send your message. Please try again later.",
});

}
};

module.exports = {
submitContact,
};
