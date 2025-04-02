chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadImage") {
    const { imageUrl, filename } = message;
    console.log(`Încep conversia și descărcarea pentru ${filename}`);

    // Descărcăm imaginea .webp ca blob
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
          // Creăm FormData și atașăm blob-ul cu numele original
          const formData = new FormData();
          formData.append('file', blob, filename);
          // Trimitem POST request către serverul local pentru conversie
          return fetch('http://localhost:5000/convert', {
            method: 'POST',
            body: formData
          });
      })
      .then(response => {
          if (!response.ok) {
              throw new Error('Eroare la conversia imaginii');
          }
          return response.blob();
      })
      .then(pngBlob => {
          // Convertește blob-ul în data URL
          const reader = new FileReader();
          reader.onloadend = function() {
            const dataUrl = reader.result; // data URL-ul rezultat
            const pngFilename = filename.replace(/\.webp$/i, '.png');
            // Folosește dataUrl în chrome.downloads.download
            chrome.downloads.download({
              url: dataUrl,
              filename: pngFilename,
              saveAs: false
            }, (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error(`Eroare la descărcare pentru ${pngFilename}: ${chrome.runtime.lastError.message}`);
              } else {
                console.log(`Descărcarea a început pentru ${pngFilename} cu ID: ${downloadId}`);
              }
            });
          };
          reader.readAsDataURL(pngBlob);
      })
      .catch(error => {
          console.error("Eroare la procesarea imaginii:", error);
      });
  }
});
