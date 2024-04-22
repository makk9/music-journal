const express = require('express');
const imageRouter = express.Router();

const fs = require('fs');
const awsService = require('../../services/awsService');
const multer = require('multer'); // middleware to handle multipart/form-data
const upload = multer({ dest: 'uploads/' });

imageRouter.post('/images/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }

    const file = req.file;
    const bucketName = process.env.AWS_BUCKET_NAME;

    try {
        // Upload file to S3 and get the result
        const result = await awsService.uploadFileToS3(file.path, bucketName, file.filename);

        // Log the location URL from the result
        console.log("Uploaded File URL:", result.Location);

        // Respond to the client with the URL
        res.send({ url: result.Location });
    } catch (error) {
        console.error("Failed to upload file to S3:", error);
        res.status(500).send({ error: 'Failed to upload file to AWS S3.' });
    } finally {
        // Delete the temporary file
        fs.unlink(file.path, err => {
            if (err) {
                console.error('Failed to delete temporary file', err);
            }
        });
    }
});

imageRouter.get('/images/get-signed-url', async (req, res) => {
    const { bucketName, objectKey } = req.query;
    try {
        const url = await awsService.getSignedUrl(bucketName, objectKey);
        res.send({ url });
    } catch (error) {
        res.status(500).send('Failed to get signed URL');
    }
});

module.exports = imageRouter;