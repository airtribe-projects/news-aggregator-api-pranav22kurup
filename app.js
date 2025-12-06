const express = require('express');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

// Simple in-memory users store for this exercise
const users = [];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware to verify Bearer token and attach user
function authMiddleware(req, res, next) {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = users.find(u => u.id === payload.id && u.email === payload.email);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// POST /register - create a new user with hashed password
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, preferences } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // check for existing user
        const existing = users.find(u => u.email === email);
        if (existing) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);

        const user = {
            id: Date.now().toString(),
            name: name || '',
            email,
            password: hashed,
            preferences: Array.isArray(preferences) ? preferences : []
        };

        users.push(user);

        return res.status(201).json({ message: 'User registered', id: user.id });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /users/signup - alias for /register used by tests (returns 200 on success)
app.post('/users/signup', async (req, res) => {
    try {
        const { name, email, password, preferences } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existing = users.find(u => u.email === email);
        if (existing) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const saltRounds = 10;
        const hashed = await bcrypt.hash(password, saltRounds);

        const user = {
            id: Date.now().toString(),
            name: name || '',
            email,
            password: hashed,
            preferences: Array.isArray(preferences) ? preferences : []
        };

        users.push(user);

        return res.status(200).json({ message: 'User registered', id: user.id });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /users/login - authenticate and return JWT
app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const payload = { id: user.id, email: user.email };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({ token });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /users/preferences - protected, returns user's preferences
app.get('/users/preferences', authMiddleware, (req, res) => {
    return res.status(200).json({ preferences: req.user.preferences || [] });
});

// PUT /users/preferences - protected, updates preferences
app.put('/users/preferences', authMiddleware, (req, res) => {
    const { preferences } = req.body || {};
    if (!Array.isArray(preferences)) {
        return res.status(400).json({ error: 'Preferences must be an array' });
    }
    req.user.preferences = preferences;
    return res.status(200).json({ preferences: req.user.preferences });
});

// GET /news - protected, returns dummy news list
app.get('/news', authMiddleware, (req, res) => {
    const news = [
        { title: 'Breaking: Sample News Item', category: 'general' },
        { title: 'Movies Update', category: 'movies' }
    ];
    return res.status(200).json({ news });
});

app.listen(port, (err) => {
    if (err) {
        return console.log('Something bad happened', err);
    }
    console.log(`Server is listening on ${port}`);
});



module.exports = app;