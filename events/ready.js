const readline = require('readline');

module.exports = {
	name: 'ready',
	once: true,
	async execute(client) {
    if (!client.guilds.cache.get(client.config.guildId).members.me.permissions.has("Administrator")) {
      console.log("\n⚠️⚠️⚠️ I don't have the Administrator permission, to prevent any issues please add the Administrator permission to me. ⚠️⚠️⚠️");
      process.exit(0);
    }

    async function sendEmbedToOpen() {
      const embedMessageId = await client.db.get("temp.openTicketMessageId");
      const openTicketChannel = await client.channels.fetch(client.config.openTicketChannelId).catch(e => console.error("The channel to open tickets is not found!\n", e));
        if (!openTicketChannel) return console.error("The channel to open tickets is not found!");
      await openTicketChannel.messages.fetch(embedMessageId)
      .catch(e => console.error("Error when trying to fetch openTicketMessage:\n", e))

      try {if (embedMessageId) openTicketChannel.messages.cache.get(embedMessageId).delete();} catch (e) {console.error}
      let embed = client.embeds.openTicket;

      embed.color = parseInt(client.config.mainColor, 16);
      embed.footer.text = "AkiraNaito" + client.embeds.ticketOpened.footer.text.replace("AkiraNaito", "") // Please respect the LICENSE :D

      const row = new client.discord.ActionRowBuilder()
			.addComponents(
				new client.discord.ButtonBuilder()
					.setCustomId('openTicket')
					.setLabel(client.locales.other.openTicketButtonMSG)
					.setStyle(client.discord.ButtonStyle.Primary),
			);

      try { openTicketChannel.send({
        embeds: [embed],
        components: [row]
      })
      .then(msg => {
        client.db.set("temp.openTicketMessageId", msg.id);
      }) } catch(e) {console.error}
    };

    sendEmbedToOpen();

    readline.cursorTo(process.stdout, 0);
    process.stdout.write(` 🚀 Запуск! Бот: ${client.user.tag} ( ID Бота: ${client.user.id} )  🌟`);
	},
};
