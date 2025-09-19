const userStates = {};

const initializeState = () => {
  // Reset state on server restart
  Object.keys(userStates).forEach(key => delete userStates[key]);
};

const getUserState = (chatId) => {
  return userStates[chatId] || {};
};

const updateUserState = (chatId, newState) => {
  userStates[chatId] = { ...getUserState(chatId), ...newState };
};

module.exports = {
  initializeState,
  getUserState,
  updateUserState
};
