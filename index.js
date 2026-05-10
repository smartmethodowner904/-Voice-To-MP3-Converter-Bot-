import { Telegraf } from "telegraf";
import axios from "axios";
import fs from "fs";
import { BOT_TOKEN } from "./config.js";

const bot = new Telegraf(BOT_TOKEN);

const FILE = "./users.json";

/* ================= FILE ================= */

function load() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ pool: [], used: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(FILE));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/* ================= BUTTON MENU ================= */

function mainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡ New Gmail Generate", callback_data: "newmail" }],
        [{ text: "📥 Mail Check", callback_data: "inbox" }],
        [{ text: "🆘 Admin Support", url: "https://t.me/Smart_Method_Owner" }]
      ]
    }
  };
}

/* ================= START ================= */

bot.start((ctx) => {
  ctx.reply("📩 Temp Mail Bot\n\nChoose option:", mainMenu());
});

/* ================= MAIL GENERATE ================= */

async function createMail() {
  const domainRes = await axios.get("https://api.mail.tm/domains");
  const domain = domainRes.data["hydra:member"][0].domain;

  const random = Math.random().toString(36).substring(2, 10);
  const email = `${random}@${domain}`;
  const password = "12345678";

  await axios.post("https://api.mail.tm/accounts", {
    address: email,
    password
  });

  return { email, password };
}

/* ================= GET TOKEN ================= */

async function getToken(email, password) {
  const res = await axios.post("https://api.mail.tm/token", {
    address: email,
    password
  });

  return res.data.token;
}

/* ================= CALLBACK HANDLER ================= */

bot.on("callback_query", async (ctx) => {
  const data = load();

  try {
    const action = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    /* ================= NEW MAIL ================= */
    if (action === "newmail") {

      const mail = await createMail();

      data.used[userId] = mail;
      save(data);

      return ctx.editMessageText(
        `📧 Your Mail Ready:\n\n${mail.email}`,
        mainMenu()
      );
    }

    /* ================= INBOX ================= */
    if (action === "inbox") {

      const mail = data.used[userId];

      if (!mail) {
        return ctx.editMessageText(
          "❌ First generate mail",
          mainMenu()
        );
      }

      const token = await getToken(mail.email, mail.password);

      const res = await axios.get("https://api.mail.tm/messages", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const messages = res.data["hydra:member"];

      if (!messages.length) {
        return ctx.editMessageText(
          "📭 Inbox Empty",
          mainMenu()
        );
      }

      let text = "📨 Inbox:\n\n";

      messages.slice(0, 5).forEach(m => {
        text += `📩 From: ${m.from.address}\n📄 ${m.subject}\n\n`;
      });

      return ctx.editMessageText(text, mainMenu());
    }

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Error occurred");
  }
});

/* ================= BOT ================= */

bot.launch();
console.log("📩 Smart Temp Mail Bot Running...");
