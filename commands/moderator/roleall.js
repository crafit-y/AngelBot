const { ApplicationCommandOptionType, Colors, PermissionFlagsBits } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require("../../utils/emojis.json");

const BATCH_SIZE = 10;
const ESTIMATED_TIME_PER_MEMBER = 1; // in seconds

const millisToMinutesAndSeconds = (millis) => {
  const minutes = Math.floor(millis / 60000);
  const seconds = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const updateEmbed = async (interaction, action, role, actionsPerformed, totalMembers, estimatedTimestamp, timeTimestamp) => {
  await interaction.editReply({
    embeds: [
      await createEmbed.embed(
        `**${emojis.loading} ${action === 'add' ? 'Adding' : 'Removing'} role ${role} in progress...**\n` +
        `> ${emojis.teams} - Current progress: \`${actionsPerformed}/${totalMembers}\`\n` +
        `> ${emojis.time} - Estimated time: <t:${estimatedTimestamp}:R>\n` +
        `> ${emojis.crono} - The operation started: <t:${timeTimestamp}:R>`,
        Colors.Orange
      )
    ]
  });
};

async function processMembersInBatches(membersArray, role, action, interaction, estimatedTimestamp, timeTimestamp) {
  const totalMembers = membersArray.length;
  let actionsPerformed = 0;

  await updateEmbed(interaction, action, role, actionsPerformed, totalMembers, estimatedTimestamp, timeTimestamp);

  for (const member of membersArray) {
    try {
      if ((action === 'add' && !member.roles.cache.has(role.id)) || (action === 'remove' && member.roles.cache.has(role.id))) {
        await member.roles[action](role);
        actionsPerformed++;
      }
    } catch (error) {
      interaction.followUp({
        embeds: [
          await createEmbed.embed(`${emojis.error} I can't ${action === 'add' ? 'add' : 'remove'} role ${role} to member ${member.user} (${member.user.username})\nReason:\`${error.message}\``, Colors.Red)
        ]
      })
    }

    if (actionsPerformed % BATCH_SIZE === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between each batch
      await updateEmbed(interaction, action, role, actionsPerformed, totalMembers, estimatedTimestamp, timeTimestamp);
    }
  }
}

module.exports = {
  name: 'role',
  OwnerOnly: false,
  description: 'Add or remove a role to all members of the server',
  permissions: [PermissionFlagsBits.ManageRoles],
  options: [
    {
      name: 'all',
      description: 'Add or remove a role to/from all members',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action',
          description: 'The action to be performed',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' }
          ]
        },
        {
          name: 'role',
          description: 'Role to add or remove',
          type: ApplicationCommandOptionType.Role,
          required: true,
        },
        {
          name: 'type',
          description: 'Select the target type to be performed',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'All (Users & Bots)', value: 'all' },
            { name: 'Users only', value: 'users' },
            { name: 'Bots only', value: 'bots' },
          ]
        },
      ]
    },
    {
      name: 'member',
      description: 'Add or remove a role to/from a specific member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action',
          description: 'The action to be performed',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' }
          ]
        },
        {
          name: 'member',
          description: 'The member to be performed',
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: 'role',
          description: 'Role to add or remove',
          type: ApplicationCommandOptionType.Role,
          required: true,
        }
      ]
    }
  ],
  async run(client, interaction) {
    try {
      const subCommand = interaction.options.getSubcommand();

      if (subCommand === 'all') {
        const action = interaction.options.getString('action');
        const role = interaction.options.getRole('role');
        const type = interaction.options.getString('type');

        await interaction.deferReply();

        if (!role || role.name === "everyone" || role.name === "here") {
          return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} Please mention a valid role.`, Colors.Red)] });
        }

        if (interaction.guild.members.me.roles.highest.comparePositionTo(role) < 0) {
          return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} My role is lower than the specified role.`, Colors.Red)] });
        }

        let membersWithRole = interaction.guild.members.cache;

        if (type === 'users') {
          membersWithRole = membersWithRole.filter(member => !member.user.bot);
        } else if (type === 'bots') {
          membersWithRole = membersWithRole.filter(member => member.user.bot);
        }

        if (action === 'remove') {
          membersWithRole = membersWithRole.filter(member => member.roles.cache.has(role.id));
        } else if (action === 'add') {
          membersWithRole = membersWithRole.filter(member => !member.roles.cache.has(role.id));
        }

        if (membersWithRole.size === 0) {
          return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} No members to modify for this role.`, Colors.Red)] });
        }

        const totalBatches = Math.ceil(membersWithRole.size / BATCH_SIZE);
        const estimatedTimeInSeconds = Math.ceil(totalBatches * BATCH_SIZE * ESTIMATED_TIME_PER_MEMBER);
        const startDate = new Date();
        const timeTimestamp = Math.round(startDate.getTime() / 1000);
        const estimatedTimestamp = timeTimestamp + estimatedTimeInSeconds;

        await processMembersInBatches(Array.from(membersWithRole.values()), role, action, interaction, estimatedTimestamp, timeTimestamp);

        const time = membersWithRole.size * 1000;

        await interaction.editReply({
          embeds: [await createEmbed.embed(
            `**${emojis.success} Role has been ${action === 'add' ? 'added' : 'removed'}**\n` +
            `> ${emojis.role} - Role: ${role}\n` +
            `> ${emojis.teams} - From: \`${membersWithRole.size}\` member${membersWithRole.size > 1 ? "s" : ""}\n` +
            `> ${emojis.type} - Type: ${type === "all" ? "For all users & bots" : ""}${type === "users" ? "For all users only" : ""}${type === "bots" ? "For all bots only" : ""}\n` +
            `> ${emojis.time} - The operation took: \`${millisToMinutesAndSeconds(time)}\``
          )]
        });
      } else if (subCommand === 'member') {
        const action = interaction.options.getString('action');
        const member = interaction.options.getMember('member');
        const role = interaction.options.getRole('role');

        await interaction.deferReply();

        if (!role || role.name === "everyone" || role.name === "here") {
          return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} Please mention a valid role.`, Colors.Red)] });
        }

        if (interaction.guild.members.me.roles.highest.comparePositionTo(role) < 0) {
          return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} My role is lower than the specified role.`, Colors.Red)] });
        }

        let memberHasRole = member.roles.cache.has(role.id);

        if ((action === 'add' && !memberHasRole) || (action === 'remove' && memberHasRole)) {
          await member.roles[action](role);
          await interaction.editReply({ embeds: [await createEmbed.embed(`**${emojis.success} Role ${role} ${action === 'add' ? 'added' : 'removed'} to member ${member}**`)] });
        } else {
          await interaction.editReply({ embeds: [await createEmbed.embed(`**${emojis.error} The member ${member} ${action === 'add' ? 'already has' : "doesn't have"} the role ${role}**`, Colors.Red)] });
        }
      }
    } catch (error) {
      console.error('An error occurred while executing the command:', error);
      await interaction.editReply({ embeds: [await createEmbed.embed(`**${emojis.error} An error occurred while executing the command.**\n\`${error.message}\``, Colors.Red)] });
    }
  }
}
