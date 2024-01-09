const axios = require('axios');

module.exports = {
  async close(interaction, client, reason) {
    const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
    if (!ticket) return interaction.reply({ content: 'Ticket not found', ephemeral: true }).catch(e => console.log(e));

    if (client.config.whoCanCloseTicket === 'STAFFONLY' && !interaction.member.roles.cache.some(r => client.config.rolesWhoHaveAccessToTheTickets.includes(r.id))) return interaction.reply({
      content: client.locales.ticketOnlyClosableByStaff,
      ephemeral: true
    }).catch(e => console.log(e));

    if (ticket.closed) return interaction.reply({
      content: client.locales.ticketAlreadyClosed,
      ephemeral: true
    }).catch(e => console.log(e));

    client.log("ticketClose", {
      user: {
        tag: interaction.user.tag,
        id: interaction.user.id,
        avatarURL: interaction.user.displayAvatarURL()
      },
      ticketId: ticket.id,
      ticketChannelId: interaction.channel.id,
      ticketCreatedAt: ticket.createdAt,
      reason: reason
    }, client);

    await client.db.set(`tickets_${interaction.channel.id}.closed`, true);
    await client.db.set(`tickets_${interaction.channel.id}.closedBy`, interaction.user.id);
    await client.db.set(`tickets_${interaction.channel.id}.closedAt`, Date.now());

    if (reason) {
      await client.db.set(`tickets_${interaction.channel.id}.closeReason`, reason);
    } else {
      await client.db.set(`tickets_${interaction.channel.id}.closeReason`, client.locales.other.noReasonGiven);
    }

    const creator = await client.db.get(`tickets_${interaction.channel.id}.creator`);
    const invited = await client.db.get(`tickets_${interaction.channel.id}.invited`);

    interaction.channel.permissionOverwrites.edit(creator, {
      ViewChannel: false,
    }).catch(e => console.log(e));

    invited.forEach(async user => {
      interaction.channel.permissionOverwrites.edit(user, {
        ViewChannel: false,
      }).catch(e => console.log(e));
    });

    interaction.reply({
      content: client.locales.ticketTranscriptCreated,
    }).catch(e => console.log(e));

    const messageId = await client.db.get(`tickets_${interaction.channel.id}.messageId`);
    const msg = interaction.channel.messages.cache.get(messageId);
    const embed = msg.embeds[0].data;

    msg.components[0].components.map(x => {
      if (x.data.custom_id === 'close') x.data.disabled = true;
      if (x.data.custom_id === 'close_askReason') x.data.disabled = true;
    });

    msg.edit({
      content: msg.content,
      embeds: [embed],
      components: msg.components
    }).catch(e => console.log(e));

    async function close() {
      const ticket = await client.db.get(`tickets_${interaction.channel.id}`);

      const row = new client.discord.ActionRowBuilder()
        .addComponents(
          new client.discord.ButtonBuilder()
            .setCustomId('deleteTicket')
            .setLabel(client.locales.other.deleteTicketButtonMSG)
            .setStyle(client.discord.ButtonStyle.Danger),
        );

      interaction.channel.send({
        embeds: [JSON.parse(JSON.stringify(client.locales.embeds.ticketClosed)
          .replace('TICKETCOUNT', ticket.id)
          .replace('REASON', ticket.closeReason.replace(/[\n\r]/g, '\\n'))
          .replace('CLOSERNAME', interaction.user.tag))],
        components: [row]
      }).catch(e => console.log(e));

      const tiketClosedDMEmbed = new client.discord.EmbedBuilder()
        .setColor(client.embeds.ticketClosedDM.color ? client.embeds.ticketClosedDM.color : client.config.mainColor)
        .setDescription(
          client.embeds.ticketClosedDM.description
          .replace('TICKETCOUNT', ticket.id)
          .replace('REASON', ticket.closeReason)
          .replace('CLOSERNAME', interaction.user.tag)
        )
        .setFooter({
          text: "AkiraNaito" + client.embeds.ticketClosedDM.footer.text.replace("AkiraNaito", ""),
          iconUrl: client.embeds.ticketClosedDM.footer.iconUrl
        });

      client.users.fetch(creator).then(user => {
        user.send({
          embeds: [tiketClosedDMEmbed]
        }).catch(e => console.log(e));
      });
    };

    close();
  }
};
