// listen for messages from the service worker (background.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.target !== "tabRecord") {
    return false;
  }

  switch (message.type) {
    case "start-recording":
      startRecording(message.data)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

    case "stop-recording":
      stopRecording()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

    default:
      console.log("Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
  }

  return true;
});

let recorder;
let data = [];

async function stopRecording() {
  if (recorder?.state === "recording") {
    recorder.stop();

    // stop all streams
    recorder.stream.getTracks().forEach((t) => t.stop());
  }
}

async function startRecording(streamId) {
  try {
    if (recorder?.state === "recording") {
      throw new Error("Called startRecording while recording is in progress.");
    }

    // use the tabCaptured streamId
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    // // get microphone audio
    // const microphone = await navigator.mediaDevices.getUserMedia({
    //   audio: { echoCancellation: false },
    // });

    // // combine the streams
    // const mixedContext = new AudioContext();
    // const mixedDest = mixedContext.createMediaStreamDestination();

    // mixedContext.createMediaStreamSource(microphone).connect(mixedDest);
    // mixedContext.createMediaStreamSource(media).connect(mixedDest);

    // const combinedStream = new MediaStream([
    //   media.getVideoTracks()[0],
    //   mixedDest.stream.getTracks()[0],
    // ]);

    recorder = new MediaRecorder(media, { mimeType: "video/webm" });

    // listen for data
    recorder.ondataavailable = (event) => {
      data.push(event.data);
    };

    // listen for when recording stops
    recorder.onstop = async () => {
      const blob = new Blob(data, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tab-recording.webm';
      a.click();

      // Cleanup
      URL.revokeObjectURL(url);
      data = [];
    };

    // start recording
    recorder.start();
  } catch (err) {
    console.log("error", err);
  }
}
