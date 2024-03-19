const { ApplicationCommandOptionType, Colors, PermissionFlagsBits } = require('discord.js');
const { moveUsersToTheVoiceChannel, disconnectAllUsers, getTheTeamOfTheUser, getAllTheTeam, updateUsersTeam } = require('../../functions/party');
const { createEmbed } = require('../../functions/all/Embeds.js');
const { teamManager, liveManager, partyManager, leaderBoard } = require('../../functions/fs');
const { PlayASound } = require('../../functions/all/PlayASound.js');
const emojis = require('../../utils/emojis.json');
const IDS = require('../../utils/ids.json');

async function setStatusAndNotify(logChannel, member, message) {
  await logChannel.send({ embeds: [await createEmbed.log(member, message)] });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function moveUsersToTeamVoiceChannels(client, teams, channelIDs) {
  const actions = [];
  actions.push(`### ${emojis.info} | LOGS - Team movements`);
  for (let i = 0; i < teams.length; i++) {
    await delay(1000); // Delay before moving users to avoid rate limits
    actions.push(await moveUsersToTheVoiceChannel(client, teams[i], channelIDs[i], `${i + 1}`));
  }
  return actions.join("\n").replaceAll(",", "");
}

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
    const action = interaction.options.getSubcommand();
    const team = interaction.options.getString('team');
    const member = interaction.options.getMember('user');
    const winner = interaction.options.getString('winner');

    const isOnLive = await liveManager.getStatus();
    const party = await partyManager.getStatus();
    const guild = await client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
    const category = await guild.channels.cache.get(IDS.CHANNELS.CATEGORY);
    const endChannel = await guild.channels.cache.get(IDS.CHANNELS.END);
    const logChannel = await guild.channels.cache.get(IDS.CHANNELS.LOG);
    const usersTeam1 = await teamManager.getTeamMembers('team1');
    const usersTeam2 = await teamManager.getTeamMembers('team2');
    const allTeam = await getAllTheTeam("all");

    await interaction.deferReply();

    switch (action.toLowerCase()) {
      case 'create':
        if (!party) {
          await PlayASound.anExistingFile(client, "GameStart").catch(console.error);
          await partyManager.setCreated(true);
          await liveManager.setStatus(false);
          await category.setPosition(1);
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Party created successfully!\nYou can now add players to different teams`)] });
          await setStatusAndNotify(logChannel, interaction.member, `### ${emojis.info} | LOGS - System\nParty created!`);
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is already created!`, Colors.Red)] });
        }
        break;

      case 'start':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created, you can't modify it!`, Colors.Red)] });
        } else if (!isOnLive && party) {
          await PlayASound.anExistingFile(client, "GameStart").catch(console.error);
          await liveManager.setStatus(true);
          await delay(5000); // Delay before starting party
          await setStatusAndNotify(logChannel, interaction.member, `### ${emojis.info} | LOGS - System\nParty started!`);
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Party is starting...`, Colors.Gold)] });
          await PlayASound.anExistingFile(client, "TeamsAreMoving").catch(console.error);
          const teamActions = await moveUsersToTeamVoiceChannels(client, [usersTeam1, usersTeam2], [IDS.CHANNELS.TEAM1, IDS.CHANNELS.TEAM2]);
          await setStatusAndNotify(logChannel, interaction.member, teamActions);
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Party is started`)] });
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is already on live!`, Colors.Red)] });
        }
        break;

      case 'update_teams':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created, you can't modify it!`, Colors.Red)] });
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
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Team${team} users\nSuccessfully updated!`)] });
            await setStatusAndNotify(logChannel, interaction.member, `### ${emojis.info} | LOGS - Team${team} Users updated\nAdded to team ➔ <@${newMembers.join(">\nAdded to team ➔ <@")}>`);
          } catch (error) {
            console.error('Error updating teams:', error);
          }
        }
        break;

      case 'end':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created, you can't modify it!`, Colors.Red)] });
        } else if (isOnLive && party) {
          await PlayASound.anExistingFile(client, "GameEnd").catch(console.error);
          await liveManager.setStatus(false);
          let winningTeam, losingTeam, SayingTeam;
          if (winner >= "1" && winner <= "2") {
            winningTeam = winner === '1' ? usersTeam1 : usersTeam2;
            losingTeam = winner === '1' ? usersTeam2 : usersTeam1;
            SayingTeam = winner === '1' ? "WinTeam1" : "WinTeam2";
          } else if (winner === "3") {
            winningTeam = allTeam;
            losingTeam = [];
            SayingTeam = "WinDraw";
          } else {
            winningTeam = [];
            losingTeam = [];
            SayingTeam = "MatchNull";
          }
          const winName = SayingTeam.replaceAll("Win", "").replaceAll("MatchNull", "Match Null");
          await setStatusAndNotify(logChannel, interaction.member, `### ${emojis.info} | LOGS - System\nParty ended!\nWinner ➔ **${winName}**`);
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Party is ending...`, Colors.Gold)] });
          const teamActions = await moveUsersToTeamVoiceChannels(client, [usersTeam1, usersTeam2], [IDS.CHANNELS.END, IDS.CHANNELS.END]);
          await setStatusAndNotify(logChannel, interaction.member, teamActions);
          await leaderBoard.updateTeamStats(winningTeam, losingTeam);
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Party is ended`)] });
          await delay(5500);
          await PlayASound.anExistingFile(client, SayingTeam).catch(console.error);
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not on live!`, Colors.Red)] });
        }
        break;

      case 'delete':
        if (isOnLive) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is on live!\nMake sure to end the party on live!`, Colors.Red)] });
        } else if (party && !isOnLive) {
          const disconnect_all_users = interaction.options.getString('disconnect_all_users');
          await partyManager.setCreated(false);
          await liveManager.setStatus(false);
          await category.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: false });
          await category.setPosition(4);
          await endChannel.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, { ViewChannel: false });
          if (disconnect_all_users === "yes") {
            disconnectAllUsers(client, interaction, IDS.CHANNELS, allTeam);
          }
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Party deleted!`)] });
          await setStatusAndNotify(logChannel, interaction.member, `### ${emojis.info} | LOGS - System\nParty deleted!`);
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created`, Colors.Red)] });
        }
        break;

      case 'get_user':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created, you can't check it!`, Colors.Red)] });
        } else {
          const team = await getTheTeamOfTheUser(member);
          if (team === "0") {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} ${member} is currently in the team 1 and 2\nThe user can't join two teams in same time, please modify it!`, Colors.Gold)] });
          } else if (team === "1" || team === "2") {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} ${member} is currently in the **Team ${team}**`)] });
          } else {
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} ${member} is not on the list of participants!`, Colors.Red)] });
          }
        }
        break;

      case 'get_team':
        if (!party) {
          await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The party is not created, you can't modify it!`, Colors.Red)] });
        } else {
          await updateUsersTeam(client, interaction, team);
        }
        break;
    }
  }
};
