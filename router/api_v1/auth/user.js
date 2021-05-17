const express = require('express');
const Router = express.Router();

// ! base url /api/v1/auth/user

const uuid = require('uuid');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

Router.get('/', [], async (req, res) => {
    try {
        const sql = 'SELECT uuid,name from auth.user;'
        const staffList = await req.mysql._query(sql);
        res.send(staffList);
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Internal Server Error');
    }
});

Router.get('/:id', [], async (req, res) => {
    try {
        const { id } = req.params;
        if (!uuid.validate(id)) return res.status(400).send('Bad Request');
        const sql = `SELECT * FROM auth.user_info WHERE uuid='${id}';`;
        const [staff] = await req.mysql._query(sql);
        res.send(staff);
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Internal Server Error');
    }
});

Router.post(
    '/register',
    [
        body('email', 'The email is not valid.').isEmail(),
        body('name', 'Name is require.').exists(),
        body('password', 'Request password at least 8 characters').isLength({
            min: 8
        })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: 'Bad Request',
                    errors: errors.array()
                });
            }
            const { name, email } = req.body;
            const [user] = await req.mysql._query(`SELECT email FROM auth.user WHERE email='${email}';`);
            if (user) return res.status(406).json({ msg: 'The email has been register' });
            const id = uuid.v1();
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash(req.body.password, salt);
            const value = [id, name, email, new Date(), new Date, password]
            await req.mysql._query('INSERT INTO auth.user VALUES (?); ', [value]);
            res.status(200).json({ uuid: id, name, email });
        } catch (erro) {
            console.error(erro);
            res.status(500).send('Internal Server Error');
        }
    }
);

Router.post(
    '/login',
    [
        body('email').isEmail(),
        body('password').exists()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    msg: 'Login failed'
                });
            }
            const { email, password } = req.body;
            const sql = `SELECT * FROM auth.user WHERE email='${email}';`
            const [user] = await req.mysql._query(sql);
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    msg: 'Login failed'
                });
            }
            await req.mysql._query(`UPDATE auth.user SET last_login=? WHERE uuid='${user.uuid}';`, [new Date]);
            const token_payload = {
                uuid: user.uuid
            }
            jwt.sign(
                token_payload,
                process.env.jwt_secret,
                { expiresIn: 0 },
                (erro, token) => {
                    if (erro) throw erro;
                    res.json({
                        msg: 'Login successed',
                        uuid: user.uuid,
                        type: 'user',
                        token
                    });
                }
            );
        } catch (erro) {
            console.error(erro);
            res.status(500).send('Internal Server Error');
        }
    }
);

module.exports = Router;