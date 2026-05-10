import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config.js";
import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("🎤 Send me a voice message, I will convert it to MP3 🎧");
});

bot.on("voice", async (ctx) => {
  try {
    const fileId = ctx.message.voice.file_id;
    const file = await ctx.telegram.getFile(fileId);

    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const inputPath = `voice.ogg`;
    const outputPath = `audio.mp3`;

    const res = await fetch(fileUrl);
    const buffer = await res.buffer();
    fs.writeFileSync(inputPath, buffer);

    ffmpeg(inputPath)
      .toFormat("mp3")
      .save(outputPath)
      .on("end", () => {
        ctx.replyWithAudio({ source: fs.createReadStream(outputPath) });

        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      });

  } catch (error) {
    console.log(error);
    ctx.reply("❌ Error converting voice!");
  }
});

bot.launch();
console.log("Bot is running...");
