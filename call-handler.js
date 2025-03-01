/**
 * Call Handler Module - Improved Version
 * Manages WebRTC functionality for audio calls with enhanced user experience
 */

const CallHandler = (function() {
  // WebRTC configuration with multiple STUN servers for better connectivity
  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }
    ]
  };
  
  // Call state object to track all call-related information
  const state = {
    localStream: null,
    peerConnection: null,
    remoteStream: null,
    callStatus: 'idle', // idle, calling, ringing, connected, ended
    callDirection: null, // 'outgoing' or 'incoming'
    remoteUser: {
      id: null,
      name: null
    },
    callStartTime: null,
    callDuration: 0,
    callTimer: null,
    isMuted: false,
    hasAudioPermission: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    audioElement: null,
    ringtoneAudio: null
  };
  
  /**
   * Initializes the call handler module
   */
  function init() {
    console.log('Initializing improved call handler module');
    
    // Set up UI elements and event listeners after DOM is loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setupCallUI();
    } else {
      document.addEventListener('DOMContentLoaded', setupCallUI);
    }
    
    // Create audio elements for remote audio and ringtone
    createAudioElements();
    
    // Pre-check audio permissions
    checkAudioPermissions();
  }
  
  /**
   * Sets up call UI and event listeners
   */
  function setupCallUI() {
    // Get all call-related buttons
    const startCallBtn = document.getElementById('startCallButton');
    const endCallBtn = document.getElementById('endCallButton');
    const acceptCallBtn = document.getElementById('acceptCallButton');
    const rejectCallBtn = document.getElementById('rejectCallButton');
    
    // Add direct event listeners to call buttons
    if (startCallBtn) {
      startCallBtn.addEventListener('click', showCallModal, true);
    }
    
    if (endCallBtn) {
      endCallBtn.addEventListener('click', endCall, true);
    }
    
    if (acceptCallBtn) {
      acceptCallBtn.addEventListener('click', acceptIncomingCall, true);
    }
    
    if (rejectCallBtn) {
      rejectCallBtn.addEventListener('click', rejectIncomingCall, true);
    }
    
    // Create mute button and add to UI if it doesn't exist
    createMuteButton();
    
    console.log('Call UI setup complete');
  }
  
  /**
   * Creates a mute button and adds it to the call controls
   */
  function createMuteButton() {
    const callButtonsContainer = document.querySelector('.call-buttons-container');
    
    if (!callButtonsContainer || document.getElementById('muteCallButton')) {
      return;
    }
    
    const muteButton = document.createElement('button');
    muteButton.id = 'muteCallButton';
    muteButton.className = 'call-button mute-call-button';
    muteButton.setAttribute('aria-label', 'Mute Call');
    muteButton.setAttribute('type', 'button');
    muteButton.style.display = 'none'; // Hidden by default
    
    muteButton.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    `;
    
    muteButton.addEventListener('click', toggleMute, true);
    callButtonsContainer.appendChild(muteButton);
  }
  
  /**
   * Creates audio elements for remote audio and ringtone
   */
  function createAudioElements() {
    // Create remote audio element
    if (!state.audioElement) {
      const audioElement = document.createElement('audio');
      audioElement.id = 'remoteAudio';
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
      state.audioElement = audioElement;
    }
    
    // Create ringtone audio
    if (!state.ringtoneAudio) {
      state.ringtoneAudio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-classic-short-alarm-993.mp3');
      state.ringtoneAudio.loop = true;
    }
  }
  
  /**
   * Checks if the browser has access to audio devices
   */
  function checkAudioPermissions() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Permissions granted
        state.hasAudioPermission = true;
        
        // Stop tracks right away since we're just checking
        stream.getTracks().forEach(track => track.stop());
        
        console.log('Audio permissions granted');
      })
      .catch(error => {
        state.hasAudioPermission = false;
        console.error('Audio permission error:', error);
      });
  }
  
  /**
   * Shows the call modal to enter a user ID
   */
  function showCallModal() {
    console.log('Showing call modal');
    
    // Prevent starting a new call if already in one
    if (state.callStatus !== 'idle') {
      UIController.appendMessage('You\'re already in a call. End the current call before starting a new one.', 'system');
      return;
    }
    
    // Remove any existing modal
    const existingModal = document.querySelector('.call-modal');
    if (existingModal) existingModal.remove();
    
    // Create modal
    const modalDiv = document.createElement('div');
    modalDiv.className = 'call-modal';
    modalDiv.id = 'callModal';
    
    modalDiv.innerHTML = `
      <div class="call-modal-content">
        <h3>Start a Call</h3>
        <p>Enter the ID of the user you want to call:</p>
        <input type="text" id="calleeIdInput" placeholder="User ID">
        <div class="call-modal-buttons">
          <button id="cancelCallButton" class="btn">Cancel</button>
          <button id="confirmCallButton" class="btn btn-primary">Call</button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modalDiv);
    
    // Handle button clicks
    const calleeIdInput = document.getElementById('calleeIdInput');
    const cancelButton = document.getElementById('cancelCallButton');
    const confirmButton = document.getElementById('confirmCallButton');
    
    // Focus input after a delay to ensure the modal is visible
    setTimeout(() => {
      if (calleeIdInput) calleeIdInput.focus();
    }, 100);
    
    // Cancel button closes the modal
    if (cancelButton) {
      cancelButton.onclick = () => modalDiv.remove();
    }
    
    // Confirm button starts the call
    if (confirmButton) {
      confirmButton.onclick = () => {
        const calleeId = calleeIdInput ? calleeIdInput.value.trim() : '';
        if (calleeId) {
          modalDiv.remove();
          startOutgoingCall(calleeId);
        } else if (calleeIdInput) {
          // Show error if input is empty
          calleeIdInput.classList.add('error');
          calleeIdInput.placeholder = 'Please enter a valid ID';
          setTimeout(() => {
            calleeIdInput.classList.remove('error');
            calleeIdInput.placeholder = 'User ID';
          }, 1500);
        }
      };
    }
    
    // Handle keyboard events
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        modalDiv.remove();
        document.removeEventListener('keydown', handleKeyDown);
      } else if (e.key === 'Enter' && calleeIdInput && document.activeElement === calleeIdInput) {
        const calleeId = calleeIdInput.value.trim();
        if (calleeId) {
          modalDiv.remove();
          document.removeEventListener('keydown', handleKeyDown);
          startOutgoingCall(calleeId);
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
  }
  
  /**
   * Starts an outgoing call to another user
   * 
   * @param {string} calleeId - The recipient's socket ID
   */
  function startOutgoingCall(calleeId) {
    // Prevent calling yourself
    if (calleeId === ChatModule.getSocketId()) {
      UIController.appendMessage('You cannot call yourself.', 'system');
      return;
    }
    
    console.log('Starting call to user:', calleeId);
    
    // Update call state
    state.callStatus = 'calling';
    state.callDirection = 'outgoing';
    state.remoteUser.id = calleeId;
    state.remoteUser.name = calleeId; // Will be updated if we get a username later
    
    // Update UI
    updateCallUI();
    UIController.appendMessage(`Calling user ${calleeId}...`, 'system');
    
    // Check for audio permissions
    if (!state.hasAudioPermission) {
      UIController.appendMessage('You need to grant microphone permissions to make calls.', 'system');
    }
    
    // Get local media stream
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log('Got local audio stream');
        state.localStream = stream;
        
        // Setup peer connection
        createPeerConnection();
        
        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          state.peerConnection.addTrack(track, stream);
        });
        
        // Create and send offer
        state.peerConnection.createOffer()
          .then(offer => {
            console.log('Created offer');
            return state.peerConnection.setLocalDescription(offer);
          })
          .then(() => {
            // Send call request to server
            SocketEvents.startCall({
              callee_id: calleeId,
              sdp_offer: state.peerConnection.localDescription,
              caller_username: ChatModule.getUsername()
            });
          })
          .catch(error => {
            console.error('Error creating offer:', error);
            handleCallError('Failed to start call. Please try again.');
          });
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        
        if (error.name === 'NotAllowedError') {
          handleCallError('Microphone access denied. Please allow microphone access in your browser settings.');
        } else {
          handleCallError('Could not access microphone. Please check your device settings.');
        }
      });
  }
  
  /**
   * Creates and sets up the WebRTC peer connection
   */
  function createPeerConnection() {
    // Close any existing connection
    if (state.peerConnection) {
      state.peerConnection.close();
    }
    
    console.log('Creating new peer connection');
    state.peerConnection = new RTCPeerConnection(peerConnectionConfig);
    
    // Handle ICE candidates
    state.peerConnection.onicecandidate = event => {
      if (event.candidate) {
        const targetId = state.remoteUser.id;
        if (targetId) {
          SocketEvents.sendIceCandidate({
            candidate: event.candidate,
            target_id: targetId
          });
        }
      }
    };
    
    // Handle connection state changes
    state.peerConnection.onconnectionstatechange = () => {
      const connectionState = state.peerConnection.connectionState;
      console.log('Connection state changed:', connectionState);
      
      switch (connectionState) {
        case 'connected':
          console.log('WebRTC connection established');
          if (state.callStatus === 'calling' || state.callStatus === 'ringing') {
            state.callStatus = 'connected';
            updateCallUI();
            startCallTimer();
          }
          break;
          
        case 'disconnected':
          console.log('WebRTC connection disconnected - attempting to reconnect');
          attemptReconnect();
          break;
          
        case 'failed':
          console.error('WebRTC connection failed');
          handleCallError('Call connection failed. Please try again.');
          break;
          
        case 'closed':
          console.log('WebRTC connection closed');
          break;
      }
    };
    
    // Handle incoming tracks
    state.peerConnection.ontrack = event => {
      console.log('Received remote track:', event.track.kind);
      
      if (event.streams && event.streams[0]) {
        state.remoteStream = event.streams[0];
        if (state.audioElement) {
          state.audioElement.srcObject = state.remoteStream;
          
          // Try to play the audio
          state.audioElement.play()
            .catch(e => console.error('Error playing remote audio:', e));
        }
      }
    };
    
    // Monitor ICE connection state
    state.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', state.peerConnection.iceConnectionState);
      
      if (state.peerConnection.iceConnectionState === 'failed') {
        // Try to restart ICE if it fails
        if (state.peerConnection.restartIce) {
          state.peerConnection.restartIce();
        }
      }
    };
  }
  
  /**
   * Attempts to reconnect a dropped call
   */
  function attemptReconnect() {
    if (state.reconnectAttempts >= state.maxReconnectAttempts) {
      handleCallError('Unable to reconnect call after multiple attempts.');
      return;
    }
    
    state.reconnectAttempts++;
    UIController.appendMessage(`Call connection lost. Attempting to reconnect... (${state.reconnectAttempts}/${state.maxReconnectAttempts})`, 'system');
    
    // Create a new connection and retry based on call direction
    createPeerConnection();
    
    if (state.callDirection === 'outgoing') {
      // For outgoing calls, we need to create a new offer
      state.localStream.getTracks().forEach(track => {
        state.peerConnection.addTrack(track, state.localStream);
      });
      
      state.peerConnection.createOffer()
        .then(offer => state.peerConnection.setLocalDescription(offer))
        .then(() => {
          SocketEvents.startCall({
            callee_id: state.remoteUser.id,
            sdp_offer: state.peerConnection.localDescription,
            caller_username: ChatModule.getUsername(),
            is_reconnect: true
          });
        })
        .catch(error => {
          console.error('Error during reconnect:', error);
          handleCallError('Failed to reconnect call.');
        });
    }
  }
  
  /**
   * Handles an incoming call from another user
   * 
   * @param {Object} data - Incoming call data
   */
  function handleIncomingCall(data) {
    console.log('Received incoming call:', data);
    
    // If already in a call, automatically reject
    if (state.callStatus !== 'idle') {
      SocketEvents.endCall({
        target_id: data.caller_id,
        reason: 'busy'
      });
      return;
    }
    
    // Save incoming call data
    state.callStatus = 'ringing';
    state.callDirection = 'incoming';
    state.remoteUser.id = data.caller_id;
    state.remoteUser.name = data.caller_username || data.caller_id;
    
    // Save offer for later use when accepting the call
    state.pendingRemoteOffer = data.sdp_offer;
    
    // Update UI for incoming call
    updateCallUI();
    
    // Play ringtone
    if (state.ringtoneAudio) {
      try {
        state.ringtoneAudio.play().catch(e => {
          console.log('Could not play ringtone automatically:', e);
          // User may need to interact with the page first
        });
      } catch (e) {
        console.error('Error playing ringtone:', e);
      }
    }
    
    // Notify user
    UIController.appendMessage(`Incoming call from ${state.remoteUser.name}`, 'system');
    
    // Automatically reject call after 30 seconds if not answered
    state.callTimeoutId = setTimeout(() => {
      if (state.callStatus === 'ringing') {
        UIController.appendMessage('Call timed out after 30 seconds', 'system');
        rejectIncomingCall();
      }
    }, 30000);
  }
  
  /**
   * Accepts an incoming call
   */
  function acceptIncomingCall() {
    if (state.callStatus !== 'ringing' || !state.pendingRemoteOffer) {
      console.error('No incoming call to accept');
      return;
    }
    
    console.log('Accepting incoming call from:', state.remoteUser.id);
    
    // Clear the auto-reject timeout
    if (state.callTimeoutId) {
      clearTimeout(state.callTimeoutId);
      state.callTimeoutId = null;
    }
    
    // Stop ringtone
    if (state.ringtoneAudio) {
      state.ringtoneAudio.pause();
      state.ringtoneAudio.currentTime = 0;
    }
    
    // Update UI while waiting for microphone
    UIController.updateCallInterface('connected', { recipient: state.remoteUser.name });
    UIController.appendMessage(`Connecting to ${state.remoteUser.name}...`, 'system');
    
    // Get local stream for outgoing audio
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        state.localStream = stream;
        
        // Create peer connection
        createPeerConnection();
        
        // Add local tracks
        stream.getTracks().forEach(track => {
          state.peerConnection.addTrack(track, stream);
        });
        
        // Set remote description (the offer)
        return state.peerConnection.setRemoteDescription(
          new RTCSessionDescription(state.pendingRemoteOffer)
        );
      })
      .then(() => {
        console.log('Creating answer');
        return state.peerConnection.createAnswer();
      })
      .then(answer => {
        console.log('Setting local description (answer)');
        return state.peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        // Send answer to caller
        SocketEvents.answerCall({
          caller_id: state.remoteUser.id,
          sdp_answer: state.peerConnection.localDescription,
          callee_username: ChatModule.getUsername()
        });
        
        // Update call status
        state.callStatus = 'connected';
        updateCallUI();
        startCallTimer();
        
        UIController.appendMessage(`Connected with ${state.remoteUser.name}`, 'system');
      })
      .catch(error => {
        console.error('Error accepting call:', error);
        
        if (error.name === 'NotAllowedError') {
          handleCallError('Microphone access denied. Please allow microphone access to accept calls.');
        } else {
          handleCallError('Error connecting call. Please try again.');
        }
      });
  }
  
  /**
   * Rejects an incoming call
   */
  function rejectIncomingCall() {
    if (state.callStatus !== 'ringing') {
      return;
    }
    
    console.log('Rejecting incoming call from:', state.remoteUser.id);
    
    // Clear the auto-reject timeout
    if (state.callTimeoutId) {
      clearTimeout(state.callTimeoutId);
      state.callTimeoutId = null;
    }
    
    // Stop ringtone
    if (state.ringtoneAudio) {
      state.ringtoneAudio.pause();
      state.ringtoneAudio.currentTime = 0;
    }
    
    // Send rejection to caller
    SocketEvents.endCall({
      target_id: state.remoteUser.id,
      reason: 'rejected'
    });
    
    // Update UI
    UIController.appendMessage(`Call from ${state.remoteUser.name} rejected`, 'system');
    resetCallState();
  }
  
  /**
   * Handles a remote user answering our call
   * 
   * @param {Object} data - Call answer data
   */
  function handleCallAnswered(data) {
    console.log('Call was answered:', data);
    
    if (state.callStatus !== 'calling' || !state.peerConnection) {
      console.error('No outgoing call in progress');
      return;
    }
    
    // Update remote user name if provided
    if (data.callee_username) {
      state.remoteUser.name = data.callee_username;
    }
    
    try {
      // Set the remote description (their answer)
      state.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp_answer))
        .then(() => {
          console.log('Remote description set successfully');
          
          // Update call status
          state.callStatus = 'connected';
          updateCallUI();
          
          UIController.appendMessage(`Connected with ${state.remoteUser.name}`, 'system');
        })
        .catch(error => {
          console.error('Error setting remote description:', error);
          handleCallError('Error establishing call connection. Please try again.');
        });
    } catch (e) {
      console.error('Error processing call answer:', e);
      handleCallError('Error establishing call connection. Please try again.');
    }
  }
  
  /**
   * Handles ICE candidates from the remote peer
   * 
   * @param {Object} data - ICE candidate data
   */
  function handleIceCandidate(data) {
    if (!state.peerConnection) return;
    
    try {
      state.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(error => console.error('Error adding ICE candidate:', error));
    } catch (e) {
      console.error('Error processing ICE candidate:', e);
    }
  }
  
  /**
   * Handles the remote user ending the call
   * 
   * @param {Object} data - Call end data
   */
  function handleCallEnded(data) {
    console.log('Remote user ended the call:', data);
    
    // Stop ringtone in case call was ended while ringing
    if (state.ringtoneAudio) {
      state.ringtoneAudio.pause();
      state.ringtoneAudio.currentTime = 0;
    }
    
    // Clear the auto-reject timeout
    if (state.callTimeoutId) {
      clearTimeout(state.callTimeoutId);
      state.callTimeoutId = null;
    }
    
    // Determine appropriate message based on reason
    let message = '';
    
    switch (data.reason) {
      case 'busy':
        message = `${state.remoteUser.name} is busy.`;
        break;
      case 'rejected':
        message = `${state.remoteUser.name} declined the call.`;
        break;
      case 'user_disconnected':
        message = `${state.remoteUser.name} disconnected.`;
        break;
      default:
        if (state.callStatus === 'connected' && state.callDuration > 0) {
          message = `Call ended. Duration: ${formatCallDuration(state.callDuration)}`;
        } else {
          message = `Call ended by ${state.remoteUser.name}.`;
        }
    }
    
    UIController.appendMessage(message, 'system');
    
    // Clean up call without sending end call event (the other party already ended it)
    endCallCleanup(false);
  }
  
  /**
   * Ends the current call
   */
  function endCall() {
    console.log('Ending call');
    
    if (state.callStatus === 'idle') {
      return;
    }
    
    // Notify the remote user if necessary
    if (['calling', 'ringing', 'connected'].includes(state.callStatus)) {
      SocketEvents.endCall({
        target_id: state.remoteUser.id,
        reason: 'ended'
      });
    }
    
    endCallCleanup(true);
  }
  
  /**
   * Clean up resources when a call ends
   * 
   * @param {boolean} showDuration - Whether to show call duration message
   */
  function endCallCleanup(showDuration = true) {
    // Capture final call duration
    const finalDuration = state.callDuration;
    
    // Stop ringtone
    if (state.ringtoneAudio) {
      state.ringtoneAudio.pause();
      state.ringtoneAudio.currentTime = 0;
    }
    
    // Clear the call timer
    if (state.callTimer) {
      clearInterval(state.callTimer);
      state.callTimer = null;
    }
    
    // Stop local audio tracks
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
      state.localStream = null;
    }
    
    // Clean up remote audio
    if (state.audioElement) {
      state.audioElement.pause();
      state.audioElement.srcObject = null;
    }
    
    // Close peer connection
    if (state.peerConnection) {
      try {
        state.peerConnection.close();
      } catch (e) {
        console.error('Error closing peer connection:', e);
      }
      state.peerConnection = null;
    }
    
    // Reset call state
    resetCallState();
    
    // Show final duration message if needed
    if (showDuration && finalDuration > 0) {
      UIController.appendMessage(`Call ended. Duration: ${formatCallDuration(finalDuration)}`, 'system');
    }
  }
  
  /**
   * Resets call state to default values
   */
  function resetCallState() {
    state.callStatus = 'idle';
    state.callDirection = null;
    state.remoteUser = { id: null, name: null };
    state.callDuration = 0;
    state.callStartTime = null;
    state.pendingRemoteOffer = null;
    state.reconnectAttempts = 0;
    state.isMuted = false;
    
    // Update UI
    updateCallUI();
  }
  
  /**
   * Updates the call UI based on current call state
   */
  function updateCallUI() {
    const muteBtn = document.getElementById('muteCallButton');
    
    // Update UI controller
    switch (state.callStatus) {
      case 'idle':
        UIController.updateCallInterface('idle');
        if (muteBtn) muteBtn.style.display = 'none';
        break;
        
      case 'calling':
        UIController.updateCallInterface('calling', { recipient: state.remoteUser.name });
        if (muteBtn) muteBtn.style.display = 'flex';
        break;
        
      case 'ringing':
        UIController.updateCallInterface('incoming', { caller: state.remoteUser.name });
        if (muteBtn) muteBtn.style.display = 'none';
        break;
        
      case 'connected':
        UIController.updateCallInterface('connected', { recipient: state.remoteUser.name });
        if (muteBtn) muteBtn.style.display = 'flex';
        break;
    }
    
    // Update mute button appearance
    if (muteBtn && state.isMuted) {
      muteBtn.classList.add('muted');
    } else if (muteBtn) {
      muteBtn.classList.remove('muted');
    }
  }
  
  /**
   * Toggles mute state of local audio
   */
  function toggleMute() {
    if (!state.localStream) return;
    
    const audioTracks = state.localStream.getAudioTracks();
    state.isMuted = !state.isMuted;
    
    audioTracks.forEach(track => {
      track.enabled = !state.isMuted;
    });
    
    // Update UI
    const muteBtn = document.getElementById('muteCallButton');
    if (muteBtn) {
      if (state.isMuted) {
        muteBtn.classList.add('muted');
        UIController.appendMessage('Your microphone is now muted', 'system');
      } else {
        muteBtn.classList.remove('muted');
        UIController.appendMessage('Your microphone is now unmuted', 'system');
      }
    }
  }
  
  /**
   * Starts the call timer
   */
  function startCallTimer() {
    state.callStartTime = new Date();
    state.callDuration = 0;
    
    UIController.updateCallTimer(0);
    
    state.callTimer = setInterval(() => {
      state.callDuration++;
      UIController.updateCallTimer(state.callDuration);
      
      // Add checkpoints for long calls
      if (state.callDuration === 60) { // 1 minute
        UIController.appendMessage('Call in progress (1 minute)', 'system');
      } else if (state.callDuration === 300) { // 5 minutes
        UIController.appendMessage('Call in progress (5 minutes)', 'system');
      } else if (state.callDuration % 600 === 0) { // Every 10 minutes
        UIController.appendMessage(`Call in progress (${state.callDuration / 60} minutes)`, 'system');
      }
    }, 1000);
  }
  
  /**
   * Formats call duration in MM:SS format
   * 
   * @param {number} seconds - Call duration in seconds
   * @return {string} - Formatted duration string
   */
  function formatCallDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Handles call errors and updates UI
   * 
   * @param {string} message - Error message
   */
  function handleCallError(message) {
    UIController.appendMessage(message, 'system');
    endCallCleanup(false);
  }
  
  // Public API
  return {
    init,
    showCallModal,
    handleIncomingCall,
    handleCallAnswered,
    handleIceCandidate,
    handleCallEnded,
    endCall,
    toggleMute
  };
})();

// Initialize when loaded
document.addEventListener('DOMContentLoaded', function() {
  if (typeof CallHandler !== 'undefined' && CallHandler.init) {
    CallHandler.init();
  }
});

// Global fallback for inline HTML call button
function showCallInput() {
  if (typeof CallHandler !== 'undefined' && CallHandler.showCallModal) {
    CallHandler.showCallModal();
  } else {
    const calleeId = prompt('Enter the ID of the user you want to call:');
    if (calleeId && calleeId.trim()) {
      alert('Call functionality is not fully loaded. Please refresh the page and try again.');
    }
  }
} 