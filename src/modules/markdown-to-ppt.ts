import {
  base64,
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPISkippableModules,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

const args = getCommandLineArgs({
  highlightSupport: true,
  graphvizSupport: true,
  autotocSupport: true,
  embeddedYoutubeLinks: true,
  addEditInVimLink: true,
  changeHtmlLinksToVim: true,
});

// TODO
// - Submit the metadata feature to the revealjs guys

const markdownToPptHandler = (
  message: PipeServerAPIv03 & PipeServerAPISkippableModules,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=markdown
  if (message.reply.type !== "markdown" || message.reply.body === undefined) {
    return message;
  }

  pipe.debug("Converting markdown to presentation");

  message.reply.body = htmlTemplate(
    message.reply.body!,
    message.request.fullUrl,
  );
  message.reply.type = "html";

  // skip server side rendering for this page for now
  message.request.skipModules?.push("ssr-html-page");

  return message;
};

const revealjsSupport = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/reset.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/reveal.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/theme/moon.min.css">

  <!-- Theme used for syntax highlighted code -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/plugin/highlight/monokai.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/reveal.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/plugin/notes/notes.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/plugin/markdown/markdown.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.4.0/plugin/highlight/highlight.min.js"></script>
  <script>

  function decodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  window.addEventListener('load', () => {

      text = document.getElementById("markdown-source").textContent,
      markdown = decodeUnicode(text);

      if(markdown.slice(0,3) === '---'){
        toRemove = markdown.match(/(^---)([\\S\\s]*?)(^---)/m).join("\\n");
        console.log("contains metatags, removing", toRemove);
        markdown = markdown.replace(/(^---)([\\S\\s]*?)(^---)/m, '');
      }

      var target = document.getElementById("markdown-target");
      target.innerHTML = markdown;

      // More info about initialization & config:
			// - https://revealjs.com/initialization/
			// - https://revealjs.com/config/
			Reveal.initialize({
				hash: true,
				// Learn about plugins: https://revealjs.com/plugins/
				plugins: [ RevealMarkdown, RevealHighlight, RevealNotes ]
			});

      // remove the markdown source from the document
      document.getElementById("markdown-source").remove()
    });
    </script>
`;

const addEditInVimLink = `
<script>
window.addEventListener('load', () => {
  const element = document.getElementById("markdown-url");
  const source_url = (element)?element.textContent:window.location.href;
  const description = "[edit in vIM]";
  const body = element.parentElement;
  const anchor = document.createElement('a');
  anchor.href = source_url;
  anchor.setAttribute("type","vim");
  anchor.style = 'position:fixed;right:20px;top:0;color:white;';
  anchor.appendChild(document.createTextNode(description));
  
  body.appendChild(anchor);

  // remove the markdown url from the document
  document.getElementById("markdown-url").remove()
});
</script>
`;

const changeHtmlLinksToVim = `
  <script>
    // changes all anchors marked with "vim" to vim links
    window.addEventListener('load', () => {
      let allLinks = document.getElementsByTagName("A");
      let properArray = [];
      for(let i=0;i<allLinks.length;i++){
        properArray.push(allLinks.item(i));
      }
  
      properArray.forEach(element => {
        if(element.type === "vim"){
          
          const textNode = document.createTextNode("\u00A0"); // &nbsp;
          const newElement = element.cloneNode(true);
          
          const href = element.href.replace("http://","vim://").replace("https://","vims://");
          newElement.href = href;
          newElement.setAttribute("class", "svg-icon-anchor");
          newElement.removeAttribute("type");
          delete newElement.type;
  
          const span = document.createElement('span');
          span.setAttribute("class", "svg-icon");
  
          newElement.appendChild(textNode);
          newElement.appendChild(span);
          newElement.setAttribute("title", "edit file in vIM");
  
          const parent = element.parentElement;
          element.parentElement.replaceChild(newElement, element);
  
          const newParentClassElements = (parent.getAttribute("class") || "") + " no-bottom-margin";
          parent.setAttribute("class", newParentClassElements.trim());
        }
      });
  
      document.getElementById("vim-svg").remove();
    });
  </script>
  `;

const baseCss = /* css */ `
a.svg-icon-anchor {
  display: flex;
  align-items: center;
  justify-content: center;
}

.svg-icon {
  background: transparent url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3 NjAiIGhlaWdodD0iNzUwIiBmaWxsPSJub25lIiB4bWxuczp2PSJodHRwczovL3Zl Y3RhLmlvL25hbm8iPjxwYXRoIGQ9Ik02NiA2NmwxMi0yM2gyMzFsMTQ2IDUzIDIy LTUzIDI1Mi01IDE2IDUwLTEzMiAxNDB2Mjg5bDMwIDcgMTUtMjBoNDRsMTUgMjAt MzcgMTE5IDEzIDctNiAxNmgtNjVsMzAtMTEyaC00OGwtMzEgODkgOSA3djE2aC02 MWwyMC03My00NCA2LTIwIDY3LTE1OCA3LTc1LTYzLTUwIDQ4aC04M2wtMTAtNTMy LTM1LTI0VjY2eiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik03NjAgMzc0LjU2Mmgt Ljg1NUw2MjIuNDA4IDIzOS42MjUgNzU4LjY3IDEwMS42ODhWNDUuNjU2bC0yMC41 NTItMjAuMjVINDc4LjUxNWwtMjAuOSAxOC45MDZ2MzIuNjU2TDM4MC40NzUuODQ0 VjBMMzgwIC40MzggMzc5LjU1NyAwdi44NDRsLTQwLjg1IDQwLjM0NC0xNy4wMzct MTYuODQ0SDY0LjQ0Mkw0NC4yMzggNDUuOTY5djU4LjkwNmwxOS41MDcgMTkuMjVo MjIuOHYxNjUuOTM3TC44NTUgMzc0LjU5NEgwbC40NDMuNDA2LS40NDMuNDM4aC44 NTVMODYuNTQ1IDQ2MHYyMDIuMDk0bDI4LjcyMiAxNi4zNDRoNzMuNTNsNTguODA1 LTU5LjUgMTMxLjkyMyAxMzAuMTg3Vjc1MGwuNDc1LS40MzguNDQzLjQzOHYtLjg3 NWw3OS40ODQtNzguNDA2aDE1LjM1OGMzLjUxNSAwIDYuNjgyLTIuMTg4IDcuOTE3 LTUuNTk0bDQuNjIzLTEzLjMxM2E4LjExIDguMTEgMCAwIDAtMS4xNzItNy40Njhs NDYuMjk3LTQ1LjY4OC0xOS4zOCA2MS4zMTNjLTEuMzYyIDQuNDA2IDEuMTQgOS4w MzEgNS42MDUgMTAuMzc1YTguMzEgOC4zMSAwIDAgMCAyLjQ3LjM3NWg1Ny43NmMz LjM1Ny0uMDMxIDYuMzY1LTIgNy42OTUtNS4wOTRsNS4yMjUtMTIuMzEzYy43OTIt Mi4wMzEuNzYtNC4zMTItLjEyNy02LjM0My0uODU1LTIuMDMxLTIuNTMzLTMuNjI1 LTQuNjIzLTQuNDM4LS45MTgtLjM3NS0xLjk2My0uNTkzLTMuMDcyLS42MjVoLTIu Mzc1bDI2LjYtODIuNjI1aDM5LjAxNGwtMzIuMTc0IDEwMC42NTdjLTEuMzYxIDQu NDA2IDEuMTQgOS4wMzEgNS41NzQgMTAuMzc0Ljc5MS4yNSAxLjY0Ni4zNzYgMi41 MDEuMzc2aDYzLjM5N2MzLjQ4MyAwIDYuNTU1LTIuMDYzIDcuODUzLTUuMzEzTDcw MC4wODcgNjUyYzEuNjE1LTQuMzEyLS42NjUtOS4wNjItNS4wMDQtMTAuNjU2LS45 MTgtLjM0NC0xLjktLjUzMi0yLjg4MS0uNTMyaC00LjU5MmwzNS44MTUtMTE0Ljc4 MWMuODU1LTIuNTYyLjM4LTUuNDA2LTEuMjM1LTcuNWwtMTEuODc1LTE1Ljc1LS4w OTUtLjE1NmMtMS42MTUtMi00LjAyMi0zLjE4Ny02LjYxOC0zLjE4N2gtNDUuNDc0 YTguNDkgOC40OSAwIDAgMC02LjAxNiAyLjUzMWwtMTIuNjY3IDEzLjcxOWgtMTku NzZsLTEuMzMtMS40MzggMTQwLjc1OC0xMzguOTA2SDc2MGwtLjQ0My0uMzQ0LjQ0 My0uNDM4ek0zMTEuNTM3IDY2MC41OTRsNTAuMDAxLTE0MC45MDZoLTE1Ljg2NWw5 LjQwNS05LjVoNTIuNTM1bC00OS40OTUgMTQyLjM0M2gxOS43MjlsLTIuNTAyIDgu MDYzaC02My44MDh6bTExNy4wMDgtMjM0Ljg3NWw0Ljc1IDQuNzE5LTguNTE4IDI4 LjgxMi03LjEyNSA3LjA2MmgtMzAuNjg1bC01LjczMi01LjY1NiA5Ljg0OC0yNy4y MTggOS4xMi03LjcxOWgyOC4zNDJ6TTE3Ny4wMTcgNjUwLjkwNmgtNTQuMjQ1bC04 LjI5Ny00LjY4N1Y5Ni41OTRoLTM5LjE0bC0zLjE2Ny0zLjEyNXYtMzYuNzVsNC41 MjgtNC44MTNoMjMzLjQxNWw2Ljc0NSA2LjY4OHYzNC42MjVsLTQuNDk3IDUuNDA2 aC0zNC4xNjh2MjcxLjVsMjc4Ljg4OC0yNzEuNWgtNjYuMDU3bC01LjU0MS01Ljg3 NVY1Ni40MDZsMy44MzEtMy40NjloMjM3LjE4NGw0LjE4IDQuMTU2djMzLjQzN0w0 MTEuMDAyIDQxNC4wNjJIMzk5LjE5Yy0uNDc1LS4wMzEtLjg4NyAwLTEuMzMuMDMy bC0uNjMzLjA5NGMtMS40MjUuMzEyLTIuNzI0LjkzNy0zLjc2OSAxLjg3NGwtMTAu ODYxIDkuMjE5LS4xMjcuMDk0Yy0xLjA0NS45NjktMS44NjggMi4xNTYtMi4zMTIg My40NjlsLTkuMzczIDI1LjkzNy0xOTMuNzY4IDE5Ni4xMjV6bTQ2Ny42NTMtMTIz LjVsMTUuMDEtMTYuMjE4aDQyLjI0M2w5Ljc4NSAxMi45NjhMNjcxLjY1IDY1Mi41 aDE1LjYxMmwtMi41MzQgNi41MzFoLTU2LjQ2MWwzNS41OTMtMTExLjM3NWgtNjMu ODA4bC0zNC4xMDUgMTA1Ljk2OWgxMy40MjZsLTIuMzExIDUuNDM3aC01MC44MjVs MzUuMDU1LTExMC44NzRoLTY2LjM3NGwtMzMuNjMgMTA0LjM0M2gxMy44MDdsLTIu MjggNi41MzFoLTUyLjU5OGw0Ny45NDMtMTM5LjM3NGgtMTguNTU3bDIuODgyLTgu NDY5aDUyLjI1TDUyMS4xNyA1MjhoMjguNjlsMTUuNTQ4LTE3LjMxM2gzMy41OTls MTUuNDg1IDE2LjcxOWgzMC4xNzh6IiBmaWxsPSIjMTA3MTAwIi8+PC9zdmc+') no-repeat center center;
  background-size: cover;
  height: 20px;
  width: 20px;
}
`;

const htmlTemplate = (markdown: string, url: string) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
    <style>${baseCss}</style>

    <title>untitled file</title>
    ${revealjsSupport}
    ${args.addEditInVimLink ? addEditInVimLink : ""}
    ${args.changeHtmlLinksToVim ? changeHtmlLinksToVim : ""}
</head>
<body>
<pre id="markdown-url" style="display:none">${url}</pre>
<pre style="display:none;" id="markdown-source">${
    base64.encodeUnicode(markdown)
  }</pre>
<div class="reveal">
  <div class="slides">
    <section data-markdown>
      <script id="markdown-target" type="text/template"></script>
    </section>
  </div>
</div>
</body>
</html>
`;

processPipeMessages<PipeServerAPIv03>(
  markdownToPptHandler,
  "markdown-to-ppt",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
