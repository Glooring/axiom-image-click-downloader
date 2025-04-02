console.log("Axiom Image Click Downloader script loaded.");

// Function to extract the image URL and filename from an image element
function extractImageInfo(imgElement) {
  const imageUrl = imgElement.src;
  let filename = "downloaded_image";
  try {
    const urlObject = new URL(imageUrl);
    const pathParts = urlObject.pathname.split('/');
    filename = decodeURIComponent(pathParts[pathParts.length - 1]) || "downloaded_image";
    filename = filename.split('?')[0]; // Remove query parameters from the name
  } catch (e) {
    console.warn("Could not extract filename:", e);
  }
  return { imageUrl, filename };
}

// Function to send a message to the background script without waiting for a response
function requestDownload(imageUrl, filename) {
  chrome.runtime.sendMessage({
    action: "downloadImage",
    imageUrl: imageUrl,
    filename: filename
  });
  console.log("Download message sent:", filename);
}

// Function to add event listeners to a container
function addListenersToContainer(container) {
  if (container.dataset.listenerAttached === "true") {
    return; // Avoid adding listeners multiple times
  }

  const imgElement = container.querySelector("img");
  const lensButton = container.querySelector("button");

  if (imgElement && imgElement.src) {
    const { imageUrl, filename } = extractImageInfo(imgElement);

    if (lensButton) {
      lensButton.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          console.log("Default click action (Google Lens) prevented on button.");
          requestDownload(imageUrl, filename); // Download the image
        },
        true
      );
    } else {
      container.addEventListener(
        "click",
        (event) => {
          if (event.target === imgElement || event.target === container) {
            event.preventDefault();
            event.stopPropagation();
            console.log("Default click action prevented on container/image.");
            requestDownload(imageUrl, filename); // Download the image
          }
        },
        true
      );
    }

    container.dataset.listenerAttached = "true";
  }
}

// Observer to detect newly added containers dynamically
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const newContainers = node.querySelectorAll("div.group\\/image");
        newContainers.forEach((container) => addListenersToContainer(container));
        if (node.matches("div.group\\/image")) {
          addListenersToContainer(node);
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Apply listeners to existing containers
document.querySelectorAll("div.group\\/image").forEach((container) => addListenersToContainer(container));
