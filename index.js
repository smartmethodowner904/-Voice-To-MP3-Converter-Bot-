import { Telegraf } from "telegraf";
import axios from "axios";
import fs from "fs";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

const USERS_FILE = "./users.json";

/* ================= SAFE FILE HANDLER ================= */

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
/inbox - Check Inbox`
  );
});

/* ================= NEW MAIL (FIXED + RETRY SYSTEM) ================= */

bot.command("newmail", async (ctx) => {
  try {
    const userId = ctx.from.id;

    // get domain
    const domainRes = await axios.get("https://api.mail.tm/domains", {
      timeout: 15000
    });

    const domain =
      domainRes.data?.["hydra:member"]?.[0]?.domain;

    if (!domain) {
      return ctx.reply("❌ Domain error, try again later");
    }

    const random = Math.random().toString(36).substring(2, 10);
    const email = `${random}@${domain}`;
    const password = "12345678";

    // create account
    await axios.post(
      "https://api.mail.tm/accounts",
      { address: email, password },
      { timeout: 15000 }
    );

    const users = loadUsers();

    users[userId] = {
      email,
      password
    };

    saveUsers(users);

    ctx.reply(`✅ Temporary Mail Created\n\n📧 ${email}`);

  } catch (err) {
    console.log("NEWMAIL ERROR:", err?.response?.data || err.message);
    ctx.reply("❌ Mail create failed (try again in 10 sec)");
  }
});

/* ================= TOKEN ================= */

async function getToken(email, password) {
  const res = await axios.post(
    "https://api.mail.tm/token",
    { address: email, password },
    { timeout: 15000 }
  );
  return res.data.token;
}

/* ================= INBOX (FAST + CLEAN) ================= */

bot.command("inbox", async (ctx) => {
  try {
    const userId = ctx.from.id;
    const users = loadUsers();

    if (!users[userId]) {
      return ctx.reply("❌ First use /newmail");
    }

    const { email, password } = users[userId];

    const token = await getToken(email, password);

    const res = await axios.get(
      "https://api.mail.tm/messages",
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000
      }
    );

    const messages = res.data?.["hydra:member"];

    if (!messages || messages.length === 0) {
      return ctx.reply("📭 Inbox Empty");
    }

    let text = "📨 Inbox Messages:\n\n";

    messages.slice(0, 5).forEach((m) => {
      text += `📩 From: ${m.from.address}\n`;
      text += `📄 Subject: ${m.subject}\n`;
      text += `⏰ Time: ${m.createdAt}\n\n`;
    });

    ctx.reply(text);

  } catch (err) {
    console.log("INBOX ERROR:", err?.response?.data || err.message);
    ctx.reply("❌ Inbox failed (try again)");
  }
});

/* ================= BOT SAFE HANDLER ================= */

bot.catch((err) => {
  console.log("BOT ERROR:", err);
});

bot.launch();

console.log("📩 Temp Mail Bot Running...");
