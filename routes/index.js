import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

/**
 * Sets up route handling for the application by defining all API endpoints
 * and linking them to their respective controllers.
 *
 * @param {Object} app - The Express application instance.
 */
function setupRoutes(app) {
  const apiRouter = express.Router();
  app.use('/', apiRouter);

  // Application Controller

  // Check the health status of Redis and the database
  apiRouter.get('/status', (req, res) => {
    AppController.getStatus(req, res);
  });

  // Retrieve counts of users and files in the database
  apiRouter.get('/stats', (req, res) => {
    AppController.getStats(req, res);
  });

  // User Controller

  // Create a new user in the database
  apiRouter.post('/users', (req, res) => {
    UsersController.createUser(req, res);
  });

  // Retrieve the authenticated user's details using the provided token
  apiRouter.get('/users/me', (req, res) => {
    UsersController.getAuthenticatedUser(req, res);
  });

  // Authentication Controller

  // Sign in the user by generating a new authentication token
  apiRouter.get('/connect', (req, res) => {
    AuthController.signIn(req, res);
  });

  // Sign out the user and invalidate their authentication token
  apiRouter.get('/disconnect', (req, res) => {
    AuthController.signOut(req, res);
  });

  // File Controller

  // Upload a new file to the database and filesystem
  apiRouter.post('/files', (req, res) => {
    FilesController.uploadFile(req, res);
  });

  // Retrieve file details based on its ID
  apiRouter.get('/files/:id', (req, res) => {
    FilesController.getFileDetails(req, res);
  });

  // Retrieve all file records for a specific parent ID, with pagination support
  apiRouter.get('/files', (req, res) => {
    FilesController.listFiles(req, res);
  });

  // Make a file publicly accessible based on its ID
  apiRouter.put('/files/:id/publish', (req, res) => {
    FilesController.publishFile(req, res);
  });

  // Make a file private (remove public access) based on its ID
  apiRouter.put('/files/:id/unpublish', (req, res) => {
    FilesController.unpublishFile(req, res);
  });

  // Retrieve the content of a file based on its ID
  apiRouter.get('/files/:id/data', (req, res) => {
    FilesController.getFileContent(req, res);
  });
}

export default setupRoutes;
