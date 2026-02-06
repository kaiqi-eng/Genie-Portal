const express = require('express');
const router = express.Router();
const rssService = require('../services/rssService');

/**
 * POST /api/rss/fetch
 * Fetches or generates an RSS feed for a given URL
 * 
 * Request body:
 * {
 *   "url": "https://example.com"
 * }
 * 
 * Response:
 * {
 *   "source": "discovered" | "generated",
 *   "feedUrl": "https://example.com/feed" | null,
 *   "feed": { title, description, items: [...] },
 *   "rssXml": "<?xml version=\"1.0\"...>" | null
 * }
 */
router.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Please provide a URL in the request body' 
      });
    }

    const result = await rssService.getRssFeed(url);
    res.json(result);
  } catch (error) {
    console.error('RSS fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch RSS',
      message: error.message 
    });
  }
});

/**
 * POST /api/rss/discover
 * Discover RSS feed URL for a website (doesn't fetch content)
 */
router.post('/discover', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const feedUrl = await rssService.discoverFeed(url);
    res.json({ 
      url: url,
      feedUrl: feedUrl,
      hasFeed: !!feedUrl 
    });
  } catch (error) {
    console.error('RSS discovery error:', error);
    res.status(500).json({ 
      error: 'Failed to discover RSS',
      message: error.message 
    });
  }
});

module.exports = router;
