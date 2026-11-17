const path = require("path");

module.exports = {
    installGlobals() {
        if (!global.GoatBot) {
            global.GoatBot = {
                config: { prefix: ".", nickNameBot: "TAHA BOT", adminBot: [] },
                botID: "61590284352509",
                startTime: Date.now(),
                fcaApi: null
            };
        }
        if (!global.utils) {
            global.utils = {
                getPrefix: () => global.GoatBot.config.prefix || ".",
                getTime: (fmt) => new Date().toLocaleTimeString("en-US", { hour12: false })
            };
        }
        if (!global.data) global.data = { threadData: new Map(), userData: new Map() };
        if (!global.temp) global.temp = {};
    },

    // GoatBot Command -> Mirai Command
    adaptCommandModule(mod) {
        if (typeof mod.run === "function") return; // Pehle se Mirai format
        if (mod.config && typeof mod.onStart === "function") {
            mod.config.commandCategory = mod.config.category || "general";
            mod.config.cooldowns = mod.config.countDown || 3;
            mod.config.usages = mod.config.guide?.en || "";

            mod.run = async function ({ api, event, args, Users }) {
                const fakeMessage = {
                    reply: (msg, callback) => {
                        if (typeof msg === "string") {
                            return api.sendMessage(msg, event.threadID, callback, event.messageID);
                        } else {
                            return api.sendMessage(msg, event.threadID, callback, event.messageID);
                        }
                    },
                    send: (msg, callback) => {
                        return api.sendMessage(msg, event.threadID, callback);
                    }
                };

                const fakeUsersData = {
                    getName: async (id) => {
                        try {
                            if (Users && Users.getName) return Users.getName(id) || "User";
                        } catch (e) {}
                        return "User_" + String(id).slice(-4);
                    },
                    getAvatarUrl: async (id) => `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
                };

                try {
                    await mod.onStart({
                        api: api,
                        event: event,
                        args: args,
                        message: fakeMessage,
                        usersData: fakeUsersData
                    });
                } catch (e) {
                    console.error(`[GoatBridge] Error in ${mod.config.name}:`, e);
                    fakeMessage.reply(`❌ Error: ${e.message}`);
                }
            };
        }
    },

    // GoatBot Event -> Mirai Event
    adaptEventModule(mod) {
        if (typeof mod.run === "function") return;
        if (mod.config && (typeof mod.onStart === "function" || typeof mod.onChat === "function")) {
            mod.run = async function ({ api, event, Users }) {
                try {
                    if (typeof mod.onStart === "function") {
                        await mod.onStart({
                            api: api,
                            event: event,
                            usersData: { getName: async (id) => Users?.getName?.(id) || "User" }
                        });
                    }
                    if (typeof mod.onChat === "function" && event.body) {
                        const fakeMessage = {
                            reply: (msg) => api.sendMessage(msg, event.threadID, event.messageID)
                        };
                        await mod.onChat({
                            api: api,
                            event: event,
                            message: fakeMessage,
                            usersData: { getName: async (id) => Users?.getName?.(id) || "User" }
                        });
                    }
                } catch (e) {
                    console.error(`[GoatBridge Event] Error in ${mod.config.name}:`, e);
                }
            };
        }
    }
};
