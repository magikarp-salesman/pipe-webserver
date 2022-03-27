import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
  utils,
} from "../dependencies.ts";

import { DB } from "https://deno.land/x/sqlite@v3.3.0/mod.ts";
// import { multiParser } from "https://deno.land/x/multiparser@v2.0.3/mod.ts";

const args = getCommandLineArgs({
  database: "facts.db",
  path: "/facts",
});

const awesomeJs = await fetch(
  "https://cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.5/awesomplete.min.js",
).then((res) => res.text()).catch((_) => "");
const awesomeCss = await fetch(
  "https://cdnjs.cloudflare.com/ajax/libs/awesomplete/1.1.5/awesomplete.base.min.css",
).then((res) => res.text()).catch((_) => "");

const geolocation = /* javascript */ `
    navigator.geolocation && navigator.geolocation.getCurrentPosition(({coords}) => {
        document.getElementById("location").value = coords.latitude + "," + coords.longitude;
    });
`;

const html = (body = "", title = "info") => /* html */ `
    <!doctype html>
    <html lang="en">
        <head>
            ${css}
            <title>${title}</title>
            ${scripts}
        </head>
        <body>${body}</body>
    </html>
`;

const addanother = /* javascript */ `
    function addAnother() {
        var node = document.createElement("INPUT");
        var name = "fact-" + Math.floor(Math.random() * 1000000000);
        node.setAttribute("class","awesomeplete");
        node.setAttribute("type","text");
        node.setAttribute("name",name);
        node.setAttribute("list","base-list");
        node.setAttribute("data-minchars","1");

        var desc_button = document.createElement("BUTTON");
        desc_button.setAttribute("class", "extra-button");
        desc_button.setAttribute("targetdiv", "desc-" + name);
        desc_button.setAttribute("onclick","window.showDescription(event)");
        var text = document.createTextNode("+");
        desc_button.appendChild(text);
        document.getElementById("group").appendChild(desc_button);
        
        var description = document.createElement("input")
        description.setAttribute("id","desc-"+name);
        description.setAttribute("class","extra-description")
        description.setAttribute("type","text");
        description.setAttribute("name","desc-"+name);

        var div = document.createElement("DIV");
        div.appendChild(node);
        div.appendChild(desc_button);
        div.appendChild(description);
        
        document.getElementById("group").appendChild(div);
        new Awesomplete(node);
    }

    function showDescription(e) {
        e.preventDefault();
        const targetdiv = e.target.getAttribute("targetdiv"); 
        const node = document.getElementById(targetdiv);
        node.setAttribute("style","display:block");
    }

    window.onload = addAnother;
`;

const search = /* javascript */ `
    function search() {
        let search = document.getElementById("search").value;
        window.location.href = "/search/" + search;
    }
    
    document.addEventListener("DOMContentLoaded", () => {

        var comboplete = new Awesomplete('input.dropdown-input', {
            minChars: 0,
        });
        
        Awesomplete.$('.dropdown-btn').addEventListener("click", function() {
            if (comboplete.ul.childNodes.length === 0) {
                comboplete.minChars = 0;
                comboplete.evaluate();
            }
            else if (comboplete.ul.hasAttribute('hidden')) {
                comboplete.open();
            }
            else {
                comboplete.close();
            }
        });

    });

`;

const scripts = [awesomeJs, geolocation, addanother, search].map((x) =>
  `<script>${x}</script>`
).join("");

const customCss = /* css */ `

    body {
        width: 100% ;
        max-width: 450px ;
        margin: 0px;
        padding: 5px;
        margin-left: auto;
        margin-right: auto;
    }

    #searchGroup .awesomplete {
        width: 90% ;
    }

    #searchGroup .awesomplete > input {
        width: 95% ;
    }

    #searchGroup > button {
        width: 10% ;
        float: rights;
        height: 15pt;
        margin-top: 5px;
    }

    #myform #group > div {
        width: 100% ;
        margin-bottom: 5px;
    }
    
    #myform #group .extra-description {
        width: 100% ;
        display: none ;
    }

    #myform .extra-button {
        width: 10% ;
        float: rights;
        height: 15pt;
        margin-top: 5px;
    }
    
    #myform > input {
        width: 100% ;
        height: 15pt ;
        display: block; 
    }
    
    #myform .awesomplete {
        width: 90% ;
        height: 15pt ;
        max-width: 450px ;
        padding-top: 5px;
    }
    
    #myform .awesomplete > input {
        width: 95% ;
    }
`;

