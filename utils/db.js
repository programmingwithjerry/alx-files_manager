import { MongoClient } from 'mongodb';

/**
 * A class that interacts with a MongoDB database.
 */
class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.databaseName = database;

    this.client.connect()
      .then(() => {
        console.log('Connected to MongoDB');
        this.db = this.client.db(this.databaseName);
      })
      .catch((err) => {
        console.error('MongoDB connection failed:', err.message || err.toString());
        this.db = null;
      });
  }

  /**
   * Checks if the MongoDB client is connected successfully.
   * @returns {boolean} True if the client is connected, false otherwise.
   */
  isAlive() {
    return this.db !== null;
  }

  /**
   * Returns the number of documents in the `users` collection.
   * @returns {Promise<number>} The number of users.
   */
  async nbUsers() {
    if (!this.isAlive()) return 0;
    return this.db.collection('users').countDocuments();
  }

  /**
   * Returns the number of documents in the `files` collection.
   * @returns {Promise<number>} The number of files.
   */
  async nbFiles() {
    if (!this.isAlive()) return 0;
    return this.db.collection('files').countDocuments();
  }
}

export const dbClient = new DBClient();
export default dbClient;
