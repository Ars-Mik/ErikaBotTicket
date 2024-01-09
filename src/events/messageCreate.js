import Utils from "../utils/utils.js";
import Config from "../config.js";
import Discord from "discord.js";
const { ButtonStyle } = Discord;

export default (Bot) => {
  Bot.on("messageCreate", (message) => {
    const Prefix = message.content.toLowerCase().startsWith(Config.PREFIX);

    if (!Prefix && !message.guild) return;

    const Args = message.content.split(" ").slice(1);
    const Command = message.content.split(" ")[0].slice(Config.PREFIX.length);

    if (Command === "ticket") {
      if (!message.member.permissions.has("0x0000000000000008"))
        return message.reply({
          content: "У вас нет прав на использование этой команды.",
        });

      message.delete().catch(() => {
        return undefined;
      });

      let TicketChannel = message.guild.channels.cache.get(
        Config.TICKET.CHANNEL
      );

      if (!TicketChannel)
        return message.reply({
          content: "Пожалуйста, укажите идентификатор канала заявки в конфигурационном файле.",
        });

      TicketChannel.send({
        embeds: [Utils.embed(Config.TICKET.MESSAGE, message.guild, Bot, "")],
        components: [
          Utils.button(
            ButtonStyle.Primary,
            "Создать заявку!",
            "🎫",
            "ticket",
            false
          ),
        ],
      });

      return message.channel.send(`Отправляет сообщение в ${TicketChannel}`);
    }
  });
};
