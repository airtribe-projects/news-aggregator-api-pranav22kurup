const express = require('express');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const axios = require('axios');
const NEWS_API_KEY = process.env.NEWS_API_KEY || '8b3f92f519a24dabb5147a469b6cf98d';

// Simple in-memory users store for this exercise
const users = [];

// In-memory cache for news per user and global index
// Structure: { [userId]: { articles: Array, fetchedAt: number } }
const newsCache = {};
// Global map of articleId -> article for quick lookup
const articleIndex = new Map();
// Generate a stable ID for an article based on URL (fallback to title+publishedAt)
function articleId(a) {
    const base = a.url || `${a.title}|${a.publishedAt || ''}`;
    return Buffer.from(base).toString('base64');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic validators
function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

function isValidPreferences(preferences) {
    return Array.isArray(preferences) && preferences.every(p => typeof p === 'string' && p.trim().length > 0);
}

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
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (preferences !== undefined && !isValidPreferences(preferences)) {
            return res.status(400).json({ error: 'Preferences must be an array of non-empty strings' });
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
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }
        if (preferences !== undefined && !isValidPreferences(preferences)) {
            return res.status(400).json({ error: 'Preferences must be an array of non-empty strings' });
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
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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
    if (!isValidPreferences(preferences)) {
        return res.status(400).json({ error: 'Preferences must be an array of non-empty strings' });
    }
    req.user.preferences = preferences;
    return res.status(200).json({ preferences: req.user.preferences });
});

// GET /preferences - same as /users/preferences
app.get('/preferences', authMiddleware, (req, res) => {
    return res.status(200).json({ preferences: req.user.preferences || [] });
});

// PUT /preferences - same as /users/preferences
app.put('/preferences', authMiddleware, (req, res) => {
    const { preferences } = req.body || {};
    if (!isValidPreferences(preferences)) {
        return res.status(400).json({ error: 'Preferences must be an array of non-empty strings' });
    }
    req.user.preferences = preferences;
    return res.status(200).json({ preferences: req.user.preferences });
});

// Fetch news from external API for given keywords
async function fetchNewsByKeywords(keywords) {
    const url = 'https://newsapi.org/v2/everything';
    const params = { q: keywords, language: 'en', sortBy: 'publishedAt', pageSize: 20 };
    const headers = { 'X-Api-Key': NEWS_API_KEY };
    const response = await axios.get(url, { params, headers });
    if (!response.data || !Array.isArray(response.data.articles)) {
        throw new Error('Invalid response from news service');
    }
    return response.data.articles.map(a => ({
        id: articleId(a),
        title: a.title,
        description: a.description,
        url: a.url,
        source: a.source?.name,
        publishedAt: a.publishedAt
    }));
}

// GET /news - protected, with caching per user
app.get('/news', authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const prefs = Array.isArray(user.preferences) ? user.preferences : [];
        const keywords = prefs.length ? prefs.join(' OR ') : 'general';

        const cacheEntry = newsCache[user.id];
        const now = Date.now();
        const ttlMs = 5 * 60 * 1000; // 5 minutes
        if (cacheEntry && (now - cacheEntry.fetchedAt) < ttlMs) {
            return res.status(200).json({ news: cacheEntry.articles });
        }

        const articles = await fetchNewsByKeywords(keywords);
        // Update global article index
        for (const a of articles) {
            if (!articleIndex.has(a.id)) {
                articleIndex.set(a.id, a);
            }
        }
        newsCache[user.id] = { articles, fetchedAt: now };
        return res.status(200).json({ news: articles });
    } catch (err) {
        if (err.response) {
            const status = err.response.status;
            const msg = err.response.data?.message || 'News API error';
            if (status === 401 || status === 403) {
                return res.status(502).json({ error: 'Invalid or unauthorized News API key' });
            }
            return res.status(502).json({ error: msg });
        }
        const msg = err.message || 'Failed to fetch news';
        return res.status(500).json({ error: msg });
    }
});

// Mark article as read
app.post('/news/:id/read', authMiddleware, async (req, res) => {
    const id = req.params.id;
    const article = articleIndex.get(id);
    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }
    req.user.read = req.user.read || new Set();
    req.user.read.add(id);
    return res.status(200).json({ message: 'Marked as read', id });
});

// Mark article as favorite
app.post('/news/:id/favorite', authMiddleware, async (req, res) => {
    const id = req.params.id;
    const article = articleIndex.get(id);
    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }
    req.user.favorites = req.user.favorites || new Set();
    req.user.favorites.add(id);
    return res.status(200).json({ message: 'Marked as favorite', id });
});

// Get read articles
app.get('/news/read', authMiddleware, async (req, res) => {
    const ids = Array.from(req.user.read || []);
    const items = ids.map(id => articleIndex.get(id)).filter(Boolean);
    return res.status(200).json({ news: items });
});

// Get favorite articles
app.get('/news/favorites', authMiddleware, async (req, res) => {
    const ids = Array.from(req.user.favorites || []);
    const items = ids.map(id => articleIndex.get(id)).filter(Boolean);
    return res.status(200).json({ news: items });
});

// Search articles by keyword using cache first, fallback to API
app.get('/news/search/:keyword', authMiddleware, async (req, res) => {
    try {
        const keyword = req.params.keyword;
        if (typeof keyword !== 'string' || !keyword.trim()) {
            return res.status(400).json({ error: 'Keyword is required' });
        }
        const lower = keyword.toLowerCase();
        // Search in cache for the user first
        const cached = newsCache[req.user.id]?.articles || [];
        let matches = cached.filter(a =>
            (a.title && a.title.toLowerCase().includes(lower)) ||
            (a.description && a.description.toLowerCase().includes(lower))
        );
        if (matches.length === 0) {
            // Fallback to external API
            matches = await fetchNewsByKeywords(keyword);
            for (const a of matches) {
                if (!articleIndex.has(a.id)) articleIndex.set(a.id, a);
            }
        }
        return res.status(200).json({ news: matches });
    } catch (err) {
        if (err.response) {
            const status = err.response.status;
            const msg = err.response.data?.message || 'News API error';
            if (status === 401 || status === 403) {
                return res.status(502).json({ error: 'Invalid or unauthorized News API key' });
            }
            return res.status(502).json({ error: msg });
        }
        return res.status(500).json({ error: 'Failed to search news' });
    }
});

// Periodic cache refresh: refetch for users every 10 minutes
setInterval(async () => {
    try {
        const ttlMs = 10 * 60 * 1000;
        for (const user of users) {
            const prefs = Array.isArray(user.preferences) ? user.preferences : [];
            const keywords = prefs.length ? prefs.join(' OR ') : 'general';
            const articles = await fetchNewsByKeywords(keywords);
            for (const a of articles) {
                if (!articleIndex.has(a.id)) articleIndex.set(a.id, a);
            }
            newsCache[user.id] = { articles, fetchedAt: Date.now() };
        }
    } catch (e) {
        // Swallow errors to avoid crashing background job
    }
}, 10 * 60 * 1000);

app.listen(port, (err) => {
    if (err) {
        return console.log('Something bad happened', err);
    }
    console.log(`Server is listening on ${port}`);
});



module.exports = app;