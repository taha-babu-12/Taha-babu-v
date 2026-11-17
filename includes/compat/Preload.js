const Module = require("module");
const path = require("path");
const runtime = require("./goatRuntime");

const COMMANDS_DIR = path.sep + path.join("Priyansh", "commands") + path.sep;
const EVENTS_DIR = path.sep + path.join("Priyansh", "events") + path.sep;

runtime.installGlobals();

const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
  const exported = originalRequire.apply(this, arguments);
  try {
    if (exported && typeof exported === "object" && exported.config && typeof request === "string") {
      let resolved = null;
      try { resolved = Module._resolveFilename(request, this); } catch (e) {}
      if (resolved) {
        if (resolved.includes(COMMANDS_DIR)) runtime.adaptCommandModule(exported);
        else if (resolved.includes(EVENTS_DIR)) runtime.adaptEventModule(exported);
      }
    }
  } catch (e) {
    console.log("[compat/preload] adapt error:", e.message);
  }
  return exported;
};

console.log("[compat/preload] Hybrid layer loaded for Priyansh/commands & Priyansh/events.");
