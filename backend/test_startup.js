try {
  require('./src/index.js');
  console.log('App loaded successfully');
} catch(e) {
  console.error('STARTUP ERROR:', e.message);
  console.error(e.stack);
}
