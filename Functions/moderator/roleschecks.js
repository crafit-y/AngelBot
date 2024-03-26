const { ChannelSelectMenuBuilder, ActionRowBuilder, InteractionCollector } = require('discord.js');
const { createEmbed } = require('../all/Embeds');
const { WebHookBuilder, Webhook } = require('../all/WebHooks');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

const RolesChecker = {
  async comparePosition(member1, member2) {
    try {
      const rolesMember1 = member1.roles;
      const rolesMember2 = member2.roles;

      // Find the highest role of each member
      const highestRoleMember1 = rolesMember1.highest;
      const highestRoleMember2 = rolesMember2.highest;

      // Compare the roles' positions in the hierarchy using RoleManager.comparePositions()
      return highestRoleMember1.comparePositionTo(highestRoleMember2) > 0;

    } catch (error) {
      console.error(error);
      return false;
    }
  },
};


module.exports = { RolesChecker };
