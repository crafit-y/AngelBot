const {
  EmbedBuilder,
  ApplicationCommandOptionType,
  Colors,
} = require("discord.js");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
} = require("@discordjs/voice");
const { useQueue } = require("discord-player");
const QueueEmbedManager = require("../../functions/music/queueListEmbed");
const { createEmbed } = require("../../functions/all/Embeds");
const { loopSelection } = require("../../functions/music/loop-selection");
const { DTBM } = require("../../functions/all/DTBM");
const emojis = require("../../utils/emojis.json");
const { PlayASound } = require("../../functions/all/PlayASound");
const handleQuickActionSelectMenu = require("../../functions/music/quickAction");

// Module export
module.exports = {
  name: "music",
  category: "music",
  description: "Manage music-related interactions on voice channels",
  OwnerOnly: false,
  permissions: [],
  options: [
    {
      name: "play",
      description: "Play a music track",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "link-or-name",
          description:
            "The name/link of a YouTube video or playlist, or a Discord interaction link with an audio attachment",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "search-engine",
          description:
            "Select the search engine if u don't find the good thing",
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            {
              name: `Auto (default)`,
              value: "auto",
            },
            {
              name: "YouTube",
              value: "youtube",
            },
            {
              name: "YouTube Playlist",
              value: "youtubePlaylist",
            },
            {
              name: "SoundCloud",
              value: "soundcloud",
            },
            {
              name: "SoundCloud Playlist",
              value: "soundcloudPlaylist",
            },
            {
              name: "Spotify",
              value: "spotifySearch",
            },
            {
              name: "Spotify Playlist",
              value: "spotifyPlaylist",
            },
            {
              name: "Facebook",
              value: "facebook",
            },
            {
              name: "Vimeo",
              value: "vimeo",
            },
            {
              name: "Arbitrary",
              value: "arbitrary",
            },
            {
              name: "Reverbnation",
              value: "reverbnation",
            },
            {
              name: "SoundCloud",
              value: "soundcloudSearch",
            },
            {
              name: "Apple Music",
              value: "appleMusicSearch",
            },
            {
              name: "Apple Music Playlist",
              value: "appleMusicPlaylist",
            },
            {
              name: "File",
              value: "file",
            },
            {
              name: "Auto Search",
              value: "autoSearch",
            },
          ],
        },
      ],
    },
    {
      name: "pause-resume",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "skip",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "quick-action",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "track",
          description: "The track",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      name: "back",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "loop",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "stop",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "join",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "disconnect",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "queue-list",
      description: "Choose an option for the music",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  run: async (client, interaction) => {
    const action = interaction.options.getSubcommand();
    const queue = useQueue(interaction.guild.id);
    const channel = interaction.member.voice.channel;

    switch (action.toLowerCase()) {
      case "play":
        await interaction.deferReply();
        await handlePlayCommand(client, interaction, channel, queue);
        break;
      default:
        await interaction.deferReply({ ephemeral: action !== "queue-list" });
        await handleOptionsCommand(client, interaction, queue);
        break;
    }
  },
};

// Function to handle the "play" command
async function handlePlayCommand(client, interaction, channel, queue) {
  const link = interaction.options.getString("link-or-name");

  if (!channel)
    return interaction.editReply("You are not connected to a voice channel!");

  const embed = new EmbedBuilder()
    .setDescription(`${emojis.loading} Fetching \`${link}\`...`)
    .setColor(Colors.Orange);
  await interaction.editReply({ embeds: [embed] });

  // Define regular expressions to check different Discord link formats
  const discordMessageLinkRegex =
    /discord\.com\/channels\/(\d{17,19})\/(\d{17,19})\/(\d{17,19})/;

  // Check if the link matches a Discord message link
  if (discordMessageLinkRegex.test(link)) {
    // Extract server, channel, and message IDs from the link
    const messageLink = link.split("/");
    const guildId = messageLink[4];
    const channelId = messageLink[5];
    const messageId = messageLink[6];

    // Fetch the message from the server, channel, and message IDs
    const targetMessage = await client.guilds.cache
      .get(guildId)
      ?.channels.cache.get(channelId)
      ?.messages.fetch(messageId);

    if (!targetMessage) {
      return await interaction.editReply({
        embeds: [
          await createEmbed.embed(
            `${emojis.error} The Discord interaction link is invalid or the interaction does not exist.`,
            Colors.Red
          ),
        ],
      });
    }

    async function getAudioUrlFromLink(link) {
      const attachment = link.attachments.first();
      if (!attachment) return null; //throw new Error("The Discord interaction does not contain an audio file attachment.");
      return attachment.url;
    }
    handleOtherLink(
      client,
      channel,
      interaction,
      await getAudioUrlFromLink(targetMessage)
    );

    // Handle the found Discord message
    // handleDiscordMessage(
    //   client,
    //   getAudioUrlFromLink(targetMessage),
    //   interaction,
    //   queue
    // );
  }
  // If it's neither a Discord message link nor a Discord message ID, handle the link as a regular URL
  else {
    // Handle the link as a normal URL
    handleOtherLink(client, channel, interaction, link);
  }
}

// Function to handle the found Discord message
async function handleDiscordMessage(client, message, interaction, queue) {
  try {
    if (queue) {
      queue.delete();
    }
    // Define a callback function to handle messages
    async function handleMessage(message) {
      await interaction.editReply(message);
    }

    // Call the function to handle Discord link with the callback function
    await PlayASound.aDiscordLink(handleMessage, client, message, interaction);
  } catch (e) {
    console.error(e);
  }
}

