const { EmbedBuilder, ApplicationCommandOptionType, Colors, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const emojis = require("../../utils/emojis.json");
const { useQueue } = require("discord-player");
const { InitializeQueueListEmbed, QueueErrorCheck } = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/All/Embeds");
const { loopSelection } = require("../../functions/music/loop-selection");
const { DTBM } = require("../../functions/All/DTBM");

module.exports = {
    name: 'music',
    category: 'music',
    description: 'Say a link interaction on voice channel',
    OwnerOnly: false,
    permissions: [],
    options: [
        {
            name: 'play',
            description: 'play a music',
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
            description: 'Choices an options fro the music',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'selected-option',
                    description: 'Selected option to send at bot',
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
            description: 'Disconnect my current voice channel',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
    async run(client, interaction) {
        const action = interaction.options.getSubcommand();
        const queue = useQueue(interaction.guild.id);
        const channel = interaction.member.voice.channel;
        const choise = interaction.options.getString('selected-option');

        switch (action.toLowerCase()) {
            case "play":
                await interaction.deferReply();
                await handlePlayCommand(client, interaction, channel);
                break;
            case "options":
                await interaction.deferReply({ ephemeral: choise !== "queue-list" ? true : false });
                await handleOptionsCommand(client, interaction, queue);
                break;
            case "join":
                await interaction.deferReply({ ephemeral: true });

                if (!channel) return await interaction.editReply('You are not connected to a voice channel!');
                if (getVoiceConnection(interaction.guild.id)) return await interaction.editReply('I\'m already connected to a voice channel!');

                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true,
                });

                if (!connection) return await interaction.editReply("Can't join this channel !");

                await interaction.editReply(`${channel} joined !`);
                break;
            case "disconnect":
                await interaction.deferReply({ ephemeral: true });
                const disconnection = getVoiceConnection(interaction.guild.id);

                if (!channel) return await interaction.editReply('You are not connected to a voice channel!');
                if (!disconnection) return await interaction.editReply('I\'m not connected to a voice channel!');

                disconnection.disconnect("Force disconnect");

                await interaction.editReply(`Disconnected !`);
                break;

        }
    }
};

async function handlePlayCommand(client, interaction, channel) {
    // Code de gestion de la commande "play"
    const link = interaction.options.getString('link');
    const player = client.player;

    if (!channel) return interaction.editReply('You are not connected to a voice channel!');

    const embed = new EmbedBuilder()
        .setDescription(`${emojis.loading} Shearing \`${link}\` on YouTube...`)
        .setColor(Colors.Orange);
    await interaction.editReply({ embeds: [embed] });

    const searchResult = await player.search(link, { requestedBy: interaction.user });

    if (!searchResult.tracks.length) {
        await interaction.editReply(`We found no tracks for ${link}!`);
        return;
    } else {
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true,
            });

            if (!connection) {
                return interaction.editReply("Impossible de rejoindre le canal vocal.");
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
        } catch (e) {
            console.error(e);
            return interaction.followUp(`Something went wrong: ${e}`);
        }
    }
}

