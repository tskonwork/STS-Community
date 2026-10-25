const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!BOT_TOKEN) {
  throw new Error("Set the BOT_TOKEN environment variable before starting the bot.");
}

if (!CLIENT_ID) {
  throw new Error("Set the CLIENT_ID environment variable before starting the bot.");
}

const sayCommand = new SlashCommandBuilder()
  .setName("сказать")
  .setDescription("Отправить сообщение от имени бота")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((option) =>
    option
      .setName("текст")
      .setDescription("Текст сообщения")
      .setRequired(true)
      .setMaxLength(2000),
  );

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: [sayCommand.toJSON()] });
  console.log(GUILD_ID ? `Registered commands in guild ${GUILD_ID}.` : "Registered global commands.");
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "сказать") {
    return;
  }

  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!isAdmin) {
    await interaction.reply({
      content: "Эта команда доступна только администраторам сервера.",
      ephemeral: true,
    });
    return;
  }

  const text = interaction.options.getString("текст", true);

  try {
    await interaction.deferReply({ ephemeral: true });
    await interaction.channel.send({
      content: text,
      allowedMentions: { parse: [] },
    });
    await interaction.editReply("Сообщение отправлено от имени бота.");
  } catch (error) {
    console.error("Could not send the /сказать message:", error);
    if (interaction.deferred) {
      await interaction.editReply("Не удалось отправить сообщение. Проверьте права бота в канале.");
    } else if (!interaction.replied) {
      await interaction.reply({
        content: "Не удалось отправить сообщение. Проверьте права бота в канале.",
        ephemeral: true,
      });
    }
  }
});

client.once("ready", () => {
  console.log(`Bot ${client.user.tag} is online.`);
});

async function start() {
  await registerCommands();
  await client.login(BOT_TOKEN);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    client.destroy();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error("Bot failed to start:", error);
  process.exitCode = 1;
});
