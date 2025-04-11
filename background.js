// check if we are recording
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  return [recordingStatus, recordingType];
};

// update recording state
const updateRecording = async (state, type) => {
  chrome.storage.local.set({ recording: state, type });
};

const startRecording = async (type) => {
  updateRecording(true, type);

  // update the icon
  chrome.action.setIcon({ path: "icons/recording.png" });
  if (type === "tab") {
    recordTabState(true);
  } else {
    recordScreen();
  }
};

const stopRecording = async (type) => {
  updateRecording(false, "");
  
  // update the icon
  chrome.action.setIcon({ path: "icons/not-recording.png" });
  if (type === "tab") {
    recordTabState(false);
  } 
};

const closeTab = async () => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("desktopRecord.html") });
    if (tabs.length > 0) {
    chrome.tabs.remove(tabs[0].id);
  }
}

const recordScreen = async () => {
  // create a pinned focused tab - with an index of 0
  const desktopRecordPath = chrome.runtime.getURL("desktopRecord.html");

  const currentTab = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const currentTabId = currentTab[0].id;

  const newTab = await chrome.tabs.create({
    url: desktopRecordPath,
    pinned: true,
    active: true,
    index: 0,
  });

  // wait for 500ms send a message to the tab to start recording
  setTimeout(() => {
    chrome.tabs.sendMessage(newTab.id, {
      type: "start-recording",
      focusedTabId: currentTabId,
    });
  }, 500);
};

const recordTabState = async (start = true) => {
  // setup our offscrene document  
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

  // If an offscreen document is not already open, create one.
  if (!offscreenDocument) {
    // Create an offscreen document.
    await chrome.offscreen.createDocument({
      url: "tabRecord.html",
      reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
      justification: "Recording from chrome.tabCapture API",
    });
  }

  if (start) {
    // use the tapCapture API to get the stream
    // get the id of the active tab
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const tabId = tab[0].id;

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    // send this to our tabRecord document
    try {
      chrome.runtime.sendMessage({
        type: "start-recording",
        target: "tabRecord",
        data: streamId,
      });

    } catch (error) {
      console.error("Error sending message to tabRecord:", error);
    }
  } else {
    // stop
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "tabRecord",
    });
  }
};

// add listender for messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.type) {
    case "start-recording":
      startRecording(request.recordingType)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    case "stop-recording":
      stopRecording(request.recordingType)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep the message channel open for async response
    case "close-tab":
      closeTab();
      return true; // Keep the message channel open for async response
    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});
