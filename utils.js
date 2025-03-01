/**
 * Utilities Module
 * Contains helper functions used throughout the application
 */

const Utils = (function() {
  
  /**
   * Creates a throttled function that only invokes the provided function at most once per specified interval
   * 
   * @param {Function} func - The function to throttle
   * @param {number} limit - The time limit in milliseconds
   * @return {Function} - Throttled function
   */
  function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * Creates a debounced function that delays invoking the provided function until after
   * the specified wait time has elapsed since the last time it was invoked
   * 
   * @param {Function} func - The function to debounce
   * @param {number} wait - The wait time in milliseconds
   * @return {Function} - Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }
  
  /**
   * Formats a timestamp into a human-readable format
   * 
   * @param {Date|number} timestamp - The timestamp to format
   * @param {boolean} includeTime - Whether to include the time in the formatted string
   * @return {string} - Formatted timestamp
   */
  function formatTimestamp(timestamp, includeTime = true) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now - 86400000).toDateString() === date.toDateString();
    
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const time = date.toLocaleTimeString([], timeOptions);
    
    if (isToday) {
      return includeTime ? `Today, ${time}` : 'Today';
    } else if (isYesterday) {
      return includeTime ? `Yesterday, ${time}` : 'Yesterday';
    } else {
      const dateOptions = { month: 'short', day: 'numeric' };
      const formattedDate = date.toLocaleDateString([], dateOptions);
      return includeTime ? `${formattedDate}, ${time}` : formattedDate;
    }
  }
  
  /**
   * Formats seconds into MM:SS format
   * 
   * @param {number} seconds - Number of seconds
   * @return {string} - Formatted time string
   */
  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  
  /**
   * Sanitizes HTML input to prevent XSS attacks
   * 
   * @param {string} html - The HTML string to sanitize
   * @return {string} - Sanitized HTML string
   */
  function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }
  
  /**
   * Generates a unique ID
   * 
   * @return {string} - Unique ID
   */
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Saves data to localStorage
   * 
   * @param {string} key - The key to store the data under
   * @param {*} data - The data to store
   */
  function saveToStorage(key, data) {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  /**
   * Retrieves data from localStorage
   * 
   * @param {string} key - The key to retrieve data from
   * @param {*} defaultValue - Default value to return if key doesn't exist
   * @return {*} - Retrieved data or default value
   */
  function getFromStorage(key, defaultValue = null) {
    try {
      const serializedData = localStorage.getItem(key);
      if (serializedData === null) {
        return defaultValue;
      }
      return JSON.parse(serializedData);
    } catch (error) {
      console.error('Error retrieving from localStorage:', error);
      return defaultValue;
    }
  }
  
  /**
   * Detects if the user's device is iOS
   * 
   * @return {boolean} - True if the device is iOS, false otherwise
   */
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  
  /**
   * Detects if the user is on a mobile device
   * 
   * @return {boolean} - True if the device is mobile, false otherwise
   */
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }
  
  /**
   * Detects if the browser supports dark mode
   * 
   * @return {boolean} - True if dark mode is preferred, false otherwise
   */
  function prefersDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  /**
   * Sets event listeners for the dark mode preference
   * 
   * @param {Function} callback - Function to call when preference changes
   */
  function watchDarkModePreference(callback) {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', callback);
      } 
      // Older implementation
      else if (mediaQuery.addListener) {
        mediaQuery.addListener(callback);
      }
    }
  }
  
  /**
   * Creates an element with specified attributes and children
   * 
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {Array|string|Node} children - Child elements or text content
   * @return {HTMLElement} - Created element
   */
  function createElement(tag, attributes = {}, children = null) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Add children
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (child) {
            if (typeof child === 'string') {
              element.appendChild(document.createTextNode(child));
            } else {
              element.appendChild(child);
            }
          }
        });
      } else if (typeof children === 'string') {
        element.textContent = children;
      } else {
        element.appendChild(children);
      }
    }
    
    return element;
  }

  // Public API
  return {
    throttle,
    debounce,
    formatTimestamp,
    formatDuration,
    sanitizeHTML,
    generateUniqueId,
    saveToStorage,
    getFromStorage,
    isIOS,
    isMobile,
    prefersDarkMode,
    watchDarkModePreference,
    createElement
  };
})(); 