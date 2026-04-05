import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Initializes the Supabase client based on environment variables.
 * In Vercel, this is injected automatically in process.env.
 */
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase Client Initialized.');
} else {
    console.warn('⚠️ Supabase environment variables missing. SillyTavern will fallback to standard FS mode if not in Vercel mode.');
}

/**
 * Uploads a local file buffer to Supabase Storage.
 * @param {string} bucket - The Supabase storage bucket ('sillytavern-assets' or 'sillytavern-chats').
 * @param {string} uploadPath - The destination path in the bucket (e.g. 'characters/john.png').
 * @param {Buffer|ArrayBuffer|string} buffer - The file content to upload.
 * @param {string} mimeType - e.g. 'image/png' or 'application/jsonl'.
 */
export async function uploadToStorage(bucket, uploadPath, buffer, mimeType) {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uploadPath, buffer, {
            contentType: mimeType,
            upsert: true,
        });
        
    if (error) {
        console.error(`Upload error to ${bucket}/${uploadPath}:`, error.message);
        throw error;
    }
    return data.path;
}

/**
 * Retrieves a file as text from Supabase Storage (ideal for JSON or JSONL).
 * @param {string} bucket - The Supabase storage bucket.
 * @param {string} filePath - Path to file in bucket.
 */
export async function downloadTextFromStorage(bucket, filePath) {
    if (!supabase) return null;
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);
        
    if (error) {
        console.error(`Download error from ${bucket}/${filePath}:`, error.message);
        return null;
    }
    return await data.text();
}

/**
 * Core export wrapper
 */
export default supabase;
