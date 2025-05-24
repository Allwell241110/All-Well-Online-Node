const crypto = require('crypto');
const axios = require('axios');
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function sendFacebookEvent({
  eventName,
  email,
  phone,
  ip,
  userAgent,
  cart,
  productName,
  price,
  pixelId,
  accessToken,
  sourceUrl,
  externalId,
  firstName,
  productId,
}) {
  const payload = {
  data: [
    {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: sourceUrl,
      user_data: {
        em: email ? [hash(email)] : undefined,
        ph: phone ? [hash(phone)] : undefined,
        fn: firstName ? [hash(firstName)] : undefined,
        external_id: externalId ? [hash(externalId)] : undefined,
        client_ip_address: ip,
        client_user_agent: userAgent
      },
      custom_data: {
        content_ids: [productId],
        content_name: productName,
        content_type: 'product',
        currency: 'UGX',
        value: price
      }
    }
  ]
};

  const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`;
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data;
}

module.exports = { sendFacebookEvent };