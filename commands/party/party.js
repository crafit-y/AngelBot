const {
  ApplicationCommandOptionType,
  Colors,
  PermissionFlagsBits,
} = require("discord.js");
const {
  moveUsersToTheVoiceChannel,
} = require("../../functions/party/MoveUsers.js");
const {
  getTheTeamOfTheUser,
} = require("../../functions/party/getTheTeamOfTheUser.js");
const {
  disconnectAllUsers,
} = require("../../functions/party/disconnectAllUsers");
const ValorantAccount = require("../../schemas/AccountSchema");
const { updateUsersTeam } = require("../../functions/party/updateUsersTeam.js");
const { getAllTheTeam } = require("../../functions/party/getAllTheTeam");
const { partyManager } = require("../../functions/fs/PartyManager.js");
const { createEmbed } = require("../../functions/all/Embeds.js");
const { liveManager } = require("../../functions/fs/LiveManager.js");
const { teamManager } = require("../../functions/fs/TeamManager.js");
const { PlayASound } = require("../../functions/all/PlayASound.js");
const { Webhook } = require("../../functions/all/WebHooks.js");
const UserManager = require("../../functions/utils/UserManager.js");

const emojis = require("../../utils/emojis.json");
const IDS = require("../../utils/ids.json");
const ValorantAPIClient = require("../../functions/api/valorant-api");
const valorantAPI = new ValorantAPIClient(process.env.HENRIK_API_KEY);

async function Notify(client, logChannel, member, message) {
  await Webhook.send(
    logChannel,
    "Party",
    client.user.displayAvatarURL(),
    null,
    [await createEmbed.log(member, message)]
  );
}

