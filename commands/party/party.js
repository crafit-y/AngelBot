const { ApplicationCommandOptionType, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const { moveUsersToTheVoiceChannel } = require('../../Functions/Party/MoveUsers.js');
const { disconnectAllUsers } = require('../../Functions/Party/disconnectAllUsers');
const { getTheTeamOfTheUser } = require('../../Functions/Party/getTheTeamOfTheUser.js');
const { getAllTheTeam } = require('../../Functions/Party/getAllTheTeam');
const { updateUsersTeam } = require('../../Functions/Party/updateUsersTeam.js');
const { createEmbed } = require('../../Functions/All/Embeds.js');
const { teamManager } = require('../../Functions/Fs/TeamManager.js');
const { liveManager } = require('../../Functions/Fs/LiveManager.js');
const { partyManager } = require('../../Functions/Fs/PartyManager.js');
const { leaderBoard } = require('../../Functions/Fs/leaderBoard.js');

const EMOJIS = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

module.exports = {
  name: 'party',
  description: 'create, start, end and stop a party',
  permissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: 'create',
      description: 'Create a new party',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'start',
      description: 'Start the party',
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: 'update_teams',
      description: 'Update the teams',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'team',
          description: 'Select the team to update',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Team 1', value: '1' },
            { name: 'Team 2', value: '2' }
          ]
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          name: `member${i + 1}`,
          description: 'Select the member to add to the team',
          type: ApplicationCommandOptionType.User,
          required: true,
        }))
      ]
    },
    {
      name: 'get_team',
      description: 'Update one user in the team',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'team',
          description: 'Select the team to update',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Team 1', value: '1' },
            { name: 'Team 2', value: '2' }
          ]
        },
      ]
    },
    {
      name: 'get_user',
      description: 'To find out which team you\'re in',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'user',
          description: 'Select the user to check your team',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ]
    },
    {
      name: 'end',
      description: 'End the party',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'winner',
          description: 'Set the winner of this party',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Team 1', value: '1' },
            { name: 'Team 2', value: '2' },
            { name: 'Draw (add 1 win for all)', value: '3' },
            { name: 'Null (does not count)', value: '4' }
          ]
        },
      ]
    },
    {
      name: 'delete',
      description: 'Delete the party',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'disconnect_all_users',
          description: 'Choose whether users will be logged out when the party is deleted',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'yes', value: 'yes' },
            { name: 'no', value: 'no' }
          ]
        },
      ]
    }
  ],
  async run(client, interaction) {

    //CONST ----------------------------------------------------------------
    const action = interaction.options.getSubcommand();
    const team = interaction.options.getString('team');
    const member = interaction.options.getMember('user');
    const winner = interaction.options.getString('winner');

    const isOnLive = await liveManager.getStatus();
    const party = await partyManager.getStatus();
    const guild = await client.guilds.cache.get(`${IDS.OTHER_IDS.GUILD}`);
    const category = await guild.channels.cache.get(`${IDS.CHANNELS.CATEGORY}`);
    const endChannel = await guild.channels.cache.get(`${IDS.CHANNELS.END}`);
    const logChannel = await guild.channels.cache.get(`${IDS.CHANNELS.LOG}`);

    const usersTeam1 = await teamManager.getTeamMembers('team1');
    const usersTeam2 = await teamManager.getTeamMembers('team2');
    const allTeam = await getAllTheTeam("all");
    //const validUserIds = allTeam.filter(userId => /^\d{17,19}$/.test(userId));

    //REAPLY ----------------------------------------------------------------
    //await interaction.reply({ embeds: [await createEmbed.embed(`${EMOJIS.kjTwerk} Update in progress...`, Colors.Gold)] });
    await interaction.deferReply();

    switch (action.toLowerCase()) {

      //CREATE FUNCTION ----------------------------------------------------------------
      case 'create':
        if (!party) {
          await partyManager.setCreated(true);
          await liveManager.setStatus(false);
          await category.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: true })
          await category.setPosition(1);
          await endChannel.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: true })

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} Party created successfully !\n> You can now add players to differents teams`)] });

          await logChannel.send({ embeds: [await createEmbed.log(interaction.member, `### ${EMOJIS.sagePeek} | LOGS - System\n> Party created !`)] });

        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is already created !`, Colors.Red)] });
        }
        break;

      //START FUNCTION ----------------------------------------------------------------
      case 'start':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created, you can't modify it !`, Colors.Red)] });
        } else if (!isOnLive && party) {
          await liveManager.setStatus(true);

          await logChannel.send({ embeds: [await createEmbed.log(interaction.member, `### ${EMOJIS.sagePeek} | LOGS - System\n> Party started !`)] });

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.kjTwerk} Party is starting...`, Colors.Gold)] });

          await new Promise(resolve => setTimeout(resolve, 1000)).catch(O_o => { console.log(O_o) });
          moveUsersToTheVoiceChannel(client, interaction, usersTeam1, IDS.CHANNELS.TEAM1, "1");
          await new Promise(resolve => setTimeout(resolve, 2500)).catch(O_o => { console.log(O_o) });
          moveUsersToTheVoiceChannel(client, interaction, usersTeam2, IDS.CHANNELS.TEAM2, "2");
          await new Promise(resolve => setTimeout(resolve, 2500)).catch(O_o => { console.log(O_o) });

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} Party is started`)] });

        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is already on live !`, Colors.Red)] });
        }
        break;

      //UPDATE_TEAM ----------------------------------------------------------------
      case 'update_teams':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created, you can't modify it !`, Colors.Red)] });
        } else {
          try {
            if (!await teamManager.fileExists()) {
              await teamManager.createFile();
            }
            const newMembers = [];
            for (let i = 1; i <= 5; i++) {
              const member = interaction.options.getUser(`member${i}`);
              if (member) {
                newMembers.push(member.id);
              }
            }
            await teamManager.updateTeam(`team${team}`, newMembers);
            await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} Team${team} users\n> Successfully updated !`)] });

            await logChannel.send({ embeds: [await createEmbed.log(interaction.member, `### ${EMOJIS.sagePeek} | LOGS - Team${team} Users updated\n> Added to team ➔ <@${newMembers.join(">\n> Added to team ➔ <@")}>`)] });

          } catch (error) {
            console.error('Error updating teams:', error);
          }
        }
        break;

      //END FUNCTION ----------------------------------------------------------------
      case 'end':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created, you can't modify it !`, Colors.Red)] });
        } else if (isOnLive && party) {
          await liveManager.setStatus(false);

          await logChannel.send({ embeds: [await createEmbed.log(interaction.member, `### ${EMOJIS.sagePeek} | LOGS - System\n> Party ended !\n> Winner ➔ **Team${winner}**`)] });

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.kjTwerk} Party is ending...`, Colors.Gold)] });

          await new Promise(resolve => setTimeout(resolve, 1000)).catch(O_o => { console.log(O_o) });
          moveUsersToTheVoiceChannel(client, interaction, usersTeam1, IDS.CHANNELS.END, "1");
          await new Promise(resolve => setTimeout(resolve, 2500)).catch(O_o => { console.log(O_o) });
          moveUsersToTheVoiceChannel(client, interaction, usersTeam2, IDS.CHANNELS.END, "2");
          await new Promise(resolve => setTimeout(resolve, 2500)).catch(O_o => { console.log(O_o) });

          let winningTeam;
          let losingTeam;

          if (winner >= 1 && winner <= 2) {
            winningTeam = winner === '1' ? usersTeam1 : usersTeam2;
            losingTeam = winner === '1' ? usersTeam2 : usersTeam1;
          } else if (winner === 3) { // DRAW
            winningTeam = allTeam;
            losingTeam = [];
          } else { //NULL
            winningTeam = [];
            losingTeam = [];
          }

          await leaderBoard.updateTeamStats(winningTeam, losingTeam);

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} Party is ended`)] });

        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not on live !`, Colors.Red)] });
        }
        break;

      //DELETE FUNCTION ----------------------------------------------------------------
      case 'delete':
        if (isOnLive) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is on live !\n> Make sure to end the party on live !`, Colors.Red)] });
        } else if (party && !isOnLive) {
          const disconnect_all_users = interaction.options.getString('disconnect_all_users');
          await partyManager.setCreated(false);
          await liveManager.setStatus(false);

          await category.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: false })
          await category.setPosition(4);
          await endChannel.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: false })

          if (disconnect_all_users === "yes") {

            disconnectAllUsers(client, interaction, IDS.CHANNELS, allTeam);

          }

          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} Party deleted !`)] });
          await logChannel.send({ embeds: [await createEmbed.log(interaction.member, `### ${EMOJIS.sagePeek} | LOGS - System\n> Party deleted !`)] });
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created`, Colors.Red)] });
        }
        break;

      //GET_USER FUNCTION ----------------------------------------------------------------
      case 'get_user':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created, you can't check it !`, Colors.Red)] });
        } else {

          const team = await getTheTeamOfTheUser(member);

          if (team === "0") {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} ${member} is currently in the team 1 and 2\n> The user can't join two teams in same time, please modify it !`, Colors.Gold)] });
          } else if (team === "1" || team === "2") {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageGood} ${member} is currently in the **Team ${team}**`)] });
          } else {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} ${member} is not on the list of participants !`, Colors.Red)] });
          }
        }

        break;

      //GET_TEAM FUNCTION ----------------------------------------------------------------
      case 'get_team':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${EMOJIS.sageCry} The party is not created, you can't modify it !`, Colors.Red)] });
        } else {

          await updateUsersTeam(client, interaction, team)

        }
        break;

    }
  }
};
