chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    function: getChatData,
  }, (results) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    const data = results[0].result;
    if (data && !data.error) {
      const readme = `# ${data.title}\n\n${data.content}`;
      const blob = new Blob([readme], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`,
        saveAs: true
      });
    } else {
      console.error('Error getting chat data:', data.error);
    }
  });
});

function getChatData() {
  try {
    // Get all elements with class 'font-tiempos'
    const titleElements = document.querySelectorAll('.font-tiempos');
    
    // Extract text content and count occurrences
    const textCounts = Array.from(titleElements)
      .map(el => el.textContent.trim())
      .reduce((acc, text) => {
        acc[text] = (acc[text] || 0) + 1;
        return acc;
      }, {});
    
    // Find the text that appears exactly twice
    const title = Object.entries(textCounts)
      .find(([text, count]) => count === 2)?.[0] || 'Untitled Chat';
    
    // Select all message elements using classes that contain 'font-' and '-message'
    const messageElements = document.querySelectorAll('[class*="font-"][class*="-message"]');
    
    const messages = Array.from(messageElements).map(element => {
      let role = 'Unknown';
      let content = '';
      
      // Extract the role from the class name
      const classAttr = element.getAttribute('class');
      const match = classAttr.match(/font-(\w+)-message/);
      if (match && match[1]) {
        role = match[1].charAt(0).toUpperCase() + match[1].slice(1); // Capitalize first letter
      }
      
      // Parse the content with formatting
      content = parseMessageContent(element);
      
      return `### ${role}\n\n${content}\n\n`;
    }).filter(message => message.trim() !== 'Unknown: \n\n');

    return {
      title: title,
      content: messages.join('')
    };
  } catch (error) {
    console.error('Error in getChatData:', error);
    return {error: error.message};
  }
}

function parseMessageContent(element) {
  let content = '';
  
  try{
  // Process child nodes
    element.querySelector('[class*="grid-col-1"]').childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        content += node.textContent.trim() + '\n\n';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        switch (node.tagName.toLowerCase()) {
          case 'p':
            content += node.textContent.trim() + '\n\n';
            break;
          case 'ul':
          case 'ol':
            content += parseList(node) + '\n\n';
            break;
          case 'pre':
            subnode = node.querySelector('[class^="language"]')
            content += '``` ' + subnode.className.replace('language-','') + '\n' + subnode.textContent.trim() + '\n```\n\n';
            break;
          case 'code':
            content += '`' + node.textContent.trim() + '`';
            break;
          case 'strong':
          case 'b':
            content += '**' + node.textContent.trim() + '**';
            break;
          case 'em':
          case 'i':
            content += '*' + node.textContent.trim() + '*';
            break;
          default:
            content += node.textContent.trim() + '\n\n';
        }
      }
    });
  }
  catch{
    element.childNodes.forEach(node => {content+= node.textContent.trim()+'\n\n';})
  }
  
  return content.trim();
}

function parseList(listElement) {
  let listContent = '';
  const listItems = listElement.querySelectorAll('li');
  listItems.forEach((item, index) => {
    const prefix = listElement.tagName.toLowerCase() === 'ol' ? `${index + 1}.` : '-';
    listContent += `${prefix} ${item.textContent.trim()}\n`;
  });
  return listContent;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getChatData') {
    Promise.resolve(getChatData())
      .then(data => {
        sendResponse(data);
      })
      .catch(error => {
        console.error('Error in getChatData:', error);
        sendResponse({error: error.message});
      });
    return true;  // This is crucial for asynchronous response
  }
});