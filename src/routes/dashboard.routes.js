const express = require("express");
const { asyncHandler } = require("../lib/errors");
const { getDashboardForUser } = require("../lib/store");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(getDashboardForUser(req.user.id));
  }),
);

module.exports = { dashboardRouter: router };
