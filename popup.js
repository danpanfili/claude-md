document.getElementById('saveChat').addEventListener('click', () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {action: 'getChatData'},
      {frameId: 0},  // Specify the main frame
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error: ", chrome.runtime.lastError);
          // Handle the error (e.g., show a message to the user)
          return;
        }
        if (response && !response.error) {
          const readme = `# ${response.title}\n\n${response.content}`;
          const blob = new Blob([readme], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          
          chrome.downloads.download({
            url: url,
            filename: `${response.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`,
            saveAs: true
          });
        } else {
          console.error('Error getting chat data:', response ? response.error : 'Unknown error');
        }
      }
    );
  });
});