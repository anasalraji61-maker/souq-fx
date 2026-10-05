import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '../app.json');
const text = fs.readFileSync(file, 'utf8');
const data = JSON.parse(text);

const extraApiUrl = data.expo?.extra?.apiUrl;
if (typeof extraApiUrl === 'string' && extraApiUrl.length > 0) {
  console.error('extra.apiUrl must be empty');
  process.exit(1);
}

const privateIpRe = /\b(192\.168|10\.\d+|172\.(1[6-9]|2\d|3[01]))\.\d+(\.\d+)?\b/;
if (privateIpRe.test(text)) {
  console.error('private IP found in app.json');
  process.exit(1);
}

console.log('ok');