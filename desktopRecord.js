// listen for messages from the service worker - start recording  - stop recording
chrome.runtime.onMessage.addListener(function (request, sender) {

  switch (request.type) {
    case "start-recording":
      startRecording(request.focusedTabId);
      break;

    case "stop-recording":
      stopRecording();
      break;

    default:
      console.log("default");
  }

  return true;
});

let recorder;
let data = [];

const stopRecording = () => {
  if (recorder?.state === "recording") {
    recorder.stop();
    // stop all streams
    recorder.stream.getTracks().forEach((t) => t.stop());
  }
};

const startRecording = async (focusedTabId) => {
  // use desktopCapture to get the screen stream
  chrome.desktopCapture.chooseDesktopMedia(
    ["screen", "window"],
    async function (streamId) {
      if (streamId === null) {
        return;
      }

      // get stream id
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: streamId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: streamId,
          },
        },
      });

      // get the microphone stream
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false },
      });

      // check that the microphone stream has audio tracks
      if (microphone.getAudioTracks().length !== 0) {
        const combinedStream = new MediaStream([
          stream.getVideoTracks()[0],
          microphone.getAudioTracks()[0],
        ]);

        recorder = new MediaRecorder(combinedStream, {
          mimeType: "video/webm",
        });

        // listen for data
        recorder.ondataavailable = (event) => {
          data.push(event.data);
        };

        // listen for when recording stops
        recorder.onstop = async () => {
          const blobFile = new Blob(data, { type: "video/webm" });

          const url = URL.createObjectURL(blobFile);

          // Create download link
          const a = document.createElement('a');
          a.href = url;
          a.download = 'screen-recording.webm';
          a.click();

          // Cleanup
          URL.revokeObjectURL(url);
          data = [];

          chrome.runtime.sendMessage({ type: "close-tab" });
        };

        // start recording
        recorder.start();

        // set focus back to the previous tab
        if (focusedTabId) {
          chrome.tabs.update(focusedTabId, { active: true });
        }
      }

      return;
    }
  );
};
