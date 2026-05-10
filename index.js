import { Telegraf } from "telegraf";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

const USERS_FILE = "./users.json";

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }

  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// START
bot.start((ctx) => {
  ctx.reply(
    `📩 Welcome To MinuteInbox Bot\n\nCommands:\n/newmail - Generate Mail\n/inbox - Check Inbox`
  );
});

// GENERATE TEMP MAIL
bot.command("newmail", async (ctx) => {
  try {
    const userId = ctx.from.id;

    const random = Math.random().toString(36).substring(2, 10);

    const mail = `${random}@minuteinbox.com`;

    const users = loadUsers();

    users[userId] = {
      email: mail
    };

    saveUsers(users);

    ctx.reply(
      `✅ Temporary Mail Created\n\n📧 ${mail}`
    );

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Failed to generate mail");
  }
});

// CHECK INBOX
bot.command("inbox", async (ctx) => {
  try {
    const userId = ctx.from.id;

    const users = loadUsers();

    if (!users[userId]) {
      return ctx.reply("❌ First create mail using /newmail");
    }

    const email = users[userId].email;

    const username = email.split("@")[0];

    // Example inbox url
    const url = `https://www.minuteinbox.com/index.php?login=${username}`;

    const response = await axios.get(url);

    const $ = cheerio.load(response.data);

    let messages = [];

    $("table tr").each((i, el) => {
      const text = $(el).text().trim();

      if (text.length > 5) {
        messages.push(text);
      }
    });

    if (messages.length === 0) {
      return ctx.reply("📭 Inbox Empty");
    }

    const latest = messages.slice(0, 5).join("\n\n");

    ctx.reply(`📨 Inbox Messages:\n\n${latest}`);

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Failed to fetch inbox");
  }
});

// ERROR HANDLER
bot.catch((err) => {
  console.log("Bot Error:", err);
});

bot.launch();

console.log("📩 MinuteInbox Bot Running...");
