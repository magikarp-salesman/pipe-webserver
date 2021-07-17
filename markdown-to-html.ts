import { api_pipeserver_v0_3 } from "./api/api_v0_3.ts";
import {
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./common.ts";

/*
  TODO:
  - Anchor links with 🔗
  - Auto reload by polling?
  - Add generated by and pgp+checksum (separate pipeline?)
  - VIM keybindings for the pages themselves (another plugin maybe?)
  - Include script dependencies in the file (separate pipeline?)
  - UTF8 decode: https://attacomsian.com/blog/javascript-base64-encode-decode
*/

const args = getCommandLineArgs({
  highlightSupport: true,
  graphvizSupport: true,
  autotocSupport: true,
  embeddedYoutubeLinks: true,
});

const markdownToHtmlHandler = async (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=markdown
  if (message.reply.type !== "markdown" || message.reply.body === undefined) {
    return message;
  }

  pipe.debug("Converting markdown to html5");

  message.reply.body = htmlTemplate(message.reply.body!!);
  message.reply.type = "html";

  return message;
};

const highlightSupport = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/styles/default.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/highlight.min.js"></script>
  <script>window.addEventListener('load', hljs.highlightAll);</script>
`;

const graphvizSupport = `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/viz.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/2.1.2/full.render.js"></script>
  <script>
  window.addEventListener('load', () => {
      var viz = new Viz();

      let dot_documents = document.querySelectorAll('code.language-dot');
  
      dot_documents.forEach(node => {
          let code = node.textContent;
          console.log(code);
  
          viz.renderSVGElement(code)
          .then(function(element) {
              node.parentNode.replaceChild(element, node);
              // take it out of the <pre> tag
              let pre = element.parentNode;
              pre.parentNode.replaceChild(element, pre);
          })
          .catch(error => {
              // Create a new Viz instance (@see Caveats page for more info)
              viz = new Viz();
  
              // Possibly display the error
              console.error(error);
          });
      });
  });
  </script>
`;

// add this for extra css:
const autotocSupport = `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.11.1/tocbot.min.js"></script>
  <!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.11.1/tocbot.css">-->
  <script>
  window.addEventListener('load', () => {
    tocbot.init({
      // Where to render the table of contents.
      tocSelector: '.toc',
      // Where to grab the headings to build the table of contents.
      contentSelector: '#markdown-body'
    });
  });
  </script>
`;

const showdownjsSupport = `
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.1/showdown.min.js"></script>

  <script>

  function decodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  }

  window.addEventListener('load', () => {

      // options
      showdown.setFlavor('github');
      showdown.setOption('simplifiedAutoLink', true);
      showdown.setOption('strikethrough', true);
      showdown.setOption('tables', true);
      showdown.setOption('tasklists', true);
      showdown.setOption('requireSpaceBeforeHeadingText', true);
      showdown.setOption('emoji', true);
      showdown.setOption('metadata', true);

      var converter = new showdown.Converter(),
      text = document.getElementById("markdown-source").textContent,
      html = converter.makeHtml(decodeUnicode(text));

      var body = document.getElementById("markdown-body");
      body.innerHTML = html;

      console.log('metadata', converter.getMetadata());

      if (converter.getMetadata().title){
        document.title = converter.getMetadata().title;
      }

      // remove the markdown source from the document
      document.getElementById("markdown-source").remove()
    });
    </script>
`;

const embeddedYoutubeLinks = `
<script>
  window.addEventListener('load', () => {
    
    let allLinks = document.getElementsByTagName("A");
    let properArray = [];
    for(let i=0;i<allLinks.length;i++){
      properArray.push(allLinks.item(i));
    }

    properArray.forEach(element => {
      const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|&v=)([^#&?]*).*/;
      const match = element.href.match(regExp);

      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if(videoId === null) return; // not a youtube link

      const newElement = document.createElement('iframe');
      newElement.width = 560;
      newElement.height = 315;
      newElement.frameBorder = 0;
      newElement.allowFullscreen = true;
      newElement.src = 'https://www.youtube.com/embed/' + videoId + '?modestbranding=1'

      element.parentElement.replaceChild(newElement,element);
    });
  });
  </script>
`;

const baseCss = `
<style>
  @media print {
    h1:not(:first-of-type) {
      break-before:always
    }
  }
  @media (max-width: 767px) {
    .markdown-body {
      padding: 15px;
    }
  }
  .markdown-body {
		box-sizing: border-box;
		min-width: 200px;
		max-width: 980px;
		margin: 0 auto;
		padding: 45px;
	}
  .markdown-body pre > svg {
    max-width: 100%;
    height: auto;
  }
</style>
`;

const htmlTemplate = (markdown: string) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    ${baseCss}
    ${showdownjsSupport}
    ${args.highlightSupport ? highlightSupport : ""}
    ${args.graphvizSupport ? graphvizSupport : ""}
    ${args.autotocSupport ? autotocSupport : ""}
    ${args.embeddedYoutubeLinks ? embeddedYoutubeLinks : ""}
    <title>untitled file</title>
</head>
<body>
<pre id="markdown-source" style="display:none">${
    toBase64Unicode(markdown)
  }</pre>
<div id="markdown-body" class="markdown-body"></div>
</body>
</html>
`;

const toBase64Unicode = (str: string) =>
  btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt("0x" + p1))),
  );

processPipeMessages<api_pipeserver_v0_3>(
  markdownToHtmlHandler,
  "markdown-to-html",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
