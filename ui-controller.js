/**
 * UI Controller Module
 * Handles all UI updates, DOM manipulations, and user interactions
 */

const UIController = (function() {
  // UI state
  const state = {
    darkMode: false,
    menuVisible: false,
    emojiPickerVisible: false
  };
  
  // Cache DOM elements
  const elements = {
    body: document.body,
    usernameForm: document.getElementById('usernameForm'),
    chatContainer: document.getElementById('chatContainer'),
    usernameInput: document.getElementById('usernameInput'),
    submitUsername: document.getElementById('submitUsername'),
    messageContainer: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),
    toggleDarkMode: document.getElementById('toggleDarkMode'),
    toggleDarkModeMenu: document.getElementById('toggleDarkModeMenu'),
    imageInput: document.getElementById('imageInput'),
    sendImageButton: document.getElementById('sendImageButton'),
    emojiButton: document.getElementById('emojiButton'),
    socketIdContainer: document.getElementById('socketIdContainer'),
    socketIdDisplay: document.getElementById('socketId'),
    usernameDisplay: document.getElementById('usernameDisplay'),
    startCallButton: document.getElementById('startCallButton'),
    endCallButton: document.getElementById('endCallButton'),
    acceptCallButton: document.getElementById('acceptCallButton'),
    rejectCallButton: document.getElementById('rejectCallButton'),
    callInfoContainer: document.getElementById('callInfoContainer'),
    calleeIdDisplay: document.getElementById('calleeIdDisplay'),
    callTimer: document.getElementById('callTimer'),
    clearChatButton: document.getElementById('clearChatButton'),
    clearDataButton: document.getElementById('clearDataButton'),
    menuToggle: document.getElementById('menuToggle'),
    actionMenu: document.getElementById('actionMenu'),
    menuOverlay: document.getElementById('menuOverlay'),
    emojiPickerContainer: document.getElementById('emojiPickerContainer')
  };
  
  /**
   * Shows the chat interface and hides the username form
   * 
   * @param {string} username - The username to display
   */
  function showChatInterface(username) {
    elements.usernameForm.style.display = 'none';
    elements.chatContainer.style.display = 'flex';
    elements.usernameDisplay.textContent = username;
    elements.messageInput.focus();
  }
  
  /**
   * Shows the username form and hides the chat interface
   */
  function showUsernameForm() {
    elements.usernameForm.style.display = 'flex';
    elements.chatContainer.style.display = 'none';
    elements.usernameInput.focus();
  }
  
  /**
   * Adds a message to the chat container
   * 
   * @param {string} text - The message text
   * @param {string} type - The message type (sent, received, system)
   * @param {string} sender - The sender's username (for received messages)
   * @param {Object} options - Additional options (timestamp, etc.)
   */
  function appendMessage(text, type, sender = '', options = {}) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    
    // Create message content based on type
    if (type === 'system') {
      messageElement.textContent = text;
    } else if (type === 'sent') {
      messageElement.innerHTML = Utils.sanitizeHTML(text);
    } else if (type === 'received') {
      const senderElement = document.createElement('strong');
      senderElement.textContent = sender;
      messageElement.appendChild(senderElement);
      messageElement.innerHTML += Utils.sanitizeHTML(text);
    }
    
    // Removed timestamp display as requested
    
    // Add the message to the container
    elements.messageContainer.appendChild(messageElement);
    
    // Scroll to the bottom
    scrollToBottom();
    
    return messageElement;
  }
  
  /**
   * Adds an image message to the chat
   * 
   * @param {string} imageSrc - The image source (data URL or URL)
   * @param {string} type - The message type (sent or received)
   * @param {string} sender - The sender's username (for received messages)
   */
  function appendImageMessage(imageSrc, type, sender = '') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', type);
    
    if (type === 'received' && sender) {
      const senderElement = document.createElement('strong');
      senderElement.textContent = sender;
      messageElement.appendChild(senderElement);
    }
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Shared image';
    img.addEventListener('load', scrollToBottom);
    
    messageElement.appendChild(img);
    elements.messageContainer.appendChild(messageElement);
    
    scrollToBottom();
    return messageElement;
  }
  
  /**
   * Scrolls the message container to the bottom
   */
  function scrollToBottom() {
    elements.messageContainer.scrollTop = elements.messageContainer.scrollHeight;
  }
  
  /**
   * Clears all messages from the chat container
   */
  function clearMessages() {
    elements.messageContainer.innerHTML = '';
  }
  
  /**
   * Toggles dark mode
   * 
   * @param {boolean} [force] - Force dark mode on or off
   */
  function toggleDarkMode(force) {
    const isDarkMode = force !== undefined ? force : !state.darkMode;
    state.darkMode = isDarkMode;
    
    if (isDarkMode) {
      elements.body.classList.add('dark-mode');
    } else {
      elements.body.classList.remove('dark-mode');
    }
    
    // Save preference
    Utils.saveToStorage('darkMode', isDarkMode);
  }
  
  /**
   * Updates the display of the socket ID
   * 
   * @param {string} id - The socket ID to display
   */
  function updateSocketId(id) {
    elements.socketIdDisplay.textContent = id;
    elements.socketIdContainer.style.display = 'flex';
  }
  
  /**
   * Sets up the emoji picker
   */
  function setupEmojiPicker() {
    if (window.EmojiMart) {
      const picker = new EmojiMart.Picker({
        onEmojiSelect: emoji => {
          elements.messageInput.value += emoji.native;
          elements.messageInput.focus();
          hideEmojiPicker();
        },
        set: 'native',
        theme: state.darkMode ? 'dark' : 'light',
        autoFocus: true,
        showPreview: false,
        showSkinTones: false,
      });
      
      elements.emojiPickerContainer.innerHTML = '';
      elements.emojiPickerContainer.appendChild(picker);
    }
  }
  
  /**
   * Shows the emoji picker
   */
  function showEmojiPicker() {
    setupEmojiPicker();
    elements.emojiPickerContainer.style.display = 'block';
    state.emojiPickerVisible = true;
  }
  
  /**
   * Hides the emoji picker
   */
  function hideEmojiPicker() {
    elements.emojiPickerContainer.style.display = 'none';
    state.emojiPickerVisible = false;
  }
  
  /**
   * Toggles the emoji picker visibility
   */
  function toggleEmojiPicker() {
    if (state.emojiPickerVisible) {
      hideEmojiPicker();
    } else {
      showEmojiPicker();
    }
  }
  
  /**
   * Shows or hides the action menu
   * 
   * @param {boolean} show - Whether to show or hide the menu
   */
  function toggleActionMenu(show) {
    const isVisible = show !== undefined ? show : !state.menuVisible;
    state.menuVisible = isVisible;
    
    if (isVisible) {
      elements.actionMenu.classList.add('visible');
      elements.menuOverlay.style.display = 'block';
    } else {
      elements.actionMenu.classList.remove('visible');
      elements.menuOverlay.style.display = 'none';
    }
  }
  
  /**
   * Updates the call interface based on call state
   * 
   * @param {string} state - The call state (idle, calling, connected, incoming)
   * @param {Object} data - Call-related data
   */
  function updateCallInterface(state, data = {}) {
    // Reset all call UI elements
    elements.startCallButton.style.display = 'flex';
    elements.endCallButton.style.display = 'none';
    elements.acceptCallButton.style.display = 'none';
    elements.rejectCallButton.style.display = 'none';
    elements.callInfoContainer.style.display = 'none';
    
    switch (state) {
      case 'idle':
        // Default state - show start call button only
        break;
        
      case 'calling':
        elements.startCallButton.style.display = 'none';
        elements.endCallButton.style.display = 'flex';
        elements.callInfoContainer.style.display = 'block';
        elements.calleeIdDisplay.textContent = data.recipient || 'Unknown';
        break;
        
      case 'connected':
        elements.startCallButton.style.display = 'none';
        elements.endCallButton.style.display = 'flex';
        elements.callInfoContainer.style.display = 'block';
        elements.calleeIdDisplay.textContent = data.recipient || 'Unknown';
        break;
        
      case 'incoming':
        elements.startCallButton.style.display = 'none';
        elements.acceptCallButton.style.display = 'flex';
        elements.rejectCallButton.style.display = 'flex';
        elements.callInfoContainer.style.display = 'block';
        elements.calleeIdDisplay.textContent = data.caller || 'Unknown';
        break;
    }
  }
  
  /**
   * Updates the call timer display
   * 
   * @param {number} seconds - The call duration in seconds
   */
  function updateCallTimer(seconds) {
    elements.callTimer.textContent = Utils.formatDuration(seconds);
  }
  
  /**
   * Initializes UI event listeners
   */
  function initEventListeners() {
    // Dark mode toggle
    elements.toggleDarkMode.addEventListener('click', () => toggleDarkMode());
    
    if (elements.toggleDarkModeMenu) {
      elements.toggleDarkModeMenu.addEventListener('click', () => {
        toggleDarkMode();
        toggleActionMenu(false);
      });
    }
    
    // Menu toggle
    elements.menuToggle.addEventListener('click', () => toggleActionMenu());
    elements.menuOverlay.addEventListener('click', () => toggleActionMenu(false));
    
    // Emoji picker
    elements.emojiButton.addEventListener('click', toggleEmojiPicker);
    document.addEventListener('click', (e) => {
      if (state.emojiPickerVisible && 
          !elements.emojiPickerContainer.contains(e.target) && 
          e.target !== elements.emojiButton) {
        hideEmojiPicker();
      }
    });
    
    // Send image button UI handling
    elements.messageInput.addEventListener('input', () => {
      if (elements.messageInput.value.trim() === '') {
        elements.sendImageButton.style.display = 'block';
      } else {
        elements.sendImageButton.style.display = 'none';
      }
    });
    
    // Initialize button visibility
    if (elements.messageInput.value.trim() === '') {
      elements.sendImageButton.style.display = 'block';
    } else {
      elements.sendImageButton.style.display = 'none';
    }
    
    // Keyboard shortcut for dark mode toggle (Ctrl+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
      }
    });
    
    // Connect menu buttons with their proper IDs
    if (elements.clearChatButton) {
      elements.clearChatButton.addEventListener('click', () => {
        if (typeof ChatModule.clearChat === 'function') {
          ChatModule.clearChat();
        } else {
          clearMessages();
          Utils.saveToStorage('chatHistory', []);
          appendMessage('Chat history cleared.', 'system');
        }
        toggleActionMenu(false);
      });
    }
    
    if (elements.clearDataButton) {
      elements.clearDataButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data? This will reload the page.')) {
          localStorage.clear();
          location.reload();
        }
        toggleActionMenu(false);
      });
    }
  }
  
  /**
   * Initializes the UI state based on saved preferences
   */
  function initUIState() {
    // Check for saved dark mode preference or system preference
    const savedDarkMode = Utils.getFromStorage('darkMode');
    
    if (savedDarkMode !== null) {
      toggleDarkMode(savedDarkMode);
    } else if (Utils.prefersDarkMode()) {
      toggleDarkMode(true);
    }
    
    // Listen for system dark mode changes
    Utils.watchDarkModePreference((e) => {
      // Only auto-switch if user hasn't explicitly chosen a theme
      if (Utils.getFromStorage('darkMode') === null) {
        toggleDarkMode(e.matches);
      }
    });
  }
  
  /**
   * Initializes the UI
   */
  function init() {
    initUIState();
    initEventListeners();
    
    // Show username form or chat interface based on saved username
    const savedUsername = Utils.getFromStorage('username');
    if (savedUsername) {
      showChatInterface(savedUsername);
    } else {
      showUsernameForm();
    }
  }
  
  // Public API
  return {
    init,
    elements,
    showChatInterface,
    showUsernameForm,
    appendMessage,
    appendImageMessage,
    scrollToBottom,
    clearMessages,
    toggleDarkMode,
    updateSocketId,
    toggleEmojiPicker,
    toggleActionMenu,
    updateCallInterface,
    updateCallTimer
  };
})(); 