async function NoPartyCreated(interaction) {
  await interaction.editReply({
    embeds: [
      await createEmbed.embed(
        `${emojis.error} The party is not created, you can't modify it!`,
        Colors.Red
      ),
    ],
  });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function moveUsersToTeamVoiceChannels(client, teams, channelIDs) {
  const actions = [];
  actions.push(`### ${emojis.info} | LOGS - Team movements`);
  for (let i = 0; i < teams.length; i++) {
    await delay(1000); // Delay before moving users to avoid rate limits
    actions.push(
      await moveUsersToTheVoiceChannel(
        client,
        teams[i],
        channelIDs[i],
        `${i + 1}`
      )
    );
  }
  return actions.join("\n").replaceAll(",", "");
}

async function fetchValorantAccount(puuid) {
  for (let i = 0; i < 3; i++) {
    // Tentatives jusqu'à 3 fois
    try {
      const response = await valorantAPI.getAccount({ name: "Crafity", tag: "007" });
      if (response.status === 200) return response; // Succès
      console.error(`Tentative ${i + 1}: Échec avec statut ${response.status}`);
    } catch (error) {
      console.error(`Tentative ${i + 1}: Erreur lors de la requête API`, error);
    }
    await delay(2000); // Attendre 2 secondes avant de réessayer
  }
  return null; // Retourner null après 3 échecs
}

module.exports = {
  name: "party",
  description: "create, start, end and stop a party",
  permissions: [PermissionFlagsBits.Administrator],
  options: [
    {
      name: "create",
      description: "Create a new party",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "start",
      description: "Start the party",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "update_teams",
      description: "Update the teams",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "team",
          description: "Select the team to update",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Team 1", value: "1" },
            { name: "Team 2", value: "2" },
          ],
        },
        ...Array.from({ length: 5 }, (_, i) => ({
          name: `member${i + 1}`,
          description: "Select the member to add to the team",
          type: ApplicationCommandOptionType.User,
          required: true,
        })),
      ],
    },
    {
      name: "get_team",
      description: "Update one user in the team",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "team",
          description: "Select the team to update",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Team 1", value: "1" },
            { name: "Team 2", value: "2" },
          ],
        },
      ],
    },
    {
      name: "get_user",
      description: "To find out which team you're in",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "Select the user to check your team",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
    {
      name: "rename_team",
      description: "To find out which team you're in",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "team",
          description: "Select the team to update",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Team 1", value: "1" },
            { name: "Team 2", value: "2" },
          ],
        },
      ],
    },
    {
      name: "end",
      description: "End the party",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "winner",
          description: "Set the winner of this party",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: "Team 1", value: "1" },
            { name: "Team 2", value: "2" },
            { name: "Draw (add 1 win for all)", value: "3" },
            { name: "Null (does not count)", value: "4" },
          ],
        },
      ],
    },
    {
      name: "delete",
      description: "Delete the party",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "disconnect_all_users",
          description:
            "Choose whether users will be logged out when the party is deleted",
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: "yes", value: "yes" },
            { name: "no", value: "no" },
          ],
        },
      ],
    },
  ],
  async run(client, interaction) {
    const action = interaction.options.getSubcommand();
    const team = interaction.options.getString("team");
    const member = interaction.options.getMember("user");
    const winner = interaction.options.getString("winner");

    const isOnLive = await liveManager.getStatus();
    const party = await partyManager.getStatus();
    const guild = await client.guilds.cache.get(IDS.OTHER_IDS.GUILD);
    const category = await guild.channels.cache.get(IDS.CHANNELS.CATEGORY);
    const endChannel = await guild.channels.cache.get(IDS.CHANNELS.END);
    const logChannel = await guild.channels.cache.get(IDS.CHANNELS.LOG);
    const usersTeam1 = await teamManager.getTeamMembers("team1");
    const usersTeam2 = await teamManager.getTeamMembers("team2");
    const allTeam = await getAllTheTeam("all");

    await interaction.deferReply();

    switch (action.toLowerCase()) {
      case "create":
        if (!party) {
          await PlayASound.anExistingFile(client, "GameStart").catch(() => {});
          await partyManager.setCreated(true);
          await liveManager.setStatus(false);
          await category.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, {
            ViewChannel: true,
          });
          await category.setPosition(1);
          await endChannel.permissionOverwrites.edit(
            IDS.OTHER_IDS.MEMBER_ROLE,
            { ViewChannel: true }
          );
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.success} Party created successfully!\nYou can now add players to different teams`
              ),
            ],
          });
          await Notify(
            client,
            logChannel,
            interaction.member,
            `### ${emojis.info} | LOGS - System\nParty created!`
          );
        } else {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is already created!`,
                Colors.Red
              ),
            ],
          });
        }
        break;

      case "start":
        if (!party) {
          return await NoPartyCreated(interaction);
        } else if (!isOnLive && party) {
          await PlayASound.anExistingFile(client, "GameStart").catch(() => {});
          await liveManager.setStatus(true);
          await delay(5000); // Delay before starting party
          await Notify(
            client,
            logChannel,
            interaction.member,
            `### ${emojis.info} | LOGS - System\nParty started!`
          );
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Party is starting...`,
                Colors.Gold
              ),
            ],
          });
          await PlayASound.anExistingFile(client, "TeamsAreMoving").catch(
            () => {}
          );
          const teamActions = await moveUsersToTeamVoiceChannels(
            client,
            [usersTeam1, usersTeam2],
            [IDS.CHANNELS.TEAM1, IDS.CHANNELS.TEAM2]
          );
          await Notify(client, logChannel, interaction.member, teamActions);
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(`${emojis.success} Party is started`),
            ],
          });
        } else {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is already on live!`,
                Colors.Red
              ),
            ],
          });
        }
        break;

      case "update_teams":
        if (!party) {
          return await NoPartyCreated(interaction);
        } else {
          try {
            if (!(await teamManager.fileExists())) {
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
            await interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  `${emojis.success} Team${team} users\nSuccessfully updated!`
                ),
              ],
            });
            await Notify(
              client,
              logChannel,
              interaction.member,
              `### ${
                emojis.info
              } | LOGS - Team${team} Users updated\nAdded to team ${
                emojis.arrow
              } <@${newMembers.join(">\nAdded to team ${emojis.arrow} <@")}>`
            );
          } catch (error) {
            console.error("Error updating teams:", error);
          }
        }
        break;

      case "end":
        if (!party) {
          return await NoPartyCreated(interaction);
        } else if (isOnLive && party) {
          await PlayASound.anExistingFile(client, "GameEnd").catch(() => {});
          await liveManager.setStatus(false);
          let winningTeam, losingTeam, SayingTeam;
          if (winner >= "1" && winner <= "2") {
            winningTeam = winner === "1" ? usersTeam1 : usersTeam2;
            losingTeam = winner === "1" ? usersTeam2 : usersTeam1;
            SayingTeam = winner === "1" ? "WinTeam1" : "WinTeam2";
          } else if (winner === "3") {
            winningTeam = allTeam;
            losingTeam = [];
            SayingTeam = "WinDraw";
          } else {
            winningTeam = [];
            losingTeam = [];
            SayingTeam = "MatchNull";
          }
          const winName = SayingTeam.replaceAll("Win", "").replaceAll(
            "MatchNull",
            "Match Null"
          );
          await Notify(
            client,
            logChannel,
            interaction.member,
            `### ${emojis.info} | LOGS - System\nParty ended!\nWinner ${emojis.arrow} **${winName}**`
          );
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.loading} Party is ending...`,
                Colors.Gold
              ),
            ],
          });
          const teamActions = await moveUsersToTeamVoiceChannels(
            client,
            [usersTeam1, usersTeam2],
            [IDS.CHANNELS.END, IDS.CHANNELS.END]
          );
          await Notify(client, logChannel, interaction.member, teamActions);
          await leaderBoard.updateTeamStats(winningTeam, losingTeam);
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(`${emojis.success} Party is ended`),
            ],
          });
          await delay(5500);
          await PlayASound.anExistingFile(client, SayingTeam).catch(() => {});
        } else {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is not on live!`,
                Colors.Red
              ),
            ],
          });
        }
        break;

      case "delete":
        if (isOnLive) {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is on live!\nMake sure to end the party on live!`,
                Colors.Red
              ),
            ],
          });
        } else if (party && !isOnLive) {
          const disconnect_all_users = interaction.options.getString(
            "disconnect_all_users"
          );
          await partyManager.setCreated(false);
          await liveManager.setStatus(false);
          await category.permissionOverwrites.edit(IDS.OTHER_IDS.MEMBER_ROLE, {
            ViewChannel: false,
          });
          await category.setPosition(4);
          await endChannel.permissionOverwrites.edit(
            IDS.OTHER_IDS.MEMBER_ROLE,
            { ViewChannel: false }
          );
          if (disconnect_all_users === "yes") {
            disconnectAllUsers(client, interaction, IDS.CHANNELS, allTeam);
          }
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(`${emojis.success} Party deleted!`),
            ],
          });
          await Notify(
            client,
            logChannel,
            interaction.member,
            `### ${emojis.info} | LOGS - System\nParty deleted!`
          );
        } else {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is not created`,
                Colors.Red
              ),
            ],
          });
        }
        break;

      case "get_user":
        if (!party) {
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} The party is not created, you can't check it!`,
                Colors.Red
              ),
            ],
          });
        } else {
          const team = await getTheTeamOfTheUser(member);
          if (team === "0") {
            await interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  `${emojis.success} ${member} is currently in the team 1 and 2\nThe user can't join two teams in same time, please modify it!`,
                  Colors.Gold
                ),
              ],
            });
          } else if (team === "1" || team === "2") {
            await interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  `${emojis.success} ${member} is currently in the **Team ${team}**`
                ),
              ],
            });
          } else {
            await interaction.editReply({
              embeds: [
                await createEmbed.embed(
                  `${emojis.error} ${member} is not on the list of participants!`,
                  Colors.Red
                ),
              ],
            });
          }
        }
        break;

      case "get_team":
        if (!party) {
          return await NoPartyCreated(interaction);
        } else {
          await updateUsersTeam(client, interaction, team);
        }
        break;

      case "rename_team":
        if (!party) {
          console.log("Aucune party n'a été créée.");
          return await NoPartyCreated(interaction);
        } else {
          console.log("Party détectée, début du traitement.");
          let actions = [];
          const teamStr = await getAllTheTeam(team);
          const uniqueUsers = new Set(teamStr); // Éviter les traitements redondants
          console.log(
            "Membres de l'équipe récupérés et filtrés pour l'unicité:",
            Array.from(uniqueUsers)
          );

          // Création d'une instance unique de UserManager
          const userManager = new UserManager();
          console.log("Instance de UserManager créée.");

          // Changement des pseudos en utilisant ValorantAPI et discord.js
          for (const user of uniqueUsers) {
            console.log(`Traitement de l'utilisateur ${user}.`);
            await delay(1000); // Délai pour éviter le rate limiting
            try {
              const accounts = await ValorantAccount.find({ discordId: user });
              console.log(
                `Comptes trouvés pour l'utilisateur ${user}:`,
                accounts
              );
              if (accounts.length > 0) {
                const member = await guild.members.fetch(user);
                console.log(
                  `Membre Discord récupéré pour l'utilisateur ${user}: ${member.displayName}`
                );
                const newName = await fetchValorantAccount(
                  accounts[0].valorantAccount
                );
                if (newName) {
                  await userManager.changeNickname(member, newName);
                  console.log(
                    `Pseudo changé pour ${member.displayName} à ${newName}`
                  );
                } else {
                  console.log(
                    `Impossible de récupérer un nouveau nom pour ${user} après plusieurs tentatives.`
                  );
                }
              }
            } catch (error) {
              console.error(
                `Erreur lors de la modification du pseudo pour l'utilisateur ${user}:`,
                error
              );
            }
          }

          // Réinitialisation des pseudos
          console.log(
            "Début de la réinitialisation des pseudos après 10 secondes de délai."
          );
          await delay(10000); // Délai global avant de réinitialiser
          for (const user of uniqueUsers) {
            console.log(
              `Réinitialisation du pseudo pour l'utilisateur ${user}.`
            );
            await delay(1000);
            try {
              const member = await guild.members.fetch(user);
              await userManager.resetNicknames(member);
              console.log(`Pseudo réinitialisé pour ${member.displayName}`);
            } catch (error) {
              console.error(
                `Erreur lors de la réinitialisation du pseudo pour l'utilisateur ${user}:`,
                error
              );
            }
          }
        }
        break;
    }
  },
};
