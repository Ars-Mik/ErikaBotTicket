module.exports = {
  async log(logsType, logs, client) {
    if (!client.config.logs) return;
    if (!client.config.logsChannelId) return;
    const channel = await client.channels.fetch(client.config.logsChannelId).catch(e => console.error("Канал для логов не найден!\n", e));
    if (!channel) return console.error("Канал для логов не найден!");

    let webhooks = await channel.fetchWebhooks()
    if (webhooks.size === 0) {
      await channel.createWebhook({ name: "Логи заявок"});
      webhooks = await channel.fetchWebhooks();
    }
    const webhook = webhooks.first();

    if (logsType === "ticketCreate") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("3ba55c")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) отправил(а) заявку в (<#${logs.ticketChannelId}>)`);

      webhook.send({
        username: "Заявка Создана",
        avatarURL: "https://i.imgur.com/M38ZmjM.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };

    if (logsType === "ticketClaim") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("faa61a")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) подтверждает заявку n°${logs.ticketId} (<#${logs.ticketChannelId}>) после ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} создания`);

      webhook.send({
        username: "Заявка подтверждена",
        avatarURL: "https://i.imgur.com/qqEaUyR.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };

    if (logsType === "ticketClose") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("ed4245")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) закрыл(а) заявку n°${logs.ticketId} (<#${logs.ticketChannelId}>) с причиной: \`${logs.reason}\` после ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} создания заявки`);

      webhook.send({
        username: "Заявка закрыта",
        avatarURL: "https://i.imgur.com/5ShDA4g.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };

    if (logsType === "ticketDelete") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("ed4245")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) удалил(а) заявку n°${logs.ticketId} после ${client.msToHm(new Date(Date.now() - logs.ticketCreatedAt))} создания\n`);

      webhook.send({
        username: "Заявка удалена",
        avatarURL: "https://i.imgur.com/obTW2BS.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };

    if (logsType === "userAdded") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("3ba55c")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) Добавлен <@${logs.added.id}> (${logs.added.id}) в заявку n°${logs.ticketId} (<#${logs.ticketChannelId}>)`);

      webhook.send({
        username: "Пользователь добавлен",
        avatarURL: "https://i.imgur.com/G6QPFBV.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };

    if (logsType === "userRemoved") {
      const embed = new client.discord.EmbedBuilder()
      .setColor("ed4245")
      .setAuthor({ name: logs.user.tag, iconURL: logs.user.avatarURL })
      .setDescription(`${logs.user.tag} (<@${logs.user.id}>) удалил(а) <@${logs.removed.id}> (${logs.removed.id}) из заявки n°${logs.ticketId} (<#${logs.ticketChannelId}>)`);

      webhook.send({
        username: "Пользователь удален",
        avatarURL: "https://i.imgur.com/eFJ8xxC.png",
        embeds: [embed]
      }).catch(e => console.log(e));
    };
  }
};