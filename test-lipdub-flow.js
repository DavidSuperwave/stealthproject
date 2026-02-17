/**
 * LipDub API Test Flow
 * Tests complete workflow: video upload → audio upload → generate
 * Uses files from Downloads folder
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.lipdub.ai/v1';
const API_KEY = 'f07ba021-9085-44fc-acda-5487354a76ab';

// File paths
const VIDEO_FILE = path.join(process.env.USERPROFILE, 'Downloads', 'final video (2).mp4');
const AUDIO_FILE = path.join(process.env.USERPROFILE, 'Downloads', 'audio.MP3');

// Helper: Make API request
async function lipdubRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'x-api-key': API_KEY,
    ...(options.headers || {}),
  };

  console.log(`\n📡 ${options.method || 'GET'} ${endpoint}`);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Error ${res.status}: ${text}`);
    throw new Error(`LipDub API Error ${res.status}: ${text}`);
  }

  if (!text) return {};
  try {
    const data = JSON.parse(text);
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    return data;
  } catch {
    return {};
  }
}

// Step 1: Upload Video
async function uploadVideo() {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 1: Video Upload');
  console.log('═══════════════════════════════════════');

  const stats = fs.statSync(VIDEO_FILE);
  console.log(`📹 Video file: ${VIDEO_FILE}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 1a. Initiate upload
  const initData = await lipdubRequest('/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: 'test_video.mp4',
      content_type: 'video/mp4',
      project_name: 'Test Project',
      scene_name: 'Scene 1',
      actor_name: 'Test Actor'
    })
  });

  const { video_id, upload_url, success_url, failure_url } = initData.data || initData;

  if (!upload_url) {
    throw new Error('No upload_url received');
  }

  console.log(`\n📤 Uploading to GCS...`);

  // 1b. Upload file to signed URL
  const fileBuffer = fs.readFileSync(VIDEO_FILE);
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} - ${err}`);
  }

  console.log('✅ File uploaded to storage');

  // 1c. Notify success
  // The success_url already includes /v1, so strip it since API_BASE includes /v1
  const successEndpoint = success_url.replace(/^\/v1/, '');
  const successData = await lipdubRequest(successEndpoint, { method: 'POST' });
  const shot_id = successData.data?.shot_id || successData.shot_id;

  console.log(`✅ Video ready - shot_id: ${shot_id || 'pending'}`);

  return { video_id, shot_id };
}

// Step 2: Upload Audio
async function uploadAudio() {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 2: Audio Upload');
  console.log('═══════════════════════════════════════');

  const stats = fs.statSync(AUDIO_FILE);
  console.log(`🎵 Audio file: ${AUDIO_FILE}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  // 2a. Initiate upload
  const initData = await lipdubRequest('/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_name: 'audio.MP3',
      content_type: 'audio/mpeg',
      size_bytes: stats.size
    })
  });

  const { audio_id, upload_url, success_url } = initData.data || initData;

  if (!upload_url) {
    throw new Error('No upload_url received');
  }

  console.log(`\n📤 Uploading to GCS...`);

  // 2b. Upload file to signed URL
  const fileBuffer = fs.readFileSync(AUDIO_FILE);
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'audio/mpeg' },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} - ${err}`);
  }

  console.log('✅ File uploaded to storage');

  // 2c. Notify success
  const audioSuccessEndpoint = success_url.replace(/^\/v1/, '');
  await lipdubRequest(audioSuccessEndpoint, { method: 'POST' });

  console.log(`✅ Audio ready - audio_id: ${audio_id}`);

  return { audio_id };
}

// Step 3: Wait for shot processing
async function waitForShot(shot_id) {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 3: Wait for Shot Processing');
  console.log('═══════════════════════════════════════');

  if (!shot_id) {
    console.log('⚠️ No shot_id from callback, will get from video status...');
    return null;
  }

  let attempts = 0;
  const maxAttempts = 120; // 60 minutes max (30s intervals)
  const interval = 30000; // 30 seconds

  while (attempts < maxAttempts) {
    attempts++;
    const statusData = await lipdubRequest(`/shots/${shot_id}/status`);
    const { shot_status, ai_training_status } = statusData.data || statusData;

    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}:`);
    console.log(`   shot_status: ${shot_status}`);
    console.log(`   ai_training_status: ${ai_training_status}`);

    // Check if ready
    const isShotReady = ['finished', 'completed', 'ready'].includes(shot_status);
    const isAiReady = ['finished', 'completed', 'ready'].includes(ai_training_status);

    if (isShotReady && isAiReady) {
      console.log('\n✅ Shot and AI training complete!');
      return true;
    }

    // Check for failures
    if (shot_status === 'failed' || ai_training_status === 'failed') {
      throw new Error(`Processing failed - shot: ${shot_status}, ai: ${ai_training_status}`);
    }

    console.log(`   ⏳ Waiting ${interval/1000}s...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error('Timeout waiting for shot processing');
}

// Step 4: Generate Video
async function generateVideo(shot_id, audio_id) {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 4: Generate Video');
  console.log('═══════════════════════════════════════');

  const generateData = await lipdubRequest(`/shots/${shot_id}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_id,
      output_filename: `generated_${Date.now()}.mp4`,
      language: 'es-MX',
      maintain_expression: true
    })
  });

  const result = generateData.data || generateData;
  const generate_id = result.generate_id || result.generateId || result.id;

  if (!generate_id) {
    throw new Error('No generate_id received: ' + JSON.stringify(generateData));
  }

  console.log(`✅ Generation started - generate_id: ${generate_id}`);

  return { generate_id };
}

// Step 5: Wait for generation
async function waitForGeneration(shot_id, generate_id) {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 5: Wait for Generation');
  console.log('═══════════════════════════════════════');

  let attempts = 0;
  const maxAttempts = 120; // 60 minutes max
  const interval = 30000; // 30 seconds

  while (attempts < maxAttempts) {
    attempts++;
    const statusData = await lipdubRequest(`/shots/${shot_id}/generate/${generate_id}`);
    const { status } = statusData.data || statusData;

    console.log(`\n🔄 Attempt ${attempts}/${maxAttempts}:`);
    console.log(`   status: ${status}`);

    if (status === 'finished' || status === 'completed') {
      console.log('\n✅ Generation complete!');
      return true;
    }

    if (status === 'failed') {
      throw new Error('Generation failed');
    }

    console.log(`   ⏳ Waiting ${interval/1000}s...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error('Timeout waiting for generation');
}

// Step 6: Get download URL
async function getDownloadUrl(shot_id, generate_id) {
  console.log('\n═══════════════════════════════════════');
  console.log('  STEP 6: Get Download URL');
  console.log('═══════════════════════════════════════');

  const downloadData = await lipdubRequest(`/shots/${shot_id}/generate/${generate_id}/download`);
  const { download_url } = downloadData.data || downloadData;

  if (!download_url) {
    throw new Error('No download_url received');
  }

  console.log(`✅ Download URL: ${download_url.substring(0, 100)}...`);

  return { download_url };
}

// Main flow
async function runTest() {
  console.log('═══════════════════════════════════════');
  console.log('  LipDub API Complete Flow Test');
  console.log('═══════════════════════════════════════');

  try {
    // Step 1: Upload Video
    const { video_id, shot_id: initial_shot_id } = await uploadVideo();

    // Step 2: Upload Audio
    const { audio_id } = await uploadAudio();

    // Step 3: Wait for shot processing (if we have shot_id)
    if (initial_shot_id) {
      await waitForShot(initial_shot_id);
    } else {
      console.log('\n⚠️ Skipping shot wait - no shot_id available');
    }

    // We need shot_id to generate - get it from video status if not from callback
    let shot_id = initial_shot_id;
    if (!shot_id) {
      console.log('\n📡 Getting shot_id from video status...');
      const videoStatus = await lipdubRequest(`/video/status/${video_id}`);
      shot_id = videoStatus.data?.shot_id || videoStatus.shot_id;

      if (!shot_id) {
        throw new Error('Could not get shot_id from video status');
      }

      console.log(`✅ Got shot_id: ${shot_id}`);
      await waitForShot(shot_id);
    }

    // Step 4: Generate Video
    const { generate_id } = await generateVideo(shot_id, audio_id);

    // Step 5: Wait for Generation
    await waitForGeneration(shot_id, generate_id);

    // Step 6: Get Download URL
    const { download_url } = await getDownloadUrl(shot_id, generate_id);

    console.log('\n═══════════════════════════════════════');
    console.log('  ✅ COMPLETE SUCCESS!');
    console.log('═══════════════════════════════════════');
    console.log(`\nVideo ID: ${video_id}`);
    console.log(`Shot ID: ${shot_id}`);
    console.log(`Audio ID: ${audio_id}`);
    console.log(`Generate ID: ${generate_id}`);
    console.log(`\nDownload URL: ${download_url}`);

    return { success: true, download_url, video_id, shot_id, audio_id, generate_id };

  } catch (err) {
    console.error('\n═══════════════════════════════════════');
    console.error('  ❌ TEST FAILED');
    console.error('═══════════════════════════════════════');
    console.error(err.message);
    return { success: false, error: err.message };
  }
}

// Run the test
runTest().then(result => {
  process.exit(result.success ? 0 : 1);
});
