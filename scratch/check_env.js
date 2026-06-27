const fs = require('fs');
const envFile = fs.readFileSync('/Users/cleissonteixeira/F5-Recompra/.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 1) {
    console.log(parts[0].trim());
  }
});
