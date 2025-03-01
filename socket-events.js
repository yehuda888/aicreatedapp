/**
 * Socket Events Module
 * Handles all Socket.IO events and communication with the server
 */

const SocketEvents = (function() {
  // Socket.IO instance
  let socket = null;
  
  // Connection state
  const state = {
    connected: false,
    reconnecting: false,
    connectionAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000
  };
  
  /**
   * Initializes and connects to the Socket.IO server
   */
  function connect() {
    // Show connecting message immediately for better user feedback
    UIController.appendMessage('Connecting to chat server...', 'system');
    
    if (socket) {
      console.log('Socket already initialized');
      return;
    }
    
    try {
      // Initialize Socket.IO connection
      socket = io();
      
      // Set up event listeners
      setupSocketEvents();
      
      console.log('Socket.IO connection initialized');
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
      UIController.appendMessage('Failed to connect to chat server. Please refresh the page.', 'system');
    }
  }
  
  /**
   * Sets up all Socket.IO event listeners
   */
  function setupSocketEvents() {
    // Connection events
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    
    // Chat events
    socket.on('message', handleMessage);
    socket.on('image', handleImage);
    socket.on('your-id', handleSocketId);
    
    // Call events
    socket.on('start-call', handleStartCall);
    socket.on('answer-call', handleAnswerCall);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('end-call', handleEndCall);
    socket.on('error', handleError);
  }
  
  /**
   * Handles successful connection to the Socket.IO server
   */
  function handleConnect() {
    console.log('Connected to Socket.IO server');
    state.connected = true;
    state.reconnecting = false;
    state.connectionAttempts = 0;
    
    UIController.appendMessage('Connected to chat server.', 'system');
  }
  
  /**
   * Handles disconnection from the Socket.IO server
   */
  function handleDisconnect(reason) {
    console.log('Disconnected from Socket.IO server:', reason);
    state.connected = false;
    
    UIController.appendMessage('Disconnected from chat server. Attempting to reconnect...', 'system');
    
    // Attempt to reconnect if not already reconnecting
    if (!state.reconnecting && state.connectionAttempts < state.maxReconnectAttempts) {
      attemptReconnect();
    }
  }
  
  /**
   * Handles connection errors
   */
  function handleConnectError(error) {
    console.error('Socket.IO connection error:', error);
    state.connected = false;
    
    UIController.appendMessage('Unable to connect to chat server.', 'system');
    
    // Attempt to reconnect if not already reconnecting
    if (!state.reconnecting && state.connectionAttempts < state.maxReconnectAttempts) {
      attemptReconnect();
    }
  }
  
  /**
   * Attempts to reconnect to the Socket.IO server
   */
  function attemptReconnect() {
    state.reconnecting = true;
    state.connectionAttempts++;
    
    console.log(`Attempting to reconnect (${state.connectionAttempts}/${state.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (!state.connected) {
        // Try to reconnect
        socket.connect();
        
        // If still not connected after reconnect attempt, try again or give up
        if (!state.connected && state.connectionAttempts < state.maxReconnectAttempts) {
          attemptReconnect();
        } else if (!state.connected) {
          state.reconnecting = false;
          UIController.appendMessage('Failed to reconnect to chat server. Please refresh the page.', 'system');
        }
      }
    }, state.reconnectDelay);
  }
  
  /**
   * Handles incoming text messages
   * 
   * @param {Object} data - Message data from the server
   */
  function handleMessage(data) {
    ChatModule.receiveMessage(data);
  }
  
  /**
   * Handles incoming images
   * 
   * @param {Object} data - Image data from the server
   */
  function handleImage(data) {
    ChatModule.receiveImage(data);
  }
  
  /**
   * Handles socket ID assignment from the server
   * 
   * @param {string} id - The assigned socket ID
   */
  function handleSocketId(id) {
    ChatModule.updateSocketId(id);
  }
  
  /**
   * Handles incoming call requests
   * 
   * @param {Object} data - Call data from the server
   */
  function handleStartCall(data) {
    CallHandler.handleIncomingCall(data);
  }
  
  /**
   * Handles incoming call answers
   * 
   * @param {Object} data - Call answer data from the server
   */
  function handleAnswerCall(data) {
    CallHandler.handleCallAnswered(data);
  }
  
  /**
   * Handles incoming ICE candidates
   * 
   * @param {Object} data - ICE candidate data from the server
   */
  function handleIceCandidate(data) {
    CallHandler.handleIceCandidate(data);
  }
  
  /**
   * Handles call end events
   * 
   * @param {Object} data - Call end data from the server
   */
  function handleEndCall(data) {
    CallHandler.handleCallEnded(data);
  }
  
  /**
   * Handles error events from the server
   * 
   * @param {Object} data - Error data from the server
   */
  function handleError(data) {
    console.error('Socket.IO error:', data.message);
    ChatModule.showError(data.message || 'An error occurred');
  }
  
  /**
   * Sends a text message to the server
   * 
   * @param {Object} data - Message data to send
   */
  function sendMessage(data) {
    if (!socket || !state.connected) {
      ChatModule.showError('Not connected to chat server. Please refresh the page.');
      return;
    }
    
    socket.emit('message', {
      username: data.username,
      message: data.message,
      timestamp: data.timestamp
    });
  }
  
  /**
   * Sends an image to the server
   * 
   * @param {Object} data - Image data to send
   */
  function sendImage(data) {
    if (!socket || !state.connected) {
      ChatModule.showError('Not connected to chat server. Please refresh the page.');
      return;
    }
    
    socket.emit('image', {
      username: data.username,
      image: data.image,
      timestamp: data.timestamp
    });
  }
  
  /**
   * Sends a call request to the server
   * 
   * @param {Object} data - Call data to send
   */
  function startCall(data) {
    if (!socket || !state.connected) {
      ChatModule.showError('Not connected to chat server. Please refresh the page.');
      return;
    }
    
    socket.emit('start-call', data);
  }
  
  /**
   * Sends a call answer to the server
   * 
   * @param {Object} data - Call answer data to send
   */
  function answerCall(data) {
    if (!socket || !state.connected) {
      ChatModule.showError('Not connected to chat server. Please refresh the page.');
      return;
    }
    
    socket.emit('answer-call', data);
  }
  
  /**
   * Sends an ICE candidate to the server
   * 
   * @param {Object} data - ICE candidate data to send
   */
  function sendIceCandidate(data) {
    if (!socket || !state.connected) {
      return;
    }
    
    socket.emit('ice-candidate', data);
  }
  
  /**
   * Sends a call end event to the server
   * 
   * @param {Object} data - Call end data to send
   */
  function endCall(data) {
    if (!socket || !state.connected) {
      return;
    }
    
    socket.emit('end-call', data);
  }
  
  /**
   * Checks if the socket is connected
   * 
   * @return {boolean} - Whether the socket is connected
   */
  function isConnected() {
    return state.connected;
  }
  
  // Public API
  return {
    connect,
    sendMessage,
    sendImage,
    startCall,
    answerCall,
    sendIceCandidate,
    endCall,
    isConnected
  };
})(); 