import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config.js";
import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("🎤 Send voice message\nI will convert it to MP3 🎧");
});

bot.on("voice", async (ctx) => {
  try {
    const fileId = ctx.message.voice.file_id;

    const file = await ctx.telegram.getFile(fileId);
    if (!file.file_path) {
      return ctx.reply("❌ File not found!");
    }

    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const input = "voice.ogg";
    const output = "voice.mp3";

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream"
    });

    const writer = fs.createWriteStream(input);
    response.data.pipe(writer);

    writer.on("finish", () => {
      ffmpeg(input)
        .toFormat("mp3")
        .on("error", (err) => {
          console.log("FFMPEG ERROR:", err);
          ctx.reply("❌ Conversion failed!");
        })
        .on("end", () => {
          ctx.replyWithAudio({ source: fs.createReadStream(output) });

          fs.unlinkSync(input);
          fs.unlinkSync(output);
        })
        .save(output);
    });

  } catch (err) {
    console.log("BOT ERROR:", err);
    ctx.reply("❌ Something went wrong!");
  }
});

bot.launch();
console.log("🤖 Bot is running...");
