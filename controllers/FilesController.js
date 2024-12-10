import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import basicUtils from '../utils/basic';

// Default folder path for storing files
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

// Queue for handling file processing tasks
const fileQueue = new Queue('fileQueue');

class FilesController {
  /**
   * Handles file or folder creation.
   *
   * - Validates user based on authentication token. If invalid, responds with a 401 error.
   * - Requires parameters:
   *   - `name`: Name of the file or folder (mandatory).
   *   - `type`: One of `folder`, `file`, or `image` (mandatory).
   *   - `parentId`: Parent folder ID (optional, defaults to root - `0`).
   *   - `isPublic`: Boolean indicating if the file is public (optional, defaults to `false`).
   *   - `data`: Base64 content for `file` or `image` types (mandatory if applicable).
   * - Validates the provided data. Returns 400 errors for missing or invalid fields.
   * - If `parentId` is specified, validates it as an existing folder.
   * - If `type` is `folder`, saves it to the database and returns the new folder with a 201 status.
   * - For `file` and `image` types:
   *   - Stores file content in the local folder path defined by `FOLDER_PATH`.
   *   - Saves file metadata in the database.
   *   - Returns the new file metadata with a 201 status.
   * - Adds image-processing tasks to the queue for `image` files.
   */
  static async postUpload(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    // Validate user authentication
    if (!basicUtils.isValidId(userId)) {
      return response.status(401).send({ error: 'Unauthorized' });
    }

    // Queue processing for image files without user authentication
    if (!userId && request.body.type === 'image') {
      await fileQueue.add({});
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Validate request body
    const { error: validationError, fileParams } = await fileUtils.validateBody(
      request
    );

    if (validationError)
      return response.status(400).send({ error: validationError });

    // Validate `parentId` if specified
    if (fileParams.parentId !== 0 && !basicUtils.isValidId(fileParams.parentId))
      return response.status(400).send({ error: 'Parent not found' });

    // Save file or folder
    const { error, code, newFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH
    );

    if (error) {
      // Add to queue for image files with errors
      if (response.body.type === 'image') await fileQueue.add({ userId });
      return response.status(code).send(error);
    }

    // Queue image processing tasks
    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: newFile.id.toString(),
        userId: newFile.userId.toString(),
      });
    }

    return response.status(201).send(newFile);
  }

  /**
   * Retrieves metadata for a specific file.
   *
   * - Validates user authentication.
   * - If the user is unauthorized or the file does not exist, responds with a 401 or 404 error.
   * - Returns the file metadata for valid requests with a 200 status.
   */
  static async getShow(request, response) {
    const fileId = request.params.id;

    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Validate file and user IDs
    if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId))
      return response.status(404).send({ error: 'Not found' });

    const result = await fileUtils.getFile({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!result) return response.status(404).send({ error: 'Not found' });

    const file = fileUtils.processFile(result);

    return response.status(200).send(file);
  }

  /**
   * Lists all files in a folder with pagination.
   *
   * - Validates user authentication.
   * - Retrieves files for the specified `parentId` (default: root folder `0`).
   * - Supports pagination:
   *   - Maximum 20 items per page.
   *   - Page numbers start at 0 (0 = first page, 1 = second page, etc.).
   * - Returns the list of files with a 200 status.
   */
  static async getIndex(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    let parentId = request.query.parentId || '0';

    if (parentId === '0') parentId = 0;

    let page = Number(request.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!basicUtils.isValidId(parentId))
        return response.status(401).send({ error: 'Unauthorized' });

      parentId = ObjectId(parentId);

      const folder = await fileUtils.getFile({ _id: ObjectId(parentId) });

      if (!folder || folder.type !== 'folder')
        return response.status(200).send([]);
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });

    return response.status(200).send(fileList);
  }

  /**
   * Publishes a file by setting its `isPublic` attribute to true.
   *
   * - Validates user authentication.
   * - If the file is not found or unauthorized, responds with a 404 or 401 error.
   * - Updates the file's `isPublic` status and returns the updated file with a 200 status.
   */
  static async putPublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      true
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  /**
   * Unpublishes a file by setting its `isPublic` attribute to false.
   *
   * - Similar to `putPublish`, but sets `isPublic` to false.
   */
  static async putUnpublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      false
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  /**
   * Retrieves the content of a file.
   *
   * - Validates user authentication and file permissions.
   * - If the file is a folder or does not exist, responds with 400 or 404 errors.
   * - If the file exists:
   *   - Determines its MIME type.
   *   - Sends the file content with the appropriate MIME type.
   */
  static async getFile(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);
    const { id: fileId } = request.params;
    const size = request.query.size || 0;

    // Validate file ID
    if (!basicUtils.isValidId(fileId))
      return response.status(404).send({ error: 'Not found' });

    const file = await fileUtils.getFile({ _id: ObjectId(fileId) });

    if (!file || !fileUtils.isOwnerAndPublic(file, userId))
      return response.status(404).send({ error: 'Not found' });

    if (file.type === 'folder') {
      return response
        .status(400)
        .send({ error: "A folder doesn't have content" });
    }

    const { error, code, data } = await fileUtils.getFileData(file, size);

    if (error) return response.status(code).send({ error });

    const mimeType = mime.contentType(file.name);

    response.setHeader('Content-Type', mimeType);

    return response.status(200).send(data);
  }
}

export default FilesController;