// Function to handle other links
async function handleOtherLink(client, channel, interaction, link) {
  // Handle the link as a normal URL for audio playback
  const searchEngine = interaction.options.getString("search-engine");
  try {
    const player = client.player;
    const searchResult = await player
      .search(link, {
        fallbackSearchEngine: searchEngine,
        requestedBy: interaction.user,
      })
      .catch(() => {});

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
      .setFooter({
        text: `Added by ${interaction.user.username}`,
        iconURL: interaction.user.avatarURL(),
      })
      .setTimestamp();

    if (searchResult.hasPlaylist()) {
      const playlist = searchResult.playlist;

      embed
        .setTitle(`${emojis.success} Playlist added to queue !`)
        .setDescription(
          `**${searchResult.tracks.length} songs from [${playlist.title}](${playlist.url})** have been added to the Queue !`
        )
        .setThumbnail(playlist.thumbnail.url);
    } else {
      const track = searchResult.tracks[0];

      embed
        .setTitle(`${emojis.success} Sound added to queue !`)
        .setDescription(
          `[${track.title}](${track.url}) are been added to the Queue !\n> **Artist** ${emojis.arrow} ${track.author}`
        )
        .setThumbnail(track.thumbnail);
    }

    await interaction.editReply({
      embeds: [embed],
      components: [DTBM.createButton()],
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      embeds: [
        await createEmbed.embed(
          `${emojis.error} The link \`${link}\` cannot be used !`,
          Colors.Red
        ),
      ],
    });
  }
}

// Function to handle the "options" command
async function handleOptionsCommand(client, interaction, queue) {
  const choice = interaction.options.getSubcommand();
  const channel = interaction.member.voice.channel;

  if (choice === "join" || choice === "disconnect") {
    switch (choice) {
      case "join":
        return await handleJoin(interaction, channel);
      case "disconnect":
        return await handleDisconnect(interaction, channel);
    }
  }

  const queueEmbedManager = new QueueEmbedManager(interaction);

  switch (choice) {
    case "stop":
      await interaction.editReply({
        embeds: [await createEmbed.embed(`${emojis.loading} Stopping...`)],
      });

      if (queue || queue.node.isPlaying()) {
        queue.delete();
        await interaction.editReply({
          embeds: [
            await createEmbed.embed(`${emojis["music-stop"]} Stopped !`),
          ],
        });
      }

      break;

    case "pause-resume":
      await interaction.editReply({
        embeds: [await createEmbed.embed(`${emojis.loading} Updating...`)],
      });

      if (queue || queue.node.isPlaying()) {
        if (queue && !queue.node.isPlaying()) {
          queue.node.resume();
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(`${emojis["music-resume"]} Resumed !`),
            ],
          });
        } else {
          queue.node.pause();
          await interaction.editReply({
            embeds: [
              await createEmbed.embed(`${emojis["music-pause"]} Paused !`),
            ],
          });
        }
      }

      break;

    case "loop":
      if (queue || queue.node.isPlaying()) {
        await loopSelection(client, interaction);
      }

      break;

    case "skip":
      await interaction.editReply({
        embeds: [await createEmbed.embed(`${emojis.loading} Skipping...`)],
      });

      if (queue || queue.node.isPlaying()) {
        queue.node.skip();
        await interaction.editReply({
          embeds: [
            await createEmbed.embed(`${emojis["music-skip"]} Skipped !`),
          ],
        });
      }

      break;

    case "quick-action":
      const trackNum = interaction.options.getString("track");
      if (trackNum === "no-more-tracks") {
        return;
      } else {
        await interaction.editReply({
          embeds: [
            await createEmbed.embed(`${emojis.loading} Action acknowledge...`),
          ],
        });
        if (queue || queue.node.isPlaying()) {
          await handleQuickActionSelectMenu(client, interaction, trackNum);
        }
      }

      break;

    case "back":
      await interaction.editReply({
        embeds: [await createEmbed.embed(`${emojis.loading} Going back...`)],
      });

      if (queue || queue.node.isPlaying()) {
        queue.history.back().catch(async (e) => {
          return await interaction.editReply({
            embeds: [
              await createEmbed.embed(
                `${emojis.error} ${e.message}`,
                Colors.Red
              ),
            ],
          });
        });
        await interaction.editReply({
          embeds: [
            await createEmbed.embed(`${emojis["music-back"]} Back again!`),
          ],
        });
      }

      break;

    case "queue-list":
      if (queue || queue.node.isPlaying()) {
        queueEmbedManager.initializeQueueListEmbed();
      }
      break;
  }
}

// Function to handle the "join" command

async function handleJoin(interaction, channel) {
  if (!channel)
    return await interaction.editReply(
      "You are not connected to a voice channel!"
    );
  if (getVoiceConnection(interaction.guild.id))
    return await interaction.editReply(
      "I'm already connected to a voice channel!"
    );

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  if (!connection)
    return await interaction.editReply("Can't join this channel!");

  await interaction.editReply(`${channel} joined!`);
}

// Function to handle the "disconnect" command

async function handleDisconnect(interaction, channel) {
  const disconnection = getVoiceConnection(interaction.guild.id);

  if (!disconnection)
    return await interaction.editReply("I'm not connected to a voice channel!");

  disconnection.disconnect("Force disconnect");

  await interaction.editReply(`Disconnected!`);
}
