/**
 * LipDub API Test Suite
 * Tests video upload, audio upload, and generation flow
 */

const API_BASE = 'https://api.lipdub.ai/v1';
const API_KEY = process.env.LIPDUB_API_KEY;

if (!API_KEY) {
  throw new Error('Set LIPDUB_API_KEY in your environment before running this test.');
}

async function testVideoUpload() {
  console.log('\n🎬 Testing POST /v1/video...');
  
  try {
    const res = await fetch(`${API_BASE}/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        file_name: 'test_video.mp4',
        content_type: 'video/mp4',
        project_name: 'Test Project',
        scene_name: 'Scene 1',
        actor_name: 'Test Actor'
      })
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data.data;
  } catch (err) {
    console.error('❌ Video upload failed:', err.message);
    return null;
  }
}

async function testVideoStatus(videoId) {
  console.log(`\n📊 Testing GET /v1/video/status/${videoId}...`);
  
  try {
    const res = await fetch(`${API_BASE}/video/status/${videoId}`, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ Video status check failed:', err.message);
    return null;
  }
}

async function testAudioUpload() {
  console.log('\n🎵 Testing POST /v1/audio...');
  
  try {
    const res = await fetch(`${API_BASE}/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        file_name: 'test_audio.mp3',
        content_type: 'audio/mp3'
      })
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data.data;
  } catch (err) {
    console.error('❌ Audio upload failed:', err.message);
    return null;
  }
}

async function testAudioStatus(audioId) {
  console.log(`\n📊 Testing GET /v1/audio/status/${audioId}...`);
  
  try {
    const res = await fetch(`${API_BASE}/audio/status/${audioId}`, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ Audio status check failed:', err.message);
    return null;
  }
}

async function testListAudio() {
  console.log('\n🎵 Testing GET /v1/audio...');
  
  try {
    const res = await fetch(`${API_BASE}/audio`, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ List audio failed:', err.message);
    return null;
  }
}

async function testShots() {
  console.log('\n🎯 Testing GET /v1/shots...');
  
  try {
    const res = await fetch(`${API_BASE}/shots`, {
      headers: { 'x-api-key': API_KEY }
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Found ${data.count} shots`);
    
    if (data.data && data.data.length > 0) {
      const firstShot = data.data[0];
      console.log('First shot:', firstShot.shot_id, firstShot.shot_label);
      
      // Test shot status
      console.log(`\n📊 Testing GET /v1/shots/${firstShot.shot_id}/status...`);
      const statusRes = await fetch(`${API_BASE}/shots/${firstShot.shot_id}/status`, {
        headers: { 'x-api-key': API_KEY }
      });
      const statusData = await statusRes.json();
      console.log(`Status: ${statusRes.status}`);
      console.log('Response:', JSON.stringify(statusData, null, 2));
      
      return firstShot;
    }
    
    return null;
  } catch (err) {
    console.error('❌ Shots test failed:', err.message);
    return null;
  }
}

async function testGenerate(shotId) {
  console.log(`\n⚡ Testing POST /v1/shots/${shotId}/generate...`);
  
  try {
    const res = await fetch(`${API_BASE}/shots/${shotId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        // Generation parameters
      })
    });

    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (err) {
    console.error('❌ Generate test failed:', err.message);
    return null;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('  LipDub API Endpoint Test Suite');
  console.log('═══════════════════════════════════════');
  
  const results = {
    videoUpload: null,
    videoStatus: null,
    audioUpload: null,
    audioStatus: null,
    listAudio: null,
    shots: null,
    generate: null
  };
  
  // Test video upload
  results.videoUpload = await testVideoUpload();
  
  if (results.videoUpload?.video_id) {
    results.videoStatus = await testVideoStatus(results.videoUpload.video_id);
  }
  
  // Test audio upload
  results.audioUpload = await testAudioUpload();
  
  if (results.audioUpload?.audio_id) {
    results.audioStatus = await testAudioStatus(results.audioUpload.audio_id);
  }
  
  // Test list audio
  results.listAudio = await testListAudio();
  
  // Test shots
  results.shots = await testShots();
  
  // Test generate (if we have a shot)
  if (results.shots?.shot_id) {
    results.generate = await testGenerate(results.shots.shot_id);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════');
  console.log('Video Upload:', results.videoUpload ? '✅ PASS' : '❌ FAIL');
  console.log('Video Status:', results.videoStatus ? '✅ PASS' : '❌ FAIL');
  console.log('Audio Upload:', results.audioUpload ? '✅ PASS' : '❌ FAIL');
  console.log('Audio Status:', results.audioStatus ? '✅ PASS' : '❌ FAIL');
  console.log('List Audio:', results.listAudio ? '✅ PASS' : '❌ FAIL');
  console.log('Shots:', results.shots ? '✅ PASS' : '❌ FAIL');
  console.log('Generate:', results.generate ? '✅ PASS' : '❌ SKIP/FAIL');
  
  return results;
}

runTests();
