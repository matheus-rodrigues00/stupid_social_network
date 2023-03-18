const pagination = async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page) || 0, 0);
  const limit = Math.min(parseInt(req.query.size) || 10, 10);
  req.pagination = { page, limit };
  next();
};

module.exports = pagination;
