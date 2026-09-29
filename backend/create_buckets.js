/**
 * create_buckets.js
 * Automatically provisions the required Supabase Storage buckets.
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const buckets = ['posts', 'avatars', 'stories', 'photos', 'videos']

async function setupBuckets() {
  console.log('Provisioning Supabase Storage Buckets...')
  for (const bucket of buckets) {
    const { data, error } = await supabase.storage.createBucket(bucket, {
      public: false, // Following Drishti security spec (access via signed URLs)
      allowedMimeTypes: ['image/*', 'video/*']
    })
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`✅ Bucket '${bucket}' already exists.`)
      } else {
        console.error(`❌ Error creating '${bucket}':`, error.message)
      }
    } else {
      console.log(`✅ Bucket '${bucket}' created successfully.`)
    }
  }
  console.log('Done.')
}

setupBuckets()
