const { ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const { MessageTransfer } = require('../../Functions/Utils/messageTransfer');

module.exports = {
  name: 'transfer_a_message',
  description: 'Transfer a message to an other channel',
  permissions: [PermissionFlagsBits.ManageMessages],
  options: [
    {
      name: 'id_of_message',
      description: 'The id of the message to transfer',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'channel',
      description: 'The destination channel',
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ],
  async run(client, interaction) {

    //CONST ----------------------------------------------------------------
    const messageID = interaction.options.getString('id_of_message');
    const targetChannel = interaction.options.getChannel('channel');
    const sourceMessage = await interaction.channel.messages.fetch(messageID);

    await interaction.deferReply({ ephemeral: true });

    MessageTransfer.transfer(client, interaction, sourceMessage, targetChannel);

  }
};
