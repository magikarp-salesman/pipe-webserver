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

const markdownToPresentationHandler = (
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

const vimSvgIcon2KB =
  '<svg id="vim-svg" class="svg-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M24 11.986h-.027l-4.318-4.318 4.303-4.414V1.461l-.649-.648h-8.198l-.66.605v1.045L12.015.027V0L12 .014 11.986 0v.027l-1.29 1.291-.538-.539H2.035l-.638.692v1.885l.616.616h.72v5.31L.027 11.987H0L.014 12 0 12.014h.027l2.706 2.706v6.467l.907.523h2.322l1.857-1.904 4.166 4.166V24l.015-.014.014.014v-.028l2.51-2.509h.485c.111 0 .211-.07.25-.179l.146-.426a.262.262 0 00-.037-.239l1.462-1.462-.612 1.962a.265.265 0 00.255.344h1.824a.266.266 0 00.243-.163l.165-.394a.27.27 0 00-.247-.365h-.075l.84-2.644h1.232l-1.016 3.221a.266.266 0 00.255.344h2.002c.11 0 .207-.066.248-.17l.164-.428a.266.266 0 00-.249-.358h-.145l1.131-3.673a.263.263 0 00-.039-.24l-.375-.504-.003-.005a.267.267 0 00-.209-.102h-1.436a.266.266 0 00-.19.081l-.4.439h-.624l-.042-.046 4.445-4.445H24L23.986 12l.014-.014zM9.838 21.139l1.579-4.509h-.501l.297-.304h1.659l-1.563 4.555h.623l-.079.258H9.838zm3.695-7.516l.15.151-.269.922-.225.226h-.969l-.181-.181.311-.871.288-.247h.895zM5.59 20.829H3.877l-.262-.15V3.091H2.379l-.1-.1V1.815l.143-.154h7.371l.213.214v1.108l-.142.173H8.785v8.688l8.807-8.688h-2.086l-.175-.188V1.805l.121-.111h7.49l.132.133v1.07L12.979 13.25h-.373c-.015-.001-.028 0-.042.001l-.02.003a.259.259 0 00-.119.06l-.343.295-.004.003a.273.273 0 00-.073.111l-.296.83-6.119 6.276zm14.768-3.952l.474-.519h1.334l.309.415-1.265 4.107h.493l-.08.209H19.84l1.124-3.564h-2.015l-1.077 3.391h.424l-.073.174h-1.605l1.107-3.548h-2.096l-1.062 3.339h.436l-.072.209H13.27l1.514-4.46h-.586l.091-.271h1.65l.519.537h.906l.491-.554h1.061l.489.535h.953z"/></svg>';

const changeHtmlLinksToVim = `
${vimSvgIcon2KB}
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
        const svgElement = document.getElementById("vim-svg").cloneNode(true);

        const href = element.href.replace("http://","vim://").replace("https://","vims://");
        newElement.href = href;
        newElement.setAttribute("class", "svg-icon-vim");
        newElement.removeAttribute("type");
        delete newElement.type;

        newElement.appendChild(textNode);
        newElement.appendChild(svgElement);
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
  .svg-icon {
    width: 20px;
    height: 20px;
    position: absolute;
    top: -20px;
    left: -20px;
    fill: #41903F;
  }
  .svg-icon-vim svg {
    width: 20px;
    height: 20px;
    top: auto;
    left: auto;
    display: inline-block;
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
  markdownToPresentationHandler,
  "markdown-to-presentation",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
