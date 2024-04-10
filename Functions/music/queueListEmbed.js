const {
  EmbedBuilder,
  Colors,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { useQueue } = require("discord-player");
const { DTBM } = require("../all/DTBM");
const { createButton } = require("../all/Buttons");
const { createEmbed } = require("../all/Embeds");
const emojis = require("../../utils/emojis.json");

const Pattern =
  /(track\.author|,|-|\/|\(|\)|ft\.?|feat|remix|video|music|lyric(s)?|explicit|official|video|clip|version|extended|radio|edit|deluxe|album|single|acoustic|cover|live|demo|seeb|feat\.?&|mit|feat|remix|video|musica|letra(s)?|explicito|oficial|avec|video|clip|versione|estendere|radio|modificare|deluxe|album|singolo|acustico|copertina|vivo|demo|seeb|versão|estender|rádio|editar|álbum|solteiro|acústico|capa|ao vivo|demo|ремикс|видео|музыка|тексты|официальный|сингл|акустический|живой|демо|リミックス|ビデオ|音楽|歌詞|公式|シングル|アコースティック|ライブ|デモ|리믹스|비디오|음악|가사|공식|싱글|어쿠스틱|라이브|데모|خليط|فيديو|موسيقى|كلمات|رسمي|ألبوم|فردي|صوتي|حي|عرض|instrumental|оркестровка|インストゥルメンタル|인스트루멘탈|موسيقي|karaoke|караоке|カラオケ|노래방|كاريوكي|bonus|бонус|ボーナス|보너스|بونص|deluxe|делюкс|デラックス|디럭스|ديلوكس|edition|издание|エディション|판|طبعة)/gi;

const pagesMap = new Map();

class QueueEmbedManager {
  constructor(interaction) {
    this.interaction = interaction;
    this.member = interaction.member;
    this.queue = this.getQueue(interaction.guild.id);
    this.tracksPerPage = 10;
    this.currentPage = this.getCurrentPage(this.member.user.id);
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

  getCurrentPage(userId) {
    const currentPage = pagesMap.get(userId);
    if (currentPage !== undefined) return currentPage;
    pagesMap.set(userId, 0);
    return 0;
  }

  async getTotalPages() {
    return this.totalPages;
  }

  async setIncrementation(increment = 0) {
    this.currentPage += increment;
    pagesMap.set(this.member.user.id, this.currentPage);
  }

  async resetCurrentPage() {
    this.currentPage = 0;
    pagesMap.set(this.member.user.id, 0);
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

  formatTrack(track, index) {
    const title = track.title
      .replace(new RegExp(track.author, "gi"), "")
      .replace(Pattern, "")
      .trim()
      .slice(0, 40);
    const author = track.author.slice(0, 25);
    return `**${emojis["music-note"]} | \`#${
      index + 1
    }\`  ${title}**\n> Added by \`@${track.requestedBy.username}\` - *[Link](${
      track.url
    })*`;
  }

  createEmbed(tracks) {
    const currentTrack = this.queue.currentTrack;
    const pageStart = this.tracksPerPage * this.currentPage;
    const pageEnd = pageStart + this.tracksPerPage;
    const description = `${this.queue.node.createProgressBar()}\n\n${tracks.join(
      "\n"
    )}\n${
      this.queue.tracks.size > pageEnd
        ? `...${this.queue.tracks.size - pageEnd} more track${
            this.queue.tracks.size - pageEnd > 1 ? "s" : ""
          }`
        : ""
    }`;
    return new EmbedBuilder()
      .setThumbnail(currentTrack.thumbnail || "")
      .setTitle(
        `${emojis.music} | ${currentTrack.title
          .replace(new RegExp(currentTrack.author, "gi"), "")
          .replace(Pattern, "")
          .trim()
          .slice(0, 40)} ${emojis.arrow} Playing on ${this.queue.channel}`
      )
      .setDescription(description)
      .setColor(Colors.Purple);
  }

  async updateMessage(embed) {
    try {
      const components = await this.buildRowComponents();
      if (this.interaction.isRepliable()) {
        await this.interaction.editReply({ embeds: [embed], components });
      } else {
        await this.interaction.message.edit({ embeds: [embed], components });
      }
    } catch (error) {
      //console.error("Error during embed refresh:", error);
      this.handleError(error);
    }
  }

  async refreshEmbed() {
    if (!this.queue) return;

    try {
      await this.interaction.deferUpdate().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const tracks = this.getTracksForCurrentPage();
      const embed = this.createEmbed(tracks);
      await this.updateMessage(embed);
      // Note: updateMessage pourrait être ajusté pour gérer à la fois l'édition de messages existants et la réponse initiale, comme indiqué précédemment.
    } catch (error) {
      //console.error("Error during embed refresh:", error);
      await this.handleError(error); // Gérer l'erreur de manière appropriée
    }
  }

  async handleError(error) {
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
    const tracksTForSLM = 25;
    const optionsList = this.queue.tracks.data
      .slice(0, tracksTForSLM)
      .map((m, i) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(
            `${i + 1}. ${m.title
              .replace(new RegExp(m.author, "gi"), "")
              .replace(Pattern, "")
              .trim()
              .slice(0, 40)} `
          )
          .setValue(`${i + 1} `)
      );
    const OnlyOneTrack = new StringSelectMenuOptionBuilder()
      .setLabel(`ttt`)
      .setValue(`ehgqehhqethqetheh`);
    const options = this.queue.tracks.size <= 0 ? OnlyOneTrack : optionsList;

    const actionRow = await createButton.create([
      [
        "queuelistembed-firstpage",
        "<<<",
        null,
        ButtonStyle.Primary,
        this.currentPage === 0 || this.currentPage < 0,
        null,
      ],
      [
        "queuelistembed-previouspage",
        "<",
        null,
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
        ">",
        null,
        ButtonStyle.Primary,
        this.currentPage === this.totalPages ||
          this.currentPage > this.totalPages,
        null,
      ],
      [
        "queuelistembed-lastpage",
        ">>>",
        null,
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
        !this.queue.node.isPlaying(),
        null,
      ],
      [
        "queuelistembed-pauseresume",
        this.queue.node.isPlaying() ? "Play" : "Pause",
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
        this.queue.node.isPlaying() && this.queue.tracks.size > 0
          ? false
          : true,
        null,
      ],
    ]);

    const musicRow2 = await createButton.create([
      [
        "queuelistembed-loop",
        "Loop",
        emojis["music-loopTrack"],
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

    return [actionRow, musicRow, musicRow2, quickAction];
  }
}

// Usage would now involve creating an instance of QueueEmbedManager and calling its methods
// Example:
// const queueEmbedManager = new QueueEmbedManager(interaction);
// queueEmbedManager.initializeQueueListEmbed(1);

module.exports = QueueEmbedManager;
