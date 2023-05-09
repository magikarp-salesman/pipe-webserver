import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";
import puppeteer from "https://deno.land/x/puppeteer@9.0.2/mod.ts";

const args = getCommandLineArgs({
  host: "puppeteer",
  port: 9222,
});

// todo - ignore removing scripts tagged with a special tag
// todo - remove xhtml comments <!--

const readyScript = `
<script>
  window.addEventListener('load', () => { window.status = 'ready'; });
</script>
`;

const ssrHtmlPageHandler = async (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // we only care about messages that already contain type=html
  if (message.reply.type !== "html" || message.reply.body === undefined) {
    return message;
  }

  if (message.reply.body.includes("data-nossr")) {
    // skip pages that cannot be rendered server side
    return message;
  }

  // run inside puppeter, wait for it to render,
  // get the html out, inline all the stylesheets, remove all scripts
  const browser = await puppeteer.connect({
    browserURL: `http://${args.host}:${args.port}`,
  });

  const page = await browser.newPage();
  await page.setContent(message.reply.body + readyScript);

  // pipe.info("Saving as PDF");
  // await page.pdf({ path: "/root/docs/test.pdf", format: "a4" });
  pipe.info("Waiting for page to finish loading...");
  await page.waitForFunction('window.status === "ready"', { timeout: 1000 })
    .catch((_e: PromiseLike<void>) => pipe.warn("timed-out rendering page"));

  pipe.info("Removing scripts.");
  await page.evaluate(`
      var scripts = document.getElementsByTagName('script');
      var scriptsArrayToDelete = [];
      var scriptsToInline = [];
      for (let script of scripts){
        // skip scripts that cannot be inline
        if(script.dataset.inline == 'true'){
          scriptsToInline.push(script);
        } else {
          scriptsArrayToDelete.push(script);
        }
      }

      scriptsArrayToDelete.forEach(s => s.parentNode.removeChild(s));
      scriptsToInline.forEach(s => {
        fetch(s.src).then(data => data.text()).then(data => {
          const newElement = document.createElement('script');
          newElement.innerHTML = data;
          s.parentElement.replaceChild(newElement,s);
          console.log("done.");
        });
      });
    `);

  pipe.info("Removing iframes");
  await page.evaluate(`
      var iframes = document.getElementsByTagName('iframe');
      var iframesArray = [];
      for (let iframe of iframes){
        // skip iframes that cannot be removed
        if(iframe.dataset.noremove == 'true') continue;
        iframesArray.push(iframe);
      }
  
      iframesArray.forEach(s => s.parentNode.removeChild(s));
    `);

  pipe.info("Inlining stylesheets");
  await page.evaluate(`
      var links = document.getElementsByTagName("link")
      var linksArray = [];
      for (let link of links){
        linksArray.push(link);
      }

      var promises = linksArray.filter(lnk => lnk.rel === 'stylesheet').map(lnk =>
          fetch(lnk.href).then(response => response.text().then(text => {
            const newElement = document.createElement('style');
            // remove the source mapping comments from the styles
            const cleanText = text.replaceAll(/\\/\\*(.*)\\*\\//g, "");
            newElement.innerHTML = cleanText;
            lnk.parentElement.replaceChild(newElement,lnk);  
          }))
      );

      Promise.allSettled(promises);
    `);

  pipe.info("Merging stylesheets");
  await page.evaluate(`
    var styles = document.getElementsByTagName("style");
    var stylesArray = [].slice.call(styles);
    var finalStyle = "";
    for (let style of stylesArray){
      finalStyle = finalStyle + style.innerHTML.replaceAll('\\n',' ') + "\\n";
    }

    const newElement = document.createElement('style');
    newElement.innerHTML = finalStyle;
    document.getElementsByTagName("head")[0].appendChild(newElement);

    for (let style of stylesArray){
      style.parentElement.removeChild(style);
    }
  `);

  if (message.reply.headers["X-SSR-Options"].includes("redirect-links")) {
    pipe.info("Changing the links to apply the redirection");
    const originalUrl = message.reply.headers["X-SSR-Original-Url"];
    await page.evaluate(`
      const alinks = document.getElementsByTagName("A");
      let failCount = 0;
      [... alinks].forEach((element) => {
        const originalLink = unescape("${originalUrl}");
        const httpLink = element.href.startsWith("http");
        const redirectLink = element.href.includes("/redirect?url=");
        const startsWithJavascript = element.href.startsWith("javascript");
        
        if(httpLink && !redirectLink){
          element.href = "/redirect?url=" + escape(element.href);
        } else if(!httpLink && !redirectLink && !startsWithJavascript) {
          element.href = "/redirect?url=" + escape(originalLink + element.href);
        } else {
          console.log(element.href);
          failCount++;
        }
      });

      console.warn("Links not adapted: " + failCount);
  `);
    // remove uneeded headers
    message.reply.headers["X-SSR-Options"] = undefined;
    message.reply.headers["X-SSR-Original-Url"] = undefined;
  }

  const renderedSource = await page.evaluate(
    "document.getElementsByTagName('html')[0].innerHTML",
  );
  page.close();

  pipe.info("Sending rendered page.");
  message.reply.body = "<!DOCTYPE html><html>" + renderedSource + "</html>";
  return message;
};

processPipeMessages<PipeServerAPIv03>(
  ssrHtmlPageHandler,
  "ssr-html-page",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
