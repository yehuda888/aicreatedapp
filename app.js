/**
 * Main Application Entry Point
 * Initializes all modules and starts the application
 */

(function() {
  /**
   * Initializes the application and all modules
   */
  function initApp() {
    // Show initializing message
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('messages')) {
        const messages = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        messageElement.textContent = 'Initializing chat application...';
        messages.appendChild(messageElement);
      }
    });
    
    // Initialize UI controller first (DOM manipulation)
    UIController.init();
    
    // Initialize chat module (message handling)
    ChatModule.init();
    
    // Initialize call handler (WebRTC)
    CallHandler.init();
    
    // Connect to server after short delay to ensure UI is ready
    setTimeout(() => {
      // If user has a username set, connect to socket server
      if (Utils.getFromStorage('username')) {
        SocketEvents.connect();
      }
    }, 300);
    
    // Log initialization
    console.log('Chat application initialized');
  }
  
  // Initialize app when DOM is fully loaded
  document.addEventListener('DOMContentLoaded', initApp);
  
  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('Tab is now visible - checking connection status');
      
      // If not already connected, reconnect the socket
      if (!SocketEvents.isConnected() && Utils.getFromStorage('username')) {
        UIController.appendMessage('Reconnecting to server...', 'system');
        SocketEvents.connect();
      }
    }
  });
  
  // Handle online/offline status
  window.addEventListener('online', () => {
    console.log('Browser is online - reconnecting to server');
    
    // If user has a username set, reconnect to socket server
    if (Utils.getFromStorage('username')) {
      UIController.appendMessage('Network connection restored. Reconnecting...', 'system');
      SocketEvents.connect();
    }
  });
})(); 