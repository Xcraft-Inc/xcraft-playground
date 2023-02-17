import "./style.css";
import loadingSrc from "./loading.html";
import { WebContainer } from "@webcontainer/api";

function writeToConsole(data) {
  const consoleEl = document.querySelector("#console");
  consoleEl.value += data;
  if (consoleEl.selectionStart == consoleEl.selectionEnd) {
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
}

let webcontainerInstance;
async function init() {
  // Call only once
  webcontainerInstance = await WebContainer.boot();
  //await webcontainerInstance.mount(filesTree);

  const exitCode = await installDependencies();
  if (exitCode !== 0) {
    throw new Error("Installation failed");
  }

  startDevServer();
}

async function installDependencies() {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn("npx", [
    "goblins@latest",
    "init",
    "demo",
    "api",
  ]);
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        writeToConsole(data);
      },
    })
  );
  // Wait for install command to exit
  return installProcess.exit;
}

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile(
    "/lib/goblin-demo/lib/api/controllers.js",
    content
  );
}

async function startDevServer() {
  // Run `npm run start` to start the Express app
  const runProcess = await webcontainerInstance.spawn("npm", ["run", "start"]);
  runProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        writeToConsole(data);
      },
    })
  );
  textareaEl.value = await webcontainerInstance.fs.readFile(
    "/lib/goblin-demo/lib/api/controllers.js",
    "utf-8"
  );
  textareaEl.addEventListener("input", (e) => {
    writeIndexJS(e.currentTarget.value);
  });
  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    iframeEl.src = `${url}/docs/index.html`;
    writeToConsole(`loading ${iframeEl.src}`);
  });
}

document.querySelector("#app").innerHTML = `
<div class="container">
  <div class="editor">
    <textarea id="editor">please wait...</textarea>
  </div>
  <div class="preview">
    <iframe src="${loadingSrc}"></iframe>
  </div>
</div>
<div class="container">
  <div class="editor">
    <textarea id="console" style="width:100vw;height:50vh;"></textarea>
  </div>
</div>`;
const iframeEl = document.querySelector("iframe");
const textareaEl = document.querySelector("#editor");
window.addEventListener("load", async () => {
  await init();
});
