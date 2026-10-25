const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const getCredentials = () => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to upload revision media');
  }
  return { cloudName, apiKey, apiSecret };
};

const createUploadSignature = (publicId, timestamp) => {
  const { cloudName, apiKey, apiSecret } = getCredentials();
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');
  return { cloudName, apiKey, signature };
};

const uploadFile = (filePath, publicId = `reelearn/revision/${crypto.randomUUID()}`) => {
  const { cloudName, apiKey, apiSecret } = getCredentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');
  const boundary = `----ReeLearn${crypto.randomUUID().replace(/-/g, '')}`;
  const fields = { api_key: apiKey, timestamp, public_id: publicId, signature };
  const prefix = Object.entries(fields).map(([name, value]) => (
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
  )).join('');
  const filename = path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const suffix = `\r\n--${boundary}--\r\n`;
  const prefixBuffer = Buffer.from(prefix + fileHeader);
  const suffixBuffer = Buffer.from(suffix);
  const contentLength = prefixBuffer.length + fs.statSync(filePath).size + suffixBuffer.length;

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${encodeURIComponent(cloudName)}/auto/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': contentLength
      }
    }, response => {
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 1024 * 1024) {
          request.destroy(new Error('Cloudinary returned an unexpectedly large response'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        let result;
        try {
          result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch (error) {
          reject(new Error('Cloudinary returned an invalid response'));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300 || !result.secure_url) {
          reject(new Error(result.error?.message || `Cloudinary upload failed with status ${response.statusCode}`));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      });
    });

    request.on('error', reject);
    request.setTimeout(120000, () => request.destroy(new Error('Cloudinary upload timed out')));
    request.write(prefixBuffer);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', error => request.destroy(error));
    fileStream.on('end', () => request.end(suffixBuffer));
    fileStream.pipe(request, { end: false });
  });
};

module.exports = { createUploadSignature, uploadFile };
