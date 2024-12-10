import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userCreationQueue = new Queue('userQueue');

class UsersController {
  /**
   * Handles user creation with provided email and password.
   *
   * Requirements:
   * - An email and password must be provided.
   * - If email is missing, respond with a "Missing email" error and a 400 status.
   * - If password is missing, respond with a "Missing password" error and a 400 status.
   * - If the email already exists in the database, respond with an "Already exist" error and a 400 status.
   * - The password is hashed using SHA1 before storage.
   *
   * On successful creation:
   * - Save the new user to the `users` collection in the database.
   * - Include the email and hashed password in the database entry.
   * - Return the new user's email and auto-generated MongoDB ID with a 201 status.
   */
  static async postNew(request, response) {
    const { email, password } = request.body;

    // Check for missing email
    if (!email) return response.status(400).send({ error: 'Missing email' });

    // Check for missing password
    if (!password)
      return response.status(400).send({ error: 'Missing password' });

    // Check if email already exists in the database
    const existingUser = await dbClient.usersCollection.findOne({ email });
    if (existingUser)
      return response.status(400).send({ error: 'Already exist' });

    // Hash the password using SHA1
    const hashedPassword = sha1(password);

    let result;
    try {
      // Insert new user into the database
      result = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword,
      });
    } catch (err) {
      await userCreationQueue.add({});
      return response.status(500).send({ error: 'Error creating user' });
    }

    // Prepare the response object
    const newUser = {
      id: result.insertedId,
      email,
    };

    // Add user creation task to the queue
    await userCreationQueue.add({
      userId: result.insertedId.toString(),
    });

    // Return the newly created user with a 201 status
    return response.status(201).send(newUser);
  }

  /**
   * Retrieves user information based on the provided token.
   *
   * Behavior:
   * - Use the token to fetch the associated user.
   * - If the token is invalid or no user is found, respond with an "Unauthorized" error and a 401 status.
   * - If a valid user is found, return their email and ID.
   */
  static async getMe(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    // Fetch user from the database using their ID
    const user = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    // Handle unauthorized access
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Prepare and sanitize the user object for the response
    const userResponse = { id: user._id, ...user };
    delete userResponse._id;
    delete userResponse.password;

    // Return the sanitized user object with a 200 status
    return response.status(200).send(userResponse);
  }
}

export default UsersController;
