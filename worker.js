import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/file';
import userUtils from './utils/user';
import basicUtils from './utils/basic';

const imageThumbnail = require('image-thumbnail');

// Queues for file and user processing tasks
const fileProcessingQueue = new Queue('fileProcessingQueue');
const userNotificationQueue = new Queue('userNotificationQueue');

// Process tasks in the file processing queue
fileProcessingQueue.process(async (task) => {
  const { fileId, ownerId } = task.data;

  // To clean Bull queue keys in Redis:
  // Execute: redis-cli keys "bull*" | xargs redis-cli del

  if (!ownerId) {
    console.error('Owner ID is missing.');
    throw new Error('Owner ID is required.');
  }

  if (!fileId) {
    console.error('File ID is missing.');
    throw new Error('File ID is required.');
  }

  if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(ownerId)) {
    throw new Error('Invalid File ID or Owner ID.');
  }

  // Retrieve the file document based on ID and owner
  const fileData = await fileUtils.getFile({
    _id: ObjectId(fileId),
    userId: ObjectId(ownerId),
  });

  if (!fileData) throw new Error('File not found.');

  const { localPath } = fileData; // Path to the file stored locally
  const thumbnailOptions = {};
  const thumbnailWidths = [500, 250, 100]; // List of thumbnail sizes

  // Generate thumbnails of specified widths
  thumbnailWidths.forEach(async (width) => {
    thumbnailOptions.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, thumbnailOptions);
      await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
    } catch (err) {
      console.error(`Error creating thumbnail of width ${width}: ${err.message}`);
    }
  });
});

// Process tasks in the user notification queue
userNotificationQueue.process(async (task) => {
  const { ownerId } = task.data;

  // To clean Bull queue keys in Redis:
  // Execute: redis-cli keys "bull*" | xargs redis-cli del

  if (!ownerId) {
    console.error('Owner ID is missing.');
    throw new Error('Owner ID is required.');
  }

  if (!basicUtils.isValidId(ownerId)) {
    throw new Error('Invalid Owner ID.');
  }

  // Retrieve the user document based on ID
  const user = await userUtils.getUser({
    _id: ObjectId(ownerId),
  });

  if (!user) {
    throw new Error('User not found.');
  }

  console.log(`Welcome, ${user.email}!`);
});
