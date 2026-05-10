import { Telegraf } from "telegraf";
import axios from "axios";
import fs from "fs";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

const USERS_FILE = "./users.json";

// load/save
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "{}");
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// START
bot.start((ctx) => {
  ctx.reply(
    "📩 Temp Mail Bot Ready\n\nCommands:\n/newmail - Create Email\n/inbox - Check Inbox"
  );
});

// CREATE MAIL (Mail.tm API)
bot.command("newmail", async (ctx) => {
  try {
    const userId = ctx.from.id;

    // get domains
    const domainRes = await axios.get("https://api.mail.tm/domains");
    const domain = domainRes.data["hydra:member"][0].domain;

    const random = Math.random().toString(36).substring(2, 10);
    const email = `${random}@${domain}`;
    const password = "12345678";

    // create account
    await axios.post("https://api.mail.tm/accounts", {
      address: email,
      password: password
    });

    const users = loadUsers();

    users[userId] = {
      email,
      password,
      token: null
    };

    saveUsers(users);

    ctx.reply(`✅ Temporary Mail Created\n\n📧 ${email}`);

  } catch (err) {
    console.log(err.response?.data || err);
    ctx.reply("❌ Failed to create mail");
  }
});

// GET TOKEN
async function getToken(email, password) {
  const res = await axios.post("https://api.mail.tm/token", {
    address: email,
    password: password
  });

  return res.data.token;
}

// INBOX
bot.command("inbox", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const users = loadUsers();

    if (!users[userId]) {
      return ctx.reply("❌ First use /newmail");
    }

    const { email, password } = users[userId];

    const token = await getToken(email, password);

    const res = await axios.get("https://api.mail.tm/messages", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const messages = res.data["hydra:member"];

    if (!messages || messages.length === 0) {
      return ctx.reply("📭 Inbox Empty");
    }

    let output = "";

    messages.slice(0, 5).forEach((m) => {
      output += `📨 From: ${m.from.address}\n`;
      output += `📄 Subject: ${m.subject}\n`;
      output += `⏰ Date: ${m.createdAt}\n\n`;
    });

    ctx.reply(output);

  } catch (err) {
    console.log(err.response?.data || err);
    ctx.reply("❌ Inbox fetch failed");
  }
});

// ERROR HANDLER
bot.catch((err) => console.log("Bot Error:", err));

bot.launch();
console.log("📩 Temp Mail Bot Running...");
