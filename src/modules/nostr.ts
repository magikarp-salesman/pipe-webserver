import {
  getCommandLineArgs,
  PipeFunctions,
  PipeServerAPIv03,
  processPipeMessages,
} from "../dependencies.ts";

import { Nostr, NostrKind, RelayList } from "../external/nostr/nostr.ts";
import Relay from "../external/nostr/relay.ts";

const _args = getCommandLineArgs({
  minifyCSS: true,
  minifyJS: true,
});

const nostrHandler = async (
  message: PipeServerAPIv03,
  pipe: PipeFunctions,
) => {
  if (!message.request.url.startsWith("/nostr")) {
    return Promise.resolve(message);
  }

  const nostr = new Nostr();

  const relayList: RelayList = {
    name: "Nostrprotocol",
    url: "wss://relay.nostrprotocol.net",
  };

  const relayList2: RelayList = {
    name: "Damus",
    url: "wss://relay.damus.io",
  };

  nostr.relayList.push(relayList2);
  nostr.relayList.push(relayList);

  nostr.on(
    "relayConnected",
    (relay: Relay) => pipe.info("Relay connected. " + relay.name),
  );
  nostr.on("relayError", (err: Error) => pipe.error("Relay error;", err));
  nostr.on("relayNotice", (notice: string[]) => pipe.info("Notice " + notice));

  nostr.debugMode = false;

  await nostr.connect();

  const filter = {
    kinds: [NostrKind.TEXT_NOTE, NostrKind.META_DATA],
    limit: 20,
  };

  let result = "# Nostr\n\n";

  //method 1: for await
  //console.log("iterable return");

  result = result.concat("## Posts\n\n");
  for await (const note of nostr.filter(filter)) {
    result = result.concat("> " + note.id + " - " + note.content + "\n\n");
  }

  // //method 2: collect
  // //console.log("promise return");
  // const allNotes = await nostr.filter(filter).collect();
  // pipe.info(JSON.stringify(allNotes));

  // //method 3: callback
  // //console.log("callback return");
  // await nostr.filter(filter).each((note) => {
  //   pipe.info(JSON.stringify(note));
  // // });

  // nostr.privateKey = "nsec1z70ycr9nsz988vylz8tqvjgwv2g6tx2rf7ljmz8e33h80sdy483qmwk986"; // A private key is optional. Only used for sending posts.
  // await nostr.sendTextPost("Hello nostr deno client library.");

  nostr.publicKey =
    "npub1yg8h96s2dnmjnwxc4sclvljrss0u6pvhg042ll00pfj39te58g9sp2frta"; // You need a public key for get posts.
  const posts = await nostr.getPosts();
  pipe.info("Posts " + JSON.stringify(posts));

  // const post = posts[posts.length - 1];
  // await nostr.sendReplyPost("Test reply.", post);

  result = result.concat("## Feeds\n\n");
  const feeds = await nostr.globalFeed({
    limit: 10,
  });

  result = result.concat(
    feeds.map((feed) => "- " + feed.id + " - " + feed.author).join("\n\n"),
  );

  result = result.concat("\n\n");

  result = result.concat("## My profile\n\n");
  const profile = await nostr.getMyProfile();
  result = result.concat(
    nostr.publicKey + " - " + profile.name + " - " + profile.about + " | " +
      profile.relays + "\n\n",
  );

  // pipe.info("Key " + nostr.getNip19FromKey("public key"));

  message.reply.body = result;
  message.reply.type = "markdown";

  return Promise.resolve(message);
};

processPipeMessages<PipeServerAPIv03>(
  nostrHandler,
  "nostr",
);

// vim: ts=2 sts=2 sw=2 tw=0 noet
