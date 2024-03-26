const { ApplicationCommandOptionType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require("discord.js");
const { createEmbed } = require("../../functions/all/Embeds");
const emojis = require('../../utils/emojis.json');

const DeleteButtonIds = {
	DeletePinned: 'delete_pinned',
	DeleteOnly: 'delete_only'
};

module.exports = {
	name: 'clear',
	OwnerOnly: false,
	description: 'Delete a specific number of messages from a given channel',
	permissions: [PermissionFlagsBits.ManageMessages],
	options: [
		{
			name: 'channel',
			description: 'Delete a specific number of messages from a channel',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'number',
					description: 'The number of messages to delete',
					type: ApplicationCommandOptionType.Number,
					required: true,
				},
				{
					name: 'channel',
					description: 'The channel to delete messages from',
					type: ApplicationCommandOptionType.Channel,
					required: false,
				},
			]
		},
		{
			name: 'user',
			description: 'Delete a specific number of messages from a user in a channel',
			type: ApplicationCommandOptionType.Subcommand,
			options: [
				{
					name: 'number',
					description: 'The number of messages to delete',
					type: ApplicationCommandOptionType.Number,
					required: true,
				},
				{
					name: 'target',
					description: 'The user whose messages should be deleted',
					type: ApplicationCommandOptionType.User,
					required: true,
				},
				{
					name: 'channel',
					description: 'The channel to delete messages from',
					type: ApplicationCommandOptionType.Channel,
					required: false,
				},
			]
		}
	],
	async run(client, interaction) {
		const { number, user, channel, sb } = extractOptions(interaction);
		await interaction.deferReply({ ephemeral: true });

		if (!isValidNumber(number)) {
			return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} Invalid number, must be between 0 and 100.`, Colors.Red)] });
		}

		try {
			const { messagesToDelete, pinnedMessages } = await fetchMessages(channel, number);

			if (pinnedMessages.size > 0) {
				await handlePinnedMessages(interaction, channel, messagesToDelete, pinnedMessages, sb);
			} else {
				await deleteMessages(channel, messagesToDelete);
				await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.success} Deleted \`${messagesToDelete.size}\` message${messagesToDelete.size > 1 ? "s" : ""} ${sb === "user" ? `from user ${user}` : ""} ${channel != interaction.channel ? `in ${channel}` : ""}`)] });
			}
		} catch (error) {
			console.error(error);
			await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} An error occurred while deleting messages.`, Colors.Red)] });
		}
	}
};

function extractOptions(interaction) {
	const options = interaction.options;
	const number = options.getNumber('number');
	const user = options.getUser('target');
	const channel = options.getChannel('channel') || interaction.channel;
	const sb = options.getSubcommand();
	return { number, user, channel, sb };
}

async function handlePinnedMessages(interaction, channel, messagesToDelete, pinnedMessages, sb) {
	const pinnedMessagesList = Array.from(pinnedMessages.values()).map(msg => msg.url);

	const button1 = new ButtonBuilder()
		.setCustomId(DeleteButtonIds.DeletePinned)
		.setLabel('Delete with pinned')
		.setStyle(ButtonStyle.Danger);
	const button2 = new ButtonBuilder()
		.setCustomId(DeleteButtonIds.DeleteOnly)
		.setLabel('Delete without pinned')
		.setStyle(ButtonStyle.Success);

	await interaction.editReply({
		embeds: [await createEmbed.embed(`${emojis.info} Pinned messages found. Do you want to delete them as well?\n\n**Pinned messages[${pinnedMessages.size}]**\n> [Message link](${pinnedMessagesList.join(')\n> [Message link](')})`, Colors.Orange)],
		components: [new ActionRowBuilder().addComponents(button1, button2)]
	});

	const filter = i => i.isButton();
	const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

	const newRow = new ActionRowBuilder().addComponents(button1.setDisabled(true), button2.setDisabled(true))

	collector.on('collect', async i => {
		await i.deferUpdate();
		if (i.customId === DeleteButtonIds.DeletePinned) {
			await handleDeleteOption(interaction, channel, messagesToDelete.concat(pinnedMessages), sb, newRow);
		} else if (i.customId === DeleteButtonIds.DeleteOnly) {
			await handleDeleteOption(interaction, channel, messagesToDelete, sb, newRow);
		}
		collector.stop();
	});

	collector.on('end', async collected => {
		if (collected.size === 0) {
			await interaction.editReply({
				embeds: [await createEmbed.embed(`${emojis.info} You did not select an option. No messages were deleted.`, Colors.Orange)],
				components: [newRow],
				ephemeral: true
			});
		}
	});
}

async function handleDeleteOption(interaction, channel, messagesToDelete, sb, newRow) {

	await interaction.editReply({
		embeds: [await createEmbed.embed(`${emojis.loading} Deleting messages...`, Colors.Orange)],
		components: [newRow],
	});

	await channel.bulkDelete(messagesToDelete, true);
	await interaction.editReply({
		embeds: [await createEmbed.embed(`${emojis.success} Deleted \`${messagesToDelete}\` message${messagesToDelete > 1 ? "s" : ""} ${sb === "user" ? `from user ${user}` : ""} ${channel != interaction.channel ? `in ${channel}` : ""}`)],
	});
}

async function fetchMessages(channel, number) {
	try {
		const messagesToDelete = await channel.messages.fetch({ limit: number });
		const filteredMessages = messagesToDelete.filter(msg => !msg.pinned);
		const pinnedMessages = messagesToDelete.filter(msg => msg.pinned);
		return { messagesToDelete: filteredMessages, pinnedMessages: pinnedMessages };
	} catch (error) {
		console.error(error);
		throw new Error("An error occurred while fetching messages.");
	}
}

function isValidNumber(number) {
	return number >= 1 && number <= 100;
}
