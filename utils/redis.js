import { promisify } from 'util';
import { createClient } from 'redis';

/**
 * A wrapper for Redis client functionality.
 */
class RedisClient {
  /**
   * Initializes a new RedisClient instance.
   */
  constructor() {
    this.client = createClient();
    this.isClientConnected = true;

    // Handle connection errors
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err.message || err.toString());
      this.isClientConnected = false;
    });

    // Handle successful connections
    this.client.on('connect', () => {
      this.isClientConnected = true;
    });
  }

  /**
   * Verifies if the Redis client is connected.
   * @returns {boolean} True if connected, false otherwise.
   */
  isAlive() {
    return this.isClientConnected;
  }

  /**
   * Retrieves the value associated with a given key.
   * @param {String} key The key to look up.
   * @returns {String | Object} The value of the key.
   */
  async get(key) {
    return promisify(this.client.GET).bind(this.client)(key);
  }

  /**
   * Saves a key-value pair with a specified expiration time.
   * @param {String} key The key to save.
   * @param {String | Number | Boolean} value The value to save.
   * @param {Number} duration The time-to-live in seconds.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async set(key, value, duration) {
    await promisify(this.client.SETEX).bind(this.client)(key, duration, value);
  }

  /**
   * Deletes the value associated with a given key.
   * @param {String} key The key to delete.
   * @returns {Promise<void>} A promise that resolves when the key is deleted.
   */
  async del(key) {
    await promisify(this.client.DEL).bind(this.client)(key);
  }
}

export const redisClient = new RedisClient();
export default redisClient;
