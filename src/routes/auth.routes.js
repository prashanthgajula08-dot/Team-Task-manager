const express = require("express");
const { clearAuthCookie, hashPassword, setAuthCookie, signAuthToken, verifyPassword } = require("../lib/auth");
const { asyncHandler, AppError } = require("../lib/errors");
const { createUser, findUserByEmail, findUserById } = require("../lib/store");
const { loginSchema, signupSchema, validate } = require("../lib/validation");
const { requireAuth } = require("../middleware/require-auth");

const router = express.Router();

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = validate(signupSchema, req.body);

    const existingUser = findUserByEmail(input.email);

    if (existingUser) {
      throw new AppError(409, "An account with that email already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const user = createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = validate(loginSchema, req.body);

    const user = findUserByEmail(input.email);

    if (!user) {
      throw new AppError(401, "Invalid email or password.");
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password.");
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({
      message: "Logged in successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = findUserById(req.user.id);

    if (!user) {
      throw new AppError(404, "User account was not found.");
    }

    res.json({ user });
  }),
);

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

module.exports = { authRouter: router };
