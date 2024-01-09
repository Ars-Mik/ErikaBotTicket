import Utils from "../utils/utils.js";
import Config from "../config.js";
import Discord from "discord.js";
const {
  ButtonBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
  InteractionType,
  ChannelType,
} = Discord;

export default (Bot) => {
  Bot.on("interactionCreate", async (interaction) => {
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId === "ticket") {
        let Questions = Config.TICKET.QUESTIONS.map((x) => x.LABEL);

        let fields = [];

        [interaction.fields].map((z) =>
          z.fields.map((x) => {
            fields.push(x);
          })
        );

        let Value = fields.map((x) => x.value);
        let Output = Value.map((x, i) => ({
          Questions: Questions[i],
          Value: x,
        }));
        let Content = Output.map(
          (x, index) =>
            `\n\`Вопрос ${index + 1}:\` **${x.Questions}** \n\`Ответ:\` **${
              x.Value
            }**`
        ).join("\n");

        const Channel = interaction.guild.channels.cache.find(
          (x) => x.name === "ticket" + "-" + interaction.user.id
        );

        await interaction.deferReply({ ephemeral: true });

        if (Channel) {
          interaction.followUp({
            content: `У вас уже есть заявка.`,
            ephemeral: true,
          });
        } else {
          let PermissionsArray = [
            {
              id: interaction.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.SendMessages,
              ],
            },
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
          ];

          Config.TICKET.STAFF_ROLES.map((x) => {
            PermissionsArray.push({
              id: x,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.SendMessages,
              ],
            });
          });

          interaction.guild.channels
            .create({
              name: "ticket" + "-" + interaction.user.id,
              type: ChannelType.GuildText,
              parent: Config.TICKET.CATEGORY,
              permissionOverwrites: PermissionsArray,
            })
            .then(async (Channel) => {
              interaction.followUp({
                content:
                  "Ваша заявка успешно была создана!",
                ephemeral: true,
              });

              Channel.send({
                embeds: [
                  Utils.embed(
                    `Информация о создателе заявки: \n${interaction.user} (\`${interaction.user.id}\`) \n${Content}`,
                    interaction.guild,
                    Bot,
                    interaction.user
                  ),
                ],
                components: [Utils.ticketButton()],
              });
            });
        }
      }
    }

    if (!interaction.isButton()) return;

    if (interaction.customId === "ticket") {
      await interaction.showModal(Utils.modal());
    }

    if (interaction.customId === "successTicket") {
      if (
        !Config.TICKET.STAFF_ROLES.some((x) =>
          interaction.member.roles.cache.has(x)
        ) &&
        ![interaction.guild.ownerId].includes(interaction.user.id)
      ) {
        await interaction.deferReply({ ephemeral: true });

        interaction.followUp({
          content: `Только администрация может принять данное решение.`,
          ephemeral: true,
        });

        return;
      } else {
        await interaction.update({
          components: [
            new ActionRowBuilder({
              components: [
                ButtonBuilder.from(
                  interaction.message.components[0].components[0]
                ).setDisabled(true),
                ButtonBuilder.from(
                  interaction.message.components[0].components[1]
                ),
                ButtonBuilder.from(
                  interaction.message.components[0].components[2]
                ),
              ],
            }),
          ],
        });

        interaction.followUp({
          content: `Ваша заявка была одобрена.`,
          ephemeral: true,
        });

        interaction.channel.send({
          content: `Поздравляю! <@!${interaction.channel.name.replace(
            "ticket-",
            ""
          )}>, ваша заявка была одобрена администрацией!`,
        });

        return;
      }
    }

 /*    if (interaction.customId === "archiveTicket") {
      await interaction.deferReply({ ephemeral: true });

      if (
        !Config.TICKET.STAFF_ROLES.some((x) =>
          interaction.member.roles.cache.has(x)
        ) &&
        ![interaction.guild.ownerId].includes(interaction.user.id)
      )
        return interaction.followUp({
          content: `Только администрация может архивировать заявку`,
          ephemeral: true,
        });

      if (interaction.channel.parentId === Config.TICKET.ARCHIVE_CATEGORY)
        return interaction.followUp({
          content: `Заявка уже была архивирована`,
          ephemeral: true,
        });

      let Parent = interaction.guild.channels.cache.get(
        Config.TICKET.ARCHIVE_CATEGORY
      );

      interaction.channel.permissionOverwrites.delete(
        interaction.channel.name.replace("ticket-", "")
      );

      interaction.channel
        .setParent(Parent.id, { lockPermissions: false })
        .then(async (x) => {
          x.setName(interaction.channel.name.replace("ticket", "archive"));

          interaction.message.edit({
            embeds: [
              Utils.embed(
                interaction.message.embeds.map((x) => x.description).join(""),
                interaction.guild,
                Bot,
                ""
              ),
            ],
            components: [],
          });

          interaction.followUp({
            content: `Заявка успешно архивирована.`,
            ephemeral: true,
          });
        });
    } */

    if (interaction.customId === "deleteTicket") {
      await interaction.deferReply({ ephemeral: true });

      let User = interaction.channel.name.replace("ticket-", "");

      if ([User].includes(interaction.user.id)) {
        if (
          interaction.message.components[0].components[0].data.disabled === true
        )
          return interaction.followUp({
            content: `Ваша заявка была одобрена администрацией, вы не можете её удалить.`,
            ephemeral: true,
          });
      } else {
        if (
          !Config.TICKET.STAFF_ROLES.some((x) =>
            interaction.member.roles.cache.has(x)
          ) &&
          ![interaction.guild.ownerId].includes(interaction.user.id)
        )
          return;
      }

      interaction.followUp({
        content: `Запрос получен. После \`5 секунд\` канал будет удален автоматически.`,
        ephemeral: true,
      });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {
          return undefined;
        });
      }, 1000 * 5);
    }
  });
};
