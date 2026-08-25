import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Drop6 End-to-End Automated Verification...\n');

  // 1. Health check
  console.log('1️⃣ Checking server health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const health = await healthRes.json();
  if (health.status !== 'ok') throw new Error('Health check failed');
  console.log('   ✅ Health OK:', health);

  // 2. Prepare test files
  console.log('\n2️⃣ Preparing dummy files for upload...');
  const testFile1Path = path.join(__dirname, 'test_sample1.txt');
  const testFile2Path = path.join(__dirname, 'test_sample2.json');
  fs.writeFileSync(testFile1Path, 'Hello Drop6 Temporary File Sharing! This is test file 1.');
  fs.writeFileSync(testFile2Path, JSON.stringify({ project: 'Drop6', version: '1.0.0', secure: true }, null, 2));

  // 3. Upload files via multipart/form-data
  console.log('\n3️⃣ Uploading files to POST /api/shares...');
  const formData = new FormData();
  const file1Blob = new Blob([fs.readFileSync(testFile1Path)], { type: 'text/plain' });
  const file2Blob = new Blob([fs.readFileSync(testFile2Path)], { type: 'application/json' });
  formData.append('files', file1Blob, 'sample_notes.txt');
  formData.append('files', file2Blob, 'config_data.json');
  formData.append('expiryMinutes', '60');
  formData.append('title', 'Automated Test Share');

  const uploadRes = await fetch(`${BASE_URL}/shares`, {
    method: 'POST',
    body: formData
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`Upload failed: ${JSON.stringify(err)}`);
  }

  const shareData = await uploadRes.json();
  console.log('   ✅ Share Created:');
  console.log(`      • Share ID: ${shareData.shareId}`);
  console.log(`      • Access Code: ${shareData.accessCode}`);
  console.log(`      • Manage Key: ${shareData.manageKey.slice(0, 8)}...`);
  console.log(`      • Files Count: ${shareData.fileCount}`);
  console.log(`      • Share URL: ${shareData.shareUrl}`);

  const shareId = shareData.shareId;
  const accessCode = shareData.accessCode;
  const manageKey = shareData.manageKey;

  // 4. Lookup share by 6-digit access code
  console.log('\n4️⃣ Testing recipient lookup by 6-digit access code (GET /api/shares/code/:code)...');
  const codeRes = await fetch(`${BASE_URL}/shares/code/${accessCode}`);
  if (!codeRes.ok) throw new Error('Failed to lookup share by code');
  const codeData = await codeRes.json();
  console.log(`   ✅ Code lookup successful. Found ${codeData.files.length} file(s).`);

  // 5. Download individual file
  console.log('\n5️⃣ Testing individual file download...');
  const targetFile = codeData.files[0];
  const downloadRes = await fetch(`http://localhost:5001${targetFile.downloadUrl}`);
  if (!downloadRes.ok) throw new Error('File download failed');
  const downloadedText = await downloadRes.text();
  console.log(`   ✅ Downloaded '${targetFile.name}': "${downloadedText.slice(0, 30)}..."`);

  // 6. Download ZIP archive
  console.log('\n6️⃣ Testing streaming ZIP download (GET /api/shares/:id/download-zip)...');
  const zipRes = await fetch(`${BASE_URL}/shares/${shareId}/download-zip`);
  if (!zipRes.ok) throw new Error('ZIP download failed');
  const zipBuffer = await zipRes.arrayBuffer();
  console.log(`   ✅ ZIP archive downloaded successfully (${zipBuffer.byteLength} bytes).`);

  // 7. Check Sender Management Info
  console.log('\n7️⃣ Testing Sender Dashboard stats (GET /api/shares/:id/manage)...');
  const manageRes = await fetch(`${BASE_URL}/shares/${shareId}/manage`, {
    headers: { 'x-manage-key': manageKey }
  });
  if (!manageRes.ok) throw new Error('Sender management request failed');
  const manageData = await manageRes.json();
  console.log(`   ✅ Sender Info: Download Count = ${manageData.downloadCount}, Last Downloaded = ${new Date(manageData.lastDownloadedAt).toLocaleTimeString()}`);

  // 8. Extend Expiry
  console.log('\n8️⃣ Testing Expiry Extension (PATCH /api/shares/:id/extend)...');
  const extendRes = await fetch(`${BASE_URL}/shares/${shareId}/extend`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-manage-key': manageKey
    },
    body: JSON.stringify({ additionalMinutes: 30 })
  });
  if (!extendRes.ok) throw new Error('Expiry extension failed');
  const extendData = await extendRes.json();
  console.log(`   ✅ Extended expiry to: ${new Date(extendData.expiresAt).toLocaleTimeString()}`);

  // 9. Manual Delete Share
  console.log('\n9️⃣ Testing Sender Share Deletion (DELETE /api/shares/:id)...');
  const deleteRes = await fetch(`${BASE_URL}/shares/${shareId}`, {
    method: 'DELETE',
    headers: { 'x-manage-key': manageKey }
  });
  if (!deleteRes.ok) throw new Error('Delete share failed');
  console.log('   ✅ Share deleted successfully.');

  // 10. Verify that deleted share is no longer accessible
  console.log('\n🔟 Verifying share is now inaccessible...');
  const checkRes = await fetch(`${BASE_URL}/shares/code/${accessCode}`);
  if (checkRes.status === 404 || checkRes.status === 410) {
    console.log(`   ✅ Verified: Share properly returns HTTP ${checkRes.status} (Inaccessible).`);
  } else {
    throw new Error(`Expected 404/410, got ${checkRes.status}`);
  }

  // Cleanup test dummy files
  if (fs.existsSync(testFile1Path)) fs.unlinkSync(testFile1Path);
  if (fs.existsSync(testFile2Path)) fs.unlinkSync(testFile2Path);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Drop6 backend and storage pipeline are working flawlessly.\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
