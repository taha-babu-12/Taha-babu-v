const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra"); // Mirai ke liye fs-extra best hai
const path = require("path");

module.exports.config = {
  name: "dewani",
  version: "31.0.5",
  hasPermssion: 0, 
  credits: "TAHA KHAN",
  description: "Dewani — Full Working AI Bot + YT Downloader",
  commandCategory: "ai",
  usages: "dewani <message | song/video name>",
  cooldowns: 2,
};

// ================== SHARED STATE ==================
const chatMemory = {};

const AI_BASE_URL = "https://taha-ai-api-7fxi.onrender.com";
const AI_MODEL = "gemini-3.5-flash";

const AUDIO_API = "https://azadx69x.is-a.dev/api/sing";
const VIDEO_API = "https://uzairrajputapis.qzz.io/api/downloader/youtube";
const YT_SEARCH = "https://azadx69x.is-a.dev/api/youtube-search"; // Base URL

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const OWNER_TAG = "»»𝐎𝐖𝐍𝐄𝐑««★™  »»𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍««";
const TRIGGER_WORDS = ["dewani", "bot"];

// ================== HELPERS ==================
function sendMsg(api, content, threadID, messageID) {
  return new Promise((resolve) => {
    api.sendMessage(content, threadID, (err, info) => resolve(info), messageID);
  });
}

function fileSizeGuard(maxBytes) {
  let received = 0;
  return new Transform({
    transform(chunk, _, cb) {
      received += chunk.length;
      if (received > maxBytes) {
        const e = new Error("File too large");
        e.code = "TOO_LARGE";
        return cb(e);
      }
      cb(null, chunk);
    },
  });
}

async function removeFile(p) {
  if (p && fs.existsSync(p)) {
    try { await fs.unlink(p); } catch {}
  }
}

async function getUserName(api, event, Users) {
  try {
    if (Users && Users.getNameUser) {
      const name = await Users.getNameUser(event.senderID);
      if (name) return name;
    }
  } catch (e) {}

  try {
    if (api && api.getUserInfo) {
      const info = await new Promise((resolve) => {
        api.getUserInfo(event.senderID, (err, data) => {
          if (err) return resolve(null);
          resolve(data);
        });
      });
      if (info && info[event.senderID]?.name) {
        return info[event.senderID].name;
      }
    }
  } catch (e) {}

  return "User_" + String(event.senderID).slice(-6);
}

function extractReply(data) {
  if (!data) return null;
  if (typeof data === "string" && data.length > 5) return data;
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  if (data.choices?.[0]?.text) return data.choices[0].text;
  if (data.response) return data.response;
  if (data.text) return data.text;
  if (data.message) return data.message;
  if (data.result) return data.result;
  if (data.answer) return data.answer;
  if (data.data) return typeof data.data === "string" ? data.data : JSON.stringify(data.data, null, 2);
  return JSON.stringify(data, null, 2);
}

async function askAI(prompt) {
  const endpoints = [
    "/v1/chat/completions", "/api/chat", "/chat", "/generate",
    "/api/generate", "/api/v1/chat/completions", "/api/v1/chat",
    "/v1/chat", "/ask", "/api/ask", "/api/completions", "/gemini", "/api/gemini",
  ];

  for (const endpoint of endpoints) {
    const url = AI_BASE_URL + endpoint;
    try {
      const res = await axios.post(url, {
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
      }, { timeout: 45000, headers: { "Content-Type": "application/json" } });
      const txt = extractReply(res.data);
      if (txt) return txt;
    } catch (e1) {
      if (e1.response && (e1.response.status === 400 || e1.response.status === 422)) {
        try {
          const res2 = await axios.post(url, {
            model: AI_MODEL,
            prompt: prompt,
          }, { timeout: 45000, headers: { "Content-Type": "application/json" } });
          const txt2 = extractReply(res2.data);
          if (txt2) return txt2;
        } catch (e2) {}
      }
    }
  }
  return null;
}

async function getYTInfo(query) {
  try {
    // 🔥 FIX: ?q= use kiya hai taake API sahi se search kare
    const { data } = await axios.get(YT_SEARCH, { params: { q: query }, timeout: 8000 });
    const video = data?.result?.[0] || data?.result?.items?.[0];
    if (video) return { url: video.url, title: video.title };
  } catch (e) {}

  try {
    const search = await yts(query);
    if (search.videos?.[0]) {
      return { url: search.videos[0].url, title: search.videos[0].title };
    }
  } catch (err) {}

  return null;
}

function isYouTubeUrl(text) {
  return /(youtube\.com|youtu\.be)/i.test(text);
}

