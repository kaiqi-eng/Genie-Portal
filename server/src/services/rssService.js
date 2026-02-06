const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const { Feed } = require('feed');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; GenieRSS/1.0)',
  },
});

// Common RSS feed URL patterns to check
const COMMON_FEED_PATHS = [
  '/feed',
  '/rss',
  '/rss.xml',
  '/feed.xml',
  '/atom.xml',
  '/feeds/posts/default',
  '/index.xml',
  '/feed/rss',
  '/rss/feed',
  '/?feed=rss2',
  '/blog/feed',
  '/news/feed',
];

/**
 * Discover RSS feed URL from a website
 * @param {string} url - The website URL to check
 * @returns {Promise<string|null>} - The RSS feed URL or null
 */
const discoverFeed = async (url) => {
  try {
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    // First, try to find feed links in the HTML head
    const response = await axios.get(normalizedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GenieRSS/1.0)',
      },
    });

    const $ = cheerio.load(response.data);
    
    // Look for RSS/Atom link tags in head
    const feedLinks = [];
    
    $('link[type="application/rss+xml"], link[type="application/atom+xml"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        feedLinks.push(resolveUrl(normalizedUrl, href));
      }
    });

    // Also check for alternate links
    $('link[rel="alternate"]').each((_, el) => {
      const type = $(el).attr('type');
      const href = $(el).attr('href');
      if (href && (type?.includes('rss') || type?.includes('atom') || type?.includes('xml'))) {
        feedLinks.push(resolveUrl(normalizedUrl, href));
      }
    });

    // Return first valid feed link found
    for (const feedUrl of feedLinks) {
      if (await isValidFeed(feedUrl)) {
        return feedUrl;
      }
    }

    // If no feed links in head, try common feed paths
    const baseUrl = new URL(normalizedUrl).origin;
    for (const path of COMMON_FEED_PATHS) {
      const feedUrl = baseUrl + path;
      if (await isValidFeed(feedUrl)) {
        return feedUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Feed discovery error:', error.message);
    return null;
  }
};

/**
 * Check if a URL points to a valid RSS/Atom feed
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>}
 */
const isValidFeed = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GenieRSS/1.0)',
      },
    });
    
    const contentType = response.headers['content-type'] || '';
    const data = response.data;
    
    // Check content type
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      return true;
    }
    
    // Check content for XML feed markers
    if (typeof data === 'string') {
      return data.includes('<rss') || data.includes('<feed') || data.includes('<channel');
    }
    
    return false;
  } catch {
    return false;
  }
};

/**
 * Fetch and parse an RSS feed
 * @param {string} feedUrl - The RSS feed URL
 * @returns {Promise<Object>} - Parsed feed object
 */
const fetchFeed = async (feedUrl) => {
  try {
    const feed = await parser.parseURL(feedUrl);
    
    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description || '',
      link: feed.link || feedUrl,
      items: feed.items.map(item => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        description: item.contentSnippet || item.content || item.summary || '',
        content: item.content || item.contentSnippet || '',
        pubDate: item.pubDate || item.isoDate || null,
        author: item.creator || item.author || '',
        categories: item.categories || [],
      })),
    };
  } catch (error) {
    console.error('Feed fetch error:', error.message);
    throw new Error(`Failed to fetch feed: ${error.message}`);
  }
};

/**
 * Generate RSS feed from website content when no feed exists
 * @param {string} url - The website URL
 * @returns {Promise<Object>} - Generated feed object and RSS XML
 */
const generateFeed = async (url) => {
  try {
    const normalizedUrl = normalizeUrl(url);
    
    const response = await axios.get(normalizedUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GenieRSS/1.0)',
      },
    });

    const $ = cheerio.load(response.data);
    
    // Extract page metadata
    const pageTitle = $('title').text() || $('meta[property="og:title"]').attr('content') || 'Generated Feed';
    const pageDescription = $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content') || '';

    // Create feed
    const feed = new Feed({
      title: pageTitle,
      description: pageDescription,
      id: normalizedUrl,
      link: normalizedUrl,
      generator: 'Genie-RSS',
      updated: new Date(),
    });

    // Extract articles/content
    const items = extractArticles($, normalizedUrl);
    
    items.forEach(item => {
      feed.addItem({
        title: item.title,
        id: item.link,
        link: item.link,
        description: item.description,
        content: item.content,
        date: item.date ? new Date(item.date) : new Date(),
        author: item.author ? [{ name: item.author }] : [],
      });
    });

    return {
      feed: {
        title: pageTitle,
        description: pageDescription,
        link: normalizedUrl,
        items: items,
      },
      rssXml: feed.rss2(),
    };
  } catch (error) {
    console.error('Feed generation error:', error.message);
    throw new Error(`Failed to generate feed: ${error.message}`);
  }
};

