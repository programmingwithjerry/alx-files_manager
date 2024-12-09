import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

/**
 * Controller for handling application endpoints.
 */
class AppController {
  /**
   * Handles the GET /status endpoint.
   * Returns the status of Redis and MongoDB connections.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
  static async getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Handles the GET /stats endpoint.
   * Returns the number of users and files in the database.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).json({
      users,
      files,
    });
  }
}

export default AppController;
