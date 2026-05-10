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

    const url = `https://www.minuteinbox.com/index.php?login=${username}`;

    const response = await axios.get(url);

    const $ = cheerio.load(response.data);

    let messages = [];

    $("table tr").each((i, el) => {

      // skip table header
      if (i === 0) return;

      const cols = $(el).find("td");

      if (cols.length >= 3) {

        const from = $(cols[0]).text().trim();
        const subject = $(cols[1]).text().trim();
        const time = $(cols[2]).text().trim();

        messages.push(
          `📨 From: ${from}\n📄 Subject: ${subject}\n⏰ Time: ${time}`
        );
      }
    });

    if (messages.length === 0) {
      return ctx.reply("📭 Inbox Empty");
    }

    ctx.reply(messages.slice(0, 5).join("\n\n"));

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
