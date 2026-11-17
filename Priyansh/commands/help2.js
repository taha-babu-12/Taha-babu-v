module.exports.config = {
	name: "help2",
	version: "2.5.0",
	hasPermssion: 0,
	credits: "𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍",
	description: "🍓 Cute Help Menu — Beginner's Guide",
	commandCategory: "system",
	usages: "[command name]",
	cooldowns: 1,
	envConfig: {
		autoUnsend: true,
		delayUnsend: 300
	}
};

module.exports.languages = {
	"en": {
		"moduleInfo":
`╔═══════════════════╗
   🌸 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎 🌸
╚═══════════════════╝

┏━━━━━━━━━━━━━━━━━━━┓
┃  🎀 𝐍𝐚𝐦𝐞        : %1
┃  📝 𝐃𝐞𝐬𝐜𝐫𝐢𝐩𝐭𝐢𝐨𝐧 : %2
┗━━━━━━━━━━━━━━━━━━━┛

✦ 𝐔𝐬𝐚𝐠𝐞      : %3
✦ 𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐲    : %4
✦ 𝐂𝐨𝐨𝐥𝐝𝐨𝐰𝐧    : %5 s ⏱️
✦ 𝐏𝐞𝐫𝐦𝐢𝐬𝐬𝐢𝐨𝐧  : %6

╔═══════════════════╗
  ✨ 𝐁𝐲 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ✨
╚═══════════════════╝`,
		"helpList": '🍓 𝐓𝐨𝐭𝐚𝐥 %1 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬!\n💫 𝐔𝐬𝐞: "%2help <commandName>" 🎀',
		"user": "👤 User",
		"adminGroup": "👑 Group Admin",
		"adminBot": "⚡ Bot Admin"
	}
};

module.exports.handleEvent = function ({ api, event, getText }) {
	const { commands } = global.client;
	const { threadID, messageID, body } = event;

	if (!body || typeof body == "undefined" || body.indexOf("help") != 0) return;
	const splitBody = body.slice(body.indexOf("help")).trim().split(/\s+/);
	if (splitBody.length == 1 || !commands.has(splitBody[1].toLowerCase())) return;
	const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
	const command = commands.get(splitBody[1].toLowerCase());
	const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;
	return api.sendMessage(getText("moduleInfo", command.config.name, command.config.description, `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`, command.config.commandCategory, command.config.cooldowns, ((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")), command.config.credits), threadID, messageID);
};

module.exports.run = function ({ api, event, args, getText }) {
	const { commands } = global.client;
	const { threadID, messageID } = event;
	const command = commands.get((args[0] || "").toLowerCase());
	const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
	const { autoUnsend, delayUnsend } = global.configModule[this.config.name];
	const prefix = (threadSetting.hasOwnProperty("PREFIX")) ? threadSetting.PREFIX : global.config.PREFIX;

	if (!command) {
		const arrayInfo = [];
		const page = parseInt(args[0]) || 1;
		const numberOfOnePage = 9999;
		let i = 0;
		let msg = "";

		for (var [name, value] of (commands)) {
			name += ``;
			arrayInfo.push(name);
		}

		arrayInfo.sort((a, b) => a.data - b.data);

		const startSlice = numberOfOnePage * page - numberOfOnePage;
		i = startSlice;
		const returnArray = arrayInfo.slice(startSlice, startSlice + numberOfOnePage);

		for (let item of returnArray) {
			msg += `  ╰┈➤ ${prefix}${item}  🍒\n`;
		}

		const header =
`╔══════════════════════╗
    ✨ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐋𝐈𝐒𝐓 ✨
╚══════════════════════╝

  🌸 𝐎𝐰𝐧𝐞𝐫  : 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍
  🎀 𝐁𝐨𝐭    : 𝐃𝐞𝐰𝐚𝐧𝐢 ✨
  💫 𝐏𝐫𝐞𝐟𝐢𝐱 : ${prefix}
  📄 𝐏𝐚𝐠𝐞   : ${page}/${Math.ceil(arrayInfo.length / numberOfOnePage)}

╔══════════════════════╗
   💗 𝐀𝐕𝐀𝐈𝐋𝐀𝐁𝐋𝐄 𝐂𝐌𝐃𝐒 💗
╚══════════════════════╝

`;

		const footer =
`

╔══════════════════════╗
  💖 𝐓𝐡𝐚𝐧𝐤 𝐘𝐨𝐮 𝐁𝐚𝐛𝐲 💖
  🦋 𝐒𝐭𝐚𝐲 𝐇𝐚𝐩𝐩𝐲 ✨
  ── 𝐓𝐀𝐇𝐀 𝐊𝐇𝐀𝐍 ──
╚══════════════════════╝`;

		return api.sendMessage(header + msg + footer, threadID, async (error, info) => {
			if (autoUnsend) {
				await new Promise(resolve => setTimeout(resolve, delayUnsend * 1000));
				return api.unsendMessage(info.messageID);
			} else return;
		}, event.messageID);
	}

	return api.sendMessage(getText("moduleInfo", command.config.name, command.config.description, `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`, command.config.commandCategory, command.config.cooldowns, ((command.config.hasPermssion == 0) ? getText("user") : (command.config.hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")), command.config.credits), threadID, messageID);
};
