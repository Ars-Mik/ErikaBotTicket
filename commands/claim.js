const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('claim')
		.setDescription('Подтвердить заявку.'),
	async execute(interaction, client) {
    const {claim} = require('../utils/claim.js');
    claim(interaction, client);
	},
};