import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export function createR2Client(env) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

export async function getPresignedUploadUrl(r2Client, env, fileName, contentType) {
  const key = `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 })
  
  return {
    uploadUrl: url,
    key,
    assetId: key,
    publicUrl: `${env.R2_PUBLIC_BASE_URL}/${key}`,
  }
}

export async function deleteR2Object(r2Client, env, key) {
  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  })

  return r2Client.send(command)
}

export function getPublicUrl(env, key) {
  return `${env.R2_PUBLIC_BASE_URL}/${key}`
}
