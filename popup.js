const recordTab = document.querySelector("#tab");
const recordScreen = document.querySelector("#screen");

// check chrome storage if recording is on
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  return [recordingStatus, recordingType];
};

const init = async () => {
  const recordingState = await checkRecording();

  if (recordingState[0] === true) {
    if (recordingState[1] === "tab") {
      recordTab.innerText = "Stop Recording";
    } else {
      recordScreen.innerText = "Stop Recording";
    }
  }

  const updateRecording = async (type) => {
    const recordingState = await checkRecording();

    if (recordingState[0] === true) {
      // stop recording
      chrome.runtime.sendMessage({ type: "stop-recording", recordingType: type });
    } else {
      // send message to service worker (background.js) to start recording
      chrome.runtime.sendMessage({
        type: "start-recording",
        recordingType: type,
      });
    }

    // close popup
    window.close();
  };

  recordTab.addEventListener("click", async () => {
    updateRecording("tab");
  });

  recordScreen.addEventListener("click", async () => {
    updateRecording("screen");
  });
};

init();