/**
 * Extract articles from HTML content
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for resolving links
 * @returns {Array} - Array of article objects
 */
const extractArticles = ($, baseUrl) => {
  const items = [];
  
  // Common article selectors
  const articleSelectors = [
    'article',
    '.post',
    '.article',
    '.entry',
    '.blog-post',
    '.news-item',
    '[class*="article"]',
    '[class*="post-"]',
    '.card',
    '.item',
  ];

  // Try each selector
  for (const selector of articleSelectors) {
    const articles = $(selector);
    if (articles.length > 0) {
      articles.each((_, el) => {
        const $el = $(el);
        const item = extractArticleData($, $el, baseUrl);
        if (item.title && item.link) {
          items.push(item);
        }
      });
      
      if (items.length > 0) break;
    }
  }

  // Fallback: extract from links with headings
  if (items.length === 0) {
    $('a').each((_, el) => {
      const $el = $(el);
      const $heading = $el.find('h1, h2, h3, h4').first();
      
      if ($heading.length > 0) {
        const href = $el.attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          items.push({
            title: $heading.text().trim(),
            link: resolveUrl(baseUrl, href),
            description: $el.text().trim().substring(0, 300),
            content: $el.html(),
            date: null,
            author: '',
          });
        }
      }
    });
  }

  // Limit to 20 items
  return items.slice(0, 20);
};

/**
 * Extract data from a single article element
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} $article - Article element
 * @param {string} baseUrl - Base URL
 * @returns {Object} - Article data
 */
const extractArticleData = ($, $article, baseUrl) => {
  // Find title
  const $titleEl = $article.find('h1, h2, h3, h4, .title, [class*="title"]').first();
  const title = $titleEl.text().trim();

  // Find link
  let link = '';
  const $link = $article.find('a').first();
  if ($link.length > 0) {
    link = resolveUrl(baseUrl, $link.attr('href') || '');
  } else if ($titleEl.is('a')) {
    link = resolveUrl(baseUrl, $titleEl.attr('href') || '');
  }

  // Find description/excerpt
  const $desc = $article.find('p, .excerpt, .summary, .description, [class*="excerpt"]').first();
  const description = $desc.text().trim().substring(0, 500);

  // Find date
  const $date = $article.find('time, .date, .time, [class*="date"]').first();
  const dateStr = $date.attr('datetime') || $date.text().trim();
  const date = parseDate(dateStr);

  // Find author
  const $author = $article.find('.author, [class*="author"], [rel="author"]').first();
  const author = $author.text().trim();

  return {
    title,
    link,
    description,
    content: $article.html(),
    date,
    author,
  };
};

/**
 * Parse date string to ISO format
 * @param {string} dateStr - Date string
 * @returns {string|null} - ISO date string or null
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Ignore parsing errors
  }
  
  return null;
};

/**
 * Normalize URL (add https:// if missing)
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
const normalizeUrl = (url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
};

/**
 * Resolve relative URL against base URL
 * @param {string} baseUrl - Base URL
 * @param {string} relativeUrl - Relative URL
 * @returns {string} - Absolute URL
 */
const resolveUrl = (baseUrl, relativeUrl) => {
  if (!relativeUrl) return baseUrl;
  
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
};

/**
 * Main function to fetch RSS for a URL (discover or generate)
 * @param {string} url - The website URL
 * @returns {Promise<Object>} - RSS feed data
 */
const getRssFeed = async (url) => {
  const normalizedUrl = normalizeUrl(url);
  
  // Try to discover existing feed
  const feedUrl = await discoverFeed(normalizedUrl);
  
  if (feedUrl) {
    // Found existing feed, fetch it
    const feed = await fetchFeed(feedUrl);
    return {
      source: 'discovered',
      feedUrl: feedUrl,
      feed: feed,
      rssXml: null,
    };
  }
  
  // No feed found, generate one
  const generated = await generateFeed(normalizedUrl);
  return {
    source: 'generated',
    feedUrl: null,
    feed: generated.feed,
    rssXml: generated.rssXml,
  };
};

module.exports = {
  discoverFeed,
  fetchFeed,
  generateFeed,
  getRssFeed,
};
