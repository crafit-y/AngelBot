const { ActionRowBuilder, CommandInteraction, StringSelectMenuBuilder, UserSelectMenuBuilder, InteractionCollector, StringSelectMenuOptionBuilder, PermissionFlagsBits, Colors } = require('discord.js');
const { updateUsersTeam } = require('../../Functions/Party/updateUsersTeam.js');
const { getAllTheTeam } = require('../../Functions/Party/getAllTheTeam');
const { teamManager } = require('../../Functions/Fs/TeamManager.js');
const { createEmbed } = require('../../Functions/All/Embeds');

const EMOJIS = require('../../utils/emojis.json');

//const SELECT_USER_CUSTOM_ID = "selecttheusertoreplace";
const USER_CUSTOM_ID = "selecttheusertoreplace-users";

module.exports = {
  name: 'selecttheusertoreplace',
  permissions: [PermissionFlagsBits.Administrator],
  async runInteraction(client, interaction) {
    try {
      const SUPRA_ID = interaction.values[0];
      const userId = SUPRA_ID.substring(2);
      const firstChar = SUPRA_ID[0];
      const firstInt = parseInt(firstChar);

      let team = "<none>";
      const embedDescription = interaction.message.embeds[0].description;
      if (embedDescription.includes("Team 1")) team = "1";
      else if (embedDescription.includes("Team 2")) team = "2";

      // const usersInTeam = await getAllTheTeam(team);

      // const selectMenu = new StringSelectMenuBuilder()
      //   .setCustomId(SELECT_USER_CUSTOM_ID)
      //   .setMinValues(1)
      //   .setMaxValues(1)
      //   .setPlaceholder("Select the user you want to update");

      // let i = 1;
      // for (const userId of usersInTeam) {
      //   const user = await client.users.fetch(userId);
      //   const userName = user.displayName.substring(0, 30);
      //   const option = new StringSelectMenuOptionBuilder()
      //     .setLabel(`User ➔ ${userName}`)
      //     .setValue(`${i}-${userId}`);
      //   selectMenu.addOptions(option);
      //   i++;
      // }

      // const rowInteraction = new ActionRowBuilder()
      //   .addComponents(selectMenu);

      // await interaction.message.edit({ components: [rowInteraction] });

      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(USER_CUSTOM_ID)
        .setPlaceholder('Select a user.')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder()
        .addComponents(userSelect);

      await interaction.reply({ embeds: [await createEmbed.embed(`### By whom do you want to replace <@${userId}> ?\n*You have 1 minute*`)], components: [row], ephemeral: true });

      const filter = i => i.user.id === interaction.user.id;
      const collector = new InteractionCollector(client, { filter, time: 60000 });

      collector.on('collect', async i => {
        const selectedUserId = i.values[0];
        const selectedUser = interaction.guild.members.cache.get(selectedUserId);

        await i.deferUpdate();
        collector.stop();
        userSelect.setDisabled(true);

        if (selectedUser) {
          await teamManager.findAndUpdate(userId, selectedUser.id, team);

          userSelect.setDefaultUsers(selectedUser.id);

          await interaction.editReply({ embeds: [await createEmbed.embed(`You have replaced <@${userId}> by ${selectedUser}`)], components: [row], ephemeral: true });

          await updateUsersTeam(client, interaction, team, true, firstInt);

        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`⚠️ Selected user not found. Please try again.`)], components: [row], ephemeral: true });
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          userSelect.setDisabled(true);
          interaction.editReply({ embeds: [await createEmbed.embed('Time is up. Please try again.', Colors.Red)], components: [row], ephemeral: true });
        }
      });

    } catch (error) {
      // Handle error
    }
  }
};
