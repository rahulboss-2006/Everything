const argon2 = require("argon2");

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error("Usage: node scripts/createAdminHash.js YOUR_ADMIN_PASSWORD");
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

argon2.hash(password, { type: argon2.argon2id }).then((hash) => {
  console.log("ADMIN_PASSWORD_HASH=" + hash);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
