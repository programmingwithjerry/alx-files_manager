import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dbClient from '../utils/db.js';

/**
 * Controller for handling user-related actions.
 */
class UsersController {
  /**
   * Handles the POST /users endpoint.
   * Creates a new user in the database.
   * @param {Request} req The request object.
   * @param {Response} res The response object.
   */
  static async postNew(req, res) {
    const { email, password } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Validate password
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if email already exists
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash the password using SHA1
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

    // Create a new user
    const newUser = {
      email,
      password: hashedPassword,
    };

    try {
      const result = await dbClient.db.collection('users').insertOne(newUser);
      res.status(201).json({
        id: result.insertedId,
        email,
      });
    } catch (error) {
      res.status(500).json({ error: 'Unable to create user' });
    }
  }
}

export default UsersController;
