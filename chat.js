/**
 * Chat Module
 * Handles core chat functionality including sending/receiving messages,
 * storing chat history, and managing user data
 */

const ChatModule = (function() {
  // Chat state
  const state = {
    username: '',
    socketId: '',
    messages: [],
    connected: false
  };
  
  /**
   * Initializes the chat module and sets up event listeners
   */
  function init() {
    // Load saved username if available
    state.username = Utils.getFromStorage('username', '');
    
    // Set up UI event listeners
    setupEventListeners();
    
    // Load and display saved chat history
    loadChatHistory();
  }
  
  /**
   * Sets up event listeners for chat-related UI elements
   */
  function setupEventListeners() {
    // Username form submission
    UIController.elements.submitUsername.addEventListener('click', handleUsernameSubmit);
    UIController.elements.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleUsernameSubmit();
    });
    
    // Message sending
    UIController.elements.sendButton.addEventListener('click', sendMessage);
    UIController.elements.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    // Image sending
    UIController.elements.sendImageButton.addEventListener('click', () => {
      UIController.elements.imageInput.click();
    });
    
    UIController.elements.imageInput.addEventListener('change', handleImageUpload);
    
    // Clear chat/data buttons
    UIController.elements.clearChatButton.addEventListener('click', clearChat);
    UIController.elements.clearChatButtonMenu.addEventListener('click', () => {
      clearChat();
      UIController.toggleActionMenu(false);
    });
    
    UIController.elements.clearDataButton.addEventListener('click', clearAllData);
    UIController.elements.clearDataButtonMenu.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all data? This will reload the page.')) {
        clearAllData();
        UIController.toggleActionMenu(false);
      }
    });
  }
  
  /**
   * Handles username form submission
   */
  function handleUsernameSubmit() {
    const username = UIController.elements.usernameInput.value.trim();
    
    if (username === '') {
      showError('Please enter a valid username.');
      return;
    }
    
    setUsername(username);
    UIController.showChatInterface(username);
    UIController.appendMessage(`Welcome, ${username}! You're now connected to the chat.`, 'system');
    
    // Trigger connection to socket server only after username is set
    SocketEvents.connect();
  }
  
  /**
   * Sets the username and saves it to local storage
   * 
   * @param {string} username - The username to set
   */
  function setUsername(username) {
    state.username = username;
    Utils.saveToStorage('username', username);
  }
  
  /**
   * Sends a text message to the chat
   */
  function sendMessage() {
    const messageText = UIController.elements.messageInput.value.trim();
    
    if (messageText === '') return;
    
    // Create message object
    const message = {
      id: Utils.generateUniqueId(),
      username: state.username,
      message: messageText,
      timestamp: Date.now(),
      type: 'text'
    };
    
    // Add to UI
    UIController.appendMessage(messageText, 'sent', '', { timestamp: message.timestamp });
    
    // Add to messages array and save to local storage
    addMessageToHistory(message);
    
    // Clear input field
    UIController.elements.messageInput.value = '';
    
    // Send to server
    SocketEvents.sendMessage(message);
  }
  
  /**
   * Handles image upload and sending
   */
  function handleImageUpload() {
    const file = UIController.elements.imageInput.files[0];
    
    if (!file) return;
    
    // Check file type and size
    if (!file.type.match('image.*')) {
      showError('Please select an image file.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showError('The image file is too large (max 5MB).');
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageData = e.target.result;
      
      // Create message object
      const message = {
        id: Utils.generateUniqueId(),
        username: state.username,
        image: imageData,
        timestamp: Date.now(),
        type: 'image'
      };
      
      // Add to UI
      UIController.appendImageMessage(imageData, 'sent');
      
      // Add to messages array and save to local storage
      addMessageToHistory(message);
      
      // Send to server
      SocketEvents.sendImage(message);
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    UIController.elements.imageInput.value = '';
  }
  
  /**
   * Handles receiving a message from the server
   * 
   * @param {Object} data - Message data from the server
   */
  function receiveMessage(data) {
    if (data.username === state.username) return; // Skip own messages
    
    // Add to UI
    UIController.appendMessage(data.message, 'received', data.username, { timestamp: data.timestamp });
    
    // Add to messages array and save to local storage
    addMessageToHistory({
      id: data.id || Utils.generateUniqueId(),
      username: data.username,
      message: data.message,
      timestamp: data.timestamp || Date.now(),
      type: 'text',
      received: true
    });
  }
  
  /**
   * Handles receiving an image from the server
   * 
   * @param {Object} data - Image data from the server
   */
  function receiveImage(data) {
    if (data.username === state.username) return; // Skip own images
    
    // Add to UI
    UIController.appendImageMessage(data.image, 'received', data.username);
    
    // Add to messages array and save to local storage
    addMessageToHistory({
      id: data.id || Utils.generateUniqueId(),
      username: data.username,
      image: data.image,
      timestamp: data.timestamp || Date.now(),
      type: 'image',
      received: true
    });
  }
  
  /**
   * Adds a message to the history and saves to local storage
   * 
   * @param {Object} message - The message to add
   */
  function addMessageToHistory(message) {
    state.messages.push(message);
    
    // Limit history to last 100 messages
    if (state.messages.length > 100) {
      state.messages = state.messages.slice(-100);
    }
    
    // Save to local storage
    saveChatHistory();
  }
  
  /**
   * Saves the current chat history to local storage
   */
  function saveChatHistory() {
    Utils.saveToStorage('chatHistory', state.messages);
  }
  
  /**
   * Loads chat history from local storage and displays it
   */
  function loadChatHistory() {
    const savedMessages = Utils.getFromStorage('chatHistory', []);
    
    state.messages = savedMessages;
    
    // Display saved messages
    if (savedMessages.length > 0) {
      savedMessages.forEach(msg => {
        if (msg.type === 'text') {
          const type = msg.received ? 'received' : 'sent';
          UIController.appendMessage(msg.message, type, msg.received ? msg.username : '', { 
            timestamp: msg.timestamp 
          });
        } else if (msg.type === 'image') {
          const type = msg.received ? 'received' : 'sent';
          UIController.appendImageMessage(msg.image, type, msg.received ? msg.username : '');
        }
      });
      
      // Scroll to bottom
      UIController.scrollToBottom();
    }
  }
  
  /**
   * Clears the chat history
   */
  function clearChat() {
    // Clear UI
    UIController.clearMessages();
    
    // Clear state and storage
    state.messages = [];
    Utils.saveToStorage('chatHistory', []);
    
    // Show system message
    UIController.appendMessage('Chat history cleared.', 'system');
  }
  
  /**
   * Clears all data and reloads the page
   */
  function clearAllData() {
    localStorage.clear();
    location.reload();
  }
  
  /**
   * Updates the socket ID in the UI and state
   * 
   * @param {string} id - The socket ID
   */
  function updateSocketId(id) {
    state.socketId = id;
    UIController.updateSocketId(id);
  }
  
  /**
   * Shows an error message
   * 
   * @param {string} message - The error message
   */
  function showError(message) {
    alert(message);
  }
  
  /**
   * Gets the current username
   * 
   * @return {string} - The current username
   */
  function getUsername() {
    return state.username;
  }
  
  /**
   * Gets the current socket ID
   * 
   * @return {string} - The current socket ID
   */
  function getSocketId() {
    return state.socketId;
  }
  
  // Public API
  return {
    init,
    getUsername,
    getSocketId,
    updateSocketId,
    receiveMessage,
    receiveImage,
    showError
  };
})(); 