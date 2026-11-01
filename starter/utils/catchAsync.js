// So we kind of Make this function into a particular file so that we don't Had to rewrite the same code again and again We can just export it
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
