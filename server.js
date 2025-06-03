require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const YT_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Helper: AI topics to search for
const TRENDING_QUERIES = [
  'Artificial Intelligence',
  'Machine Learning',
  'Generative AI',
  'AI Tools 2025',
  'OpenAI',
  'ChatGPT',
  'Google Gemini',
  'AI News',
  'AI Tutorial',
  'Future of AI'
];

// Fetch your channel's videos
async function getChannelVideos(channelId, max = 10) {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${channelId}&part=snippet&maxResults=${max}&order=date&type=video`;
  try {
    const res = await axios.get(url);
    return res.data.items.map(v => ({
      videoId: v.id.videoId,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.medium.url,
      channel: v.snippet.channelTitle,
      description: v.snippet.description
    }));
  } catch (err) {
    console.error("[ERROR] Fetching channel videos:", err?.response?.data || err.message);
    return [];
  }
}

// Fetch truly trending/popular AI videos across YouTube (not just newest)
// Uses Science & Tech category and filters for AI terms
async function getTrendingAIVideos(max = 12) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=US&videoCategoryId=28&maxResults=25&key=${YT_KEY}`;
  try {
    const res = await axios.get(url);
    // Filter for AI-related keywords in title/description
    const aiTerms = ['AI', 'Artificial Intelligence', 'Machine Learning', 'Generative', 'OpenAI', 'ChatGPT', 'Gemini'];
    const isAI = (v) => {
      const txt = (v.snippet.title + ' ' + v.snippet.description).toLowerCase();
      return aiTerms.some(term => txt.includes(term.toLowerCase()));
    };
    const filtered = res.data.items.filter(isAI).slice(0, max);
    return filtered.map(v => ({
      videoId: v.id,
      title: v.snippet.title,
      thumbnail: v.snippet.thumbnails.medium.url,
      channel: v.snippet.channelTitle,
      description: v.snippet.description
    }));
  } catch (err) {
    console.error("[ERROR] Fetching trending AI videos:", err?.response?.data || err.message);
    return [];
  }
}

app.get('/api/neural-stream', async (req, res) => {
  try {
    // Section 1: Your channel’s videos
    const myVideos = await getChannelVideos(CHANNEL_ID, 10);

    // Section 2: Truly trending AI videos (not just latest, but most popular!)
    let trendingVideos = await getTrendingAIVideos(12);

    // (Optional fallback if none found)
    if (trendingVideos.length === 0) {
      trendingVideos = [];
      for (let topic of TRENDING_QUERIES) {
        const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&part=snippet&q=${encodeURIComponent(topic)}&maxResults=1&order=viewCount&type=video`;
        const resp = await axios.get(url);
        trendingVideos.push(...resp.data.items.map(v => ({
          videoId: v.id.videoId,
          title: v.snippet.title,
          thumbnail: v.snippet.thumbnails.medium.url,
          channel: v.snippet.channelTitle,
          description: v.snippet.description
        })));
        if (trendingVideos.length >= 12) break;
      }
    }

    res.json({ myVideos, trendingVideos: trendingVideos.slice(0, 12) });
  } catch (err) {
    console.error("[FATAL] /api/neural-stream route error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch videos", details: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Neural Stream API running on port ${PORT}`);
  if (!YT_KEY || !CHANNEL_ID) {
    console.log("[WARN] Missing env vars! Check .env file (YOUTUBE_API_KEY, CHANNEL_ID).");
  }
});