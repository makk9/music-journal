const AWS = require('aws-sdk');
const fs = require('fs');

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

/**
 * Uploads a file to AWS S3
 * @param {string} filePath Local path to the file. 
 * @param {string} bucketName The name of the S3 bucket. 
 * @param {string} destinationFileName The file name in the S3 bucket.
 * @returns {Promise}
 */
function uploadFileToS3(filePath, bucketName, destinationFileName) {
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', function (err) {
        console.error('File stream error:', err);
    });

    const uploadParams = {
        Bucket: bucketName,
        Key: destinationFileName,
        Body: fileStream,
    };

    return new Promise((resolve, reject) => {
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                console.error("Error uploading file:", err);
                reject(err);
            } else {
                console.log("Upload successful:", data);
                resolve(data);
            }
        });
    });
}

// Get signed URL(grants temporary access) to access private objecct from AWS S3
function getSignedUrl(bucketName, objectKey, expiresIn = 900) {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: expiresIn
    }

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        })
    })
}

module.exports = { uploadFileToS3, getSignedUrl };