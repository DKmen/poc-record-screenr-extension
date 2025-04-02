// Global variables
let mediaRecorder;
let recordedChunks = [];

document.getElementById('startRecording').addEventListener('click', async () => {
  try {
    // Capture screen (video + system audio if available)
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true  // This captures system audio if the user allows it
    });

    // Capture microphone audio separately
    // const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Extract audio tracks from both streams
    const combinedAudioTracks = [
      ...screenStream.getAudioTracks(),
      // ...micStream.getAudioTracks()
    ];

    // Merge screen video and combined audio into a single MediaStream
    const combinedStream = new MediaStream([
      ...screenStream.getVideoTracks(), // Screen video track
      ...combinedAudioTracks            // Both system & mic audio
    ]);

    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

    // Collect recorded chunks
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    // Handle stop event
    mediaRecorder.onstop = () => {
      // Create video blob
      const blob = new Blob(recordedChunks, { type: 'video/webm' });

      // Generate download link
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'screen-recording.webm';
      downloadLink.click();

      // Cleanup
      URL.revokeObjectURL(url);
      recordedChunks = [];
    };

    // Start recording
    mediaRecorder.start();
    updateUIState(true);
  } catch (err) {
    console.error('Error:', err);
    document.getElementById('status').textContent = 'Error: ' + err.message;
  }
});

// Stop recording
document.getElementById('stopRecording').addEventListener('click', () => {
  mediaRecorder.stop();
  updateUIState(false);
});

// UI updates
function updateUIState(isRecording) {
  document.getElementById('startRecording').disabled = isRecording;
  document.getElementById('stopRecording').disabled = !isRecording;
  document.getElementById('status').textContent = isRecording ? 'Recording...' : 'Recording saved!';
}
