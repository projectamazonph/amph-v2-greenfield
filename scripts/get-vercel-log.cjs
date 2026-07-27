const { execSync } = require('child_process');
const token = process.env.VERCEL_TOKEN;
const deploymentId = 'JCXSZwkqqbV838Zz7CmAuz3FcZN2';
const url = `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=ryandabao1982s-projects`;
const out = execSync(`curl -s -H "Authorization: Bearer ${token}" "${url}"`, { encoding: 'utf8' });
const data = JSON.parse(out);
console.log('State:', data.state);
console.log('Ready:', data.readyState);
if (data.status === 'READY') {
  console.log('READY - checking build output');
} else {
  console.log('Status:', data.status);
  if (data.buildingAt) console.log('Building at:', data.buildingAt);
  if (data.readyAt) console.log('Ready at:', data.readyAt);
  if (data.createdAt) console.log('Created at:', data.createdAt);
}
if (data.error) console.log('Error:', JSON.stringify(data.error, null, 2));
