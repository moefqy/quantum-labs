// QUANTUM LABS — Event Bus
// Simple Pub/Sub event bus for decoupling components.

const events = {};

export const EventBus = {
  // Subscribe to an event
  // eventName
  // callback
  on(eventName, callback) {
    if (!events[eventName]) {
      events[eventName] = [];
    }
    events[eventName].push(callback);
  },

  // Unsubscribe from an event
  // eventName
  // callback
  off(eventName, callback) {
    if (!events[eventName]) {
      return;
    }
    events[eventName] = events[eventName].filter((cb) => cb !== callback);
  },

  // Emit an event with data
  // eventName
  // data
  emit(eventName, data) {
    if (!events[eventName]) {
      return;
    }
    events[eventName].forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event listener for ${eventName}:`, e);
      }
    });
  },
};
