// momoTokenManager.js
const axios = require('axios');
const Redis = require('ioredis');

const redis = new Redis(); // adjust with options if needed

async function getMomoToken() {
  const cachedToken = await redis.get('momo_token');
  if (cachedToken) {
    return cachedToken;
  }

  // Token not cached or expired, get new one
  const response = await axios.post(
    `${process.env.MOMO_BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
        Authorization: 'Basic ' + Buffer.from(`${process.env.MOMO_UUID_OR_API_USER}:${process.env.MOMO_API_KEY}`).toString('base64'),
      },
    }
  );

  const accessToken = response.data.access_token;

  // Set token in Redis with expiry of ~58 mins
  await redis.set('momo_token', accessToken, 'EX', 3500); // EX sets expiry in seconds

  return accessToken;
}

module.exports = { getMomoToken };