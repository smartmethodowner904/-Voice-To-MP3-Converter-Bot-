import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "./config.js";
import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

const bot = new Telegraf(BOT_TOKEN);

// START MESSAGE
bot.start((ctx) => {
  ctx.reply("🎤 Send me a voice message\nI will convert it to MP3 🎧");
});

// VOICE HANDLER
bot.on("voice", async (ctx) => {
  try {
    const fileId = ctx.message.voice.file_id;

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const inputFile = "voice.ogg";
    const outputFile = "audio.mp3";

    const res = await fetch(fileUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(inputFile, Buffer.from(buffer));

    // convert with promise (IMPORTANT FIX)
    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .toFormat("mp3")
        .save(outputFile)
        .on("end", resolve)
        .on("error", reject);
    });

    // send file only if exists
    if (fs.existsSync(outputFile)) {
      await ctx.replyWithAudio({ source: fs.createReadStream(outputFile) });

      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    } else {
      ctx.reply("❌ MP3 file generate হয়নি!");
    }

  } catch (error) {
    console.log(error);
    ctx.reply("❌ Something went wrong!");
  }
});

// ERROR HANDLING (important for Railway)
bot.catch((err) => {
  console.log("Bot error:", err);
});

bot.launch();
console.log("🤖 Voice to MP3 Bot is running...");
