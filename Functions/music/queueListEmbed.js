const {
  EmbedBuilder,
  Colors,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { useQueue, useTimeline } = require("discord-player");
const { DTBM } = require("../all/DTBM");
const { createButton } = require("../all/Buttons");
const { createEmbed } = require("../all/Embeds");
const emojis = require("../../utils/emojis.json");
const { extractDomain } = require("../all/CensoredLink");

const Pattern =
  /(track\.author|,|\/|\(|\)|ft\.?|feat|remix|video|music|lyric(s)?|&|explicit|official|video|clip|version|extended|radio|edit|deluxe|album|single|acoustic|cover|live|demo|seeb|feat\.?&|mit|feat|remix|video|musica|letra(s)?|explicito|oficial|avec|video|clip|versione|estendere|radio|modificare|deluxe|album|singolo|acustico|copertina|vivo|demo|seeb|versão|estender|rádio|editar|álbum|solteiro|acústico|capa|ao vivo|demo|ремикс|видео|музыка|тексты|официальный|сингл|акустический|живой|демо|リミックス|ビデオ|音楽|歌詞|公式|シングル|アコースティック|ライブ|デモ|리믹스|비디오|음악|가사|공식|싱글|어쿠스틱|라이브|데모|خليط|فيديو|موسيقى|كلمات|رسمي|ألبوم|فردي|صوتي|حي|عرض|instrumental|оркестровка|インストゥルメンタル|인스트루멘탈|موسيقي|karaoke|караоке|カラオケ|노래방|كاريوكي|bonus|бонус|ボーナス|보너스|بونص|deluxe|делюкс|デラックス|디럭스|ديلوكس|edition|издание|エディション|판|طبعة)/gi;

const pagesMap = new Map();

const domainEmojis = {
  "open.spotify.com": emojis["music-spotify"],
  "spotify.com": emojis["music-spotify"],
  "youtube.com": emojis["music-youtube"],
  "youtu.be": emojis["music-youtube"],
  "soundcloud.com": emojis["music-soundcloud"],
  // Ajoutez d'autres domaines et emojis selon vos besoins
};

function formatDuration(milliseconds) {
  if (isNaN(milliseconds) || milliseconds < 0) return "Invalid time";

  const units = [
    [1000 * 60 * 60, "hour"],
    [1000 * 60, "minute"],
    [1000, "second"],
  ];

  return units
    .reduce((acc, [unitMilliseconds, unitName]) => {
      const quantity = Math.floor(milliseconds / unitMilliseconds);
      milliseconds %= unitMilliseconds;
      return quantity
        ? `${acc}${quantity} ${unitName}${quantity > 1 ? "s" : ""} `
        : acc;
    }, "")
    .trim();
}

class QueueEmbedManager {
  constructor(interaction) {
    this.interaction = interaction;
    this.member = interaction.member;
    this.queue = this.getQueue(interaction.guild.id);
    this.timeline = useTimeline(interaction.guild.id) || null;
    this.tracksPerPage = 12;
    this.currentPage =
      interaction?.message != null
        ? this.getCurrentPage(interaction.message?.id)
        : 0;
    this.totalPages = this.queue
      ? Math.max(
          0,
          Math.ceil(this.queue.tracks.data.length / this.tracksPerPage) - 1
        )
      : 0;
  }

  getQueue(guildId) {
    const queue = useQueue(guildId);
    if (!queue) {
      this.handleError("1");
      return null;
    }
    return queue;
  }

  getCurrentPage(messageId) {
    const currentPage = pagesMap.get(messageId);
    if (currentPage !== undefined) return currentPage;
    pagesMap.set(messageId, 0);
    return 0;
  }

  async getTotalPages() {
    return this.totalPages;
  }

  async setIncrementation(increment = 0) {
    this.currentPage += increment;
    pagesMap.set(this.interaction.message.id, this.currentPage);
  }

  async resetCurrentPage() {
    this.currentPage = 0;
    pagesMap.set(this.interaction.message.id, 0);
  }

  async initializeQueueListEmbed() {
    if (!this.queue) return;
    const tracks = this.getTracksForCurrentPage();
    const embed = this.createEmbed(tracks);
    await this.updateMessage(embed);
  }

  getTracksForCurrentPage() {
    const start = this.tracksPerPage * this.currentPage;
    const end = start + this.tracksPerPage;
    return this.queue.tracks.data
      .slice(start, end)
      .map(this.formatTrack.bind(this));
  }

  formatTitle(track) {
    let title = track.title;

    // Utilisation de la méthode map pour remplacer la boucle for
    track.author.split(",").map((author) => {
      const authorRegex = new RegExp(author.trim(), "gi");
      title = title.replace(authorRegex, "");
    });

    // Utilisation de la méthode replaceAll pour remplacer plusieurs occurrences en une seule opération
    title = title
      .replaceAll(Pattern, "")
      .replaceAll("'", "")
      .replaceAll("`", "")
      .replaceAll('"', "")
      .trim()
      .slice(0, 40);

    return title;
  }

  formatEmoji(track) {
    const { domain, crypted } = extractDomain(track.url);
    let emoji;
    const domainEmoji = domainEmojis[domain];
    if (domainEmoji) {
      // Si un emoji est défini pour ce domaine, l'utiliser
      emoji = domainEmoji;
    } else {
      // Si le domaine n'est pas répertorié, utiliser un emoji par défaut
      emoji = emojis["music-note"]; // Emoji pour domaine inconnu
    }
    return emoji;
  }

  calculerIndexAbsolu(numeroPage, positionDansPage, elementsParPage) {
    return numeroPage * elementsParPage + positionDansPage + 1;
  }

  formatTrack(track, index) {
    const currentPage = this.currentPage;
    const tracksPerPage = this.tracksPerPage;
    const trackNumber = this.calculerIndexAbsolu(
      currentPage,
      index,
      tracksPerPage
    );
    // const firstNumber = index + 1 >= 10 ? currentPage + 1 : currentPage;
    // const trackNumber = index + 1 >= 10 ? 0 : index + 1;

    const author = track.author.slice(0, 25);
    return {
      name: `**${this.formatEmoji(
        track
      )} | \`#${trackNumber}\`  ${this.formatTitle(track)}** `,
      value: `- [${author}](${track.url})\n- \`@${track.requestedBy.username}\``, //> *[Link]*\n
      inline: true,
    };
  }

  createEmbed(tracks) {
    const currentTrack = this.queue.currentTrack;
    const description =
      `### ${emojis.music} ${emojis.arrow} Playing on ${this.queue.channel}\n` +
      `**${this.formatTitle(currentTrack)}**\n` +
      `*- [${currentTrack.author}](${currentTrack.url}) - \`@${currentTrack.requestedBy.username}\`*` +
      `${this.queue.node.createProgressBar()}${
        this.timeline != null ? ` (${this.timeline.timestamp?.progress}%)` : ""
      }\n`;
    const fields = tracks; //+
    // `\n${
    //   this.queue.tracks.size > pageEnd
    //     ? `...${this.queue.tracks.size - pageEnd} more track${
    //         this.queue.tracks.size - pageEnd > 1 ? "s" : ""
    //       }`
    //     : ""
    // }`;
    return (
      new EmbedBuilder()
        .setThumbnail(currentTrack.thumbnail || "")
        // .setTitle(
        //   `${emojis.music} ${emojis.arrow} Playing on ${this.queue.channel}`
        // )
        .setDescription(description)
        .addFields(fields)
        .setFooter({
          text: `${formatDuration(this.queue.estimatedDuration)} remaining - ${
            this.queue.size
          } sound${this.queue.size > 1 ? "" : "s"} in this queue`,
        })
        .setColor(Colors.Purple)
    );
  }

  async updateMessage(embed) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const components = await this.buildRowComponents();
      if (this.interaction.isRepliable()) {
        await this.interaction.editReply({ embeds: [embed], components });
      } else {
        await this.interaction.message.edit({ embeds: [embed], components });
      }
    } catch (error) {
      console.error("Error during embed refresh:", error);
      this.handleError(error);
    }
  }

  async refreshEmbed(messageId = null) {
    if (!this.queue) return;

    try {
      await this.interaction.deferUpdate().catch(() => {});

      if (this.totalPages < this.currentPage || 0 >= this.currentPage) {
        this.resetCurrentPage();
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const tracks = this.getTracksForCurrentPage();
      const embed = this.createEmbed(tracks);
      if (messageId && messageId != null) {
        const message = await this.interaction.message.channel.messages.fetch(
          messageId
        );
        return await message.edit(embed);
      } else {
        return await this.updateMessage(embed);
      }
      // Note: updateMessage pourrait être ajusté pour gérer à la fois l'édition de messages existants et la réponse initiale, comme indiqué précédemment.
    } catch (error) {
      //console.error("Error during embed refresh:", error);
      await this.handleError(error); // Gérer l'erreur de manière appropriée
    }
  }

  async handleError(error) {
    console.log(error);
    const errorMessage = error === "1" ? "No music are playing" : error;
    const messageArray = {
      embeds: [
        await createEmbed.embed(
          `${emojis.error} An error occurred\n> \`${errorMessage}\``,
          Colors.Red
        ),
      ],
      components: [],
      ephemeral: true,
    };
    try {
      switch (error) {
        case "1":
          if (this.interaction.isRepliable() && !this.interaction.isButton()) {
            await this.interaction.editReply(messageArray);
          } else {
            await this.interaction.message.edit(messageArray);
          }
          break;

        default:
          this.interaction.deferUpdate().catch(() => {});
          await this.interaction.followUp(messageArray);
          break;
      }
    } catch (error) {
      //console.log(error);
    }
  }

  async buildRowComponents() {
    const currentPage = this.currentPage;
    const tracksPerPage = this.tracksPerPage;
    const tracksTForSLM = tracksPerPage > 25 ? 25 : tracksPerPage;
    const currentAbsoluteTrack = tracksPerPage * currentPage;
    const currentTrackNumber = (index) => {
      return this.calculerIndexAbsolu(currentPage, index, tracksPerPage);
    };

    const optionsList = this.queue.tracks.data
      .slice(currentAbsoluteTrack, currentAbsoluteTrack + tracksTForSLM)
      .map((m, i) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`#${currentTrackNumber(i)} - ${this.formatTitle(m)} `)
          .setEmoji(this.formatEmoji(m))
          .setValue(`${currentTrackNumber(i)} `)
      );
    const OnlyOneTrack = new StringSelectMenuOptionBuilder()
      .setLabel(`You're not supposed to see that!`)
      .setEmoji("🤔")
      .setValue(`onlyonetrack`);
    const options = this.queue.tracks.size <= 0 ? OnlyOneTrack : optionsList;

    const actionRow = await createButton.create([
      [
        "queuelistembed-firstpage",
        null,
        emojis["page-first"],
        ButtonStyle.Primary,
        this.currentPage === 0 || this.currentPage < 0,
        null,
      ],
      [
        "queuelistembed-previouspage",
        null,
        emojis["page-previous"],
        ButtonStyle.Primary,
        this.currentPage === 0 || this.currentPage < 0,
        null,
      ],
      [
        "queuelistembed-refresh",
        `${this.currentPage + 1}/${this.totalPages + 1}`,
        null,
        ButtonStyle.Secondary,
        false,
        null,
      ],
      [
        "queuelistembed-nextpage",
        null,
        emojis["page-next"],
        ButtonStyle.Primary,
        this.currentPage === this.totalPages ||
          this.currentPage > this.totalPages,
        null,
      ],
      [
        "queuelistembed-lastpage",
        null,
        emojis["page-last"],
        ButtonStyle.Primary,
        this.currentPage === this.totalPages ||
          this.currentPage > this.totalPages,
        null,
      ],
    ]);

    const musicRow = await createButton.create([
      [
        "queuelistembed-back",
        "Back",
        emojis["music-back"],
        ButtonStyle.Secondary,
        this.queue.node.isPlaying()
          ? this.queue.history.previousTrack != null
            ? false
            : true
          : true,
        null,
      ],
      [
        "queuelistembed-pauseresume",
        !this.queue.node.isPlaying() ? "Play" : "Pause",
        this.queue.node.isPlaying()
          ? emojis["music-pause"]
          : emojis["music-resume"],
        this.queue.node.isPlaying() ? ButtonStyle.Success : ButtonStyle.Danger,
        false,
        null,
      ],
      [
        "queuelistembed-skip",
        "Skip",
        emojis["music-skip"],
        ButtonStyle.Secondary,
        this.queue.node.isPlaying()
          ? this.queue.history.nextTrack != null
            ? false
            : true
          : true,
        null,
      ],
    ]);

    function getCurrentLoopEmoji(value) {
      switch (parseInt(value)) {
        case 1:
          return emojis["music-loopTrack"];
        case 2:
          return emojis["music-loopQueue"];
        case 3:
          return emojis["music-loopInfinitQueue"];
        case 4:
          return emojis.error;
        default:
          return emojis.error;
      }
    }

    const musicRow2 = await createButton.create([
      [
        "queuelistembed-loop",
        "Loop",
        getCurrentLoopEmoji(this.queue.repeatMode), //TODO
        ButtonStyle.Secondary,
        false,
        null,
      ],
      [
        "queuelistembed-delete",
        "Stop",
        emojis["music-stop"],
        ButtonStyle.Danger,
        false,
        null,
      ],
      [
        "queuelistembed-shuffle",
        "Shuffle",
        emojis["music-shuffle"],
        ButtonStyle.Secondary,
        false,
        null,
      ],
    ]);

    const quickAction = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setPlaceholder("Quick action for a sound")
        .setCustomId("quikactionselectmenu")
        .addOptions(options || [])
        .setMinValues(1)
        .setMaxValues(1)
        .setDisabled(this.queue.tracks.size <= 0 ? true : false)
    );

    return [quickAction, actionRow, musicRow, musicRow2];
  }
}

// Usage would now involve creating an instance of QueueEmbedManager and calling its methods
// Example:
// const queueEmbedManager = new QueueEmbedManager(interaction);
// queueEmbedManager.initializeQueueListEmbed(1);

module.exports = QueueEmbedManager;
