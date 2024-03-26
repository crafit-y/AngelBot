const { EmbedBuilder, ApplicationCommandOptionType, Colors } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { useQueue } = require("discord-player");
const { InitializeQueueListEmbed, QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");
const { loopSelection } = require("../../functions/music/loop-selection");
const { DTBM } = require("../../functions/all/DTBM");
const emojis = require("../../utils/emojis.json");
const { PlayASound } = require("../../functions/all/PlayASound");

// Module export
module.exports = {
    name: 'music',
    category: 'music',
    description: 'Manage music-related interactions on voice channels',
    OwnerOnly: false,
    permissions: [],
    options: [
        {
            name: 'play',
            description: 'Play a music track',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'link',
                    description: 'The name/link of a YouTube video or playlist, or a Discord interaction link with an audio attachment',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                }
            ]
        },
        {
            name: 'options',
            description: 'Choose an option for the music',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'selected-option',
                    description: 'Selected option to send to the bot',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'pause/resume', value: 'pause-resume' },
                        { name: 'skip', value: 'skip' },
                        { name: 'back', value: 'back' },
                        { name: 'loop', value: 'loop' },
                        { name: 'stop', value: 'stop' },
                        { name: 'queue-list', value: 'queue-list' }
                    ]
                },
            ]
        },
        {
            name: 'join',
            description: 'Join your current voice channel',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'disconnect',
            description: 'Disconnect from the current voice channel',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    run: async (client, interaction) => {
        const action = interaction.options.getSubcommand();
        const queue = useQueue(interaction.guild.id);
        const channel = interaction.member.voice.channel;
        const choice = interaction.options.getString('selected-option');

        switch (action.toLowerCase()) {
            case "play":
                await interaction.deferReply();
                await handlePlayCommand(client, interaction, channel, queue);
                break;
            case "options":
                await interaction.deferReply({ ephemeral: choice !== "queue-list" });
                await handleOptionsCommand(client, interaction, queue);
                break;
            case "join":
                await interaction.deferReply({ ephemeral: true });
                await handleJoinCommand(interaction, channel);
                break;
            case "disconnect":
                await interaction.deferReply({ ephemeral: true });
                await handleDisconnectCommand(interaction, channel);
                break;
        }
    }
};

