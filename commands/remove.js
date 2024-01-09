const { SlashCommandBuilder, ActionRowBuilder, Events, SelectMenuBuilder } = require('discord.js');
const add = require('./add');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('Удалить заявку'),
	async execute(interaction, client) {
    const ticket = await client.db.get(`tickets_${interaction.channel.id}`);
    if (!ticket) return interaction.reply({content: 'Заявка не найдена', ephemeral: true}).catch(e => console.log(e));
    if (ticket.invited.length < 1) return interaction.reply({content: 'Нет пользователей, которых можно было бы удалить', ephemeral: true}).catch(e => console.log(e));
    
    for (let i = 0; i < ticket.invited.length; i++) {
      await client.users.fetch(ticket.invited[i]);
    }

    const addedUsers = ticket.invited.map(user => client.users.cache.get(user))

    const row = new ActionRowBuilder()
			.addComponents(
				new SelectMenuBuilder()
					.setCustomId('removeUser')
					.setPlaceholder('Пожалуйста, выберите пользователя для удаления')
          .setMinValues(1)
          .setMaxValues(ticket.invited.length)
					.addOptions(
            addedUsers.map(user => {
              return {
                label: user.tag,
                value: user.id
              }
            })
					),
			);

    interaction.reply({components: [row]}).catch(e => console.log(e));
	},
};