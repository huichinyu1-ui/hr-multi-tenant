const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Employees.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('setForm') || l.includes('showModal') || l.includes('editingId')) {
    console.log(i + 1, l.trim().substring(0, 120));
  }
});
