const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("./env");

const TOKEN_NAME = "team_task_manager_token";

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: "7d" },
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function setAuthCookie(res, token) {
  res.cookie(TOKEN_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
  });
}

module.exports = {
  TOKEN_NAME,
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
  verifyPassword,
};
