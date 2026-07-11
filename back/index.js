const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json()); // Parses incoming JSON requests

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running successfully' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
