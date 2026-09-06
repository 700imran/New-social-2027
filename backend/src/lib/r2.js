import { AwsClient } from 'aws4fetch'

export function r2Client(env) {
  return new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY })
}

export function r2Endpoint(env, storageKey) {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${storageKey}`
}

// Best-effort: logs and moves on rather than throwing, so one bad object
// key can't abort a larger operation (e.g. deleting the other 19 photos
// in an account-deletion request) — see routes/account.js.
export async function deleteR2Object(env, storageKey) {
  try {
    const client = r2Client(env)
    const signed = await client.sign(new Request(r2Endpoint(env, storageKey), { method: 'DELETE' }))
    const res = await fetch(signed)
    if (!res.ok && res.status !== 404) {
      console.warn(`[r2] failed to delete object ${storageKey}: HTTP ${res.status}`)
    }
  } catch (err) {
    console.warn(`[r2] delete request failed for ${storageKey}`, err)
  }
}
