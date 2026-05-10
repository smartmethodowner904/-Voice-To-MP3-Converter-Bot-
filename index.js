import { Telegraf } from "telegraf";
import axios from "axios";
import fs from "fs";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

const USERS_FILE = "./users.json";

/* ================= DB ================= */

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "{}");
  }
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

/* ================= START ================= */

bot.start((ctx) => {
  ctx.reply(
`📩 Temp Mail Bot Ready

Commands:
/newmail - Create Email
/inbox - Check Inbox
/copy_0 - Copy Subject`
  );
});

/* ================= NEW MAIL ================= */

bot.command("newmail", async (ctx) => {
  try {
    const userId = ctx.from.id;

    const domainRes = await axios.get("https://api.mail.tm/domains");
    const domain = domainRes.data["hydra:member"]?.[0]?.domain;

    const random = Math.random().toString(36).substring(2, 10);
    const email = `${random}@${domain}`;
    const password = "12345678";

    await axios.post("https://api.mail.tm/accounts", {
      address: email,
      password
    });

    const users = loadUsers();
    users[userId] = {
      email,
      password,
      lastMessages: []
    };

    saveUsers(users);

    ctx.reply(`✅ Mail Created\n\n📧 ${email}`);

  } catch (err) {
    console.log(err?.response?.data || err.message);
    ctx.reply("❌ Mail create failed");
  }
});

/* ================= TOKEN ================= */

async function getToken(email, password) {
  const res = await axios.post("https://api.mail.tm/token", {
    address: email,
    password
  });

  return res.data.token;
}

/* ================= INBOX ================= */

bot.command("inbox", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const users = loadUsers();

    if (!users[userId]) {
      return ctx.reply("❌ Use /newmail first");
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

    const latest = messages.slice(0, 5);

    // save messages for copy system
    users[userId].lastMessages = latest;
    saveUsers(users);

    let text = "📨 Inbox Messages:\n\n";

    latest.forEach((m, i) => {
      text += `📩 From: ${m.from.address}\n`;
      text += `📄 Subject: /copy_${i}\n`;
      text += `⏰ Time: ${m.createdAt}\n\n`;
    });

    ctx.reply(text);

  } catch (err) {
    console.log(err?.response?.data || err.message);
    ctx.reply("❌ Inbox failed");
  }
});

/* ================= COPY SYSTEM ================= */

bot.command("copy_", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const users = loadUsers();

    const index = ctx.message.text.split("_")[1];

    if (!users[userId]?.lastMessages) {
      return ctx.reply("❌ No data found");
    }

    const msg = users[userId].lastMessages[index];

    if (!msg) {
      return ctx.reply("❌ Invalid message");
    }

    ctx.reply(`📋 Copied Subject:\n\n${msg.subject}`);

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Copy failed");
  }
});

/* ================= ERROR HANDLER ================= */

bot.catch((err) => console.log("BOT ERROR:", err));

bot.launch();

console.log("📩 Temp Mail Bot Running...");