// Function to handle the "play" command
async function handlePlayCommand(client, interaction, channel, queue) {
    const link = interaction.options.getString('link');

    if (!channel) return interaction.editReply('You are not connected to a voice channel!');

    const embed = new EmbedBuilder()
        .setDescription(`${emojis.loading} Fetching \`${link}\`...`)
        .setColor(Colors.Orange);
    await interaction.editReply({ embeds: [embed] });

    // Define regular expressions to check different Discord link formats
    const discordMessageLinkRegex = /discord\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})/;

    // Check if the link matches a Discord message link
    if (discordMessageLinkRegex.test(link)) {
        // Extract server, channel, and message IDs from the link
        const messageLink = link.split('/');
        const guildId = messageLink[4];
        const channelId = messageLink[5];
        const messageId = messageLink[6];

        // Fetch the message from the server, channel, and message IDs
        const targetMessage = await client.guilds.cache.get(guildId)?.channels.cache.get(channelId)?.messages.fetch(messageId);

        if (!targetMessage) {
            return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The Discord interaction link is invalid or the interaction does not exist.`, Colors.Red)] });
        }

        // Handle the found Discord message
        handleDiscordMessage(client, targetMessage, interaction, queue);
    }
    // If it's neither a Discord message link nor a Discord message ID, handle the link as a regular URL
    else {
        // Handle the link as a normal URL
        handleOtherLink(client, channel, interaction, link);
    }
}

// Function to handle the found Discord message
async function handleDiscordMessage(client, message, interaction, queue) {
    
    if (QueueErrorCheck(interaction, queue), true) {

        if (queue) {
            queue.delete();
        }

        // Define a callback function to handle messages
        async function handleMessage(message) {
            await interaction.editReply(message);
        }

        // Call the function to handle Discord link with the callback function
        await PlayASound.aDiscordLink(handleMessage, client, message, interaction);

    }
}

// Function to handle other links
async function handleOtherLink(client, channel, interaction, link) {
    // Handle the link as a normal URL for audio playback
    try {
        const player = client.player;
        const searchResult = await player.search(link, { requestedBy: interaction.user }).catch(() => { });

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        if (!connection) {
            return interaction.editReply("Cannot join the voice channel.");
        }

        await player.play(channel, searchResult, {
            nodeOptions: {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user,
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 300000,
            },
        });

        const embed = new EmbedBuilder()
            .setColor(Colors.Green)
            .setFooter({ text: `Added by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() })
            .setTimestamp();

        if (searchResult.hasPlaylist()) {
            const playlist = searchResult.playlist

            embed.setTitle(`${emojis.success} Playlist added to queue !`)
                .setDescription(`**${searchResult.tracks.length} songs from [${playlist.title}](${playlist.url})** have been added to the Queue !`)
                .setThumbnail(playlist.thumbnail.url)
        } else {
            const track = searchResult.tracks[0];

            embed.setTitle(`${emojis.success} Sound added to queue !`)
                .setDescription(`[${track.title}](${track.url}) are been added to the Queue !\n**Duration:** *${track.duration}*\n**Artist:** *${track.author}*`)
                .setThumbnail(track.thumbnail)
        }

        await interaction.editReply({ embeds: [embed], components: [DTBM.createButton()] });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} The link \`${link}\` cannot be used !`, Colors.Red)] });
    }
}

// Function to handle the "options" command
async function handleOptionsCommand(client, interaction, queue) {
    const choice = interaction.options.getString('selected-option');

    switch (choice) {
        case 'stop':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Stopping...`)] });

            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {
                queue.delete();
                await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-stop"]} Stopped !`)] });
            }

            break;

        case 'pause-resume':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Updating...`)] });

            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {

                if (queue && !queue.node.isPlaying()) {
                    queue.node.resume();
                    await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-resume"]} Resumed !`)] });
                } else {
                    queue.node.pause();
                    await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-pause"]} Paused !`)] });
                }
            }

            break;

        case 'loop':

            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {
                await loopSelection(client, interaction);
            }

            break;

        case 'skip':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Skipping...`)] });

            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {
                queue.node.skip();
                await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-skip"]} Skipped !`)] });
            }

            break;

        case 'back':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Going back...`)] });

            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {
                queue.history.back().catch(async (e) => {
                    return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} ${e.message}`)] });
                });
                await interaction.editReply({
                    embeds: [await createEmbed.embed(`${emojis["music-back"]} Back again!`)]
                });
            }

            break;

        case 'queue-list':
            if (QueueErrorCheck(interaction, !queue || !queue.node.isPlaying())) {
                InitializeQueueListEmbed(interaction, 0)
            }

            break;
    }
}

// Function to handle the "join" command

async function handleJoinCommand(interaction, channel) {
    if (!channel) return await interaction.editReply('You are not connected to a voice channel!');
    if (getVoiceConnection(interaction.guild.id)) return await interaction.editReply('I\'m already connected to a voice channel!');

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
    });

    if (!connection) return await interaction.editReply("Can't join this channel!");

    await interaction.editReply(`${channel} joined!`);
}

// Function to handle the "disconnect" command

async function handleDisconnectCommand(interaction, channel) {
    const disconnection = getVoiceConnection(interaction.guild.id);

    if (!channel) return await interaction.editReply('You are not connected to a voice channel!');
    if (!disconnection) return await interaction.editReply('I\'m not connected to a voice channel!');

    disconnection.disconnect("Force disconnect");

    await interaction.editReply(`Disconnected!`);
}
