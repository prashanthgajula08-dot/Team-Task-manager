const { AppError } = require("../lib/errors");
const { TOKEN_NAME, verifyAuthToken } = require("../lib/auth");

function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;
  const token = req.cookies[TOKEN_NAME] || bearerToken;

  if (!token) {
    return next(new AppError(401, "Authentication is required."));
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch (_error) {
    return next(new AppError(401, "Your session has expired. Please log in again."));
  }
}

module.exports = { requireAuth };
