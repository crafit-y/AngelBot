const Canvas = require("canvas");
const { formatVariable, applyText } = require("../../utils/functions");

module.exports = class Greeting {

    constructor() {
        this.username = "Clyde";
        this.guildName = "ServerName";
        this.colorTitleBorder = "#000000";
        this.colorMemberCount = "#ffffff";
        this.textMemberCount = "Il y a {count} membres sur le serveur";
        this.memberCount = "0";
        this.backgroundImage = `${process.cwd()}/functions/api/canvas-AngelBot/assets/img/background.gif`;
        this.avatar = `${process.cwd()}/functions/api/canvas-AngelBot/assets/img/default-avatar.png`;
        this.opacityBorder = "0.8";
        this.colorBorder = "#000000";
        this.colorUsername = "#ffffff";
        this.colorUsernameBox = "#000000";
        this.opacityUsernameBox = "0.8";
        this.colorAvatar = "#000000";
        this.colorMessage = "#ffffff";
        this.colorHashtag = "#ffffff";
        this.colorBackground = "000000";
        this.font = `PEANUT BUTTER`;
        //Limite >>>   "                                   "
        this.colorMessageBox = "#000000";
        this.opacityMessageBox = "0.8";
    }

    setAvatar(value) {
        this.avatar = value;
        return this;
    }

    setUsername(value) {
        this.username = value;
        return this;
    }

    setGuildName(value) {
        this.guildName = value;
        return this;
    }

    setMemberCount(value) {
        this.memberCount = value;
        return this;
    }

    setBackground(value) {
        this.backgroundImage = value;
        return this;
    }

    setColor(variable, value) {
        const formattedVariable = formatVariable("color", variable);
        if (this[formattedVariable]) this[formattedVariable] = value;
        return this;
    }

    setText(variable, value) {
        const formattedVariable = formatVariable("text", variable);
        if (this[formattedVariable]) this[formattedVariable] = value;
        return this;
    }

    setOpacity(variable, value) {
        const formattedVariable = formatVariable("opacity", variable);
        if (this[formattedVariable]) this[formattedVariable] = value;
        return this;
    }

    async toAttachment() {
        // Create canvas
        const canvas = Canvas.createCanvas(1024, 450);
        const ctx = canvas.getContext("2d");

        const guildName = this.textMessage.replace(/{server}/g, this.guildName);
        const memberCount = this.textMemberCount.replace(/{count}/g, this.memberCount);

        // Draw background
        ctx.fillStyle = this.colorBackground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let background = await Canvas.loadImage(this.backgroundImage);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        // Draw layer
        ctx.fillStyle = this.colorBorder;
        ctx.globalAlpha = this.opacityBorder;
        ctx.fillRect(0, 0, 25, canvas.height);
        ctx.fillRect(canvas.width - 25, 0, 25, canvas.height);
        ctx.fillRect(25, 0, canvas.width - 50, 25);
        ctx.fillRect(25, canvas.height - 25, canvas.width - 50, 25);
        ctx.fillStyle = this.colorUsernameBox;
        ctx.globalAlpha = this.opacityUsernameBox;
        ctx.fillRect(344, canvas.height - 296, 625, 65);
        ctx.fillStyle = this.colorMessageBox;
        ctx.globalAlpha = this.opacityMessageBox;
        ctx.fillRect(344, canvas.height - 196, 625, 160);

        // Draw username
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.colorUsername;
        ctx.font = applyText(canvas, this.username, 48, 600, this.font);
        ctx.fillText(this.username, canvas.width - 660, canvas.height - 248);

        // Draw guild name
        ctx.fillStyle = this.colorMessage;
        ctx.font = applyText(canvas, guildName, 65, 600, this.font);
        ctx.fillText(guildName, canvas.width - 670, canvas.height - 135);

        // Draw message
        ctx.fillStyle = this.colorMessage;
        ctx.font = `${35}px ${this.font}`;
        ctx.fillText(this.message, canvas.width - 660, canvas.height - 95);

        // Draw membercount
        ctx.fillStyle = this.colorMemberCount;
        ctx.font = `${35}px ${this.font}`;
        ctx.fillText(memberCount, canvas.width - 660, canvas.height - 55);

        // Draw title
        ctx.font = `${100}px ${this.font}`;
        ctx.strokeStyle = this.colorTitleBorder;
        ctx.lineWidth = 15;
        ctx.strokeText(this.textTitle, canvas.width - 575, canvas.height - 330);
        ctx.fillStyle = this.colorTitle;
        ctx.fillText(this.textTitle, canvas.width - 575, canvas.height - 330);

        // Draw avatar circle
        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = this.colorAvatar;
        ctx.arc(180, 225, 135, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.closePath();
        ctx.clip();
        const avatar = await Canvas.loadImage(this.avatar);
        ctx.drawImage(avatar, 45, 90, 270, 270);

        return canvas;
    }
};
