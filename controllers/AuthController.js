import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import userUtils from '../utils/user';

class AuthController {
  /**
   * Handles user login by generating an authentication token.
   *
   * - Utilizes the `Authorization` header with Basic Authentication 
   *   (Base64 encoding of `<email>:<password>`).
   * - Searches for a user matching the provided email and password 
   *   (password is stored as a SHA1 hash).
   * - If no matching user is found, responds with a 401 status and 
   *   an "Unauthorized" error.
   * - If a valid user is found:
   *   - Generates a unique token using `uuidv4`.
   *   - Creates a Redis key (`auth_<token>`) to store the user ID, 
   *     with an expiration of 24 hours.
   *   - Returns the token as a JSON object: `{ "token": "<generated-token>" }` 
   *     with a 200 status.
   */
  static async getConnect(request, response) {
    const Authorization = request.header('Authorization') || '';

    // Extract and decode credentials from the Authorization header
    const credentials = Authorization.split(' ')[1];

    if (!credentials)
      return response.status(401).send({ error: 'Unauthorized' });

    const decodedCredentials = Buffer.from(credentials, 'base64').toString(
      'utf-8'
    );

    const [email, password] = decodedCredentials.split(':');

    if (!email || !password)
      return response.status(401).send({ error: 'Unauthorized' });

    // Hash the password using SHA1
    const sha1Password = sha1(password);

    // Find the user with the matching email and hashed password
    const user = await userUtils.getUser({
      email,
      password: sha1Password,
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Generate a unique token and store it in Redis
    const token = uuidv4();
    const redisKey = `auth_${token}`;
    const expirationInSeconds = 24 * 3600;

    await redisClient.set(redisKey, user._id.toString(), expirationInSeconds);

    // Respond with the generated token
    return response.status(200).send({ token });
  }

  /**
   * Handles user logout by invalidating the authentication token.
   *
   * - Identifies the user based on the provided token.
   * - If the user is not found, responds with a 401 status and an 
   *   "Unauthorized" error.
   * - If the user is valid:
   *   - Deletes the Redis key associated with the token.
   *   - Responds with a 204 status and no content.
   */
  static async getDisconnect(request, response) {
    const { userId, key } = await userUtils.getUserIdAndKey(request);

    // If the user is not found, respond with an unauthorized error
    if (!userId) return response.status(401).send({ error: 'Unauthorized' });

    // Delete the Redis key associated with the user's token
    await redisClient.del(key);

    // Respond with no content
    return response.status(204).send();
  }
}

export default AuthController;
