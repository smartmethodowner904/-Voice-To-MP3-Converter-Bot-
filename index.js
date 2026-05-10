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

/* ================= PRE-GENERATE MAILS ================= */

async function generateMail() {
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

/* ================= REFILL POOL ================= */

async function refillPool() {
  const data = load();

  while (data.pool.length < 10) {
    try {
      const mail = await generateMail();
      data.pool.push(mail);
    } catch (e) {
      console.log("Refill error");
    }
  }

  save(data);
}

setInterval(refillPool, 60000); // every 1 min

/* ================= START ================= */

bot.start((ctx) => {
  ctx.reply("📩 Temp Mail Bot Ready\n\n/newmail - Instant Mail\n/inbox - Check Mail");
});

/* ================= INSTANT MAIL ================= */

bot.command("newmail", async (ctx) => {
  try {
    const data = load();

    if (data.pool.length === 0) {
      await refillPool();
    }

    const mail = data.pool.pop();

    data.used[ctx.from.id] = mail;
    save(data);

    ctx.reply(`⚡ Instant Mail Ready\n\n📧 ${mail.email}`);

  } catch (err) {
    console.log(err);
    ctx.reply("❌ Try again");
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
    const data = load();
    const mail = data.used[ctx.from.id];

    if (!mail) return ctx.reply("❌ First use /newmail");

    const token = await getToken(mail.email, mail.password);

    const res = await axios.get("https://api.mail.tm/messages", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const messages = res.data["hydra:member"];

    if (!messages.length) return ctx.reply("📭 Inbox Empty");

    let text = "";

    messages.slice(0, 5).forEach(m => {
      text += `📩 ${m.from.address}\n📄 ${m.subject}\n\n`;
    });

    ctx.reply(text);

  } catch (err) {
    ctx.reply("❌ Inbox error");
  }
});

bot.launch();
console.log("⚡ FAST Temp Mail Bot Running...");