const css = /* html */ `
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta charset="utf-8"/>
` + [awesomeCss, customCss].map((x) => `<style>${x}</style>`).join("");

// Open a database
// const db = new DB(args.database);
// const SQL = /* SQL */ `
//     CREATE TABLE IF NOT EXISTS facts
//         (
//             id INTEGER PRIMARY KEY AUTOINCREMENT,
//             fact TEXT NOT NULL,
//             description TEXT,
//             operation TEXT NOT NULL,
//             location TEXT,
//             timestamp DATE DEFAULT (datetime('now','localtime'))
//         )
// `;

// db.query(SQL);

const facts = async (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  // If already answered skip.
  if (message.reply.returnCode) return message;

  // If not part of our path skip it
  if (!message.request.url.startsWith(args.path)) return message;

  const db = new DB(args.database);

  if (message.request.url.startsWith("/search/")) {
    const fact = decodeURI(message.request.url.replace("/search/", "").trim());

    pipe.debug("search " + fact);

    const query = /* sql */ `
            SELECT
                group_concat(f.id) as id,
                fact,
                group_concat(f.description) as description,
                group_concat(f.operation) as operation,
                group_concat(f.location) as location,
                max(f.timestamp) as timestamp
            FROM facts f WHERE operation 
                IN (SELECT operation FROM facts WHERE fact LIKE ?)
                GROUP BY fact
                ORDER BY timestamp DESC, fact DESC
        `;

    let results;
    try {
      results = db.query(query, [fact]);
    } catch (e) {
      pipe.error("error querying the database.", e);
      return message;
    }

    const rows = [];

    for (
      const [id, fact, description, operation, location, timestamp] of results
    ) {
      const row = `
                <tr>
                    <td>${id}</td>
                    <td><a href="/search/${fact}">${fact}</a></td>
                    <td>${description || ""}</td>
                    <td>${operation}</td>
                    <td>${location || "no location"}</td>
                    <td><time>${timestamp}</time></td>
                </tr>
            `;
      rows.push(row);
    }

    message.reply.type = "html";
    message.reply.body = html("<table>" + rows.join("") + "</table>");
    message.reply.returnCode = 200;

    return message;
  }

  pipe.debug("parsing url");

  const form = await { fields: { location: "" } }; // multiParser(undefined);
  const uuid = utils.uuid.generate();

  if (form) {
    pipe.info("inserting into form");
    const { location } = form.fields;

    const values = Object.entries(form.fields)
      .filter((z) => z[0] != "location")
      .filter((z) => z[1] !== undefined && z[1] !== null && z[1] !== "")
      .filter((z) => !z[0].startsWith("desc-"))
      .map((z) => [z[0], z[1].trim().toLowerCase()])
      .map((z) => [z[1], ""]) // form.fields["desc-" + z[0]]])
      .map((z) => [z[0], z[1] ?? null]);

    for (const [value, desc] of values) {
      pipe.info("inserting " + value + " " + desc);
      db.query(
        "INSERT INTO facts (fact,description,operation,location) VALUES (?,?,?,?)",
        [value, desc, uuid, location],
      );
    }
  }

  const listKeywords = [];

  pipe.info("getting facts");

  for (const [fact] of db.query(/* SQL */ `SELECT DISTINCT fact FROM facts`)) {
    listKeywords.push(fact);
  }

  const list_options = listKeywords.map((word) => (`<option>${word}</option>`))
    .join("");
  const base_components = `
        <datalist id="base-list">${list_options}</datalist>
        <form autocomplete=\"off\" method="post" enctype="multipart/form-data" accept-charset="UTF-8" action="" id="myform">
            <div id=\"group\"></div>
            <input type=\"hidden\" name=\"location\" id="location">
            <input id=\"addAnother\" type=\"button\" value=\"Add\" onclick=\"window.addAnother()\" style=\"margin-top:20px;height:20pt\">
            <input id=\"submit\" type=\"submit\" value=\"Submit\" style=\"margin-top:10px;height:20pt\">
        </form>
        <div id="searchGroup">
            <input list="base-list" class="dropdown-input" id="search"/><button onclick="window.search()">go</button>
        </div>
    `;

  pipe.info("reply");

  message.reply.body = html(base_components);
  message.reply.returnCode = 200;

  if (form) {
    message.reply.returnCode = 303;
    message.reply.body = undefined;
    message.reply.headers["Location"] = "/#" +
      Math.floor(Math.random() * 1000000000);
  }

  // Close connection
  db.close();

  return message;
};

processPipeMessages<PipeServerAPIv03>(facts, "facts");
