const {
  EmbedBuilder,
  Colors,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  InteractionType,
} = require("discord.js");
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");
const LoopSelectionHandler = require("../../functions/music/loop-selection");

let currentInteraction = false;

module.exports = {
  name: "queuelistembed-loop",
  permissions: [],
  async run(client, interaction) {
    const loopHandler = new LoopSelectionHandler();
    loopHandler.handleLoopSelection(client, interaction);
  },
};
