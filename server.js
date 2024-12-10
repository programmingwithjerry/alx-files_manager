import express from 'express';
import controllerRouting from './routes/index';

/**
 * This project serves as a practical application of back-end development concepts,
 * including authentication, Node.js, MongoDB, Redis, pagination, and background tasks.
 *
 * It aims to provide a basic platform for file management, offering features such as:
 *
 * - User authentication using tokens
 * - File listing
 * - Uploading new files
 * - Modifying file permissions
 * - Viewing files
 * - Creating thumbnails for images
 */

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// Register routes
controllerRouting(app);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
