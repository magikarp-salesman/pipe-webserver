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
      var scriptsArray = [];
      for (let script of scripts){
        scriptsArray.push(script);
      }

      scriptsArray.forEach(s => s.parentNode.removeChild(s));
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
            newElement.innerHTML = text;
            lnk.parentElement.replaceChild(newElement,lnk);  
          }))
      );

      Promise.allSettled(promises);
    `);

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
