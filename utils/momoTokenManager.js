// momoTokenManager.js
const axios = require('axios');

let cachedToken = null;
let tokenExpiryTime = 0;

async function getMomoToken() {
  const now = Date.now();

  // Return the cached token if it's still valid
  if (cachedToken && now < tokenExpiryTime) {
    return cachedToken;
  }

  // Token not cached or expired, get new one
  const response = await axios.post(
    `${process.env.MOMO_BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
        Authorization: 'Basic ' + Buffer.from(
          `${process.env.MOMO_UUID_OR_API_USER}:${process.env.MOMO_API_KEY}`
        ).toString('base64'),
      },
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiryTime = now + 3500 * 1000; // 3500 seconds in milliseconds

  return cachedToken;
}

module.exports = { getMomoToken };