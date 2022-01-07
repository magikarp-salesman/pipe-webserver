import {
  api_pipeserver_v0_3,
  base64,
  getCommandLineArgs,
  PipeFunctions,
  processPipeMessages,
} from "./dependencies.ts";

/*
  TODO:
  - Auto reload by polling?
  - Add generated by and pgp+checksum (separate pipeline?)
  - VIM keybindings for the pages themselves (another plugin maybe?)
*/

const args = getCommandLineArgs({
  highlightSupport: true,
  graphvizSupport: true,
  autotocSupport: true,
  embeddedYoutubeLinks: true,
});

const markdownToHtmlHandler = (
  message: api_pipeserver_v0_3,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=markdown
  if (message.reply.type !== "markdown" || message.reply.body === undefined) {
    return message;
  }

  pipe.debug("Converting markdown to html5");

  message.reply.body = htmlTemplate(message.reply.body!);
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

      // extension
      showdown.extension('header-anchors', function() {

        var ancTpl = '$1<a id="user-content-$3" class="anchor" href="#$3" aria-hidden="true"><svg aria-hidden="true" class="octicon octicon-link" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg></a>$4';

        return [{
          type: 'html',
          regex: /(<h([1-3]) id="([^"]+?)">)(.*<\\/h\\2>)/g,
          replace: ancTpl
        }];
      });

      // options
      showdown.setFlavor('github');
      showdown.setOption('simplifiedAutoLink', true);
      showdown.setOption('strikethrough', true);
      showdown.setOption('tables', true);
      showdown.setOption('tasklists', true);
      showdown.setOption('requireSpaceBeforeHeadingText', true);
      showdown.setOption('emoji', true);
      showdown.setOption('metadata', true);

      var converter = new showdown.Converter({
        extensions: ['header-anchors']
      }),
      text = document.getElementById("markdown-source").textContent,
      html = converter.makeHtml(decodeUnicode(text));

      var body = document.getElementById("markdown-body");
      body.innerHTML = html;

      console.log('metadata', converter.getMetadata());

      if (converter.getMetadata().title){
        document.title = converter.getMetadata().title;
      }

      Object.keys(converter.getMetadata()).map(
        (data) => {
          var meta = document.createElement('meta');
          meta.name = data;
          meta.content = converter.getMetadata()[data];
          document.getElementsByTagName('HEAD')[0].appendChild(meta);
        }
      );

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
  .markdown-body svg {
    max-width: 100%;
  }
</style>
`;

const htmlTemplate = (markdown: string) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
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
    base64.encodeUnicode(markdown)
  }</pre>
<div id="markdown-body" class="markdown-body"></div>
</body>
</html>
`;

processPipeMessages<api_pipeserver_v0_3>(
  markdownToHtmlHandler,
  "markdown-to-html",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
