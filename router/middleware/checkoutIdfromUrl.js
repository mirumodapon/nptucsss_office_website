const uuid = require('uuid');
module.exports = function (req, res, next) {
    const id = req.params.id;
    if (!uuid.validate(id)) return res.status(400).send('Bad Request');
    next();
}