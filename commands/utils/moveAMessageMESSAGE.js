const { PermissionFlagsBits, ApplicationCommandType } = require('discord.js');
const { MessageTransfer } = require('../../Functions/Utils/messageTransfer');


module.exports = {
  name: 'TransferMessage',
  type: ApplicationCommandType.Message,
  permissions: [PermissionFlagsBits.ManageMessages],
  async run(client, interaction) {

    //CONST ----------------------------------------------------------------
    const sourceMessage = await interaction.targetMessage;

    await interaction.deferReply({ ephemeral: true });

    MessageTransfer.transfer(client, interaction, sourceMessage);

  }
};
