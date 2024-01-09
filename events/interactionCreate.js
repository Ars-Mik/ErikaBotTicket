const {PermissionFlagsBits} = require('discord.js');

module.exports = {
	name: 'interactionCreate',
	once: false,
  async execute(interaction, client) {
    async function createTicket(ticketType, reason, reason2, reason3, reason4, reason5) {
      const ticketName = client.config.ticketNameOption
      .replace('USERNAME', interaction.user.username)
      .replace('USERID', interaction.user.id)
      .replace('TICKETCOUNT', await client.db.get(`temp.ticketCount`) || 0);

      client.guilds.cache.get(client.config.guildId).channels.create({
        name: ticketName,
        parent: ticketType.categoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      }).then(async channel => {
        client.log("ticketCreate", {
          user: {
            tag: interaction.user.tag,
            id: interaction.user.id,
            avatarURL: interaction.user.displayAvatarURL()
          },
          reason: reason,
          reason2: reason2,
          reason3: reason3,
          reason4: reason4,
          reason5: reason5,
          ticketChannelId: channel.id
        }, client);

        await client.db.add(`temp.ticketCount`, 1);
        const ticketId = await client.db.get(`temp.ticketCount`);
        await client.db.set(`tickets_${channel.id}`, {
          id: ticketId-1,
          category: ticketType,
          reason: reason,
          reason2: reason2,
          reason3: reason3,
          reason4: reason4,
          reason5: reason5,
          creator: interaction.user.id,
          invited: [],
          createdAt: Date.now(),
          claimed: false,
          claimedBy: null,
          claimedAt: null,
          closed: false,
          closedBy: null,
          closedAt: null
        });

        channel.permissionOverwrites.edit(interaction.user, {
          SendMessages: true,
          AddReactions: true,
          ReadMessageHistory: true,
          AttachFiles: true,
          ViewChannel: true,
        }).catch(e => console.log(e));

        if (client.config.rolesWhoHaveAccessToTheTickets.length > 0) {
          client.config.rolesWhoHaveAccessToTheTickets.forEach(async role => {
            channel.permissionOverwrites.edit(role, {
              SendMessages: true,
              AddReactions: true,
              ReadMessageHistory: true,
              AttachFiles: true,
              ViewChannel: true,
            }).catch(e => console.log(e));
          });
        };

        const ticketOpenedEmbed = new client.discord.EmbedBuilder()
        .setColor(ticketType.color ? ticketType.color : client.config.mainColor)
        .setTitle(client.embeds.ticketOpened.title.replace('CATEGORYNAME', ticketType.name))
        .setDescription(
          ticketType.customDescription ? ticketType.customDescription
          .replace('CATEGORYNAME', ticketType.name)
          .replace('UUSER', `${interaction.user} (\`${interaction.user.id}\`)`)
          .replace('REASON', reason)
          .replace('REASON2', reason2)
          .replace('REASON3', reason3)
          .replace('REASON4', reason4)
          .replace('REASON5', reason5) :
          client.embeds.ticketOpened.description
          .replace('CATEGORYNAME', ticketType.name)
          .replace('UUSER', `${interaction.user} (\`${interaction.user.id}\`)`)
          .replace('REASON', reason)
          .replace('REASON2', reason2)
          .replace('REASON3', reason3)
          .replace('REASON4', reason4)
          .replace('REASON5', reason5))
          .setFooter({
          text: "AkiraNaito" + client.embeds.ticketOpened.footer.text.replace("AkiraNaito", ""),
          iconUrl: client.embeds.ticketOpened.footer.iconUrl })
          .setThumbnail(interaction.user.avatarURL({ dynamic: true }));

        const row = new client.discord.ActionRowBuilder()

        if (client.config.closeButton) {
          if (client.config.askReasonWhenClosing) {
            row.addComponents(
              new client.discord.ButtonBuilder()
                .setCustomId('close_askReason')
                .setLabel(client.locales.buttons.close.label)
                .setEmoji(client.locales.buttons.close.emoji)
                .setStyle(client.discord.ButtonStyle.Danger),
            );
          } else {
            row.addComponents(
              new client.discord.ButtonBuilder()
                .setCustomId('close')
                .setLabel(client.locales.buttons.close.label)
                .setEmoji(client.locales.buttons.close.emoji)
                .setStyle(client.discord.ButtonStyle.Danger),
            );
          }
        };

        if (client.config.claimButton) {
          row.addComponents(
            new client.discord.ButtonBuilder()
              .setCustomId('claim')
              .setLabel(client.locales.buttons.claim.label)
              .setEmoji(client.locales.buttons.claim.emoji)
              .setStyle(client.discord.ButtonStyle.Primary),
          );
        };

        const body = {
          embeds: [ticketOpenedEmbed],
          content: `<@${interaction.user.id}> ${client.config.pingRoleWhenOpened ? `<@&${client.config.roleToPingWhenOpenedId}>` : ''}`,
        };

        if (row.components.length > 0) body.components = [row];

        channel.send(body).then((msg) => {
          client.db.set(`tickets_${channel.id}.messageId`, msg.id);
          msg.pin().then(() => {
            msg.channel.bulkDelete(1);
          });
          interaction.update({
            content: client.locales.ticketOpenedMessage.replace('TICKETCHANNEL', `<#${channel.id}>`),
            components: [],
            ephemeral: true
          }).catch(e => console.log(e));
        }).catch(e => console.log(e));
      });
    };

    if (interaction.isButton()) {
      if (interaction.customId === "openTicket") {
        // Max ticket opened

        const all = (await client.db.all()).filter(data => data.id.startsWith("tickets_"));
        const ticketsOpened = all.filter(data => data.value.creator === interaction.user.id && data.value.closed === false).length;
        if (client.config.maxTicketOpened !== 0) { // If maxTicketOpened is 0, it means that there is no limit
          if(ticketsOpened > client.config.maxTicketOpened || ticketsOpened === client.config.maxTicketOpened) {
            return interaction.reply({
              content: client.locales.ticketLimitReached.replace("TICKETLIMIT", client.config.maxTicketOpened),
              ephemeral: true
            }).catch(e => console.log(e));
          };
        };

        // Make a select menus of all tickets types

        const row = new client.discord.ActionRowBuilder()
        .addComponents(
          new client.discord.SelectMenuBuilder()
            .setCustomId('selectTicketType')
            .setPlaceholder(client.locales.other.selectTicketTypePlaceholder)
            .setMaxValues(1)
            .addOptions(
              client.config.ticketTypes.map(x => {
                const options = new client.discord.SelectMenuOptionBuilder()
                options.setLabel(x.name)
                options.setValue(x.codeName)
                if (x.emoji) options.setEmoji(x.emoji)
                return options
              })
            ),
        );

        interaction.reply({
          ephemeral: true,
          components: [row]
        }).catch(e => console.log(e));
      };

      if (interaction.customId === "claim") {
        const {claim} = require('../utils/claim.js');
        claim(interaction, client);
      };

      if (interaction.customId === "close") {
        const {close} = require('../utils/close.js');
        close(interaction, client, client.locales.other.noReasonGiven);
      };

      if (interaction.customId === "close_askReason") {
        const {closeAskReason} = require('../utils/close_askReason.js');
        closeAskReason(interaction, client);
      };

      if (interaction.customId === "deleteTicket") {
        const {deleteTicket} = require("../utils/delete.js");
        deleteTicket(interaction, client);
      }
    };

    if (interaction.isSelectMenu()) {
      if (interaction.customId === "selectTicketType") {
        const ticketType = client.config.ticketTypes.find(x => x.codeName === interaction.values[0] );
        if (!ticketType) return console.error(`Вариант заявки ${interaction.values[0]} не был найден!`);
        if (ticketType.askReason && ticketType.codeName === "Kurator") {
          const modal = new client.discord.ModalBuilder()
          .setCustomId('askReason')
          .setTitle(client.locales.modals.reasonTicketOpen2.title);

          const input = new client.discord.TextInputBuilder() // Ваше имя и возраст?
          .setCustomId('input_'+interaction.values[0])
          .setLabel(client.locales.modals.reasonTicketOpen2.label)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen2.placeholder)
          .setMaxLength(50);

          const input2 = new client.discord.TextInputBuilder() // Сколько времени вы готовы уделять серверу?
          .setCustomId('input2')
          .setLabel(client.locales.modals.reasonTicketOpen2.label3)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen2.placeholder3)
          .setMaxLength(50);

          const input3 = new client.discord.TextInputBuilder() // "Был ли у вас опыт в данной сфере?"
          .setCustomId('input3')
          .setLabel(client.locales.modals.reasonTicketOpen2.label21)
          .setStyle(client.discord.TextInputStyle.Paragraph)
          .setPlaceholder(client.locales.modals.reasonTicketOpen2.placeholder21)
          .setMaxLength(50);

          const input4 = new client.discord.TextInputBuilder() // "Почему мы должны выбрать именно вас?"
          .setCustomId('input4')
          .setLabel(client.locales.modals.reasonTicketOpen2.label22)
          .setStyle(client.discord.TextInputStyle.Paragraph)
          .setPlaceholder(client.locales.modals.reasonTicketOpen2.placeholder22)
          .setMaxLength(199);

          const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
          const TwoActionRow   = new client.discord.ActionRowBuilder().addComponents(input2);
          const FreeActionRow  = new client.discord.ActionRowBuilder().addComponents(input3);
          const FourActionRow  = new client.discord.ActionRowBuilder().addComponents(input4);
          modal.addComponents(firstActionRow, TwoActionRow, FreeActionRow, FourActionRow);


          await interaction.showModal(modal).catch(e => console.log(e));
        } 
        else if (ticketType.askReason && ticketType.codeName === "Iventer") {
          const modal = new client.discord.ModalBuilder()
          .setCustomId('askReason2')
          .setTitle(client.locales.modals.reasonTicketOpen.title);

          const input = new client.discord.TextInputBuilder()  // Ваше имя и возраст?
          .setCustomId('input_'+interaction.values[0])
          .setLabel(client.locales.modals.reasonTicketOpen.label)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder)
          .setMaxLength(50);

          const input2 = new client.discord.TextInputBuilder() // "Какие ивенты вы сможете проводить?
          .setCustomId('input2')
          .setLabel(client.locales.modals.reasonTicketOpen.label2)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder2)
          .setMaxLength(60);

          const input3 = new client.discord.TextInputBuilder() // "Был ли у вас опыт в данной сфере?"
          .setCustomId('input3')
          .setLabel(client.locales.modals.reasonTicketOpen.label21)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder21)
          .setMaxLength(40);

          const input4 = new client.discord.TextInputBuilder() // "Как часто вы будете проводить ивенты?"
          .setCustomId('input4')
          .setLabel(client.locales.modals.reasonTicketOpen.label34)
          .setStyle(client.discord.TextInputStyle.Short)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder34)
          .setMaxLength(50);

          const input5 = new client.discord.TextInputBuilder() // Почему вы решили стать ивентером?
          .setCustomId('input5')
          .setLabel(client.locales.modals.reasonTicketOpen.label4)
          .setStyle(client.discord.TextInputStyle.Paragraph)
          .setPlaceholder(client.locales.modals.reasonTicketOpen.placeholder4)
          .setMaxLength(200);
          
          const firstActionRow = new client.discord.ActionRowBuilder().addComponents(input);
          const TwoActionRow   = new client.discord.ActionRowBuilder().addComponents(input2);
          const FreeActionRow  = new client.discord.ActionRowBuilder().addComponents(input3);
          const FourActionRow  = new client.discord.ActionRowBuilder().addComponents(input4);
          const FiveActionRow  = new client.discord.ActionRowBuilder().addComponents(input5);
          modal.addComponents(firstActionRow, TwoActionRow, FreeActionRow, FourActionRow, FiveActionRow);


          await interaction.showModal(modal).catch(e => console.log(e));
        };
      };

      if (interaction.customId === "removeUser") {
        const ticket = await client.db.get(`tickets_${interaction.message.channelId}`);
        client.db.pull(`tickets_${interaction.message.channel.id}.invited`, interaction.values);

        interaction.values.forEach(value => {
          interaction.channel.permissionOverwrites.delete(value).catch(e => console.log(e));

          client.log("userRemoved", {
            user: {
              tag: interaction.user.tag,
              id: interaction.user.id,
              avatarURL: interaction.user.displayAvatarURL()
            },
            ticketId: ticket.id,
            ticketChannelId: interaction.channel.id,
            removed: {
              id: value,
            }
          }, client);
        });

        interaction.update({
          content: `> Удаленный ${interaction.values.length < 1 ? interaction.values : interaction.values.map(a => `<@${a}>`).join(', ')} из заявки`,
          components: []
        }).catch(e => console.log(e));
      };
    };

    if (interaction.isModalSubmit()) {
      if (interaction.customId === "askReason") {
        const type = interaction.fields.fields.first().customId.split('_')[1];
        const ticketType = client.config.ticketTypes.find(x => x.codeName === type);

        const type2 = interaction.fields.getTextInputValue('input2');
        const type3 = interaction.fields.getTextInputValue('input3');
        const type4 = interaction.fields.getTextInputValue('input4');

        if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);

        createTicket(ticketType, interaction.fields.fields.first().value, type2, type3, type4);
      }
      else if (interaction.customId === "askReason2") {
        const type = interaction.fields.fields.first().customId.split('_')[1];
        const ticketType = client.config.ticketTypes.find(x => x.codeName === type);

        const type2 = interaction.fields.getTextInputValue('input2');
        const type3 = interaction.fields.getTextInputValue('input3');
        const type4 = interaction.fields.getTextInputValue('input4');
        const type5 = interaction.fields.getTextInputValue('input5');

        if (!ticketType) return console.error(`Ticket type ${interaction.values[0]} not found!`);

        createTicket(ticketType, interaction.fields.fields.first().value, type2, type3, type4, type5);
      };

      if (interaction.customId === "askReasonClose") {
        const {close} = require('../utils/close.js');
        close(interaction, client, interaction.fields.fields.first().value);
      }
    };
  },
};