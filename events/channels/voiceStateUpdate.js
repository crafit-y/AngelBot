const Logger = require('../../utils/Logger');
const { handleUserStatus } = require('../../Functions/Party/handleUserStatus');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(client, oldState, newState) {
    if (!oldState.channel && newState.channel) {
      handleUserStatus(client, newState.member, 'reconnect')
    } else if (oldState.channel && !newState.channel) {
      handleUserStatus(client, newState.member, 'disconnect')
    }
  }
}