// ================== DOWNLOADERS ==================
async function downloadAudio(api, event, query) {
  const { threadID, messageID, senderID } = event;
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  let filePath = null;

  if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

  try {
    const info = isYouTubeUrl(query)
      ? { url: query, title: "Requested Media" }
      : await getYTInfo(query);

    if (!info || !info.url) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return sendMsg(api, "Maafi jaanu, ye audio nahi mili 🥺💔", threadID, messageID);
    }

    const { data } = await axios.post(AUDIO_API, { url: info.url }, { timeout: 30000 });
    const downloadUrl = data?.result?.video || data?.result?.download_url || data?.result?.url || data?.download_url;

    if (!downloadUrl) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return sendMsg(api, "Maafi jaanu, iska download link nahi mil raha 🥺", threadID, messageID);
    }

    filePath = path.join(cacheDir, `dewani_${senderID}_${Date.now()}.mp3`);
    const res = await axios({ url: downloadUrl, method: "GET", responseType: "stream", timeout: 60000 });

    await pipeline(res.data, fileSizeGuard(MAX_FILE_SIZE), fs.createWriteStream(filePath));

    if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    
    // 🔥 FIX: Callback mein async fs.unlink use kiya hai taake error na aaye
    return api.sendMessage({
      body: `${OWNER_TAG}\n\n𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 MP3 file tayar hai! 💖\n🎵 Title: ${info.title}`,
      attachment: fs.createReadStream(filePath),
    }, threadID, (err) => {
        if(!err) removeFile(filePath);
    }, messageID);

  } catch (err) {
    if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
    await removeFile(filePath);
    return sendMsg(api, "Jaanu server busy hai, thodi der baad try karna 🥺", threadID, messageID);
  }
}

async function downloadVideo(api, event, query) {
  const { threadID, messageID, senderID } = event;
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  let filePath = null;

  if (api.setMessageReaction) api.setMessageReaction("⌛", messageID, () => {}, true);

  try {
    const info = isYouTubeUrl(query)
      ? { url: query, title: "Requested Media" }
      : await getYTInfo(query);

    if (!info || !info.url) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return sendMsg(api, "Maafi jaanu, ye video nahi mili 🥺💔", threadID, messageID);
    }

    const { data } = await axios.post(VIDEO_API, { url: info.url }, { timeout: 30000 });
    const downloadUrl = data?.result?.video || data?.result?.download_url || data?.result?.url || data?.download_url;

    if (!downloadUrl) {
      if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
      return sendMsg(api, "Maafi jaanu, iska download link nahi mil raha 🥺", threadID, messageID);
    }

    filePath = path.join(cacheDir, `dewani_${senderID}_${Date.now()}.mp4`);
    const res = await axios({ url: downloadUrl, method: "GET", responseType: "stream", timeout: 60000 });

    await pipeline(res.data, fileSizeGuard(MAX_FILE_SIZE), fs.createWriteStream(filePath));

    if (api.setMessageReaction) api.setMessageReaction("✅", messageID, () => {}, true);
    
    return api.sendMessage({
      body: `${OWNER_TAG}\n\n𝒀𝑬 𝑳𝑶 𝑩𝑨𝑩𝒀 𝑨𝑷𝑲𝑰👉 MP4 file tayar hai! 💖\n🎬 Title: ${info.title}`,
      attachment: fs.createReadStream(filePath),
    }, threadID, (err) => {
        if(!err) removeFile(filePath);
    }, messageID);

  } catch (err) {
    if (api.setMessageReaction) api.setMessageReaction("❌", messageID, () => {}, true);
    await removeFile(filePath);
    return sendMsg(api, "Jaanu server busy hai, thodi der baad try karna 🥺", threadID, messageID);
  }
}

