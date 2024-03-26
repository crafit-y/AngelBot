const { CensoredLink } = require("../../functions/all/CensoredLink");

module.exports = {
  name: 'messageUpdate',
  once: false,
  async execute(client, message) {
    CensoredLink.findAndReplace(client, message);
  }
}
