/**
 * AI Image Generation using Stable Horde (stablehorde.net)
 * Free, community-powered, no API key required.
 * Downloads image and serves it locally.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'public', 'images');
const HORDE_API = 'https://stablehorde.net/api/v2';
const ANON_KEY = '0000000000'; // Anonymous access

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Submit image generation job to Stable Horde
 */
async function submitJob(prompt) {
  const response = await fetch(`${HORDE_API}/generate/async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 500),
      params: {
        width: 512,
        height: 512,
        steps: 25,
        cfg_scale: 7,
      },
      nsfw: true,
      censor_nsfw: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Horde submit failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Poll for job completion and return the image
 */
async function waitForResult(jobId, maxWait = 120000) {
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const response = await fetch(`${HORDE_API}/generate/status/${jobId}`);
    if (!response.ok) throw new Error(`Status check failed: ${response.status}`);

    const data = await response.json();

    if (data.done && data.generations && data.generations.length > 0) {
      return data.generations[0].img; // base64 image data
    }

    if (data.faulted) {
      throw new Error('Image generation faulted on the server');
    }

    // Log progress
    if (data.queue_position !== undefined) {
      console.log(`[ImageGen] Queue position: ${data.queue_position}, wait: ~${data.wait_time}s`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error('Image generation timed out');
}

/**
 * Generate an image, save locally, return URL
 */
async function generateImage(prompt) {
  console.log(`[ImageGen] Generating: "${prompt.slice(0, 60)}..."`);

  // Submit job
  const job = await submitJob(prompt);
  console.log(`[ImageGen] Job submitted: ${job.id}`);

  // Wait for result (returns a URL to the image)
  const imageUrl = await waitForResult(job.id);

  // Download the image
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
  const buffer = Buffer.from(await imgResponse.arrayBuffer());

  // Save to file
  const ext = (imgResponse.headers.get('content-type') || '').includes('png') ? 'png' : 'webp';
  const filename = `nova_${Date.now()}.${ext}`;
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  const size = (fs.statSync(filepath).size / 1024).toFixed(0);
  console.log(`[ImageGen] Saved: ${filename} (${size} KB)`);

  return `/public/images/${filename}`;
}

module.exports = { generateImage };