async function handleOptionsCommand(client, interaction, queue) {
    // Code de gestion de la commande "options"
    const choise = interaction.options.getString('selected-option');

    switch (choise) {
        case 'stop':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Stopping...`)] });
            QueueErrorCheck(!queue || !queue.node.isPlaying());
            queue.delete();
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-stop"]} Stopped !`)] });
            break;

        case 'pause-resume':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Updating...`)] });

            QueueErrorCheck(!queue);

            if (queue && !queue.node.isPlaying()) {
                queue.node.resume();
                await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-resume"]} Resumed !`)] });
            } else {
                queue.node.pause();
                await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-pause"]} Paused !`)] });
            }
            break;

        case 'loop':

            QueueErrorCheck(!queue || !queue.node.isPlaying());

            await loopSelection(client, interaction);

            break;

        case 'skip':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Skipping...`)] });

            QueueErrorCheck(!queue || !queue.node.isPlaying());
            queue.node.skip();

            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis["music-skip"]} Skipped !`)] });
            break;

        case 'back':
            await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.loading} Going back...`)] });

            QueueErrorCheck(!queue || !queue.node.isPlaying());

            queue.history.back().catch(async (e) => {
                return await interaction.editReply({ embeds: [await createEmbed.embed(`${emojis.error} ${e.message}`)] });
            });

            await interaction.editReply({
                embeds: [await createEmbed.embed(`${emojis["music-back"]} Back again!`)]
            });

            break;

        case 'queue-list':
            QueueErrorCheck(!queue || !queue.node.isPlaying());
            InitializeQueueListEmbed(interaction, 0)
            break;
    }
}




/*
// Après avoir ajouté une piste à la file d'attente
        const queue = useQueue(interaction.guild.id);
 
        if (!queue || !queue.node.isPlaying()) {
            return interaction.followUp("Aucune piste n'est en cours de lecture.");
        }
 
        const loopEnabled = !queue.loopMode;
 
        queue.setRepeatMode(1);
        await interaction.followUp(`Boucle ${loopEnabled ? "activée" : "désactivée"}.`);
 
 
 
const embed = new EmbedBuilder()
    .setDescription(
        `${emojis.loading} Shearing the audio...`
    )
    .setColor(Colors.Orange)
 
await interaction.reply({ embeds: [embed] });
 
function isYouTubeLink(string) {
    const youtubeLinkRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]{11}$/;
    const youtubeShortLinkRegex = /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]{11}$/;
    return youtubeLinkRegex.test(string) || youtubeShortLinkRegex.test(string);
}
 
function isYouTubePlaylist(string) {
    const youtubePlaylistRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]{34}$/;
    return youtubePlaylistRegex.test(string);
}
 
function isYouTubeVideoName(string) {
    const youtubeVideoNameRegex = /^[A-Za-z0-9-_]{11}$/;
    return youtubeVideoNameRegex.test(string);
}
 
if (isYouTubeLink(link)) {
 
    console.log("C'est un lien YouTube");
 
} else if (isYouTubePlaylist(link)) {
 
    console.log("C'est une playlist YouTube");
 
} else if (isYouTubeVideoName(link)) {
 
    console.log("C'est le nom d'une vidéo YouTube");
 
} else {
 
    console.log("Ce n'est pas un lien YouTube valide");
 
}
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
/*const discordLinkRegex = /discord\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})/;
 
const embed = new EmbedBuilder()
    .setDescription(
        `${emojis.loading} Shearing the audio...`
    )
    .setColor(Colors.Orange)
 
await interaction.reply({ embeds: [embed] });
 
if (discordLinkRegex.test(link)) {
    const interactionId = link.split('/').pop();
    const targetinteraction = await interaction.channel.interactions.fetch(interactionId);
 
    if (!targetinteraction) {
        return interaction.reply('The Discord interaction link is invalid or the interaction does not exist.');
    }
 
    const attachment = targetinteraction.attachments.first();
 
    if (!attachment) {
        return interaction.reply('The Discord interaction does not contain an audio file attachment.');
    }
 
    const audioUrl = attachment.url;
 
    try {
        const response = await axios.get(audioUrl, { responseType: 'stream' });
 
        const voiceChannel = interaction.member.voice.channel;
 
        if (!voiceChannel) {
            return interaction.reply('You must be connected to a voice channel to play an audio file.');
        }
 
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
 
        const player = createAudioPlayer();
 
        /*player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
        });
 
        const stream = Readable.from(response.data);
 
        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
 
        const embed2 = new EmbedBuilder()
            .setDescription(
                `${emojis.music} The audio file \"${attachment.name}\" are playing now on <#${voiceChannel.id}>`
            )
            .setColor(Colors.Green)
 
        await interaction.editReply({ embeds: [embed2] });
 
        player.play(resource);
        connection.subscribe(player);
 
    } catch (error) {
 
        console.error(error);
 
        const embed = new EmbedBuilder()
            .setDescription(
                `${emojis.error} An error occurred while fetching the audio file.`
            )
            .setColor(Colors.Red)
 
        await interaction.editReply({ embeds: [embed] });
    }
} else if (link.match(/(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/g)) {
    const embed = new EmbedBuilder()
        .setDescription(
            `${emojis.error} Les liens youtube ne sont pas encore pris en charge !`
        )
        .setColor(Colors.Red)
 
    await interaction.editReply({ embeds: [embed] });
    //return
 
    try {
        const voiceChannel = interaction.member.voice.channel;
 
        if (!voiceChannel) {
            return interaction.reply('You must be connected to a voice channel to play a YouTube music.');
        }
 
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
 
        const player = createAudioPlayer();
 
        const stream = ytdl(link, { filter: 'audioonly' });
 
        const resource = createAudioResource(stream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        });
 
        player.play(resource);
        connection.subscribe(player);
 
        const embed2 = new EmbedBuilder()
            .setDescription(`${emojis.music} The audio file "${link}" is now playing in <#${voiceChannel.id}>`)
            .setColor(Colors.Green);
 
        await interaction.editReply({ embeds: [embed2] });
    } catch (error) {
        console.error(error);
 
        const embed = new EmbedBuilder()
            .setDescription(`${emojis.error} An error occurred while fetching the audio file.`)
            .setColor(Colors.Red);
 
        await interaction.editReply({ embeds: [embed] });
    }
 
 
} else {
 
    const embed = new EmbedBuilder()
        .setDescription(
            `${emojis.error} Le lien "${link}" n'est pas pris en charge.`
        )
        .setColor(Colors.Red)
 
    await interaction.editReply({ embeds: [embed] });
    return
 
}*/