// ================== AI CHAT ==================
async function handleAI(api, event, userMsg, Users) {
  const { threadID, messageID, senderID } = event;

  if (api.setMessageReaction) api.setMessageReaction("❤️", messageID, () => {}, true);

  const userName = await getUserName(api, event, Users);

  chatMemory[threadID] = chatMemory[threadID] || {};
  chatMemory[threadID][senderID] = chatMemory[threadID][senderID] || [];

  const userHistory = chatMemory[threadID][senderID];
  userHistory.push(`${userName}: ${userMsg}`);
  if (userHistory.length > 6) userHistory.shift();

  const historyText = userHistory.join("\n");

  const prompt = `You are Dewani.

SYSTEM INSTRUCTIONS:
• Fixed information ke answers kabhi change ya guess mat karna.

USER INFO:
• User ka naam: ${userName}

⚠️ STRICT LANGUAGE RULES (MUST FOLLOW):
1. IF the user speaks in ENGLISH, you MUST reply ONLY in ENGLISH (Do not use Roman Urdu).
2. IF the user speaks in ROMAN URDU (like "kaise ho"), you MUST reply ONLY in ROMAN URDU (Do not use English).
3. IF the user speaks in HINDI or BANGLA, reply in that exact same language.
4. NEVER mix languages. Match the user's language perfectly.

Golden Rules:
1 : Ap girlfriend jasi ho pyari or buth acha sa bat kro gyi.
2 : Koi pocha owner kon ha ya kis banya to bolna "TAHA KHAN NA BANYA".
3 : User jis language mein bole, usi language aur vibe mein reply dena 🙂.
4 : Reply playful, caring aur friendly hona chahiye 😌❤️.
5 : Reply maximum 1–2 short lines ka ho.
6 : Maximum 25–30 words mein jawab do.
7 : Emojis zarur use karo 😘❤️😌.

Chat History:
${historyText}

Dewani:`;

  try {
    const reply = await askAI(prompt);
    if (!reply) throw new Error("Koi endpoint kaam nahi kiya");

    let finalReply = reply;
    if (finalReply.length > 130) finalReply = finalReply.split(".")[0] + " 🫣";

    userHistory.push(`Dewani: ${finalReply}`);
    return sendMsg(api, finalReply, threadID, messageID);
  } catch (e) {
    console.error("[dewani AI Error]", e.message);
    return sendMsg(api, "Net issue hai baby, main thak gayi hoon 🥺", threadID, messageID);
  }
}

// ================== MAIN PROCESSOR ==================
async function processMessage(api, event, text, Users, isReplyToBot) {
  let cleanedMsg = text;

  TRIGGER_WORDS.forEach((w) => {
    const reg = new RegExp(`^${w}[\\s,!.?:-]*`, "gi");
    cleanedMsg = cleanedMsg.replace(reg, "");
  });
  cleanedMsg = cleanedMsg.trim();

  const isVideoReq = /\b(video|vdo|mp4)\b/i.test(cleanedMsg);
  const isAudioReq = /\b(song|music|audio|mp3|play|gana|gaana)\b/i.test(cleanedMsg);

  if ((isVideoReq || isAudioReq || isYouTubeUrl(cleanedMsg)) && cleanedMsg.length > 3) {
    let query = cleanedMsg
      .replace(/\b(video|vdo|mp4|song|music|audio|mp3|play|gana|gaana|dewani|bot|babu|baby|bby|jan|simi)\b/gi, "")
      .trim();
    if (isYouTubeUrl(cleanedMsg)) query = cleanedMsg;

    if (query) {
      if (isVideoReq) return downloadVideo(api, event, query);
      return downloadAudio(api, event, query);
    }
  }

  return handleAI(api, event, cleanedMsg || text, Users);
}

// ================== MIRAI HANDLERS ==================

// 🔹 Noprefix trigger — "bot" ya "dewani" se shuru hone wala message
module.exports.handleEvent = async function ({ api, event, Users }) {
  if (!event.body) return;

  const botID = api.getCurrentUserID ? api.getCurrentUserID() : global.data?.botID;
  if (String(event.senderID) === String(botID)) return;

  const body = event.body.trim();
  
  // Mirai mein prefix check safe tarike se
  const prefix = (global.config && global.config.PREFIX) ? global.config.PREFIX : ".";

  // Prefix wala message chhod do — woh run() handle karega
  if (body.startsWith(prefix)) return;

  const isReplyToBot =
    event.type === "message_reply" &&
    (String(event.messageReply?.senderID) === String(botID) ||
      String(event.messageReply?.author) === String(botID));

  let startsWithTrigger = false;
  for (const word of TRIGGER_WORDS) {
    const reg = new RegExp(`^${word}\\b`, "i");
    if (reg.test(body)) {
      const textAfterTrigger = body
        .replace(reg, "")
        .replace(/^[\s,!.?:-]+/, "")
        .trim();
      if (textAfterTrigger.length > 0) startsWithTrigger = true;
      break;
    }
  }

  if (isReplyToBot || startsWithTrigger) {
    return processMessage(api, event, body, Users, isReplyToBot);
  }
};

// 🔹 Prefix command — jaise `.dewani kaise ho`
module.exports.run = async function ({ api, event, args, Users }) {
  const text = args.join(" ").trim();
  if (!text) {
    return sendMsg(api, "Kuch to likho jaanu 🥺 jaise: .dewani kaise ho", event.threadID, event.messageID);
  }
  return processMessage(api, event, text, Users, false);
};
